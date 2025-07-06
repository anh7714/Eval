import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage-supabase-api";
import { insertAdminSchema, insertEvaluatorSchema, insertCandidateSchema, insertEvaluationCategorySchema, insertEvaluationItemSchema, insertEvaluationSchema, insertSystemConfigSchema, insertCategoryOptionSchema } from "@shared/schema";
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
function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Auth middleware for evaluator routes
function requireEvaluatorAuth(req: any, res: any, next: any) {
  if (!req.session?.evaluator) {
    return res.status(401).json({ message: "Evaluator authentication required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize default admin if not exists
  try {
    console.log("Checking for existing admin...");
    const existingAdmin = await storage.getAdminByUsername("admin");
    console.log("Existing admin check result:", existingAdmin);
    
    if (!existingAdmin) {
      console.log("Creating default admin account...");
      const newAdmin = await storage.createAdmin({
        username: "admin",
        password: "admin123",
        name: "시스템 관리자"
      });
      console.log("Default admin account created:", newAdmin);
    } else {
      console.log("Admin account already exists:", existingAdmin.username);
    }
  } catch (error) {
    console.log("Admin initialization error:", error);
  }

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
      res.status(500).json({ message: "Failed to update system config", error: error.message });
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
    } catch (error) {
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
      
      // 각 후보자의 평가 상태 확인
      const candidatesWithStatus = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const evaluationStatus = await storage.getEvaluationStatus(evaluatorId, candidate.id);
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

  // 평가위원 전용 평가 항목 조회 API
  app.get("/api/evaluator/evaluation-items", requireEvaluatorAuth, async (req, res) => {
    try {
      const items = await storage.getAllEvaluationItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluation items" });
    }
  });

  // 평가위원 임시저장 API
  app.post("/api/evaluator/evaluation/save-temporary", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const { candidateId, scores, totalScore } = req.body;
      
      console.log('📝 임시저장 요청:', { evaluatorId, candidateId, scores, totalScore });
      
      // Supabase에 임시저장 데이터 저장
      const result = await storage.saveTemporaryEvaluation({
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
      
      // Supabase에 평가완료 데이터 저장
      const result = await storage.completeEvaluation({
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

  // 기존 평가 데이터 조회 API
  app.get("/api/evaluator/evaluation/:candidateId", requireEvaluatorAuth, async (req, res) => {
    try {
      const evaluatorId = req.session.evaluator.id;
      const candidateId = parseInt(req.params.candidateId);
      
      console.log('📖 기존 평가 데이터 조회:', { evaluatorId, candidateId });
      
      const evaluationData = await storage.getEvaluationStatus(evaluatorId, candidateId);
      res.json(evaluationData);
    } catch (error) {
      console.error('❌ 기존 평가 데이터 조회 오류:', error);
      res.status(500).json({ message: "기존 평가 데이터 조회 중 오류가 발생했습니다." });
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
      // 전체 후보자
      const candidates = await storage.getAllCandidates();
      // 전체 평가위원
      const evaluators = await storage.getActiveEvaluators();
      // Supabase 클라이언트 직접 import
      const supabase: SupabaseClient = require('../shared/supabase').supabase;
      // 전체 평가 제출 현황
      const { data: submissions, error: submissionsError } = await supabase
        .from('evaluation_submissions')
        .select('candidateId, evaluatorId');
      if (submissionsError) throw submissionsError;
      // 후보자별 미평가 평가위원 목록 생성
      const candidateSubmissionMap: { [key: number]: Set<number> } = {};
      (submissions as any[]).forEach((s: any) => {
        if (!candidateSubmissionMap[s.candidateId]) candidateSubmissionMap[s.candidateId] = new Set();
        candidateSubmissionMap[s.candidateId].add(s.evaluatorId);
      });
      const result = candidates.map((c: any) => {
        const submittedSet = candidateSubmissionMap[c.id] || new Set();
        const notEvaluated = evaluators.filter((e: any) => !submittedSet.has(e.id));
        return {
          candidateName: c.name,
          notEvaluatedEvaluators: notEvaluated.map((e: any) => e.name)
        };
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch incomplete details", error: error.message });
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

  const httpServer = createServer(app);
  return httpServer;
}
