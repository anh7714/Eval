import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";
import * as fs from 'fs';
import * as path from 'path';
import {
  systemConfig,
  admins,
  evaluators,
  evaluationCategories,
  evaluationItems,
  candidates,
  evaluations,
  evaluationSubmissions,
  type SystemConfig,
  type InsertSystemConfig,
  type Admin,
  type InsertAdmin,
  type Evaluator,
  type InsertEvaluator,
  type EvaluationCategory,
  type InsertEvaluationCategory,
  type EvaluationItem,
  type InsertEvaluationItem,
  type Candidate,
  type InsertCandidate,
  type Evaluation,
  type InsertEvaluation,
  type EvaluationSubmission,
  type InsertEvaluationSubmission,
} from "@shared/schema";

// Use in-memory storage if DATABASE_URL is not provided
let db: any;
let useMemoryStorage = false;
const DATA_FILE = path.join(process.cwd(), 'data.json');

// In-memory storage objects
const memoryStore = {
  systemConfig: null as SystemConfig | null,
  admins: [] as Admin[],
  evaluators: [] as Evaluator[],
  categories: [] as EvaluationCategory[],
  evaluationItems: [] as EvaluationItem[],
  candidates: [] as Candidate[],
  evaluations: [] as Evaluation[],
  submissions: [] as EvaluationSubmission[],
  nextId: 1
};

// File-based persistence functions
function loadDataFromFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      Object.assign(memoryStore, data);
      console.log('Data loaded from file:', DATA_FILE);
    }
  } catch (error) {
    console.warn('Failed to load data from file:', error);
  }
}

function saveDataToFile() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2));
  } catch (error) {
    console.warn('Failed to save data to file:', error);
  }
}

// Force file-based storage due to Replit network limitations with Supabase
console.log("Using file-based storage for reliable operation");
useMemoryStorage = true;
  
  // Load data from file
  loadDataFromFile();
  
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

