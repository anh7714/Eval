import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, asc, desc, count, sum, avg, sql } from 'drizzle-orm';
import {
  SystemConfig,
  Admin,
  Evaluator,
  EvaluationCategory,
  EvaluationItem,
  Candidate,
  Evaluation,
  EvaluationSubmission,
  InsertSystemConfig,
  InsertAdmin,
  InsertEvaluator,
  InsertEvaluationCategory,
  InsertEvaluationItem,
  InsertCandidate,
  InsertEvaluation,
  InsertEvaluationSubmission,
  systemConfig,
  admins,
  evaluators,
  evaluationCategories,
  evaluationItems,
  candidates,
  evaluations,
  evaluationSubmissions,
} from '../shared/schema';
import * as fs from 'fs';
import * as path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data.json');

interface MemoryStore {
  systemConfig: SystemConfig | null;
  admins: Admin[];
  evaluators: Evaluator[];
  evaluationCategories: EvaluationCategory[];
  evaluationItems: EvaluationItem[];
  candidates: Candidate[];
  evaluations: Evaluation[];
  evaluationSubmissions: EvaluationSubmission[];
  nextId: number;
}

const memoryStore: MemoryStore = {
  systemConfig: null,
  admins: [],
  evaluators: [],
  evaluationCategories: [],
  evaluationItems: [],
  candidates: [],
  evaluations: [],
  evaluationSubmissions: [],
  nextId: 1,
};

let db: ReturnType<typeof drizzle>;
// System is now Supabase-only - no memory storage fallback

// Supabase-only storage system - no file-based fallback

// Database connection initialization
async function initializeDatabase() {
  try {
    if (process.env.DATABASE_URL) {
      console.log("Attempting to connect to Supabase database...");
      console.log("DATABASE_URL format:", process.env.DATABASE_URL.slice(0, 50) + "...");
      
      // Parse URL to check if it's using pooler
      const dbUrl = new URL(process.env.DATABASE_URL);
      console.log("Database host:", dbUrl.hostname);
      console.log("Database port:", dbUrl.port);
      
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        },
        // Connection options optimized for Supabase
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: false
      });
      
      // Test the connection with timeout
      console.log("Testing database connection...");
      const testClient = await pool.connect();
      const result = await testClient.query('SELECT NOW() as current_time');
      console.log("Connection test successful:", result.rows[0]);
      testClient.release();
      
      db = drizzle(pool);
      useMemoryStorage = false;
      console.log("✅ Successfully connected to Supabase database");
      
      // Initialize database schema if needed
      await initializeSchema();
    } else {
      throw new Error("DATABASE_URL not provided");
    }
  } catch (error) {
    console.log("❌ Initial Supabase connection failed:", error.message);
    console.log("Attempting alternative Supabase connection method...");
    
    try {
      // Try direct connection without pooler for Replit environment
      const directUrl = process.env.DATABASE_URL?.replace('pooler.', '').replace(':6543', ':5432');
      console.log("Trying direct connection to:", directUrl?.slice(0, 50) + "...");
      
      const pool = new Pool({
        connectionString: directUrl,
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
      });
      
      const testClient = await pool.connect();
      await testClient.query('SELECT 1');
      testClient.release();
      
      db = drizzle(pool);
      console.log("✅ Successfully connected to Supabase database (direct connection)");
      await initializeSchema();
      
    } catch (directError) {
      console.log("❌ Direct connection also failed:", directError.message);
      console.log("🔄 System configured for Supabase only - connection required");
      
      // Force exit instead of fallback to ensure Supabase requirement
      console.log("Please verify Supabase DATABASE_URL and try again");
      process.exit(1);
    }
  }
}

// Initialize database schema
async function initializeSchema() {
  if (!db) return;
  
  try {
    // Create admin if not exists
    const existingAdmin = await db.select().from(admins).limit(1);
    if (existingAdmin.length === 0) {
      await db.insert(admins).values({
        username: 'admin',
        password: 'admin123',
        name: '시스템 관리자',
        isActive: true
      });
      console.log("Default admin account created");
    }
    
    // Create system config if not exists
    const existingConfig = await db.select().from(systemConfig).limit(1);
    if (existingConfig.length === 0) {
      await db.insert(systemConfig).values({
        evaluationTitle: "종합평가시스템",
        isEvaluationActive: false
      });
      console.log("Default system config created");
    }
  } catch (error) {
    console.log("Schema initialization failed:", error);
  }
}

