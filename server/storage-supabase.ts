import { createClient } from '@supabase/supabase-js';
import {
  systemConfig,
  admins,
  evaluators,
  evaluationCategories,
  evaluationItems,
  candidates,
  evaluations,
  evaluationSubmissions
} from '../shared/schema';
import type {
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
  InsertEvaluation
} from '../shared/schema';

let db: ReturnType<typeof drizzle>;

// Initialize Supabase database connection
async function initializeSupabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not provided - Supabase connection required");
    process.exit(1);
  }

  try {
    console.log("🔄 Connecting to Supabase database...");
    console.log("Database URL:", databaseUrl.replace(/:[^:@]*@/, ':***@'));
    
    // Use the provided URL directly
    let connectionUrl = databaseUrl;
    
    // Parse the URL to extract components
    const url = new URL(connectionUrl);
    const host = url.hostname;
    const port = parseInt(url.port) || 5432;
    const database = url.pathname.slice(1);
    const user = url.username;
    const password = url.password;
    
    console.log(`Connecting to host: ${host}, port: ${port}`);
    
    const pool = new Pool({
      host: host,
      port: port,
      database: database,
      user: user,
      password: password,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });
    
    console.log("Testing connection...");
    const testClient = await pool.connect();
    await testClient.query('SELECT NOW() as current_time');
    testClient.release();
    
    db = drizzle(pool);
    console.log("✅ Successfully connected to Supabase database");
    
  } catch (error) {
    console.error("❌ Failed to connect to Supabase:", error.message);
    console.error("Please verify your DATABASE_URL and try again");
    process.exit(1);
  }
}