// Note: Supabase connection disabled due to Replit network limitations
if (false) {
  console.log("Attempting to connect to Supabase with Connection Pooler...");
  try {
    // Use the exact connection string provided
    console.log("Connecting to Supabase using Transaction Pooler...");
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { 
        rejectUnauthorized: false,
        ca: undefined
      },
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      max: 5,
      min: 1,
      application_name: 'replit-evaluation-system'
    });
    
    db = drizzle(pool);
    console.log("Successfully connected to Supabase via Transaction Pooler");
    
    // Test the connection asynchronously
    pool.query('SELECT 1').then(() => {
      console.log("Database connection test successful - ready to use Supabase");
    }).catch((testError) => {
      console.warn("Database connection test failed:", testError.message);
    });
    
  } catch (error) {
    console.warn("Failed to connect to database, falling back to file-based storage:", error.message);
    console.log("Continuing with reliable file-based storage");
    useMemoryStorage = true;
    
    // Load data from file as fallback
    loadDataFromFile();
    
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
      saveDataToFile();
    }
  }
}

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
    const result = await db.select().from(systemConfig).limit(1);
    return result[0];
  }

  async updateSystemConfig(config: Partial<InsertSystemConfig>): Promise<SystemConfig> {
    if (useMemoryStorage) {
      const existing = memoryStore.systemConfig;
      if (existing) {
        const updated = { ...existing, ...config, updatedAt: new Date() };
        memoryStore.systemConfig = updated;
        return updated;
      } else {
        const created = {
          id: 1,
          evaluationTitle: "종합평가시스템",
          isEvaluationActive: true,
          allowPublicResults: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...config
        } as SystemConfig;
        memoryStore.systemConfig = created;
        return created;
      }
    }
    
    const existing = await this.getSystemConfig();
    if (existing) {
      const [updated] = await db
        .update(systemConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(systemConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(systemConfig).values(config).returning();
      return created;
    }
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    if (useMemoryStorage) {
      return memoryStore.admins.find(admin => admin.username === username);
    }
    const result = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
    return result[0];
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [created] = await db.insert(admins).values(admin).returning();
    return created;
  }

  async updateAdmin(id: number, admin: Partial<InsertAdmin>): Promise<Admin> {
    const [updated] = await db.update(admins).set(admin).where(eq(admins.id, id)).returning();
    return updated;
  }

  async getAllEvaluators(): Promise<Evaluator[]> {
    if (useMemoryStorage) {
      console.log("Getting all evaluators from memory store:", memoryStore.evaluators.length);
      return memoryStore.evaluators;
    }
    return await db.select().from(evaluators).orderBy(asc(evaluators.name));
  }

  async getActiveEvaluators(): Promise<Evaluator[]> {
    if (useMemoryStorage) {
      return memoryStore.evaluators.filter(e => e.isActive);
    }
    return await db.select().from(evaluators).where(eq(evaluators.isActive, true)).orderBy(asc(evaluators.name));
  }

  async getEvaluatorByName(name: string): Promise<Evaluator | undefined> {
    if (useMemoryStorage) {
      return memoryStore.evaluators.find(e => e.name === name);
    }
    const result = await db.select().from(evaluators).where(eq(evaluators.name, name)).limit(1);
    return result[0];
  }

  async createEvaluator(evaluator: InsertEvaluator): Promise<Evaluator> {
    if (useMemoryStorage) {
      const newEvaluator: Evaluator = {
        id: memoryStore.nextId++,
        name: evaluator.name,
        email: evaluator.email || null,
        department: evaluator.department,
        password: evaluator.password,
        isActive: evaluator.isActive ?? true,
        createdAt: new Date()
      };
      memoryStore.evaluators.push(newEvaluator);
      saveDataToFile();
      return newEvaluator;
    }
    const [created] = await db.insert(evaluators).values(evaluator).returning();
    return created;
  }

  async createManyEvaluators(evaluatorList: InsertEvaluator[]): Promise<Evaluator[]> {
    if (useMemoryStorage) {
      const createdEvaluators: Evaluator[] = [];
      for (const evaluator of evaluatorList) {
        const newEvaluator = await this.createEvaluator(evaluator);
        createdEvaluators.push(newEvaluator);
      }
      return createdEvaluators;
    }
    return await db.insert(evaluators).values(evaluatorList).returning();
  }

  async updateEvaluator(id: number, evaluator: Partial<InsertEvaluator>): Promise<Evaluator> {
    if (useMemoryStorage) {
      const index = memoryStore.evaluators.findIndex(e => e.id === id);
      if (index === -1) throw new Error("Evaluator not found");
      memoryStore.evaluators[index] = { 
        ...memoryStore.evaluators[index], 
        ...evaluator
      };
      saveDataToFile();
      return memoryStore.evaluators[index];
    }
    const [updated] = await db.update(evaluators).set(evaluator).where(eq(evaluators.id, id)).returning();
    return updated;
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
    return await db.select().from(evaluationCategories).orderBy(asc(evaluationCategories.order));
  }

  async getActiveCategories(): Promise<EvaluationCategory[]> {
    return await db.select().from(evaluationCategories).where(eq(evaluationCategories.isActive, true)).orderBy(asc(evaluationCategories.order));
  }

  async createCategory(category: InsertEvaluationCategory): Promise<EvaluationCategory> {
    const [created] = await db.insert(evaluationCategories).values(category).returning();
    return created;
  }

  async updateCategory(id: number, category: Partial<InsertEvaluationCategory>): Promise<EvaluationCategory> {
    const [updated] = await db.update(evaluationCategories).set(category).where(eq(evaluationCategories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(evaluationCategories).where(eq(evaluationCategories.id, id));
  }

  async getAllEvaluationItems(): Promise<(EvaluationItem & { categoryName: string })[]> {
    return await db
      .select({
        id: evaluationItems.id,
        categoryId: evaluationItems.categoryId,
        code: evaluationItems.code,
        name: evaluationItems.name,
        description: evaluationItems.description,
        maxScore: evaluationItems.maxScore,
        weight: evaluationItems.weight,
        order: evaluationItems.order,
        isActive: evaluationItems.isActive,
        categoryName: evaluationCategories.name,
      })
      .from(evaluationItems)
      .leftJoin(evaluationCategories, eq(evaluationItems.categoryId, evaluationCategories.id))
      .orderBy(asc(evaluationCategories.order), asc(evaluationItems.order));
  }

  async getActiveEvaluationItems(): Promise<(EvaluationItem & { categoryName: string })[]> {
    return await db
      .select({
        id: evaluationItems.id,
        categoryId: evaluationItems.categoryId,
        code: evaluationItems.code,
        name: evaluationItems.name,
        description: evaluationItems.description,
        maxScore: evaluationItems.maxScore,
        weight: evaluationItems.weight,
        order: evaluationItems.order,
        isActive: evaluationItems.isActive,
        categoryName: evaluationCategories.name,
      })
      .from(evaluationItems)
      .leftJoin(evaluationCategories, eq(evaluationItems.categoryId, evaluationCategories.id))
      .where(and(eq(evaluationItems.isActive, true), eq(evaluationCategories.isActive, true)))
      .orderBy(asc(evaluationCategories.order), asc(evaluationItems.order));
  }

  async getEvaluationItemsByCategory(categoryId: number): Promise<EvaluationItem[]> {
    return await db.select().from(evaluationItems).where(eq(evaluationItems.categoryId, categoryId)).orderBy(asc(evaluationItems.order));
  }

  async createEvaluationItem(item: InsertEvaluationItem): Promise<EvaluationItem> {
    const [created] = await db.insert(evaluationItems).values(item).returning();
    return created;
  }

  async createManyEvaluationItems(items: InsertEvaluationItem[]): Promise<EvaluationItem[]> {
    return await db.insert(evaluationItems).values(items).returning();
  }

  async updateEvaluationItem(id: number, item: Partial<InsertEvaluationItem>): Promise<EvaluationItem> {
    const [updated] = await db.update(evaluationItems).set(item).where(eq(evaluationItems.id, id)).returning();
    return updated;
  }

  async deleteEvaluationItem(id: number): Promise<void> {
    await db.delete(evaluationItems).where(eq(evaluationItems.id, id));
  }

  async getAllCandidates(): Promise<Candidate[]> {
    if (useMemoryStorage) {
      return memoryStore.candidates.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }
    return await db.select().from(candidates).orderBy(asc(candidates.sortOrder), asc(candidates.name));
  }

  async getActiveCandidates(): Promise<Candidate[]> {
    if (useMemoryStorage) {
      return memoryStore.candidates
        .filter(c => c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }
    return await db.select().from(candidates).where(eq(candidates.isActive, true)).orderBy(asc(candidates.sortOrder), asc(candidates.name));
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    if (useMemoryStorage) {
      const newCandidate: Candidate = {
        id: memoryStore.nextId++,
        name: candidate.name,
        department: candidate.department,
        position: candidate.position,
        category: candidate.category || "",
        description: candidate.description || "",
        sortOrder: candidate.sortOrder || 0,
        isActive: candidate.isActive ?? true,
        createdAt: new Date(),
      };
      memoryStore.candidates.push(newCandidate);
      saveDataToFile();
      return newCandidate;
    }
    const [created] = await db.insert(candidates).values(candidate).returning();
    return created;
  }

  async createManyCandidates(candidateList: InsertCandidate[]): Promise<Candidate[]> {
    if (useMemoryStorage) {
      const createdCandidates: Candidate[] = [];
      for (const candidate of candidateList) {
        const newCandidate = await this.createCandidate(candidate);
        createdCandidates.push(newCandidate);
      }
      return createdCandidates;
    }
    return await db.insert(candidates).values(candidateList).returning();
  }

  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    if (useMemoryStorage) {
      const index = memoryStore.candidates.findIndex(c => c.id === id);
      if (index === -1) throw new Error("Candidate not found");
      memoryStore.candidates[index] = { ...memoryStore.candidates[index], ...candidate };
      saveDataToFile();
      return memoryStore.candidates[index];
    }
    const [updated] = await db.update(candidates).set(candidate).where(eq(candidates.id, id)).returning();
    return updated;
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
    return await db
      .select({
        id: evaluations.id,
        evaluatorId: evaluations.evaluatorId,
        candidateId: evaluations.candidateId,
        itemId: evaluations.itemId,
        score: evaluations.score,
        comment: evaluations.comment,
        isSubmitted: evaluations.isSubmitted,
        submittedAt: evaluations.submittedAt,
        createdAt: evaluations.createdAt,
        updatedAt: evaluations.updatedAt,
        candidateName: candidates.name,
        itemName: evaluationItems.name,
      })
      .from(evaluations)
      .leftJoin(candidates, eq(evaluations.candidateId, candidates.id))
      .leftJoin(evaluationItems, eq(evaluations.itemId, evaluationItems.id))
      .where(eq(evaluations.evaluatorId, evaluatorId));
  }

  async getEvaluationsByCandidate(candidateId: number): Promise<(Evaluation & { evaluatorName: string; itemName: string })[]> {
    return await db
      .select({
        id: evaluations.id,
        evaluatorId: evaluations.evaluatorId,
        candidateId: evaluations.candidateId,
        itemId: evaluations.itemId,
        score: evaluations.score,
        comment: evaluations.comment,
        isSubmitted: evaluations.isSubmitted,
        submittedAt: evaluations.submittedAt,
        createdAt: evaluations.createdAt,
        updatedAt: evaluations.updatedAt,
        evaluatorName: evaluators.name,
        itemName: evaluationItems.name,
      })
      .from(evaluations)
      .leftJoin(evaluators, eq(evaluations.evaluatorId, evaluators.id))
      .leftJoin(evaluationItems, eq(evaluations.itemId, evaluationItems.id))
      .where(eq(evaluations.candidateId, candidateId));
  }

  async getEvaluationByIds(evaluatorId: number, candidateId: number, itemId: number): Promise<Evaluation | undefined> {
    const result = await db
      .select()
      .from(evaluations)
      .where(and(eq(evaluations.evaluatorId, evaluatorId), eq(evaluations.candidateId, candidateId), eq(evaluations.itemId, itemId)))
      .limit(1);
    return result[0];
  }

  async saveEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    const existing = await this.getEvaluationByIds(evaluation.evaluatorId, evaluation.candidateId, evaluation.itemId);
    
    if (existing) {
      const [updated] = await db
        .update(evaluations)
        .set({ ...evaluation, updatedAt: new Date() })
        .where(eq(evaluations.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(evaluations).values(evaluation).returning();
      return created;
    }
  }

  async updateEvaluation(id: number, evaluation: Partial<InsertEvaluation>): Promise<Evaluation> {
    const [updated] = await db
      .update(evaluations)
      .set({ ...evaluation, updatedAt: new Date() })
      .where(eq(evaluations.id, id))
      .returning();
    return updated;
  }

  async getEvaluationSubmission(evaluatorId: number, candidateId: number): Promise<EvaluationSubmission | undefined> {
    const result = await db
      .select()
      .from(evaluationSubmissions)
      .where(and(eq(evaluationSubmissions.evaluatorId, evaluatorId), eq(evaluationSubmissions.candidateId, candidateId)))
      .limit(1);
    return result[0];
  }

  async submitEvaluation(evaluatorId: number, candidateId: number): Promise<EvaluationSubmission> {
    const existing = await this.getEvaluationSubmission(evaluatorId, candidateId);
    
    if (existing) {
      const [updated] = await db
        .update(evaluationSubmissions)
        .set({ isCompleted: true, submittedAt: new Date() })
        .where(eq(evaluationSubmissions.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(evaluationSubmissions)
        .values({ evaluatorId, candidateId, isCompleted: true, submittedAt: new Date() })
        .returning();
      return created;
    }
  }

  async getEvaluatorProgress(evaluatorId: number): Promise<{ completed: number; total: number; progress: number }> {
    const totalCandidates = await db.select({ count: count() }).from(candidates).where(eq(candidates.isActive, true));
    const completedSubmissions = await db
      .select({ count: count() })
      .from(evaluationSubmissions)
      .where(and(eq(evaluationSubmissions.evaluatorId, evaluatorId), eq(evaluationSubmissions.isCompleted, true)));

    const total = totalCandidates[0].count;
    const completed = completedSubmissions[0].count;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, progress };
  }

  async getEvaluationResults(): Promise<any[]> {
    // Complex query to calculate aggregated scores for each candidate
    const results = await db
      .select({
        candidateId: candidates.id,
        candidateName: candidates.name,
        department: candidates.department,
        position: candidates.position,
        totalScore: sql<number>`COALESCE(SUM(${evaluations.score}), 0)`,
        evaluationCount: sql<number>`COUNT(${evaluations.id})`,
      })
      .from(candidates)
      .leftJoin(evaluations, and(eq(evaluations.candidateId, candidates.id), eq(evaluations.isSubmitted, true)))
      .where(eq(candidates.isActive, true))
      .groupBy(candidates.id, candidates.name, candidates.department, candidates.position)
      .orderBy(desc(sql`COALESCE(SUM(${evaluations.score}), 0)`));

    return results.map((result, index) => ({
      ...result,
      rank: index + 1,
      averageScore: result.evaluationCount > 0 ? (result.totalScore / result.evaluationCount).toFixed(1) : "0.0",
    }));
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
      const totalCandidates = memoryStore.candidates.filter(c => c.isActive).length;
      const totalEvaluationItems = memoryStore.evaluationItems.filter(i => i.isActive).length;
      const totalCategories = memoryStore.categories.filter(c => c.isActive).length;
      const completedSubmissions = memoryStore.submissions.filter(s => s.isCompleted).length;
      const totalPossibleSubmissions = activeEvaluators * totalCandidates;
      
      const completionRate = totalPossibleSubmissions > 0 
        ? Math.round((completedSubmissions / totalPossibleSubmissions) * 100)
        : 0;

      return {
        totalEvaluators,
        activeEvaluators,
        totalCandidates,
        totalEvaluationItems,
        totalCategories,
        completionRate,
      };
    }

    const [
      totalEvaluators,
      activeEvaluators,
      totalCandidates,
      totalEvaluationItems,
      totalCategories,
      completedSubmissions,
      totalPossibleSubmissions,
    ] = await Promise.all([
      db.select({ count: count() }).from(evaluators),
      db.select({ count: count() }).from(evaluators).where(eq(evaluators.isActive, true)),
      db.select({ count: count() }).from(candidates).where(eq(candidates.isActive, true)),
      db.select({ count: count() }).from(evaluationItems).where(eq(evaluationItems.isActive, true)),
      db.select({ count: count() }).from(evaluationCategories).where(eq(evaluationCategories.isActive, true)),
      db.select({ count: count() }).from(evaluationSubmissions).where(eq(evaluationSubmissions.isCompleted, true)),
      db.select({ 
        count: sql<number>`${count(evaluators.id)} * ${count(candidates.id)}`
      }).from(evaluators).crossJoin(candidates).where(and(eq(evaluators.isActive, true), eq(candidates.isActive, true))),
    ]);

    const completionRate = totalPossibleSubmissions[0].count > 0 
      ? Math.round((completedSubmissions[0].count / totalPossibleSubmissions[0].count) * 100)
      : 0;

    return {
      totalEvaluators: totalEvaluators[0].count,
      activeEvaluators: activeEvaluators[0].count,
      totalCandidates: totalCandidates[0].count,
      totalEvaluationItems: totalEvaluationItems[0].count,
      totalCategories: totalCategories[0].count,
      completionRate,
    };
  }

  async getEvaluatorProgressList(): Promise<any[]> {
    const evaluatorList = await db.select().from(evaluators).where(eq(evaluators.isActive, true));
    
    const progressList = await Promise.all(
      evaluatorList.map(async (evaluator) => {
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
