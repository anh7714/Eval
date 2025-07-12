import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage-supabase-api";
import { insertAdminSchema, insertEvaluatorSchema, insertCandidateSchema, insertEvaluationCategorySchema, insertEvaluationItemSchema, insertEvaluationSchema, insertSystemConfigSchema, insertCategoryOptionSchema, insertEvaluationTemplateSchema, insertCandidatePresetScoreSchema } from "@shared/schema";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { 
  admins, systemConfig, evaluators, evaluationCategories, 
  evaluationItems, candidates, evaluations, evaluationSubmissions 
} from "../shared/schema";
import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

// Extend session data interface
declare module 'express-session' {
  interface SessionData {
    user?: any;
    evaluator?: any;
  }
}

// Auth middleware for admin routes
function requireAdminAuth(req: any, res: any, next: any) {
  if (!req.session?.user) {
    return res.status(401).json({ message: "Admin authentication required" });
  }
  next();
}

// Legacy alias for backward compatibility
const requireAuth = requireAdminAuth;

// Auth middleware for evaluator routes
function requireEvaluatorAuth(req: any, res: any, next: any) {
  if (!req.session?.evaluator) {
    return res.status(401).json({ message: "Evaluator authentication required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // 🎯 index.ts에서 이미 초기화했으므로 중복 초기화 제거
  console.log("📝 Setting up routes...");

  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'evaluation-system-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  }));

  // ===== SYSTEM CONFIG ROUTES =====
  app.get("/api/system/config", async (req, res) => {
    try {
      const config = await storage.getSystemConfig();
      console.log("System config fetched:", config);
      res.json(config || { 
        evaluationTitle: "종합평가시스템", 
        isEvaluationActive: false, 
        allowPublicResults: false 
      });
    } catch (error) {
      console.error("Error fetching system config:", error);
      res.status(500).json({ message: "Failed to fetch system config" });
    }
  });

  app.put("/api/system/config", requireAuth, async (req, res) => {
    try {
      const validatedData = insertSystemConfigSchema.parse(req.body);
      const config = await storage.updateSystemConfig(validatedData);
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update system config" });
    }
  });

  // ===== ADMIN AUTH ROUTES =====
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const admin = await storage.getAdminByUsername(username);
      
      if (!admin || admin.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.user = { id: admin.id, username: admin.username, name: admin.name };
      res.json({ user: req.session.user });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/admin/me", requireAuth, (req, res) => {
    res.json({ user: req.session.user });
  });

  app.get("/api/admin/profile", requireAuth, (req, res) => {
    res.json(req.session.user);
  });

  // ===== EVALUATOR AUTH ROUTES =====
  app.post("/api/evaluator/login", async (req, res) => {
    try {
      const { name, password } = req.body;
      const evaluator = await storage.getEvaluatorByName(name);
      
      if (!evaluator || evaluator.password !== password || !evaluator.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.evaluator = { id: evaluator.id, name: evaluator.name, department: evaluator.department };
      res.json({ evaluator: req.session.evaluator });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/evaluator/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/evaluator/me", requireEvaluatorAuth, (req, res) => {
    res.json({ evaluator: req.session.evaluator });
  });

  app.get("/api/evaluator/profile", requireEvaluatorAuth, (req, res) => {
    res.json(req.session.evaluator);
  });

  // ===== ADMIN SYSTEM CONFIG ROUTES =====
  app.get("/api/admin/system-config", requireAuth, async (req, res) => {
    try {
      const config = await storage.getSystemConfig();
      res.json(config || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system config" });
    }
  });

  app.put("/api/admin/system-config", requireAuth, async (req, res) => {
    try {
      console.log("Received system config update request:", req.body);
      
      // 임시로 직접 데이터 전달 (스키마 업데이트 전까지)
      const configData = {
        evaluationTitle: req.body.evaluationTitle,
        systemName: req.body.systemName,
        description: req.body.description,
        adminEmail: req.body.adminEmail,
        maxEvaluators: req.body.maxEvaluators,
        maxCandidates: req.body.maxCandidates,
        evaluationDeadline: req.body.evaluationDeadline,
        allowPartialSubmission: req.body.allowPartialSubmission,
        enableNotifications: req.body.enableNotifications,
        allowPublicResults: req.body.allowPublicResults,
        isEvaluationActive: req.body.isEvaluationActive,
        evaluationStartDate: req.body.evaluationStartDate,
        evaluationEndDate: req.body.evaluationEndDate,
        maxScore: req.body.maxScore
      };
      
      console.log("Config data to save:", configData);
      const config = await storage.updateSystemConfig(configData);
      console.log("Updated config:", config);
      res.json(config);
    } catch (error) {
      console.error("System config update error:", error);
      res.status(500).json({ message: "Failed to update system config", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/admin/reset-password", requireAuth, async (req, res) => {
    try {
      const adminId = req.session.user.id;
      const updatedAdmin = await storage.updateAdmin(adminId, { password: "admin123" });
      res.json({ message: "비밀번호가 admin123으로 초기화되었습니다." });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "비밀번호 초기화에 실패했습니다." });
    }
  });

  // ===== EVALUATOR MANAGEMENT ROUTES =====
  app.get("/api/evaluators", requireAuth, async (req, res) => {
    try {
      const evaluators = await storage.getAllEvaluators();
      res.json(evaluators);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluators" });
    }
  });

  // 평가자 로그인용 공개 엔드포인트 - 활성 평가자 이름만 반환
  app.get("/api/evaluators/active", async (req, res) => {
    try {
      const evaluators = await storage.getActiveEvaluators();
      // 보안을 위해 이름만 반환
      const evaluatorNames = evaluators.map(e => ({ id: e.id, name: e.name }));
      res.json(evaluatorNames);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active evaluators" });
    }
  });

  app.get("/api/evaluators/active", async (req, res) => {
    try {
      const evaluators = await storage.getActiveEvaluators();
      res.json(evaluators);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active evaluators" });
    }
  });

  app.post("/api/evaluators", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEvaluatorSchema.parse(req.body);
      const evaluator = await storage.createEvaluator(validatedData);
      res.json(evaluator);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create evaluator" });
    }
  });

  app.post("/api/evaluators/bulk", requireAuth, async (req, res) => {
    try {
      const { evaluators } = req.body;
      const validatedData = z.array(insertEvaluatorSchema).parse(evaluators);
      const createdEvaluators = await storage.createManyEvaluators(validatedData);
      res.json(createdEvaluators);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create evaluators" });
    }
  });

  app.put("/api/evaluators/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEvaluatorSchema.partial().parse(req.body);
      const evaluator = await storage.updateEvaluator(id, validatedData);
      res.json(evaluator);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update evaluator" });
    }
  });

  app.delete("/api/evaluators/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEvaluator(id);
      res.json({ message: "Evaluator deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete evaluator" });
    }
  });

  // ===== ADMIN EVALUATOR ROUTES =====
  app.get("/api/admin/evaluators", requireAuth, async (req, res) => {
    try {
      const evaluators = await storage.getAllEvaluators();
      res.json(evaluators);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluators" });
    }
  });

  app.post("/api/admin/evaluators", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEvaluatorSchema.parse(req.body);
      const evaluator = await storage.createEvaluator(validatedData);
      res.json(evaluator);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create evaluator" });
    }
  });

  app.patch("/api/admin/evaluators/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEvaluatorSchema.partial().parse(req.body);
      const evaluator = await storage.updateEvaluator(id, validatedData);
      res.json(evaluator);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update evaluator" });
    }
  });

  app.delete("/api/admin/evaluators/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEvaluator(id);
      res.json({ message: "Evaluator deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete evaluator" });
    }
  });

  // ===== CANDIDATE MANAGEMENT ROUTES =====
  app.get("/api/candidates", async (req, res) => {
    try {
      const candidates = await storage.getAllCandidates();
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.get("/api/candidates/active", async (req, res) => {
    try {
      const candidates = await storage.getActiveCandidates();
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active candidates" });
    }
  });

  app.post("/api/candidates", requireAuth, async (req, res) => {
    try {
      const validatedData = insertCandidateSchema.parse(req.body);
      const candidate = await storage.createCandidate(validatedData);
      res.json(candidate);
    } catch (error) {
      console.error("후보자 추가 에러:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create candidate" });
    }
  });

  app.post("/api/candidates/bulk", requireAuth, async (req, res) => {
    try {
      const { candidates } = req.body;
      const validatedData = z.array(insertCandidateSchema).parse(candidates);
      const createdCandidates = await storage.createManyCandidates(validatedData);
      res.json(createdCandidates);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create candidates" });
    }
  });

  app.put("/api/candidates/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCandidateSchema.partial().parse(req.body);
      const candidate = await storage.updateCandidate(id, validatedData);
      res.json(candidate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update candidate" });
    }
  });

  app.delete("/api/candidates/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCandidate(id);
      res.json({ message: "Candidate deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete candidate" });
    }
  });

  // ===== ADMIN CANDIDATE ROUTES =====
  app.get("/api/admin/candidates", requireAuth, async (req, res) => {
    try {
      const candidates = await storage.getAllCandidates();
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.post("/api/admin/candidates", requireAuth, async (req, res) => {
    try {
      const validatedData = insertCandidateSchema.parse(req.body);
      const candidate = await storage.createCandidate(validatedData);
      res.json(candidate);
    } catch (error) {
      console.error("후보자 추가 에러:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create candidate" });
    }
  });

  app.post("/api/admin/candidates/bulk", requireAuth, async (req, res) => {
    try {
      const { candidates } = req.body;
      const validatedData = z.array(insertCandidateSchema).parse(candidates);
      const createdCandidates = await storage.createManyCandidates(validatedData);
      res.json(createdCandidates);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create candidates" });
    }
  });

  app.patch("/api/admin/candidates/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log("PATCH /api/admin/candidates/:id - Request body:", req.body);
      console.log("PATCH /api/admin/candidates/:id - Candidate ID:", id);
      
      const validatedData = insertCandidateSchema.partial().parse(req.body);
      console.log("PATCH /api/admin/candidates/:id - Validated data:", validatedData);
      
      const candidate = await storage.updateCandidate(id, validatedData);
      console.log("PATCH /api/admin/candidates/:id - Updated candidate:", candidate);
      res.json(candidate);
    } catch (error) {
      console.error("PATCH /api/admin/candidates/:id - Error details:", error);
      if (error instanceof z.ZodError) {
        console.error("PATCH /api/admin/candidates/:id - Zod validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to update candidate", error: errorMessage });
    }
  });

  app.delete("/api/admin/candidates/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCandidate(id);
      res.json({ message: "Candidate deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete candidate" });
    }
  });

  // ===== TEMPLATE ROUTES =====
  app.get("/api/admin/templates/default", async (req, res) => {
    try {
      // 관리자 화면에서 사용 중인 실제 템플릿 반환 (두 번째 이미지와 동일)
      const template = {
        title: "제공기관 선정 심의회 평가표",
        totalScore: 100,
        sections: [
          {
            id: 'A',
            title: '기관수행능력',
            totalPoints: 35,
            items: [
              { id: 1, text: '통계SOS 사업 운영 체계화 점검', type: '정량', points: 20 },
              { id: 2, text: '점검 및 운영 목적 확인', type: '정량', points: 5 },
              { id: 3, text: '기관 운영 기간', type: '정량', points: 5 },
              { id: 4, text: '조직구성', type: '정량', points: 5 }
            ]
          },
          {
            id: 'B',
            title: '인력운영',
            totalPoints: 20,
            items: [
              { id: 1, text: '사업 운영 총괄자 및 담당자의 전문성', type: '정량', points: 5 },
              { id: 2, text: '통계업무 담당자 지정', type: '정량', points: 5 },
              { id: 3, text: 'SOS서비스 수행 인력의 확보', type: '정량', points: 10 }
            ]
          },
          {
            id: 'C',
            title: '안전관리',
            totalPoints: 10,
            items: [
              { id: 1, text: '배상책임보험', type: '정량', points: 5 },
              { id: 2, text: '사고예방 및 개인정보', type: '정량', points: 5 }
            ]
          },
          {
            id: 'D',
            title: '품질관리',
            totalPoints: 15,
            items: [
              { id: 1, text: '시설(품질) 평가 결과', type: '정량', points: 15 }
            ]
          },
          {
            id: 'E',
            title: '실적평가',
            totalPoints: 20,
            items: [
              { id: 1, text: '서비스 제공건수', type: '정량', points: 15 },
              { id: 2, text: '만족도조사결과', type: '정량', points: 5 }
            ]
          }
        ]
      };
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  // ===== PRESET SCORES ROUTES =====
  app.get("/api/admin/candidate-preset-scores/:candidateId?", async (req, res) => {
    try {
      const { candidateId } = req.params;
      if (candidateId) {
        const scores = await storage.getPresetScoresByCandidateId(parseInt(candidateId));
        res.json(scores);
      } else {
        const scores = await storage.getAllPresetScores();
        res.json(scores);
      }
    } catch (error: any) {
      console.error("Error fetching preset scores:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/candidate-preset-scores", requireAuth, async (req, res) => {
    try {
      const { candidateId, evaluationItemId, presetScore, applyPreset } = req.body;
      const score = await storage.upsertPresetScore({
        candidateId,
        evaluationItemId,
        presetScore,
        applyPreset
      });
      res.json(score);
    } catch (error) {
      console.error("Error saving preset score:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== EVALUATION CATEGORY ROUTES =====
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/active", async (req, res) => {
    try {
      const categories = await storage.getActiveCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active categories" });
    }
  });

  app.post("/api/categories", requireAuth, async (req, res) => {
    try {
      console.log("Creating category with data:", req.body);
      const validatedData = insertEvaluationCategorySchema.parse(req.body);
      console.log("Validated data:", validatedData);
      const category = await storage.createCategory(validatedData);
      res.json(category);
    } catch (error: any) {
      console.error("Category creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create category", error: error.message });
    }
  });

  app.put("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEvaluationCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, validatedData);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // 모든 평가 카테고리 삭제 (덮어쓰기용)
  app.delete("/api/admin/evaluation-categories/clear", requireAuth, async (req, res) => {
    try {
      if (storage.clearCategories) {
        await storage.clearCategories();
      } else {
        // fallback: 모든 카테고리 가져와서 개별 삭제
        const categories = await storage.getAllCategories();
        for (const category of categories) {
          await storage.deleteCategory(category.id);
        }
      }
      res.json({ message: "모든 평가 카테고리가 삭제되었습니다." });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // 모든 평가 항목 삭제 (덮어쓰기용)
  app.delete("/api/admin/evaluation-items/clear", requireAuth, async (req, res) => {
    try {
      if (storage.clearEvaluationItems) {
        await storage.clearEvaluationItems();
      } else {
        // fallback: 모든 항목 가져와서 개별 삭제
        const items = await storage.getAllEvaluationItems();
        for (const item of items) {
          await storage.deleteEvaluationItem(item.id);
        }
      }
      res.json({ message: "모든 평가 항목이 삭제되었습니다." });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== ADMIN EVALUATION CATEGORY ROUTES =====
  app.get("/api/admin/categories", requireAuth, async (req, res) => {
    try {
      // 캐시 방지 헤더 추가
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/admin/evaluation-categories", requireAuth, async (req, res) => {
    try {
      console.log("📝 평가 카테고리 생성 요청:", req.body);
      const validatedData = insertEvaluationCategorySchema.parse(req.body);
      console.log("✅ 유효성 검사 통과:", validatedData);
      const category = await storage.createCategory(validatedData);
      console.log("✅ 카테고리 생성 성공:", category);
      res.json(category);
    } catch (error) {
      console.error("❌ 카테고리 생성 실패:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // ===== CATEGORY OPTIONS ROUTES =====
  app.get("/api/admin/category-options", requireAuth, async (req, res) => {
    try {
      const options = await storage.getAllCategoryOptions();
      res.json(options);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category options" });
    }
  });

  app.post("/api/admin/category-options", requireAuth, async (req, res) => {
    try {
      const validatedData = insertCategoryOptionSchema.parse(req.body);
      const option = await storage.createCategoryOption(validatedData);
      res.json(option);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create category option" });
    }
  });

  app.patch("/api/admin/category-options/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCategoryOptionSchema.partial().parse(req.body);
      const option = await storage.updateCategoryOption(id, validatedData);
      res.json(option);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update category option" });
    }
  });

  app.delete("/api/admin/category-options/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategoryOption(id);
      res.json({ message: "Category option deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category option" });
    }
  });

  // ===== EVALUATION ITEM ROUTES =====
  // Admin routes for evaluation items
  app.get("/api/admin/evaluation-items", requireAuth, async (req, res) => {
    try {
      // 캐시 방지 헤더 추가
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const items = await storage.getAllEvaluationItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluation items" });
    }
  });

  app.post("/api/admin/evaluation-items", requireAuth, async (req, res) => {
    try {
      console.log("📝 평가항목 생성 요청 데이터:", req.body);
      const validatedData = insertEvaluationItemSchema.parse(req.body);
      console.log("✅ 유효성 검사 통과:", validatedData);
      const item = await storage.createEvaluationItem(validatedData);
      console.log("✅ 평가항목 생성 성공:", item);
      res.json(item);
    } catch (error) {
      console.error("❌ 평가항목 생성 실패:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create evaluation item" });
    }
  });

  app.get("/api/evaluation-items", async (req, res) => {
    try {
      const items = await storage.getAllEvaluationItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluation items" });
    }
  });

  app.get("/api/evaluation-items/active", async (req, res) => {
    try {
      const items = await storage.getActiveEvaluationItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active evaluation items" });
    }
  });

  app.post("/api/evaluation-items", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEvaluationItemSchema.parse(req.body);
      const item = await storage.createEvaluationItem(validatedData);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create evaluation item" });
    }
  });

  app.post("/api/evaluation-items/bulk", requireAuth, async (req, res) => {
    try {
      const { items } = req.body;
      const validatedData = z.array(insertEvaluationItemSchema).parse(items);
      const createdItems = await storage.createManyEvaluationItems(validatedData);
      res.json(createdItems);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create evaluation items" });
    }
  });

  app.put("/api/evaluation-items/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEvaluationItemSchema.partial().parse(req.body);
      const item = await storage.updateEvaluationItem(id, validatedData);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update evaluation item" });
    }
  });

  app.delete("/api/evaluation-items/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEvaluationItem(id);
      res.json({ message: "Evaluation item deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete evaluation item" });
    }
  });

  // ===== EVALUATION ROUTES =====
  app.get("/api/evaluations/my", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const evaluations = await storage.getEvaluationsByEvaluator(evaluatorId);
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluations" });
    }
  });

  app.post("/api/evaluations", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const validatedData = insertEvaluationSchema.parse({ ...req.body, evaluatorId });
      const evaluation = await storage.saveEvaluation(validatedData);
      res.json(evaluation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save evaluation" });
    }
  });

  app.post("/api/evaluations/submit/:candidateId", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const candidateId = parseInt(req.params.candidateId);
      const submission = await storage.submitEvaluation(evaluatorId, candidateId);
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit evaluation" });
    }
  });

  // 평가위원 전용 후보자 조회 API (평가 상태 포함)
  app.get("/api/evaluator/candidates", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const candidates = await storage.getActiveCandidates();
      
      // 각 후보자의 평가 상태 확인 (새로운 시스템 사용)
      const candidatesWithStatus = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const evaluationStatus = await storage.getEvaluationStatusNew(evaluatorId, candidate.id);
            return {
              ...candidate,
              evaluationStatus: evaluationStatus || { isCompleted: false, hasTemporarySave: false, totalScore: 0 }
            };
          } catch (error) {
            return {
              ...candidate,
              evaluationStatus: { isCompleted: false, hasTemporarySave: false, totalScore: 0 }
            };
          }
        })
      );
      
      res.json(candidatesWithStatus);
    } catch (error) {
      console.error('평가자 후보자 목록 조회 오류:', error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  // 평가위원 전용 카테고리 조회 API
  app.get("/api/evaluator/categories", requireEvaluatorAuth, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // 🔧 수정: 평가위원 전용 평가 항목 조회 API (실시간 업데이트 지원)
  app.get("/api/evaluator/evaluation-items", requireEvaluatorAuth, async (req, res) => {
    try {
      const items = await storage.getAllEvaluationItems();
      
      // 🔧 개선: 더 자세한 정보 포함
      const itemsWithCode = items.map(item => ({
        ...item,
        itemCode: item.code,
        itemName: item.name,
        type: item.isQuantitative ? '정량' : '정성',
        hasPresetScores: item.hasPresetScores || false,
        category: {
          id: item.categoryId,
          categoryName: item.categoryName || '',
          categoryCode: item.categoryId.toString() || ''
        }
      }));
      
      // 🔧 개선: 캐시 방지 헤더 추가
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      console.log(`📋 평가자 ${req.session.evaluator.name}에게 평가 항목 ${items.length}개 전송`);
      res.json(itemsWithCode);
    } catch (error: any) {
      console.error('❌ 평가 항목 조회 실패:', error);
      res.status(500).json({ message: "Failed to fetch evaluation items" });
    }
  });

  // 평가위원 점수 저장 API (code 기반)
  app.post("/api/evaluator/scores", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const { candidateId, itemId, itemCode, score, comments } = req.body;
      
      console.log('💾 점수 저장 요청:', { evaluatorId, candidateId, itemId, itemCode, score });
      
      // itemCode가 있으면 code로 평가항목 찾기, 없으면 itemId 사용
      let targetItemId = itemId;
      if (itemCode) {
        const items = await storage.getAllEvaluationItems();
        const targetItem = items.find(item => item.code === itemCode);
        if (targetItem) {
          targetItemId = targetItem.id;
        }
      }
      
      // 점수 저장 (새로운 시스템 사용)
      const result = await storage.saveTemporaryEvaluationNew({
        evaluatorId,
        candidateId,
        scores: { [targetItemId]: score },
        totalScore: score,
        isCompleted: false
      });
      
      console.log('✅ 점수 저장 성공:', result);
      res.json({ 
        message: "점수가 저장되었습니다.", 
        result,
        itemCode, // code 필드 반환
        itemId: targetItemId
      });
    } catch (error) {
      console.error('❌ 점수 저장 오류:', error);
      res.status(500).json({ message: "점수 저장 중 오류가 발생했습니다." });
    }
  });

  // 평가위원 점수 조회 API (code 기반)
  app.get("/api/evaluator/scores/:candidateId", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const candidateId = parseInt(req.params.candidateId);
      
      console.log('📖 점수 조회 요청:', { evaluatorId, candidateId });
      
      // 평가항목 정보와 함께 점수 조회 (새로운 시스템 사용)
      const items = await storage.getAllEvaluationItems();
      const evaluationData = await storage.getEvaluationStatusNew(evaluatorId, candidateId);
      
      // code 필드를 포함한 점수 데이터 구성
      const scoresWithCode = items.map(item => {
        const score = evaluationData.scores?.[item.id] || 0;
        return {
          itemId: item.id,
          itemCode: item.code, // 템플릿과 매핑을 위한 필드
          score: score,
          comments: evaluationData.comments?.[item.id] || "",
          type: item.isQuantitative ? '정량' : '정성',
          maxScore: item.maxScore,
          weight: item.weight
        };
      });
      
      res.json(scoresWithCode);
    } catch (error) {
      console.error('❌ 점수 조회 오류:', error);
      res.status(500).json({ message: "점수 조회 중 오류가 발생했습니다." });
    }
  });

  // 평가위원 임시저장 API
  app.post("/api/evaluator/evaluation/save-temporary", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const { candidateId, scores, totalScore } = req.body;
      
      console.log('📝 임시저장 요청:', { evaluatorId, candidateId, scores, totalScore });
      
      // 새로운 시스템에 임시저장 데이터 저장
      const result = await storage.saveTemporaryEvaluationNew({
        evaluatorId,
        candidateId,
        scores,
        totalScore,
        isCompleted: false
      });
      
      console.log('✅ 임시저장 성공:', result);
      res.json({ message: "임시저장이 완료되었습니다.", result });
    } catch (error) {
      console.error('❌ 임시저장 오류:', error);
      res.status(500).json({ message: "임시저장 중 오류가 발생했습니다." });
    }
  });

  // 평가위원 평가완료 API
  app.post("/api/evaluator/evaluation/complete", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const { candidateId, scores, totalScore } = req.body;
      
      console.log('🎯 평가완료 요청:', { evaluatorId, candidateId, scores, totalScore });
      
      // 새로운 시스템에 평가완료 데이터 저장
      const result = await storage.saveTemporaryEvaluationNew({
        evaluatorId,
        candidateId,
        scores,
        totalScore,
        isCompleted: true
      });
      
      console.log('✅ 평가완료 성공:', result);
      res.json({ message: "평가가 완료되었습니다.", result });
    } catch (error) {
      console.error('❌ 평가완료 오류:', error);
      res.status(500).json({ message: "평가완료 중 오류가 발생했습니다." });
    }
  });

  // 🎯 평가위원 평가 데이터 조회 API (새 시스템 사용)
  app.get("/api/evaluator/evaluation/:candidateId", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const candidateId = parseInt(req.params.candidateId);
      
      console.log('📖 새 시스템으로 평가 데이터 조회:', { evaluatorId, candidateId });
      
      // 🎯 새 시스템 사용 (기존 인터페이스 유지)
      const result = await storage.getEvaluationStatusNew(evaluatorId, candidateId);
      
      console.log('✅ 새 시스템 평가 데이터 조회 성공:', result);
      res.json(result);
    } catch (error) {
      console.error('❌ 새 시스템 평가 데이터 조회 실패:', error);
      res.status(500).json({ message: "평가 데이터 조회 중 오류가 발생했습니다." });
    }
  });

  // 🎯 평가위원 평가 저장 API (새 시스템 사용)
  app.post("/api/evaluator/evaluation", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const { candidateId, scores, totalScore, isCompleted } = req.body;

      console.log('💾 새 시스템으로 평가 저장:', { evaluatorId, candidateId, scores, totalScore, isCompleted });

      // 🎯 새 시스템 사용 (기존 인터페이스 유지)
      const result = await storage.saveTemporaryEvaluationNew({
        evaluatorId,
        candidateId,
        scores,
        totalScore,
        isCompleted
      });

      console.log('✅ 새 시스템 평가 저장 성공:', result);
      res.json(result);
    } catch (error) {
      console.error('❌ 새 시스템 평가 저장 실패:', error);
      res.status(500).json({ message: "평가 저장 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/evaluator/progress", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const progress = await storage.getEvaluatorProgress(evaluatorId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // ===== PUBLIC EVALUATOR ROUTES (for login) =====
  app.get("/api/evaluators", async (req, res) => {
    try {
      const evaluators = await storage.getActiveEvaluators();
      // 보안을 위해 민감한 정보는 제외하고 이름과 ID만 반환
      const publicEvaluators = evaluators.map(evaluator => ({
        id: evaluator.id,
        name: evaluator.name
      }));
      res.json(publicEvaluators);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluators" });
    }
  });

  // ===== RESULTS AND STATISTICS ROUTES =====
  app.get("/api/results", async (req, res) => {
    try {
      const config = await storage.getSystemConfig();
      if (config && !config.allowPublicResults) {
        return res.status(403).json({ message: "Public results are not available" });
      }
      
      const results = await storage.getEvaluationResults();
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch results" });
    }
  });

  app.get("/api/admin/results", requireAuth, async (req, res) => {
    try {
      const results = await storage.getEvaluationResults();
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch results" });
    }
  });

  // 🎯 관리자용 특정 평가위원-평가대상 평가 데이터 조회 API (평가위원도 접근 가능)
  app.get("/api/admin/evaluation/:evaluatorId/:candidateId", (req, res, next) => {
    // admin 또는 evaluator 권한 모두 허용
    if (!req.session?.user && !req.session?.evaluator) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  }, async (req, res) => {
    try {
      const evaluatorId = parseInt(req.params.evaluatorId);
      const candidateId = parseInt(req.params.candidateId);
      
      console.log('📖 관리자용 새 시스템 평가 데이터 조회:', { evaluatorId, candidateId });

      // 🎯 새 시스템 사용 (기존 인터페이스 유지)
      const result = await storage.getEvaluationStatusNew(evaluatorId, candidateId);

      console.log('✅ 관리자용 새 시스템 조회 성공:', result);
      res.json(result);
    } catch (error) {
      console.error('❌ 관리자용 새 시스템 조회 실패:', error);
      res.status(500).json({ message: "평가 데이터 조회 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/admin/statistics", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getSystemStatistics();
      console.log('📊 서버 통계 데이터:', stats);
      res.json(stats);
    } catch (error) {
      console.error('❌ 통계 API 오류:', error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // 🔧 추가: 시스템 통계 API (공개)
  app.get("/api/system/stats", async (req, res) => {
    try {
      const stats = await storage.getSystemStatistics();
      console.log('📊 시스템 통계 데이터:', stats);
      res.json(stats);
    } catch (error: any) {
      console.error('❌ 시스템 통계 API 오류:', error);
      res.status(500).json({ message: "Failed to fetch system statistics" });
    }
  });

  app.get("/api/admin/progress", requireAuth, async (req, res) => {
    try {
      const progress = await storage.getEvaluatorProgressList();
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // ===== INCOMPLETE DETAILS ROUTE =====
  app.get("/api/admin/incomplete-details", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log('🔍 미완료 상세 조회 시작');
      
      // 1. 모든 활성 평가대상 조회
      const allCandidates = await storage.getActiveCandidates();
      console.log('📊 총 평가대상 수:', allCandidates.length);
      
      // 2. 모든 활성 평가위원 조회  
      const allEvaluators = await storage.getActiveEvaluators();
      console.log('📊 총 평가위원 수:', allEvaluators.length);
      
      // 3. 각 평가대상별로 평가 상태 확인 (통계 API와 동일한 로직 사용)
      const candidateDetails: any[] = [];
      
      for (const candidate of allCandidates) {
        try {
          // evaluation_submissions 테이블에서 직접 조회 (통계 API와 동일한 방식)
          const submissions = await storage.getEvaluationSubmissionsByCandidate(candidate.id);
          
          const completedSubmissions = submissions.filter(s => s.is_completed === true);
          const inProgressSubmissions = submissions.filter(s => s.is_completed === false);
          
          // 상태 결정: 완료된 평가가 하나라도 있으면 completed, 임시저장이 있으면 inProgress, 없으면 notStarted
          let status = 'notStarted';
          if (completedSubmissions.length > 0) {
            status = 'completed';
          } else if (inProgressSubmissions.length > 0) {
            status = 'inProgress';
          }
          
                    // 진행중 평가위원과 미평가 평가위원 구분
          const completedEvaluatorIds = completedSubmissions.map(s => s.evaluator_id);
          const inProgressEvaluatorIds = inProgressSubmissions.map(s => s.evaluator_id);
          const evaluatedEvaluatorIds = [...completedEvaluatorIds, ...inProgressEvaluatorIds];
          
          // 진행중 평가위원 (평가를 시작했지만 완료하지 않은 평가위원)
          const inProgressEvaluators = allEvaluators.filter(evaluator => 
            inProgressEvaluatorIds.includes(evaluator.id)
          ).map(evaluator => ({
            id: evaluator.id,
            name: evaluator.name
          }));
          
          // 미평가 평가위원 (아무것도 하지 않은 평가위원)
          const notEvaluatedEvaluators = allEvaluators.filter(evaluator => 
            !evaluatedEvaluatorIds.includes(evaluator.id)
          ).map(evaluator => ({
            id: evaluator.id,
            name: evaluator.name
          }));

          candidateDetails.push({
            id: candidate.id,
            name: candidate.name,
            department: candidate.department || '정보 없음',
            position: candidate.position || '',
            category: candidate.category || '정보 없음',
            status: status,
            inProgressEvaluators: inProgressEvaluators,
            pendingEvaluators: notEvaluatedEvaluators
          });
          
          console.log(`📋 ${candidate.name}: ${status} (완료: ${completedSubmissions.length}, 진행중: ${inProgressSubmissions.length}, 미평가: ${notEvaluatedEvaluators.length}명)`);
        } catch (candidateError: any) {
          console.warn(`평가대상 ${candidate.name} 상태 조회 실패:`, candidateError);
          // 오류 시 기본값으로 처리
          candidateDetails.push({
            id: candidate.id,
            name: candidate.name,
            department: candidate.department || '정보 없음',
            position: candidate.position || '',
            category: candidate.category || '정보 없음',
            status: 'notStarted',
            pendingEvaluators: allEvaluators.map(evaluator => ({
              id: evaluator.id,
              name: evaluator.name
            }))
          });
        }
      }
      
      console.log('✅ 미완료 상세 조회 완료:', candidateDetails.length, '건');
      
      // 상태별 개수 로깅
      const statusCounts = {
        completed: candidateDetails.filter(c => c.status === 'completed').length,
        inProgress: candidateDetails.filter(c => c.status === 'inProgress').length,
        notStarted: candidateDetails.filter(c => c.status === 'notStarted').length
      };
      console.log('📊 상태별 개수:', statusCounts);
      
      // 미완료 건만 필터링 (완료된 건 제외)
      const incompleteCandidates = candidateDetails.filter(candidate => candidate.status !== 'completed');
      console.log('📊 실제 미완료 건수:', incompleteCandidates.length, '건');
      
      // 미완료 건의 상태별 개수 로깅
      const incompleteStatusCounts = {
        inProgress: incompleteCandidates.filter(c => c.status === 'inProgress').length,
        notStarted: incompleteCandidates.filter(c => c.status === 'notStarted').length
      };
      console.log('📊 미완료 건 상태별 개수:', incompleteStatusCounts);
      
      const result = {
        candidates: incompleteCandidates, // 완료된 건 제외
        evaluators: await Promise.all(allEvaluators.map(async evaluator => {
          // 각 평가위원별 진행률 계산
          const evaluatorSubmissions = await storage.getEvaluationSubmissionsByEvaluator(evaluator.id);
          
          const allSubmissions = evaluatorSubmissions || [];
          const completedCount = allSubmissions.filter((s: any) => s.is_completed === true).length;
          const inProgressCount = allSubmissions.filter((s: any) => s.is_completed === false).length;
          const totalCandidatesCount = allCandidates.length; // 전체 평가대상 기준
          const progress = totalCandidatesCount > 0 ? Math.round(((completedCount + inProgressCount) / totalCandidatesCount) * 100) : 0;
          
          // 이 평가위원이 평가하지 않은 미완료 평가대상들
          const evaluatedCandidateIds = allSubmissions.map((s: any) => s.candidate_id);
          const pendingCandidates = incompleteCandidates.filter(candidate => 
            !evaluatedCandidateIds.includes(candidate.id)
          ).map(candidate => ({
            id: candidate.id,
            name: candidate.name
          }));
          
          return {
            id: evaluator.id,
            name: evaluator.name,
            department: evaluator.department || '정보 없음',
            status: 'active',
            progress: progress,
            completedCount: completedCount,
            totalCount: totalCandidatesCount,
            pendingCandidates: pendingCandidates
          };
        }))
      };
      
      res.json(result);
    } catch (error: any) {
      console.error('❌ 미완료 상세 조회 실패:', error);
      res.status(500).json({ 
        message: "Failed to fetch incomplete details", 
        error: error.message 
      });
    }
  });

  // ===== CANDIDATE PRESET SCORES ROUTES =====

  // 평가대상별 사전 점수 조회
  app.get("/api/admin/candidate-preset-scores", requireAdminAuth, async (req, res) => {
    try {
      const presetScores = await storage.getAllCandidatePresetScores();
      res.json(presetScores);
    } catch (error) {
      console.error("Failed to fetch candidate preset scores:", error);
      res.status(500).json({ message: "Failed to fetch candidate preset scores" });
    }
  });

  // 평가대상별 사전 점수 등록/수정 (upsert)
  app.post("/api/admin/candidate-preset-scores", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { candidateId, evaluationItemId, itemCode, presetScore, applyPreset, notes } = req.body;
      
      if (!candidateId || (!evaluationItemId && !itemCode) || presetScore === undefined) {
        return res.status(400).json({ error: "Required fields missing" });
      }
      
      // itemCode가 있으면 code로 평가항목 찾기
      let targetItemId = evaluationItemId;
      if (itemCode && !evaluationItemId) {
        const items = await storage.getAllEvaluationItems();
        const targetItem = items.find(item => item.code === itemCode);
        if (targetItem) {
          targetItemId = targetItem.id;
        } else {
          return res.status(400).json({ error: "Invalid itemCode" });
        }
      }
      
      const result = await storage.upsertCandidatePresetScore({
        candidateId,
        evaluationItemId: targetItemId,
        presetScore,
        applyPreset: applyPreset !== undefined ? applyPreset : false,
        notes
      });
      
      // code 필드를 포함하여 반환
      const items = await storage.getAllEvaluationItems();
      const targetItem = items.find(item => item.id === targetItemId);
      const resultWithCode = {
        ...result,
        itemCode: targetItem?.code || itemCode
      };
      
      res.json(resultWithCode);
    } catch (error) {
      console.error("Upsert candidate preset score error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 평가대상별 사전 점수 삭제
  app.delete("/api/admin/candidate-preset-scores/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCandidatePresetScore(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete candidate preset score error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 사전 점수 등록/수정 (upsert) - 기존 호환성 유지
  app.post("/api/admin/preset-scores", requireAdminAuth, async (req, res) => {
    try {
      const { candidateId, itemId, score, notes } = req.body;
      const presetScore = await storage.upsertPresetScore(candidateId, itemId, score, notes);
      res.json(presetScore);
    } catch (error) {
      console.error("Failed to upsert preset score:", error);
      res.status(500).json({ message: "Failed to save preset score" });
    }
  });

  // 사전 점수 삭제
  app.delete("/api/admin/preset-scores/:id", requireAdminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePresetScore(id);
      res.json({ message: "Preset score deleted successfully" });
    } catch (error) {
      console.error("Failed to delete preset score:", error);
      res.status(500).json({ message: "Failed to delete preset score" });
    }
  });

  // 평가위원용 사전 점수 조회 (평가항목 정보와 함께)
  app.get("/api/evaluator/preset-scores/candidate/:candidateId", requireEvaluatorAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const presetScores = await storage.getPresetScoresByCandidate(candidateId);
      res.json(presetScores);
    } catch (error) {
      console.error("Failed to fetch preset scores for evaluator:", error);
      res.status(500).json({ message: "Failed to fetch preset scores" });
    }
  });

  // ===== INITIALIZATION ROUTES (for development) =====
  app.post("/api/init/admin", async (req, res) => {
    try {
      const existingAdmin = await storage.getAdminByUsername("admin");
      if (existingAdmin) {
        return res.json({ message: "Admin already exists", admin: { username: existingAdmin.username, name: existingAdmin.name } });
      }
      
      const admin = await storage.createAdmin({
        username: "admin",
        password: "admin",
        name: "시스템 관리자"
      });
      
      res.json({ message: "Admin created successfully", admin: { username: admin.username, name: admin.name } });
    } catch (error) {
      console.error("Failed to create admin:", error);
      res.status(500).json({ message: "Failed to create admin", error: String(error) });
    }
  });

  // ===== EVALUATION TEMPLATES ROUTES =====
  
  // Get all evaluation templates
  app.get("/api/admin/templates", requireAdminAuth, async (req, res) => {
    try {
      const templates = await storage.getEvaluationTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Failed to fetch evaluation templates:", error);
      res.status(500).json({ message: "Failed to fetch evaluation templates", error: String(error) });
    }
  });

  // Get default evaluation template
  app.get("/api/admin/templates/default", requireAdminAuth, async (req, res) => {
    try {
      const template = await storage.getDefaultEvaluationTemplate();
      if (!template) {
        return res.status(404).json({ message: "No default template found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Failed to fetch default evaluation template:", error);
      res.status(500).json({ message: "Failed to fetch default evaluation template", error: String(error) });
    }
  });

  // Create evaluation template
  app.post("/api/admin/templates", requireAdminAuth, async (req, res) => {
    try {
      const validation = insertEvaluationTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid template data", errors: validation.error.errors });
      }

      const template = await storage.createEvaluationTemplate(validation.data);
      res.json(template);
    } catch (error) {
      console.error("Failed to create evaluation template:", error);
      res.status(500).json({ message: "Failed to create evaluation template", error: String(error) });
    }
  });

  // Update evaluation template
  app.put("/api/admin/templates/:id", requireAdminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertEvaluationTemplateSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid template data", errors: validation.error.errors });
      }

      const template = await storage.updateEvaluationTemplate(id, validation.data);
      res.json(template);
    } catch (error) {
      console.error("Failed to update evaluation template:", error);
      res.status(500).json({ message: "Failed to update evaluation template", error: String(error) });
    }
  });

  // Delete evaluation template
  app.delete("/api/admin/templates/:id", requireAdminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEvaluationTemplate(id);
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Failed to delete evaluation template:", error);
      res.status(500).json({ message: "Failed to delete evaluation template", error: String(error) });
    }
  });

  // ===== 사전 점수 관리 API =====
  
  // 모든 평가대상별 사전 점수 조회
  app.get("/api/admin/candidate-preset-scores", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const presetScores = await storage.getAllCandidatePresetScores();
      // code 필드를 포함하여 반환
      const items = await storage.getAllEvaluationItems();
      const presetScoresWithCode = presetScores.map((ps: any) => {
        const targetItem = items.find(item => item.id === ps.evaluation_item_id);
        return {
          ...ps,
          itemCode: targetItem?.code || ps.item_code
        };
      });
      res.json(presetScoresWithCode);
    } catch (error) {
      console.error("Get candidate preset scores error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.post("/api/admin/candidate-preset-scores", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { candidateId, evaluationItemId, itemCode, presetScore, applyPreset, notes } = req.body;
      
      if (!candidateId || (!evaluationItemId && !itemCode) || presetScore === undefined) {
        return res.status(400).json({ error: "Required fields missing" });
      }
      
      // itemCode가 있으면 code로 평가항목 찾기
      let targetItemId = evaluationItemId;
      if (itemCode && !evaluationItemId) {
        const items = await storage.getAllEvaluationItems();
        const targetItem = items.find(item => item.code === itemCode);
        if (targetItem) {
          targetItemId = targetItem.id;
        } else {
          return res.status(400).json({ error: "Invalid itemCode" });
        }
      }
      
      const result = await storage.upsertCandidatePresetScore({
        candidateId,
        evaluationItemId: targetItemId,
        presetScore,
        applyPreset: applyPreset !== undefined ? applyPreset : false,
        notes
      });
      
      // code 필드를 포함하여 반환
      const items = await storage.getAllEvaluationItems();
      const targetItem = items.find(item => item.id === targetItemId);
      const resultWithCode = {
        ...result,
        itemCode: targetItem?.code || itemCode
      };
      
      res.json(resultWithCode);
    } catch (error) {
      console.error("Upsert candidate preset score error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 평가대상별 사전 점수 삭제
  app.delete("/api/admin/candidate-preset-scores/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCandidatePresetScore(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete candidate preset score error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Clear all evaluation data (for testing purposes)
  app.post("/api/admin/clear-evaluation-data", requireAdminAuth, async (req, res) => {
    try {
      await storage.clearAllEvaluationData();
      res.json({ message: "All evaluation data cleared successfully" });
    } catch (error) {
      console.error("Failed to clear evaluation data:", error);
      res.status(500).json({ message: "Failed to clear evaluation data", error: String(error) });
    }
  });

  // ===== 데이터 정리 및 마이그레이션 API =====
  
  // 중복 평가 데이터 정리 API
  app.post("/api/admin/cleanup-duplicates", requireAuth, async (req, res) => {
    try {
      console.log('🧹 중복 데이터 정리 요청 받음');
      await storage.cleanupDuplicateEvaluations();
      res.json({ message: "중복 데이터 정리가 완료되었습니다." });
    } catch (error) {
      console.error('❌ 중복 데이터 정리 실패:', error);
      res.status(500).json({ message: "중복 데이터 정리 중 오류가 발생했습니다." });
    }
  });

  // 기존 평가 데이터 마이그레이션 API
  app.post("/api/admin/migrate-old-data", requireAuth, async (req, res) => {
    try {
      console.log('🔄 기존 데이터 마이그레이션 요청 받음');
      await storage.migrateOldEvaluations();
      res.json({ message: "기존 데이터 마이그레이션이 완료되었습니다." });
    } catch (error) {
      console.error('❌ 기존 데이터 마이그레이션 실패:', error);
      res.status(500).json({ message: "기존 데이터 마이그레이션 중 오류가 발생했습니다." });
    }
  });

  // 전체 데이터 정리 (중복 제거 + 마이그레이션) API
  app.post("/api/admin/full-data-cleanup", requireAuth, async (req, res) => {
    try {
      console.log('🔧 전체 데이터 정리 요청 받음');
      
      // 1. 기존 데이터 마이그레이션
      console.log('1️⃣ 기존 데이터 마이그레이션 시작...');
      await storage.migrateOldEvaluations();
      
      // 2. 중복 데이터 정리
      console.log('2️⃣ 중복 데이터 정리 시작...');
      await storage.cleanupDuplicateEvaluations();
      
      console.log('✅ 전체 데이터 정리 완료');
      res.json({ 
        message: "전체 데이터 정리가 완료되었습니다. (기존 데이터 마이그레이션 + 중복 제거)",
        steps: [
          "기존 evaluations 테이블 데이터 마이그레이션",
          "evaluation_sessions 테이블 중복 데이터 제거"
        ]
      });
    } catch (error) {
      console.error('❌ 전체 데이터 정리 실패:', error);
      res.status(500).json({ message: "전체 데이터 정리 중 오류가 발생했습니다." });
    }
  });

  // 🔧 추가: 평가위원 전용 평가 데이터 조회 API
  app.get("/api/evaluator/evaluation/:candidateId", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const candidateId = parseInt(req.params.candidateId);
      
      console.log('📖 평가위원 전용 평가 데이터 조회:', { evaluatorId, candidateId });

      // 새 시스템 사용
      const result = await storage.getEvaluationStatusNew(evaluatorId, candidateId);

      console.log('✅ 평가위원 전용 조회 성공:', result);
      res.json(result);
    } catch (error) {
      console.error('❌ 평가위원 전용 조회 실패:', error);
      res.status(500).json({ message: "평가 데이터 조회 중 오류가 발생했습니다." });
    }
  });

  // 🔧 추가: 평가위원 전용 카테고리 조회 API
  app.get("/api/evaluator/categories", requireEvaluatorAuth, async (req, res) => {
    try {
      const categories = await storage.getActiveCategories();
      console.log('📋 평가위원 전용 카테고리 조회 성공:', categories.length, '개');
      res.json(categories);
    } catch (error: any) {
      console.error('❌ 평가위원 전용 카테고리 조회 실패:', error);
      res.status(500).json({ message: "카테고리 조회 중 오류가 발생했습니다." });
    }
  });

  // 🔧 추가: 평가위원 전용 평가 항목 조회 API  
  app.get("/api/evaluator/evaluation-items", requireEvaluatorAuth, async (req, res) => {
    try {
      const items = await storage.getAllEvaluationItems();
      
      // 평가위원에게 필요한 정보만 포함
      const itemsWithCode = items.map(item => ({
        ...item,
        itemCode: item.code,
        itemName: item.name,
        type: item.isQuantitative ? '정량' : '정성',
        hasPresetScores: item.hasPresetScores || false,
        category: {
          id: item.categoryId,
          categoryName: item.categoryName || '',
        }
      }));
      
      console.log('📋 평가위원 전용 평가 항목 조회 성공:', itemsWithCode.length, '개');
      
      // 캐시 방지 헤더 추가
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(itemsWithCode);
    } catch (error: any) {
      console.error('❌ 평가위원 전용 평가 항목 조회 실패:', error);
      res.status(500).json({ message: "평가 항목 조회 중 오류가 발생했습니다." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
