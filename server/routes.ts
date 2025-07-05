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
      const validatedData = insertSystemConfigSchema.partial().parse(req.body);
      console.log("Validated data:", validatedData);
      const config = await storage.updateSystemConfig(validatedData);
      console.log("Updated config:", config);
      res.json(config);
    } catch (error) {
      console.error("System config update error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
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
      const validatedData = insertEvaluationCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create category" });
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

  app.get("/api/evaluations/progress", requireEvaluatorAuth, async (req, res) => {
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
      res.json(stats);
    } catch (error) {
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

  // Data migration endpoint
  app.post("/api/admin/migrate-data", async (req, res) => {
    try {
      // Force switch to database storage for migration
      console.log("Starting data migration to Supabase...");
      
      // Create the database connection with proper SSL settings
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });
      
      const dbConnection = drizzle(pool);
      
      // Read data from file
      const dataPath = path.join(process.cwd(), 'data.json');
      
      if (!fs.existsSync(dataPath)) {
        return res.status(404).json({ message: "No data file found to migrate" });
      }
      
      const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      
      // Clear existing data (optional)
      await dbConnection.delete(evaluationSubmissions);
      await dbConnection.delete(evaluations);
      await dbConnection.delete(evaluationItems);
      await dbConnection.delete(evaluationCategories);
      await dbConnection.delete(candidates);
      await dbConnection.delete(evaluators);
      await dbConnection.delete(systemConfig);
      await dbConnection.delete(admins);
      
      // Migrate data
      let migrated = {
        admins: 0,
        systemConfig: 0,
        evaluators: 0,
        categories: 0,
        items: 0,
        candidates: 0,
        evaluations: 0,
        submissions: 0
      };
      
      // Migrate admins
      if (fileData.admins && fileData.admins.length > 0) {
        for (const admin of fileData.admins) {
          await dbConnection.insert(admins).values({
            username: admin.username,
            password: admin.password,
            name: admin.name,
            isActive: admin.isActive || true
          });
          migrated.admins++;
        }
      }
      
      // Migrate system config
      if (fileData.systemConfig) {
        await dbConnection.insert(systemConfig).values({
          evaluationTitle: fileData.systemConfig.evaluationTitle || "종합평가시스템",
          systemName: fileData.systemConfig.systemName,
          description: fileData.systemConfig.description,
          adminEmail: fileData.systemConfig.adminEmail,
          maxEvaluators: fileData.systemConfig.maxEvaluators,
          maxCandidates: fileData.systemConfig.maxCandidates,
          evaluationDeadline: fileData.systemConfig.evaluationDeadline ? new Date(fileData.systemConfig.evaluationDeadline) : null,
          allowPartialSubmission: fileData.systemConfig.allowPartialSubmission || false,
          enableNotifications: fileData.systemConfig.enableNotifications !== false,
          isEvaluationActive: fileData.systemConfig.isEvaluationActive || false,
          allowPublicResults: fileData.systemConfig.allowPublicResults || false
        });
        migrated.systemConfig++;
      }
      
      // Migrate evaluators
      if (fileData.evaluators && fileData.evaluators.length > 0) {
        for (const evaluator of fileData.evaluators) {
          await dbConnection.insert(evaluators).values({
            name: evaluator.name,
            password: evaluator.password,
            department: evaluator.department || "",
            email: evaluator.email,
            sortOrder: evaluator.sortOrder || 0,
            isActive: evaluator.isActive !== false
          });
          migrated.evaluators++;
        }
      }
      
      // Migrate categories
      if (fileData.evaluationCategories && fileData.evaluationCategories.length > 0) {
        for (const category of fileData.evaluationCategories) {
          await dbConnection.insert(evaluationCategories).values({
            name: category.name,
            description: category.description,
            sortOrder: category.sortOrder || 0,
            isActive: category.isActive !== false
          });
          migrated.categories++;
        }
      }
      
      // Migrate evaluation items
      if (fileData.evaluationItems && fileData.evaluationItems.length > 0) {
        for (const item of fileData.evaluationItems) {
          await dbConnection.insert(evaluationItems).values({
            categoryId: item.categoryId,
            name: item.name,
            description: item.description,
            type: item.type || "score",
            maxScore: item.maxScore || 100,
            sortOrder: item.sortOrder || 0,
            isActive: item.isActive !== false
          });
          migrated.items++;
        }
      }
      
      // Migrate candidates
      if (fileData.candidates && fileData.candidates.length > 0) {
        for (const candidate of fileData.candidates) {
          await dbConnection.insert(candidates).values({
            name: candidate.name,
            department: candidate.department || "",
            position: candidate.position || "",
            email: candidate.email,
            phone: candidate.phone,
            sortOrder: candidate.sortOrder || 0,
            isActive: candidate.isActive !== false
          });
          migrated.candidates++;
        }
      }
      
      // Migrate evaluations
      if (fileData.evaluations && fileData.evaluations.length > 0) {
        for (const evaluation of fileData.evaluations) {
          await dbConnection.insert(evaluations).values({
            evaluatorId: evaluation.evaluatorId,
            candidateId: evaluation.candidateId,
            itemId: evaluation.itemId,
            score: evaluation.score || "0",
            comment: evaluation.comment || evaluation.comments,
            isSubmitted: evaluation.isSubmitted || false,
            submittedAt: evaluation.submittedAt ? new Date(evaluation.submittedAt) : null
          });
          migrated.evaluations++;
        }
      }
      
      // Migrate evaluation submissions
      if (fileData.evaluationSubmissions && fileData.evaluationSubmissions.length > 0) {
        for (const submission of fileData.evaluationSubmissions) {
          await dbConnection.insert(evaluationSubmissions).values({
            evaluatorId: submission.evaluatorId,
            candidateId: submission.candidateId,
            submittedAt: submission.submittedAt ? new Date(submission.submittedAt) : new Date(),
            isCompleted: submission.isCompleted !== false
          });
          migrated.submissions++;
        }
      }
      
      await pool.end();
      
      console.log("Data migration completed successfully:", migrated);
      res.json({ 
        message: "Data migration completed successfully", 
        migrated 
      });
      
    } catch (error) {
      console.error("Data migration failed:", error);
      res.status(500).json({ 
        message: "Data migration failed", 
        error: String(error) 
      });
    }
  });

  // Export data as SQL for manual migration to Supabase
  app.get('/api/admin/export-sql', requireAuth, async (req, res) => {
    try {
      const dataPath = path.join(process.cwd(), 'data.json');
      
      if (!fs.existsSync(dataPath)) {
        return res.status(404).json({ message: "No data file found to export" });
      }
      
      const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      let sqlStatements = [];
      
      // Clean up existing data
      sqlStatements.push('-- Data Migration SQL for Supabase');
      sqlStatements.push('-- Execute this in Supabase SQL Editor');
      sqlStatements.push('');
      sqlStatements.push('-- Clean up existing data');
      sqlStatements.push('DELETE FROM evaluation_submissions;');
      sqlStatements.push('DELETE FROM evaluations;');
      sqlStatements.push('DELETE FROM evaluation_items;');
      sqlStatements.push('DELETE FROM evaluation_categories;');
      sqlStatements.push('DELETE FROM candidates;');
      sqlStatements.push('DELETE FROM evaluators;');
      sqlStatements.push('UPDATE system_config SET evaluation_title = \'종합평가시스템\', is_evaluation_active = false WHERE id = 1;');
      sqlStatements.push('');
      
      // Insert evaluators
      if (fileData.evaluators && fileData.evaluators.length > 0) {
        sqlStatements.push('-- Insert evaluators');
        for (const evaluator of fileData.evaluators) {
          const name = evaluator.name.replace(/'/g, "''");
          const dept = (evaluator.department || '').replace(/'/g, "''");
          const email = evaluator.email ? `'${evaluator.email.replace(/'/g, "''")}'` : 'NULL';
          sqlStatements.push(`INSERT INTO evaluators (name, password, department, email, is_active) VALUES ('${name}', '${evaluator.password}', '${dept}', ${email}, ${evaluator.isActive !== false});`);
        }
        sqlStatements.push('');
      }
      
      // Insert categories
      if (fileData.evaluationCategories && fileData.evaluationCategories.length > 0) {
        sqlStatements.push('-- Insert evaluation categories');
        for (const category of fileData.evaluationCategories) {
          const name = category.name.replace(/'/g, "''");
          const code = (category.code || 'CAT' + category.id).replace(/'/g, "''");
          const desc = category.description ? `'${category.description.replace(/'/g, "''")}'` : 'NULL';
          sqlStatements.push(`INSERT INTO evaluation_categories (id, category_code, category_name, description, sort_order, is_active) VALUES (${category.id}, '${code}', '${name}', ${desc}, ${category.sortOrder || 0}, ${category.isActive !== false});`);
        }
        sqlStatements.push('');
      }
      
      // Insert evaluation items
      if (fileData.evaluationItems && fileData.evaluationItems.length > 0) {
        sqlStatements.push('-- Insert evaluation items');
        for (const item of fileData.evaluationItems) {
          const name = item.name.replace(/'/g, "''");
          const code = (item.code || 'ITEM' + item.id).replace(/'/g, "''");
          const desc = item.description ? `'${item.description.replace(/'/g, "''")}'` : 'NULL';
          sqlStatements.push(`INSERT INTO evaluation_items (id, category_id, item_code, item_name, description, max_score, weight, sort_order, is_active) VALUES (${item.id}, ${item.categoryId}, '${code}', '${name}', ${desc}, ${item.maxScore || 10}, ${item.weight || 1.0}, ${item.sortOrder || 0}, ${item.isActive !== false});`);
        }
        sqlStatements.push('');
      }
      
      // Insert candidates  
      if (fileData.candidates && fileData.candidates.length > 0) {
        sqlStatements.push('-- Insert candidates');
        for (const candidate of fileData.candidates) {
          const name = candidate.name.replace(/'/g, "''");
          const dept = candidate.department.replace(/'/g, "''");
          const pos = candidate.position.replace(/'/g, "''");
          const cat = (candidate.category || '').replace(/'/g, "''");
          const desc = (candidate.description || '').replace(/'/g, "''");
          sqlStatements.push(`INSERT INTO candidates (id, name, department, position, category, description, sort_order, is_active) VALUES (${candidate.id}, '${name}', '${dept}', '${pos}', '${cat}', '${desc}', ${candidate.sortOrder || 0}, ${candidate.isActive !== false});`);
        }
        sqlStatements.push('');
      }
      
      // Insert evaluations
      if (fileData.evaluations && fileData.evaluations.length > 0) {
        sqlStatements.push('-- Insert evaluations');
        for (const evaluation of fileData.evaluations) {
          const score = parseInt(evaluation.score) || 0;
          const maxScore = evaluation.maxScore || 10;
          const comments = evaluation.comment ? `'${evaluation.comment.replace(/'/g, "''")}'` : 'NULL';
          sqlStatements.push(`INSERT INTO evaluations (evaluator_id, candidate_id, item_id, score, max_score, comments, is_final) VALUES (${evaluation.evaluatorId}, ${evaluation.candidateId}, ${evaluation.itemId}, ${score}, ${maxScore}, ${comments}, ${evaluation.isSubmitted || false});`);
        }
        sqlStatements.push('');
      }
      
      // Insert submissions
      if (fileData.evaluationSubmissions && fileData.evaluationSubmissions.length > 0) {
        sqlStatements.push('-- Insert evaluation submissions');
        for (const submission of fileData.evaluationSubmissions) {
          sqlStatements.push(`INSERT INTO evaluation_submissions (evaluator_id, candidate_id, submitted_at) VALUES (${submission.evaluatorId}, ${submission.candidateId}, NOW());`);
        }
        sqlStatements.push('');
      }
      
      sqlStatements.push('-- Migration completed');
      const sqlContent = sqlStatements.join('\n');
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="supabase_migration.sql"');
      res.send(sqlContent);
    } catch (error) {
      console.error("SQL export error:", error);
      res.status(500).json({ 
        message: "SQL export failed", 
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
