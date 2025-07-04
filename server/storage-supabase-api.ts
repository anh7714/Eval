import { createClient } from '@supabase/supabase-js';
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

let supabase: ReturnType<typeof createClient>;

// Initialize Supabase client
async function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ SUPABASE_URL and SUPABASE_ANON_KEY are required");
    process.exit(1);
  }

  try {
    console.log("🔄 Connecting to Supabase API...");
    console.log("Supabase URL:", supabaseUrl);
    
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test the connection with a simple heartbeat
    const { data, error } = await supabase.from('system_config').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST104') { 
      // PGRST116 = no rows returned, PGRST104 = table doesn't exist - both are ok for initial setup
      console.warn("⚠️  Supabase API warning:", error.message);
    }
    
    console.log("✅ Successfully connected to Supabase API");
    
  } catch (error) {
    console.error("❌ Failed to connect to Supabase API:", error.message);
    console.error("Please verify your SUPABASE_URL and SUPABASE_ANON_KEY");
    console.error("Continuing with limited functionality...");
    // Don't exit the process, just log the error and continue
  }
}

// Initialize system with default data
async function initializeSystem() {
  try {
    console.log("🔧 Checking system initialization...");
    
    // Try to check for existing admin with error handling
    try {
      const { data: existingAdmin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .limit(1);
      
      if (adminError && adminError.code !== 'PGRST116' && adminError.code !== 'PGRST104') {
        console.warn("⚠️  Admin table check warning:", adminError.message);
      } else if (!existingAdmin || existingAdmin.length === 0) {
        console.log("🔧 Creating default admin account...");
        const { error: insertError } = await supabase
          .from('admins')
          .insert({
            username: 'admin',
            password: 'admin123',
            name: '시스템 관리자',
            is_active: true
          });
        
        if (insertError) {
          console.warn("⚠️  Failed to create admin:", insertError.message);
        } else {
          console.log("✅ Default admin account created");
        }
      } else {
        console.log("✅ Existing admin account found");
      }
    } catch (error) {
      console.warn("⚠️  Admin initialization skipped:", error.message);
    }
    
    // Try to check for existing system config with error handling
    try {
      const { data: existingConfig, error: configError } = await supabase
        .from('system_config')
        .select('*')
        .limit(1);
      
      if (configError && configError.code !== 'PGRST116' && configError.code !== 'PGRST104') {
        console.warn("⚠️  System config check warning:", configError.message);
      } else if (!existingConfig || existingConfig.length === 0) {
        console.log("🔧 Creating default system config...");
        const { error: insertError } = await supabase
          .from('system_config')
          .insert({
            evaluation_title: "종합평가시스템",
            is_evaluation_active: false
          });
        
        if (insertError) {
          console.warn("⚠️  Failed to create system config:", insertError.message);
        } else {
          console.log("✅ Default system config created");
        }
      } else {
        console.log("✅ Existing system config found");
      }
    } catch (error) {
      console.warn("⚠️  System config initialization skipped:", error.message);
    }
    
    console.log("✅ System initialization completed");
  } catch (error) {
    console.error("❌ System initialization error:", error.message);
    console.log("📝 Continuing with basic functionality...");
  }
}

export class SupabaseStorage {
  // System Config Methods
  async getSystemConfig(): Promise<SystemConfig | undefined> {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    
    return data && data.length > 0 ? this.mapSystemConfig(data[0]) : undefined;
  }

  async updateSystemConfig(config: Partial<InsertSystemConfig>): Promise<SystemConfig> {
    const mappedConfig = this.mapToSupabaseSystemConfig(config);
    
    const { data, error } = await supabase
      .from('system_config')
      .upsert(mappedConfig)
      .select()
      .single();
    
    if (error) throw error;
    
    return this.mapSystemConfig(data);
  }

  // Admin Methods
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    return data ? this.mapAdmin(data) : undefined;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const mappedAdmin = this.mapToSupabaseAdmin(admin);
    
    const { data, error } = await supabase
      .from('admins')
      .insert(mappedAdmin)
      .select()
      .single();
    
    if (error) throw error;
    
    return this.mapAdmin(data);
  }

  async updateAdmin(id: number, admin: Partial<InsertAdmin>): Promise<Admin> {
    const mappedAdmin = this.mapToSupabaseAdmin(admin);
    
    const { data, error } = await supabase
      .from('admins')
      .update(mappedAdmin)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return this.mapAdmin(data);
  }

  // Evaluator Methods
  async getAllEvaluators(): Promise<Evaluator[]> {
    const { data, error } = await supabase
      .from('evaluators')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return data ? data.map(this.mapEvaluator) : [];
  }

  async getActiveEvaluators(): Promise<Evaluator[]> {
    const { data, error } = await supabase
      .from('evaluators')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    
    return data ? data.map(this.mapEvaluator) : [];
  }

  async getEvaluatorByName(name: string): Promise<Evaluator | undefined> {
    const { data, error } = await supabase
      .from('evaluators')
      .select('*')
      .eq('name', name)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    return data ? this.mapEvaluator(data) : undefined;
  }

  async createEvaluator(evaluator: InsertEvaluator): Promise<Evaluator> {
    const mappedEvaluator = this.mapToSupabaseEvaluator(evaluator);
    
    const { data, error } = await supabase
      .from('evaluators')
      .insert(mappedEvaluator)
      .select()
      .single();
    
    if (error) throw error;
    
    return this.mapEvaluator(data);
  }

  async createManyEvaluators(evaluatorList: InsertEvaluator[]): Promise<Evaluator[]> {
    const mappedEvaluators = evaluatorList.map(this.mapToSupabaseEvaluator);
    
    const { data, error } = await supabase
      .from('evaluators')
      .insert(mappedEvaluators)
      .select();
    
    if (error) throw error;
    
    return data ? data.map(this.mapEvaluator) : [];
  }

  async updateEvaluator(id: number, evaluator: Partial<InsertEvaluator>): Promise<Evaluator> {
    const mappedEvaluator = this.mapToSupabaseEvaluator(evaluator);
    
    const { data, error } = await supabase
      .from('evaluators')
      .update(mappedEvaluator)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return this.mapEvaluator(data);
  }

  async deleteEvaluator(id: number): Promise<void> {
    const { error } = await supabase
      .from('evaluators')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Mapping functions to convert between API and internal formats
  private mapSystemConfig(data: any): SystemConfig {
    return {
      id: data.id,
      evaluationTitle: data.evaluation_title,
      systemName: data.system_name,
      description: data.description,
      adminEmail: data.admin_email,
      maxEvaluators: data.max_evaluators,
      maxCandidates: data.max_candidates,
      evaluationDeadline: data.evaluation_deadline ? new Date(data.evaluation_deadline) : null,
      allowPartialSubmission: data.allow_partial_submission || false,
      enableNotifications: data.enable_notifications || false,
      isEvaluationActive: data.is_evaluation_active || false,
      allowPublicResults: data.allow_public_results || false,
      evaluationStartDate: data.evaluation_start_date ? new Date(data.evaluation_start_date) : null,
      evaluationEndDate: data.evaluation_end_date ? new Date(data.evaluation_end_date) : null,
      maxScore: data.max_score,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapToSupabaseSystemConfig(config: Partial<InsertSystemConfig>): any {
    const mapped: any = {};
    
    if (config.evaluationTitle !== undefined) mapped.evaluation_title = config.evaluationTitle;
    if (config.systemName !== undefined) mapped.system_name = config.systemName;
    if (config.description !== undefined) mapped.description = config.description;
    if (config.adminEmail !== undefined) mapped.admin_email = config.adminEmail;
    if (config.maxEvaluators !== undefined) mapped.max_evaluators = config.maxEvaluators;
    if (config.maxCandidates !== undefined) mapped.max_candidates = config.maxCandidates;
    if (config.evaluationDeadline !== undefined) mapped.evaluation_deadline = config.evaluationDeadline;
    if (config.allowPartialSubmission !== undefined) mapped.allow_partial_submission = config.allowPartialSubmission;
    if (config.enableNotifications !== undefined) mapped.enable_notifications = config.enableNotifications;
    if (config.isEvaluationActive !== undefined) mapped.is_evaluation_active = config.isEvaluationActive;
    if (config.allowPublicResults !== undefined) mapped.allow_public_results = config.allowPublicResults;
    if (config.evaluationStartDate !== undefined) mapped.evaluation_start_date = config.evaluationStartDate;
    if (config.evaluationEndDate !== undefined) mapped.evaluation_end_date = config.evaluationEndDate;
    if (config.maxScore !== undefined) mapped.max_score = config.maxScore;
    
    mapped.updated_at = new Date().toISOString();
    
    return mapped;
  }

  private mapAdmin(data: any): Admin {
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      name: data.name,
      isActive: data.is_active,
      createdAt: new Date(data.created_at)
    };
  }

  private mapToSupabaseAdmin(admin: Partial<InsertAdmin>): any {
    const mapped: any = {};
    
    if (admin.username !== undefined) mapped.username = admin.username;
    if (admin.password !== undefined) mapped.password = admin.password;
    if (admin.name !== undefined) mapped.name = admin.name;
    if (admin.isActive !== undefined) mapped.is_active = admin.isActive;
    
    return mapped;
  }

  private mapEvaluator(data: any): Evaluator {
    return {
      id: data.id,
      name: data.name,
      password: data.password,
      email: data.email,
      department: data.department,
      position: data.position,
      isActive: data.is_active,
      createdAt: new Date(data.created_at)
    };
  }

  private mapToSupabaseEvaluator(evaluator: Partial<InsertEvaluator>): any {
    const mapped: any = {};
    
    if (evaluator.name !== undefined) mapped.name = evaluator.name;
    if (evaluator.password !== undefined) mapped.password = evaluator.password;
    if (evaluator.email !== undefined) mapped.email = evaluator.email;
    if (evaluator.department !== undefined) mapped.department = evaluator.department;
    if (evaluator.position !== undefined) mapped.position = evaluator.position;
    if (evaluator.isActive !== undefined) mapped.is_active = evaluator.isActive;
    
    return mapped;
  }

  // Add more methods as needed...
  // For now, implementing core methods needed for basic functionality
  async getAllCategories(): Promise<EvaluationCategory[]> {
    return [];
  }

  async getActiveCategories(): Promise<EvaluationCategory[]> {
    return [];
  }

  async createCategory(category: InsertEvaluationCategory): Promise<EvaluationCategory> {
    throw new Error("Not implemented");
  }

  async updateCategory(id: number, category: Partial<InsertEvaluationCategory>): Promise<EvaluationCategory> {
    throw new Error("Not implemented");
  }

  async deleteCategory(id: number): Promise<void> {
    throw new Error("Not implemented");
  }

  async getAllEvaluationItems(): Promise<(EvaluationItem & { categoryName: string })[]> {
    return [];
  }

  async getActiveEvaluationItems(): Promise<(EvaluationItem & { categoryName: string })[]> {
    return [];
  }

  async getEvaluationItemsByCategory(categoryId: number): Promise<EvaluationItem[]> {
    return [];
  }

  async createEvaluationItem(item: InsertEvaluationItem): Promise<EvaluationItem> {
    throw new Error("Not implemented");
  }

  async createManyEvaluationItems(items: InsertEvaluationItem[]): Promise<EvaluationItem[]> {
    throw new Error("Not implemented");
  }

  async updateEvaluationItem(id: number, item: Partial<InsertEvaluationItem>): Promise<EvaluationItem> {
    throw new Error("Not implemented");
  }

  async deleteEvaluationItem(id: number): Promise<void> {
    throw new Error("Not implemented");
  }

  async getAllCandidates(): Promise<Candidate[]> {
    return [];
  }

  async getActiveCandidates(): Promise<Candidate[]> {
    return [];
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    throw new Error("Not implemented");
  }

  async createManyCandidates(candidateList: InsertCandidate[]): Promise<Candidate[]> {
    throw new Error("Not implemented");
  }

  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    throw new Error("Not implemented");
  }

  async deleteCandidate(id: number): Promise<void> {
    throw new Error("Not implemented");
  }

  async getEvaluationsByEvaluator(evaluatorId: number): Promise<(Evaluation & { candidateName: string; itemName: string })[]> {
    return [];
  }

  async getEvaluationsByCandidate(candidateId: number): Promise<(Evaluation & { evaluatorName: string; itemName: string })[]> {
    return [];
  }

  async getEvaluationByIds(evaluatorId: number, candidateId: number, itemId: number): Promise<Evaluation | undefined> {
    return undefined;
  }

  async saveEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    throw new Error("Not implemented");
  }

  async updateEvaluation(id: number, evaluation: Partial<InsertEvaluation>): Promise<Evaluation> {
    throw new Error("Not implemented");
  }

  async getEvaluationSubmission(evaluatorId: number, candidateId: number): Promise<EvaluationSubmission | undefined> {
    return undefined;
  }

  async submitEvaluation(evaluatorId: number, candidateId: number): Promise<EvaluationSubmission> {
    throw new Error("Not implemented");
  }

  async getEvaluatorProgress(evaluatorId: number): Promise<{ completed: number; total: number; progress: number }> {
    return { completed: 0, total: 0, progress: 0 };
  }

  async getEvaluationResults(): Promise<any[]> {
    return [];
  }

  async getSystemStatistics(): Promise<{
    totalEvaluators: number;
    activeEvaluators: number;
    totalCandidates: number;
    totalEvaluationItems: number;
    totalCategories: number;
    completionRate: number;
  }> {
    return {
      totalEvaluators: 0,
      activeEvaluators: 0,
      totalCandidates: 0,
      totalEvaluationItems: 0,
      totalCategories: 0,
      completionRate: 0
    };
  }

  async getEvaluatorProgressList(): Promise<any[]> {
    return [];
  }
}

// Initialize and export storage instance
let storage: SupabaseStorage;

export async function initializeStorage() {
  await initializeSupabase();
  await initializeSystem();
  storage = new SupabaseStorage();
  console.log("Supabase API storage system initialized");
}

export { storage };