// Initialize database schema and admin account
async function initializeSystem() {
  try {
    // Check for existing admin
    const existingAdmin = await db.select().from(admins).limit(1);
    
    if (existingAdmin.length === 0) {
      console.log("🔧 Creating default admin account...");
      await db.insert(admins).values({
        username: 'admin',
        password: 'admin123',
        name: '시스템 관리자',
        isActive: true,
        createdAt: new Date()
      });
      console.log("✅ Default admin account created (admin/admin123)");
    }
    
    // Initialize system config if needed
    const existingConfig = await db.select().from(systemConfig).limit(1);
    if (existingConfig.length === 0) {
      await db.insert(systemConfig).values({
        evaluationTitle: '종합평가시스템',
        isEvaluationActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log("✅ Default system configuration created");
    }
    
  } catch (error) {
    console.error("❌ Failed to initialize system:", error.message);
  }
}

// Storage interface implementation for Supabase
export class SupabaseStorage {
  // System Config
  async getSystemConfig(): Promise<SystemConfig | undefined> {
    const result = await db.select().from(systemConfig).limit(1);
    return result[0];
  }

  async updateSystemConfig(config: Partial<InsertSystemConfig>): Promise<SystemConfig> {
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

  // Admin Management
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const result = await db
      .select()
      .from(admins)
      .where(eq(admins.username, username))
      .limit(1);
    return result[0];
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const inserted = await db
      .insert(admins)
      .values({ ...admin, createdAt: new Date(), updatedAt: new Date() })
      .returning();
    return inserted[0];
  }

  async updateAdmin(id: number, admin: Partial<InsertAdmin>): Promise<Admin> {
    const updated = await db
      .update(admins)
      .set({ ...admin, updatedAt: new Date() })
      .where(eq(admins.id, id))
      .returning();
    return updated[0];
  }

  // Evaluator Management
  async getAllEvaluators(): Promise<Evaluator[]> {
    return await db.select().from(evaluators).orderBy(asc(evaluators.name));
  }

  async getActiveEvaluators(): Promise<Evaluator[]> {
    return await db
      .select()
      .from(evaluators)
      .where(eq(evaluators.isActive, true))
      .orderBy(asc(evaluators.name));
  }

  async getEvaluatorByName(name: string): Promise<Evaluator | undefined> {
    const result = await db
      .select()
      .from(evaluators)
      .where(eq(evaluators.name, name))
      .limit(1);
    return result[0];
  }

  async createEvaluator(evaluator: InsertEvaluator): Promise<Evaluator> {
    const inserted = await db
      .insert(evaluators)
      .values({ 
        ...evaluator, 
        isActive: true,
        createdAt: new Date(), 
        updatedAt: new Date() 
      })
      .returning();
    return inserted[0];
  }

  async createManyEvaluators(evaluatorList: InsertEvaluator[]): Promise<Evaluator[]> {
    const inserted = await db
      .insert(evaluators)
      .values(evaluatorList.map(evaluator => ({
        ...evaluator,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })))
      .returning();
    return inserted;
  }

  async updateEvaluator(id: number, evaluator: Partial<InsertEvaluator>): Promise<Evaluator> {
    const updated = await db
      .update(evaluators)
      .set({ ...evaluator, updatedAt: new Date() })
      .where(eq(evaluators.id, id))
      .returning();
    return updated[0];
  }

  async deleteEvaluator(id: number): Promise<void> {
    await db.delete(evaluators).where(eq(evaluators.id, id));
  }

  // Category Management
  async getAllCategories(): Promise<EvaluationCategory[]> {
    return await db.select().from(evaluationCategories).orderBy(asc(evaluationCategories.sortOrder));
  }

  async getActiveCategories(): Promise<EvaluationCategory[]> {
    return await db
      .select()
      .from(evaluationCategories)
      .where(eq(evaluationCategories.isActive, true))
      .orderBy(asc(evaluationCategories.sortOrder));
  }

  async createCategory(category: InsertEvaluationCategory): Promise<EvaluationCategory> {
    const inserted = await db
      .insert(evaluationCategories)
      .values({ ...category, createdAt: new Date(), updatedAt: new Date() })
      .returning();
    return inserted[0];
  }

  async updateCategory(id: number, category: Partial<InsertEvaluationCategory>): Promise<EvaluationCategory> {
    const updated = await db
      .update(evaluationCategories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(evaluationCategories.id, id))
      .returning();
    return updated[0];
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(evaluationCategories).where(eq(evaluationCategories.id, id));
  }

  // Evaluation Item Management
  async getAllEvaluationItems(): Promise<(EvaluationItem & { categoryName: string })[]> {
    const result = await db
      .select({
        id: evaluationItems.id,
        categoryId: evaluationItems.categoryId,
        itemCode: evaluationItems.itemCode,
        itemName: evaluationItems.itemName,
        description: evaluationItems.description,
        maxScore: evaluationItems.maxScore,
        weight: evaluationItems.weight,
        sortOrder: evaluationItems.sortOrder,
        isActive: evaluationItems.isActive,
        categoryName: evaluationCategories.categoryName
      })
      .from(evaluationItems)
      .leftJoin(evaluationCategories, eq(evaluationItems.categoryId, evaluationCategories.id))
      .orderBy(asc(evaluationItems.sortOrder));
    
    return result.map(item => ({
      ...item,
      categoryName: item.categoryName || 'Unknown'
    }));
  }

  async getActiveEvaluationItems(): Promise<(EvaluationItem & { categoryName: string })[]> {
    const result = await db
      .select({
        id: evaluationItems.id,
        categoryId: evaluationItems.categoryId,
        itemCode: evaluationItems.itemCode,
        itemName: evaluationItems.itemName,
        description: evaluationItems.description,
        maxScore: evaluationItems.maxScore,
        weight: evaluationItems.weight,
        sortOrder: evaluationItems.sortOrder,
        isActive: evaluationItems.isActive,
        categoryName: evaluationCategories.categoryName
      })
      .from(evaluationItems)
      .leftJoin(evaluationCategories, eq(evaluationItems.categoryId, evaluationCategories.id))
      .where(eq(evaluationItems.isActive, true))
      .orderBy(asc(evaluationItems.sortOrder));
    
    return result.map(item => ({
      ...item,
      categoryName: item.categoryName || 'Unknown'
    }));
  }

  async getEvaluationItemsByCategory(categoryId: number): Promise<EvaluationItem[]> {
    return await db
      .select()
      .from(evaluationItems)
      .where(eq(evaluationItems.categoryId, categoryId))
      .orderBy(asc(evaluationItems.sortOrder));
  }

  async createEvaluationItem(item: InsertEvaluationItem): Promise<EvaluationItem> {
    const inserted = await db
      .insert(evaluationItems)
      .values({ ...item })
      .returning();
    return inserted[0];
  }

  async createManyEvaluationItems(items: InsertEvaluationItem[]): Promise<EvaluationItem[]> {
    const inserted = await db
      .insert(evaluationItems)
      .values(items)
      .returning();
    return inserted;
  }

  async updateEvaluationItem(id: number, item: Partial<InsertEvaluationItem>): Promise<EvaluationItem> {
    const updated = await db
      .update(evaluationItems)
      .set(item)
      .where(eq(evaluationItems.id, id))
      .returning();
    return updated[0];
  }

  async deleteEvaluationItem(id: number): Promise<void> {
    await db.delete(evaluationItems).where(eq(evaluationItems.id, id));
  }

  // Candidate Management
  async getAllCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates).orderBy(asc(candidates.name));
  }

  async getActiveCandidates(): Promise<Candidate[]> {
    return await db
      .select()
      .from(candidates)
      .where(eq(candidates.isActive, true))
      .orderBy(asc(candidates.name));
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const inserted = await db
      .insert(candidates)
      .values({ 
        ...candidate, 
        isActive: true,
        createdAt: new Date() 
      })
      .returning();
    return inserted[0];
  }

  async createManyCandidates(candidateList: InsertCandidate[]): Promise<Candidate[]> {
    const inserted = await db
      .insert(candidates)
      .values(candidateList.map(candidate => ({
        ...candidate,
        isActive: true,
        createdAt: new Date()
      })))
      .returning();
    return inserted;
  }

  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    const updated = await db
      .update(candidates)
      .set(candidate)
      .where(eq(candidates.id, id))
      .returning();
    return updated[0];
  }

  async deleteCandidate(id: number): Promise<void> {
    await db.delete(candidates).where(eq(candidates.id, id));
  }

  // Evaluation Management
  async getEvaluationsByEvaluator(evaluatorId: number): Promise<(Evaluation & { candidateName: string; itemName: string })[]> {
    const result = await db
      .select({
        id: evaluations.id,
        evaluatorId: evaluations.evaluatorId,
        candidateId: evaluations.candidateId,
        itemId: evaluations.itemId,
        score: evaluations.score,
        comments: evaluations.comments,
        isFinal: evaluations.isFinal,
        maxScore: evaluations.maxScore,
        createdAt: evaluations.createdAt,
        updatedAt: evaluations.updatedAt,
        candidateName: candidates.name,
        itemName: evaluationItems.itemName
      })
      .from(evaluations)
      .leftJoin(candidates, eq(evaluations.candidateId, candidates.id))
      .leftJoin(evaluationItems, eq(evaluations.itemId, evaluationItems.id))
      .where(eq(evaluations.evaluatorId, evaluatorId));
    
    return result.map(evaluation => ({
      ...evaluation,
      candidateName: evaluation.candidateName || 'Unknown',
      itemName: evaluation.itemName || 'Unknown'
    }));
  }

  async getEvaluationsByCandidate(candidateId: number): Promise<(Evaluation & { evaluatorName: string; itemName: string })[]> {
    const result = await db
      .select({
        id: evaluations.id,
        evaluatorId: evaluations.evaluatorId,
        candidateId: evaluations.candidateId,
        itemId: evaluations.itemId,
        score: evaluations.score,
        comments: evaluations.comments,
        isFinal: evaluations.isFinal,
        maxScore: evaluations.maxScore,
        createdAt: evaluations.createdAt,
        updatedAt: evaluations.updatedAt,
        evaluatorName: evaluators.name,
        itemName: evaluationItems.itemName
      })
      .from(evaluations)
      .leftJoin(evaluators, eq(evaluations.evaluatorId, evaluators.id))
      .leftJoin(evaluationItems, eq(evaluations.itemId, evaluationItems.id))
      .where(eq(evaluations.candidateId, candidateId));
    
    return result.map(evaluation => ({
      ...evaluation,
      evaluatorName: evaluation.evaluatorName || 'Unknown',
      itemName: evaluation.itemName || 'Unknown'
    }));
  }

  async getEvaluationByIds(evaluatorId: number, candidateId: number, itemId: number): Promise<Evaluation | undefined> {
    const result = await db
      .select()
      .from(evaluations)
      .where(
        eq(evaluations.evaluatorId, evaluatorId) &&
        eq(evaluations.candidateId, candidateId) &&
        eq(evaluations.itemId, itemId)
      )
      .limit(1);
    return result[0];
  }

  async saveEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    const existing = await this.getEvaluationByIds(
      evaluation.evaluatorId,
      evaluation.candidateId,
      evaluation.itemId
    );

    if (existing) {
      const updated = await db
        .update(evaluations)
        .set({ 
          ...evaluation, 
          updatedAt: new Date(),
          comments: evaluation.comments || null,
          isFinal: evaluation.isFinal || false
        })
        .where(eq(evaluations.id, existing.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db
        .insert(evaluations)
        .values({ 
          ...evaluation, 
          createdAt: new Date(), 
          updatedAt: new Date(),
          comments: evaluation.comments || null,
          isFinal: evaluation.isFinal || false
        })
        .returning();
      return inserted[0];
    }
  }

  async updateEvaluation(id: number, evaluation: Partial<InsertEvaluation>): Promise<Evaluation> {
    const updated = await db
      .update(evaluations)
      .set({ 
        ...evaluation, 
        updatedAt: new Date(),
        comments: evaluation.comments || null
      })
      .where(eq(evaluations.id, id))
      .returning();
    return updated[0];
  }

  // Submission Management
  async getEvaluationSubmission(evaluatorId: number, candidateId: number): Promise<EvaluationSubmission | undefined> {
    const result = await db
      .select()
      .from(evaluationSubmissions)
      .where(
        eq(evaluationSubmissions.evaluatorId, evaluatorId) &&
        eq(evaluationSubmissions.candidateId, candidateId)
      )
      .limit(1);
    return result[0];
  }

  async submitEvaluation(evaluatorId: number, candidateId: number): Promise<EvaluationSubmission> {
    const inserted = await db
      .insert(evaluationSubmissions)
      .values({
        evaluatorId,
        candidateId,
        submittedAt: new Date()
      })
      .returning();
    return inserted[0];
  }

  async getEvaluatorProgress(evaluatorId: number): Promise<{ completed: number; total: number; progress: number }> {
    // Get total candidates and items
    const activeCandidates = await this.getActiveCandidates();
    const activeItems = await this.getActiveEvaluationItems();
    const total = activeCandidates.length * activeItems.length;

    // Get completed evaluations
    const completedEvaluations = await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.evaluatorId, evaluatorId));

    const completed = completedEvaluations.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, progress };
  }

  // Results and Statistics
  async getEvaluationResults(): Promise<any[]> {
    const result = await db
      .select({
        candidateId: evaluations.candidateId,
        candidateName: candidates.name,
        itemId: evaluations.itemId,
        itemName: evaluationItems.itemName,
        evaluatorId: evaluations.evaluatorId,
        evaluatorName: evaluators.name,
        score: evaluations.score,
        maxScore: evaluations.maxScore,
        weight: evaluationItems.weight
      })
      .from(evaluations)
      .leftJoin(candidates, eq(evaluations.candidateId, candidates.id))
      .leftJoin(evaluationItems, eq(evaluations.itemId, evaluationItems.id))
      .leftJoin(evaluators, eq(evaluations.evaluatorId, evaluators.id));

    return result;
  }

  async getSystemStatistics(): Promise<{
    totalEvaluators: number;
    activeEvaluators: number;
    totalCandidates: number;
    totalEvaluationItems: number;
    totalCategories: number;
    completionRate: number;
  }> {
    const allEvaluators = await this.getAllEvaluators();
    const activeEvaluators = await this.getActiveEvaluators();
    const allCandidates = await this.getAllCandidates();
    const allItems = await this.getAllEvaluationItems();
    const allCategories = await this.getAllCategories();

    const totalEvaluations = allEvaluators.length * allCandidates.length * allItems.length;
    const completedEvaluations = await db.select().from(evaluations);

    const completionRate = totalEvaluations > 0 
      ? Math.round((completedEvaluations.length / totalEvaluations) * 100) 
      : 0;

    return {
      totalEvaluators: allEvaluators.length,
      activeEvaluators: activeEvaluators.length,
      totalCandidates: allCandidates.length,
      totalEvaluationItems: allItems.length,
      totalCategories: allCategories.length,
      completionRate
    };
  }

  async getEvaluatorProgressList(): Promise<any[]> {
    const allEvaluators = await this.getAllEvaluators();
    const progressList = await Promise.all(
      allEvaluators.map(async (evaluator) => {
        const progress = await this.getEvaluatorProgress(evaluator.id);
        return {
          id: evaluator.id,
          name: evaluator.name,
          department: evaluator.department,
          completed: progress.completed,
          total: progress.total,
          progress: progress.progress
        };
      })
    );
    return progressList;
  }
}

// Initialize and export storage instance
let storage: SupabaseStorage;

export async function initializeStorage() {
  await initializeSupabase();
  await initializeSystem();
  storage = new SupabaseStorage();
  return storage;
}

export { storage };