// Initialize database connection
(async () => {
  await initializeDatabase();
  
  // Only initialize memory storage if we're using file-based storage
  if (useMemoryStorage) {
    // Initialize with default admin if no data exists
    if (memoryStore.admins.length === 0) {
      memoryStore.admins.push({
        id: 1,
        username: 'admin',
        password: 'admin123',
        name: '시스템 관리자',
        createdAt: new Date(),
        isActive: true
      });
      memoryStore.nextId = 2;
    }

    // Initialize system config if it doesn't exist
    if (!memoryStore.systemConfig) {
      memoryStore.systemConfig = {
        id: 1,
        evaluationTitle: "종합평가시스템",
        systemName: null,
        description: null,
        adminEmail: null,
        maxEvaluators: null,
        maxCandidates: null,
        evaluationDeadline: null,
        allowPartialSubmission: false,
        enableNotifications: true,
        isEvaluationActive: false,
        allowPublicResults: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    saveDataToFile();
  }
})();

export interface IStorage {
  // System Config
  getSystemConfig(): Promise<SystemConfig | undefined>;
  updateSystemConfig(config: Partial<InsertSystemConfig>): Promise<SystemConfig>;

  // Admin Management
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdmin(id: number, admin: Partial<InsertAdmin>): Promise<Admin>;

  // Evaluator Management
  getAllEvaluators(): Promise<Evaluator[]>;
  getActiveEvaluators(): Promise<Evaluator[]>;
  getEvaluatorByName(name: string): Promise<Evaluator | undefined>;
  createEvaluator(evaluator: InsertEvaluator): Promise<Evaluator>;
  createManyEvaluators(evaluators: InsertEvaluator[]): Promise<Evaluator[]>;
  updateEvaluator(id: number, evaluator: Partial<InsertEvaluator>): Promise<Evaluator>;
  deleteEvaluator(id: number): Promise<void>;

  // Category Management
  getAllCategories(): Promise<EvaluationCategory[]>;
  getActiveCategories(): Promise<EvaluationCategory[]>;
  createCategory(category: InsertEvaluationCategory): Promise<EvaluationCategory>;
  updateCategory(id: number, category: Partial<InsertEvaluationCategory>): Promise<EvaluationCategory>;
  deleteCategory(id: number): Promise<void>;

  // Evaluation Item Management
  getAllEvaluationItems(): Promise<(EvaluationItem & { categoryName: string })[]>;
  getActiveEvaluationItems(): Promise<(EvaluationItem & { categoryName: string })[]>;
  getEvaluationItemsByCategory(categoryId: number): Promise<EvaluationItem[]>;
  createEvaluationItem(item: InsertEvaluationItem): Promise<EvaluationItem>;
  createManyEvaluationItems(items: InsertEvaluationItem[]): Promise<EvaluationItem[]>;
  updateEvaluationItem(id: number, item: Partial<InsertEvaluationItem>): Promise<EvaluationItem>;
  deleteEvaluationItem(id: number): Promise<void>;

  // Candidate Management
  getAllCandidates(): Promise<Candidate[]>;
  getActiveCandidates(): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  createManyCandidates(candidates: InsertCandidate[]): Promise<Candidate[]>;
  updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate>;
  deleteCandidate(id: number): Promise<void>;

  // Evaluation Management
  getEvaluationsByEvaluator(evaluatorId: number): Promise<(Evaluation & { candidateName: string; itemName: string })[]>;
  getEvaluationsByCandidate(candidateId: number): Promise<(Evaluation & { evaluatorName: string; itemName: string })[]>;
  getEvaluationByIds(evaluatorId: number, candidateId: number, itemId: number): Promise<Evaluation | undefined>;
  saveEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;
  updateEvaluation(id: number, evaluation: Partial<InsertEvaluation>): Promise<Evaluation>;

  // Submission Management
  getEvaluationSubmission(evaluatorId: number, candidateId: number): Promise<EvaluationSubmission | undefined>;
  submitEvaluation(evaluatorId: number, candidateId: number): Promise<EvaluationSubmission>;
  getEvaluatorProgress(evaluatorId: number): Promise<{ completed: number; total: number; progress: number }>;

  // Results and Statistics
  getEvaluationResults(): Promise<any[]>;
  getSystemStatistics(): Promise<{
    totalEvaluators: number;
    activeEvaluators: number;
    totalCandidates: number;
    totalEvaluationItems: number;
    totalCategories: number;
    completionRate: number;
  }>;
  getEvaluatorProgressList(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getSystemConfig(): Promise<SystemConfig | undefined> {
    if (useMemoryStorage) {
      return memoryStore.systemConfig || undefined;
    }
    const configs = await db.select().from(systemConfig).limit(1);
    return configs[0];
  }

  async updateSystemConfig(config: Partial<InsertSystemConfig>): Promise<SystemConfig> {
    if (useMemoryStorage) {
      if (memoryStore.systemConfig) {
        Object.assign(memoryStore.systemConfig, config, { updatedAt: new Date() });
      } else {
        memoryStore.systemConfig = {
          id: 1,
          evaluationTitle: "종합평가시스템",
          systemName: null,
          description: null,
          adminEmail: null,
          maxEvaluators: null,
          maxCandidates: null,
          evaluationDeadline: null,
          allowPartialSubmission: false,
          enableNotifications: true,
          isEvaluationActive: false,
          allowPublicResults: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...config
        };
      }
      saveDataToFile();
      return memoryStore.systemConfig;
    }
    
    const existing = await this.getSystemConfig();
    if (existing) {
      const updated = await db
        .update(systemConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(systemConfig.id, existing.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db
        .insert(systemConfig)
        .values({ ...config, createdAt: new Date(), updatedAt: new Date() })
        .returning();
      return inserted[0];
    }
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    if (useMemoryStorage || !db) {
      return memoryStore.admins.find(admin => admin.username === username);
    }
    try {
      const admin = await db
        .select()
        .from(admins)
        .where(eq(admins.username, username))
        .limit(1);
      return admin[0];
    } catch (error) {
      console.log("Database query failed, falling back to memory storage");
      useMemoryStorage = true;
      return memoryStore.admins.find(admin => admin.username === username);
    }
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    if (useMemoryStorage || !db) {
      const newAdmin: Admin = {
        id: memoryStore.nextId++,
        ...admin,
        createdAt: new Date(),
        isActive: true
      };
      memoryStore.admins.push(newAdmin);
      saveDataToFile();
      return newAdmin;
    }
    
    try {
      const inserted = await db
        .insert(admins)
        .values({ ...admin, createdAt: new Date(), isActive: true })
        .returning();
      return inserted[0];
    } catch (error) {
      console.log("Database admin creation failed, falling back to memory storage");
      useMemoryStorage = true;
      const newAdmin: Admin = {
        id: memoryStore.nextId++,
        ...admin,
        createdAt: new Date(),
        isActive: true
      };
      memoryStore.admins.push(newAdmin);
      saveDataToFile();
      return newAdmin;
    }
  }

  async updateAdmin(id: number, admin: Partial<InsertAdmin>): Promise<Admin> {
    if (useMemoryStorage) {
      const existing = memoryStore.admins.find(a => a.id === id);
      if (!existing) throw new Error('Admin not found');
      Object.assign(existing, admin);
      saveDataToFile();
      return existing;
    }
    
    const updated = await db
      .update(admins)
      .set(admin)
      .where(eq(admins.id, id))
      .returning();
    return updated[0];
  }

  async getAllEvaluators(): Promise<Evaluator[]> {
    if (useMemoryStorage) {
      return memoryStore.evaluators;
    }
    return await db.select().from(evaluators).orderBy(asc(evaluators.name));
  }

  async getActiveEvaluators(): Promise<Evaluator[]> {
    if (useMemoryStorage) {
      return memoryStore.evaluators.filter(e => e.isActive);
    }
    return await db
      .select()
      .from(evaluators)
      .where(eq(evaluators.isActive, true))
      .orderBy(asc(evaluators.sortOrder));
  }

  async getEvaluatorByName(name: string): Promise<Evaluator | undefined> {
    if (useMemoryStorage) {
      return memoryStore.evaluators.find(e => e.name === name);
    }
    const evaluator = await db
      .select()
      .from(evaluators)
      .where(eq(evaluators.name, name))
      .limit(1);
    return evaluator[0];
  }

  async createEvaluator(evaluator: InsertEvaluator): Promise<Evaluator> {
    if (useMemoryStorage) {
      const newEvaluator: Evaluator = {
        id: memoryStore.nextId++,
        ...evaluator,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.evaluators.push(newEvaluator);
      saveDataToFile();
      return newEvaluator;
    }
    
    const inserted = await db
      .insert(evaluators)
      .values({ ...evaluator, createdAt: new Date(), updatedAt: new Date() })
      .returning();
    return inserted[0];
  }

  async createManyEvaluators(evaluatorList: InsertEvaluator[]): Promise<Evaluator[]> {
    if (useMemoryStorage) {
      const newEvaluators: Evaluator[] = evaluatorList.map(evaluator => ({
        id: memoryStore.nextId++,
        ...evaluator,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      memoryStore.evaluators.push(...newEvaluators);
      saveDataToFile();
      return newEvaluators;
    }
    
    const inserted = await db
      .insert(evaluators)
      .values(evaluatorList.map(evaluator => ({ 
        ...evaluator, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      })))
      .returning();
    return inserted;
  }

  async updateEvaluator(id: number, evaluator: Partial<InsertEvaluator>): Promise<Evaluator> {
    if (useMemoryStorage) {
      const existing = memoryStore.evaluators.find(e => e.id === id);
      if (!existing) throw new Error('Evaluator not found');
      Object.assign(existing, evaluator, { updatedAt: new Date() });
      saveDataToFile();
      return existing;
    }
    
    const updated = await db
      .update(evaluators)
      .set({ ...evaluator, updatedAt: new Date() })
      .where(eq(evaluators.id, id))
      .returning();
    return updated[0];
  }

  async deleteEvaluator(id: number): Promise<void> {
    if (useMemoryStorage) {
      const index = memoryStore.evaluators.findIndex(e => e.id === id);
      if (index !== -1) {
        memoryStore.evaluators.splice(index, 1);
        saveDataToFile();
      }
      return;
    }
    
    await db.delete(evaluators).where(eq(evaluators.id, id));
  }

  async getAllCategories(): Promise<EvaluationCategory[]> {
    if (useMemoryStorage) {
      return memoryStore.evaluationCategories;
    }
    return await db.select().from(evaluationCategories).orderBy(asc(evaluationCategories.sortOrder));
  }

  async getActiveCategories(): Promise<EvaluationCategory[]> {
    if (useMemoryStorage) {
      return memoryStore.evaluationCategories.filter(c => c.isActive);
    }
    return await db
      .select()
      .from(evaluationCategories)
      .where(eq(evaluationCategories.isActive, true))
      .orderBy(asc(evaluationCategories.sortOrder));
  }

  async createCategory(category: InsertEvaluationCategory): Promise<EvaluationCategory> {
    if (useMemoryStorage) {
      const newCategory: EvaluationCategory = {
        id: memoryStore.nextId++,
        ...category,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.evaluationCategories.push(newCategory);
      saveDataToFile();
      return newCategory;
    }
    
    const inserted = await db
      .insert(evaluationCategories)
      .values({ ...category, createdAt: new Date(), updatedAt: new Date() })
      .returning();
    return inserted[0];
  }

  async updateCategory(id: number, category: Partial<InsertEvaluationCategory>): Promise<EvaluationCategory> {
    if (useMemoryStorage) {
      const existing = memoryStore.evaluationCategories.find(c => c.id === id);
      if (!existing) throw new Error('Category not found');
      Object.assign(existing, category, { updatedAt: new Date() });
      saveDataToFile();
      return existing;
    }
    
    const updated = await db
      .update(evaluationCategories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(evaluationCategories.id, id))
      .returning();
    return updated[0];
  }

  async deleteCategory(id: number): Promise<void> {
    if (useMemoryStorage) {
      const index = memoryStore.evaluationCategories.findIndex(c => c.id === id);
      if (index !== -1) {
        memoryStore.evaluationCategories.splice(index, 1);
        saveDataToFile();
      }
      return;
    }
    
    await db.delete(evaluationCategories).where(eq(evaluationCategories.id, id));
  }

  async getAllEvaluationItems(): Promise<(EvaluationItem & { categoryName: string })[]> {
    if (useMemoryStorage) {
      return memoryStore.evaluationItems.map(item => ({
        ...item,
        categoryName: memoryStore.evaluationCategories.find(c => c.id === item.categoryId)?.name || 'Unknown'
      }));
    }
    
    const items = await db
      .select({
        id: evaluationItems.id,
        name: evaluationItems.name,
        description: evaluationItems.description,
        categoryId: evaluationItems.categoryId,
        categoryName: evaluationCategories.name,
        type: evaluationItems.type,
        maxScore: evaluationItems.maxScore,
        weight: evaluationItems.weight,
        sortOrder: evaluationItems.sortOrder,
        isActive: evaluationItems.isActive,
        createdAt: evaluationItems.createdAt,
        updatedAt: evaluationItems.updatedAt
      })
      .from(evaluationItems)
      .leftJoin(evaluationCategories, eq(evaluationItems.categoryId, evaluationCategories.id))
      .orderBy(asc(evaluationItems.sortOrder));
    
    return items as (EvaluationItem & { categoryName: string })[];
  }

  async getActiveEvaluationItems(): Promise<(EvaluationItem & { categoryName: string })[]> {
    if (useMemoryStorage) {
      return memoryStore.evaluationItems
        .filter(item => item.isActive)
        .map(item => ({
          ...item,
          categoryName: memoryStore.evaluationCategories.find(c => c.id === item.categoryId)?.name || 'Unknown'
        }));
    }
    
    const items = await db
      .select({
        id: evaluationItems.id,
        name: evaluationItems.name,
        description: evaluationItems.description,
        categoryId: evaluationItems.categoryId,
        categoryName: evaluationCategories.name,
        type: evaluationItems.type,
        maxScore: evaluationItems.maxScore,
        weight: evaluationItems.weight,
        sortOrder: evaluationItems.sortOrder,
        isActive: evaluationItems.isActive,
        createdAt: evaluationItems.createdAt,
        updatedAt: evaluationItems.updatedAt
      })
      .from(evaluationItems)
      .leftJoin(evaluationCategories, eq(evaluationItems.categoryId, evaluationCategories.id))
      .where(eq(evaluationItems.isActive, true))
      .orderBy(asc(evaluationItems.sortOrder));
    
    return items as (EvaluationItem & { categoryName: string })[];
  }

  async getEvaluationItemsByCategory(categoryId: number): Promise<EvaluationItem[]> {
    if (useMemoryStorage) {
      return memoryStore.evaluationItems.filter(item => item.categoryId === categoryId);
    }
    
    return await db
      .select()
      .from(evaluationItems)
      .where(eq(evaluationItems.categoryId, categoryId))
      .orderBy(asc(evaluationItems.sortOrder));
  }

  async createEvaluationItem(item: InsertEvaluationItem): Promise<EvaluationItem> {
    if (useMemoryStorage) {
      const newItem: EvaluationItem = {
        id: memoryStore.nextId++,
        ...item,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.evaluationItems.push(newItem);
      saveDataToFile();
      return newItem;
    }
    
    const inserted = await db
      .insert(evaluationItems)
      .values({ ...item, createdAt: new Date(), updatedAt: new Date() })
      .returning();
    return inserted[0];
  }

  async createManyEvaluationItems(items: InsertEvaluationItem[]): Promise<EvaluationItem[]> {
    if (useMemoryStorage) {
      const newItems: EvaluationItem[] = items.map(item => ({
        id: memoryStore.nextId++,
        ...item,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      memoryStore.evaluationItems.push(...newItems);
      saveDataToFile();
      return newItems;
    }
    
    const inserted = await db
      .insert(evaluationItems)
      .values(items.map(item => ({ 
        ...item, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      })))
      .returning();
    return inserted;
  }

  async updateEvaluationItem(id: number, item: Partial<InsertEvaluationItem>): Promise<EvaluationItem> {
    if (useMemoryStorage) {
      const existing = memoryStore.evaluationItems.find(i => i.id === id);
      if (!existing) throw new Error('Evaluation item not found');
      Object.assign(existing, item, { updatedAt: new Date() });
      saveDataToFile();
      return existing;
    }
    
    const updated = await db
      .update(evaluationItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(evaluationItems.id, id))
      .returning();
    return updated[0];
  }

  async deleteEvaluationItem(id: number): Promise<void> {
    if (useMemoryStorage) {
      const index = memoryStore.evaluationItems.findIndex(i => i.id === id);
      if (index !== -1) {
        memoryStore.evaluationItems.splice(index, 1);
        saveDataToFile();
      }
      return;
    }
    
    await db.delete(evaluationItems).where(eq(evaluationItems.id, id));
  }

  async getAllCandidates(): Promise<Candidate[]> {
    if (useMemoryStorage) {
      return memoryStore.candidates;
    }
    return await db.select().from(candidates).orderBy(asc(candidates.sortOrder));
  }

  async getActiveCandidates(): Promise<Candidate[]> {
    if (useMemoryStorage) {
      return memoryStore.candidates.filter(c => c.isActive);
    }
    return await db
      .select()
      .from(candidates)
      .where(eq(candidates.isActive, true))
      .orderBy(asc(candidates.sortOrder));
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    if (useMemoryStorage) {
      const newCandidate: Candidate = {
        id: memoryStore.nextId++,
        ...candidate,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.candidates.push(newCandidate);
      saveDataToFile();
      return newCandidate;
    }
    
    const inserted = await db
      .insert(candidates)
      .values({ ...candidate, createdAt: new Date(), updatedAt: new Date() })
      .returning();
    return inserted[0];
  }

  async createManyCandidates(candidateList: InsertCandidate[]): Promise<Candidate[]> {
    if (useMemoryStorage) {
      const newCandidates: Candidate[] = candidateList.map(candidate => ({
        id: memoryStore.nextId++,
        ...candidate,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      memoryStore.candidates.push(...newCandidates);
      saveDataToFile();
      return newCandidates;
    }
    
    const inserted = await db
      .insert(candidates)
      .values(candidateList.map(candidate => ({ 
        ...candidate, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      })))
      .returning();
    return inserted;
  }

  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    if (useMemoryStorage) {
      const existing = memoryStore.candidates.find(c => c.id === id);
      if (!existing) throw new Error('Candidate not found');
      Object.assign(existing, candidate, { updatedAt: new Date() });
      saveDataToFile();
      return existing;
    }
    
    const updated = await db
      .update(candidates)
      .set({ ...candidate, updatedAt: new Date() })
      .where(eq(candidates.id, id))
      .returning();
    return updated[0];
  }

  async deleteCandidate(id: number): Promise<void> {
    if (useMemoryStorage) {
      const index = memoryStore.candidates.findIndex(c => c.id === id);
      if (index !== -1) {
        memoryStore.candidates.splice(index, 1);
        saveDataToFile();
      }
      return;
    }
    
    await db.delete(candidates).where(eq(candidates.id, id));
  }

  async getEvaluationsByEvaluator(evaluatorId: number): Promise<(Evaluation & { candidateName: string; itemName: string })[]> {
    if (useMemoryStorage) {
      return memoryStore.evaluations
        .filter(e => e.evaluatorId === evaluatorId)
        .map(evaluation => ({
          ...evaluation,
          candidateName: memoryStore.candidates.find(c => c.id === evaluation.candidateId)?.name || 'Unknown',
          itemName: memoryStore.evaluationItems.find(i => i.id === evaluation.itemId)?.name || 'Unknown'
        }));
    }
    
    const evaluationList = await db
      .select({
        id: evaluations.id,
        evaluatorId: evaluations.evaluatorId,
        candidateId: evaluations.candidateId,
        itemId: evaluations.itemId,
        score: evaluations.score,
        comments: evaluations.comments,
        createdAt: evaluations.createdAt,
        updatedAt: evaluations.updatedAt,
        candidateName: candidates.name,
        itemName: evaluationItems.name
      })
      .from(evaluations)
      .leftJoin(candidates, eq(evaluations.candidateId, candidates.id))
      .leftJoin(evaluationItems, eq(evaluations.itemId, evaluationItems.id))
      .where(eq(evaluations.evaluatorId, evaluatorId));
    
    return evaluationList as (Evaluation & { candidateName: string; itemName: string })[];
  }

  async getEvaluationsByCandidate(candidateId: number): Promise<(Evaluation & { evaluatorName: string; itemName: string })[]> {
    if (useMemoryStorage) {
      return memoryStore.evaluations
        .filter(e => e.candidateId === candidateId)
        .map(evaluation => ({
          ...evaluation,
          evaluatorName: memoryStore.evaluators.find(e => e.id === evaluation.evaluatorId)?.name || 'Unknown',
          itemName: memoryStore.evaluationItems.find(i => i.id === evaluation.itemId)?.name || 'Unknown'
        }));
    }
    
    const evaluationList = await db
      .select({
        id: evaluations.id,
        evaluatorId: evaluations.evaluatorId,
        candidateId: evaluations.candidateId,
        itemId: evaluations.itemId,
        score: evaluations.score,
        comments: evaluations.comments,
        createdAt: evaluations.createdAt,
        updatedAt: evaluations.updatedAt,
        evaluatorName: evaluators.name,
        itemName: evaluationItems.name
      })
      .from(evaluations)
      .leftJoin(evaluators, eq(evaluations.evaluatorId, evaluators.id))
      .leftJoin(evaluationItems, eq(evaluations.itemId, evaluationItems.id))
      .where(eq(evaluations.candidateId, candidateId));
    
    return evaluationList as (Evaluation & { evaluatorName: string; itemName: string })[];
  }

  async getEvaluationByIds(evaluatorId: number, candidateId: number, itemId: number): Promise<Evaluation | undefined> {
    if (useMemoryStorage) {
      return memoryStore.evaluations.find(e => 
        e.evaluatorId === evaluatorId && 
        e.candidateId === candidateId && 
        e.itemId === itemId
      );
    }
    
    const evaluation = await db
      .select()
      .from(evaluations)
      .where(and(
        eq(evaluations.evaluatorId, evaluatorId),
        eq(evaluations.candidateId, candidateId),
        eq(evaluations.itemId, itemId)
      ))
      .limit(1);
    
    return evaluation[0];
  }

  async saveEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    if (useMemoryStorage) {
      const existing = memoryStore.evaluations.find(e => 
        e.evaluatorId === evaluation.evaluatorId && 
        e.candidateId === evaluation.candidateId && 
        e.itemId === evaluation.itemId
      );
      
      if (existing) {
        Object.assign(existing, evaluation, { updatedAt: new Date() });
        saveDataToFile();
        return existing;
      } else {
        const newEvaluation: Evaluation = {
          id: memoryStore.nextId++,
          ...evaluation,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        memoryStore.evaluations.push(newEvaluation);
        saveDataToFile();
        return newEvaluation;
      }
    }
    
    const existing = await this.getEvaluationByIds(evaluation.evaluatorId, evaluation.candidateId, evaluation.itemId);
    if (existing) {
      const updated = await db
        .update(evaluations)
        .set({ ...evaluation, updatedAt: new Date() })
        .where(eq(evaluations.id, existing.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db
        .insert(evaluations)
        .values({ ...evaluation, createdAt: new Date(), updatedAt: new Date() })
        .returning();
      return inserted[0];
    }
  }

  async updateEvaluation(id: number, evaluation: Partial<InsertEvaluation>): Promise<Evaluation> {
    if (useMemoryStorage) {
      const existing = memoryStore.evaluations.find(e => e.id === id);
      if (!existing) throw new Error('Evaluation not found');
      Object.assign(existing, evaluation, { updatedAt: new Date() });
      saveDataToFile();
      return existing;
    }
    
    const updated = await db
      .update(evaluations)
      .set({ ...evaluation, updatedAt: new Date() })
      .where(eq(evaluations.id, id))
      .returning();
    return updated[0];
  }

  async getEvaluationSubmission(evaluatorId: number, candidateId: number): Promise<EvaluationSubmission | undefined> {
    if (useMemoryStorage) {
      return memoryStore.evaluationSubmissions.find(s => 
        s.evaluatorId === evaluatorId && s.candidateId === candidateId
      );
    }
    
    const submission = await db
      .select()
      .from(evaluationSubmissions)
      .where(and(
        eq(evaluationSubmissions.evaluatorId, evaluatorId),
        eq(evaluationSubmissions.candidateId, candidateId)
      ))
      .limit(1);
    
    return submission[0];
  }

  async submitEvaluation(evaluatorId: number, candidateId: number): Promise<EvaluationSubmission> {
    if (useMemoryStorage) {
      const existing = memoryStore.evaluationSubmissions.find(s => 
        s.evaluatorId === evaluatorId && s.candidateId === candidateId
      );
      
      if (existing) {
        existing.submittedAt = new Date();
        saveDataToFile();
        return existing;
      } else {
        const newSubmission: EvaluationSubmission = {
          id: memoryStore.nextId++,
          evaluatorId,
          candidateId,
          submittedAt: new Date()
        };
        memoryStore.evaluationSubmissions.push(newSubmission);
        saveDataToFile();
        return newSubmission;
      }
    }
    
    const existing = await this.getEvaluationSubmission(evaluatorId, candidateId);
    if (existing) {
      const updated = await db
        .update(evaluationSubmissions)
        .set({ submittedAt: new Date() })
        .where(eq(evaluationSubmissions.id, existing.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db
        .insert(evaluationSubmissions)
        .values({ evaluatorId, candidateId, submittedAt: new Date() })
        .returning();
      return inserted[0];
    }
  }

  async getEvaluatorProgress(evaluatorId: number): Promise<{ completed: number; total: number; progress: number }> {
    if (useMemoryStorage) {
      const activeCandidates = memoryStore.candidates.filter(c => c.isActive);
      const completed = memoryStore.evaluationSubmissions.filter(s => s.evaluatorId === evaluatorId).length;
      const total = activeCandidates.length;
      return {
        completed,
        total,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    }
    
    const totalResult = await db
      .select({ count: count() })
      .from(candidates)
      .where(eq(candidates.isActive, true));
    
    const completedResult = await db
      .select({ count: count() })
      .from(evaluationSubmissions)
      .where(eq(evaluationSubmissions.evaluatorId, evaluatorId));
    
    const total = totalResult[0].count;
    const completed = completedResult[0].count;
    
    return {
      completed,
      total,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  async getEvaluationResults(): Promise<any[]> {
    if (useMemoryStorage) {
      const results = memoryStore.candidates.map(candidate => {
        const candidateEvaluations = memoryStore.evaluations.filter(e => e.candidateId === candidate.id);
        const totalScore = candidateEvaluations.reduce((sum, evaluation) => sum + parseFloat(evaluation.score.toString()), 0);
        const averageScore = candidateEvaluations.length > 0 ? totalScore / candidateEvaluations.length : 0;
        
        return {
          candidate,
          totalScore,
          averageScore,
          evaluationCount: candidateEvaluations.length,
          evaluations: candidateEvaluations.map(evaluation => ({
            ...evaluation,
            evaluatorName: memoryStore.evaluators.find(e => e.id === evaluation.evaluatorId)?.name || 'Unknown',
            itemName: memoryStore.evaluationItems.find(i => i.id === evaluation.itemId)?.name || 'Unknown'
          }))
        };
      });
      
      return results.sort((a, b) => b.averageScore - a.averageScore);
    }
    
    const results = await db
      .select({
        candidateId: candidates.id,
        candidateName: candidates.name,
        candidateDepartment: candidates.department,
        candidatePosition: candidates.position,
        totalScore: sum(evaluations.score),
        averageScore: avg(evaluations.score),
        evaluationCount: count(evaluations.id)
      })
      .from(candidates)
      .leftJoin(evaluations, eq(candidates.id, evaluations.candidateId))
      .groupBy(candidates.id, candidates.name, candidates.department, candidates.position)
      .orderBy(desc(avg(evaluations.score)));
    
    return results;
  }

  async getSystemStatistics(): Promise<{
    totalEvaluators: number;
    activeEvaluators: number;
    totalCandidates: number;
    totalEvaluationItems: number;
    totalCategories: number;
    completionRate: number;
  }> {
    if (useMemoryStorage) {
      const totalEvaluators = memoryStore.evaluators.length;
      const activeEvaluators = memoryStore.evaluators.filter(e => e.isActive).length;
      const totalCandidates = memoryStore.candidates.length;
      const totalEvaluationItems = memoryStore.evaluationItems.length;
      const totalCategories = memoryStore.evaluationCategories.length;
      
      const expectedEvaluations = activeEvaluators * totalCandidates;
      const completedEvaluations = memoryStore.evaluationSubmissions.length;
      const completionRate = expectedEvaluations > 0 ? Math.round((completedEvaluations / expectedEvaluations) * 100) : 0;
      
      return {
        totalEvaluators,
        activeEvaluators,
        totalCandidates,
        totalEvaluationItems,
        totalCategories,
        completionRate
      };
    }
    
    const [
      totalEvaluators,
      activeEvaluators,
      totalCandidates,
      totalEvaluationItems,
      totalCategories,
      completedEvaluations
    ] = await Promise.all([
      db.select({ count: count() }).from(evaluators),
      db.select({ count: count() }).from(evaluators).where(eq(evaluators.isActive, true)),
      db.select({ count: count() }).from(candidates),
      db.select({ count: count() }).from(evaluationItems),
      db.select({ count: count() }).from(evaluationCategories),
      db.select({ count: count() }).from(evaluationSubmissions)
    ]);
    
    const expectedEvaluations = activeEvaluators[0].count * totalCandidates[0].count;
    const completionRate = expectedEvaluations > 0 ? Math.round((completedEvaluations[0].count / expectedEvaluations) * 100) : 0;
    
    return {
      totalEvaluators: totalEvaluators[0].count,
      activeEvaluators: activeEvaluators[0].count,
      totalCandidates: totalCandidates[0].count,
      totalEvaluationItems: totalEvaluationItems[0].count,
      totalCategories: totalCategories[0].count,
      completionRate
    };
  }

  async getEvaluatorProgressList(): Promise<any[]> {
    if (useMemoryStorage) {
      const progressList = await Promise.all(
        memoryStore.evaluators.map(async (evaluator) => {
          const progress = await this.getEvaluatorProgress(evaluator.id);
          return {
            id: evaluator.id,
            name: evaluator.name,
            department: evaluator.department,
            completed: progress.completed,
            total: progress.total,
            progress: progress.progress,
          };
        })
      );
      
      return progressList;
    }
    
    const progressList = await Promise.all(
      (await this.getAllEvaluators()).map(async (evaluator) => {
        const progress = await this.getEvaluatorProgress(evaluator.id);
        return {
          id: evaluator.id,
          name: evaluator.name,
          department: evaluator.department,
          completed: progress.completed,
          total: progress.total,
          progress: progress.progress,
        };
      })
    );

    return progressList;
  }
}

export const storage = new DatabaseStorage();