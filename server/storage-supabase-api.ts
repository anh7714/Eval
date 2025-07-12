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
  CategoryOption,
  PresetScore,
  EvaluationTemplate,
  InsertSystemConfig,
  InsertAdmin,
  InsertEvaluator,
  InsertEvaluationCategory,
  InsertEvaluationItem,
  InsertCandidate,
  InsertEvaluation,
  InsertCategoryOption,
  InsertPresetScore,
  InsertEvaluationTemplate
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
    try {
      const { data, error } = await supabase.from('system_config').select('count').limit(1);
      
      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST104') { 
        // PGRST116 = no rows returned, PGRST104 = table doesn't exist - both are ok for initial setup
        console.warn("⚠️  Supabase API warning:", error.message);
      }
    } catch (testError: any) {
      console.warn("⚠️  Supabase connection test warning:", testError?.message || testError);
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
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    return data && data.length > 0 ? this.mapSystemConfig(data[0]) : undefined;
  }

  async updateSystemConfig(config: Partial<InsertSystemConfig>): Promise<SystemConfig> {
    // 먼저 기존 설정을 가져옵니다
    const existing = await this.getSystemConfig();
    
    // 기본 필드만으로 업데이트를 시도합니다 (데이터베이스에 존재하는 컬럼만)
    const safeUpdate: any = {};
    
    // systemName이 있으면 evaluationTitle로 저장 (임시 우회책)
    if (config.systemName !== undefined) {
      safeUpdate.evaluation_title = config.systemName;
    } else if (config.evaluationTitle !== undefined) {
      safeUpdate.evaluation_title = config.evaluationTitle;
    }
    
    if (config.isEvaluationActive !== undefined) safeUpdate.is_evaluation_active = config.isEvaluationActive;
    if (config.evaluationStartDate !== undefined) safeUpdate.evaluation_start_date = config.evaluationStartDate;
    if (config.evaluationEndDate !== undefined) safeUpdate.evaluation_end_date = config.evaluationEndDate;
    if (config.maxScore !== undefined) safeUpdate.max_score = config.maxScore;
    
    // 새로운 필드들도 시도하되, 에러가 나면 무시합니다
    if (config.systemName !== undefined) safeUpdate.system_name = config.systemName;
    if (config.description !== undefined) safeUpdate.description = config.description;
    if (config.adminEmail !== undefined) safeUpdate.admin_email = config.adminEmail;
    if (config.maxEvaluators !== undefined) safeUpdate.max_evaluators = config.maxEvaluators;
    if (config.maxCandidates !== undefined) safeUpdate.max_candidates = config.maxCandidates;
    if (config.evaluationDeadline !== undefined) safeUpdate.evaluation_deadline = config.evaluationDeadline;
    if (config.allowPartialSubmission !== undefined) safeUpdate.allow_partial_submission = config.allowPartialSubmission;
    if (config.enableNotifications !== undefined) safeUpdate.enable_notifications = config.enableNotifications;
    if (config.allowPublicResults !== undefined) safeUpdate.allow_public_results = config.allowPublicResults;
    
    safeUpdate.updated_at = new Date().toISOString();
    
    let result;
    if (existing) {
      // 기존 레코드 업데이트
      const { data, error } = await supabase
        .from('system_config')
        .update(safeUpdate)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) {
        console.error("System config update error:", error);
        throw error;
      }
      result = data;
    } else {
      // 새 레코드 생성
      const { data, error } = await supabase
        .from('system_config')
        .insert(safeUpdate)
        .select()
        .single();
      
      if (error) {
        console.error("System config insert error:", error);
        throw error;
      }
      result = data;
    }
    
    return this.mapSystemConfig(result);
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
      evaluationTitle: data.evaluation_title || "종합평가시스템",
      // 임시: systemName은 evaluationTitle과 동일하게 처리 (스키마 업데이트 전까지)
      systemName: data.system_name || data.evaluation_title || undefined,
      description: data.description || undefined,
      adminEmail: data.admin_email || undefined,
      maxEvaluators: data.max_evaluators || undefined,
      maxCandidates: data.max_candidates || undefined,
      evaluationDeadline: data.evaluation_deadline ? new Date(data.evaluation_deadline) : null,
      allowPartialSubmission: data.allow_partial_submission || false,
      enableNotifications: data.enable_notifications || false,
      isEvaluationActive: data.is_evaluation_active || false,
      allowPublicResults: data.allow_public_results || false,
      evaluationStartDate: data.evaluation_start_date ? new Date(data.evaluation_start_date) : null,
      evaluationEndDate: data.evaluation_end_date ? new Date(data.evaluation_end_date) : null,
      maxScore: data.max_score || 100,
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
    try {
      const { data, error } = await supabase
        .from('evaluation_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Supabase getAllCategories error:', error);
        return [];
      }

      return data.map((item: any) => this.mapEvaluationCategory(item));
    } catch (error) {
      console.error('getAllCategories error:', error);
      return [];
    }
  }

  async getActiveCategories(): Promise<EvaluationCategory[]> {
    return [];
  }

  async createCategory(category: InsertEvaluationCategory): Promise<EvaluationCategory> {
    try {
      const { data, error } = await supabase
        .from('evaluation_categories')
        .insert([this.mapToSupabaseEvaluationCategory(category)])
        .select()
        .single();

      if (error) {
        console.error('Supabase createCategory error:', error);
        throw new Error(`Failed to create category: ${error.message}`);
      }

      return this.mapEvaluationCategory(data);
    } catch (error) {
      console.error('createCategory error:', error);
      throw error;
    }
  }

  async updateCategory(id: number, category: Partial<InsertEvaluationCategory>): Promise<EvaluationCategory> {
    throw new Error("Not implemented");
  }

  async deleteCategory(id: number): Promise<void> {
    const { error } = await supabase
      .from('evaluation_categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`카테고리 삭제 실패: ${error.message}`);
    }
  }

  async clearCategories(): Promise<void> {
    const { error } = await supabase
      .from('evaluation_categories')
      .delete()
      .neq('id', 0); // 모든 데이터 삭제

    if (error) {
      throw new Error(`모든 카테고리 삭제 실패: ${error.message}`);
    }
  }

  async clearEvaluationItems(): Promise<void> {
    const { error } = await supabase
      .from('evaluation_items')
      .delete()
      .neq('id', 0); // 모든 데이터 삭제

    if (error) {
      throw new Error(`모든 평가 항목 삭제 실패: ${error.message}`);
    }
  }

  async getAllEvaluationItems(): Promise<(EvaluationItem & { categoryName: string })[]> {
    try {
      const { data, error } = await supabase
        .from('evaluation_items')
        .select(`
          *,
          evaluation_categories(name)
        `)
        .eq('is_active', true)
        .order('id');

      if (error) {
        console.error('Supabase getAllEvaluationItems error:', error);
        return [];
      }

      return data.map((item: any) => ({
        ...this.mapEvaluationItem(item),
        categoryName: item.evaluation_categories?.name || 'Unknown'
      }));
    } catch (error) {
      console.error('getAllEvaluationItems error:', error);
      return [];
    }
  }

  async getActiveEvaluationItems(): Promise<(EvaluationItem & { categoryName: string })[]> {
    return [];
  }

  async getEvaluationItemsByCategory(categoryId: number): Promise<EvaluationItem[]> {
    return [];
  }

  async createEvaluationItem(item: InsertEvaluationItem): Promise<EvaluationItem> {
    try {
      const mappedItem = this.mapToSupabaseEvaluationItem(item);
      console.log('🔍 Supabase 저장 데이터:', JSON.stringify(mappedItem, null, 2));
      
      const { data, error } = await supabase
        .from('evaluation_items')
        .insert([mappedItem])
        .select()
        .single();

      if (error) {
        console.error('Supabase createEvaluationItem error:', error);
        throw new Error(`Failed to create evaluation item: ${error.message}`);
      }

      console.log('✅ Supabase 저장 결과:', JSON.stringify(data, null, 2));
      return this.mapEvaluationItem(data);
    } catch (error) {
      console.error('createEvaluationItem error:', error);
      throw error;
    }
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
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching candidates:', error);
        throw error;
      }
      
      // Map Supabase data to application schema
      return (data || []).map(candidate => ({
        id: candidate.id as number,
        name: candidate.name as string,
        department: candidate.department as string,
        position: candidate.position as string,
        category: candidate.category as string | null,
        mainCategory: candidate.main_category as string | null,
        subCategory: candidate.sub_category as string | null,
        description: candidate.description as string | null,
        sortOrder: candidate.sort_order as number,
        isActive: candidate.is_active as boolean,
        createdAt: new Date(candidate.created_at as string),
        updatedAt: new Date(candidate.updated_at as string)
      }));
    } catch (error) {
      console.error('Error in getAllCandidates:', error);
      throw error;
    }
  }

  async getActiveCandidates(): Promise<Candidate[]> {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching active candidates:', error);
        throw error;
      }
      
      // Map Supabase data to application schema
      return (data || []).map(candidate => ({
        id: candidate.id as number,
        name: candidate.name as string,
        department: candidate.department as string,
        position: candidate.position as string,
        category: candidate.category as string | null,
        mainCategory: candidate.main_category as string | null,
        subCategory: candidate.sub_category as string | null,
        description: candidate.description as string | null,
        sortOrder: candidate.sort_order as number,
        isActive: candidate.is_active as boolean,
        createdAt: new Date(candidate.created_at as string),
        updatedAt: new Date(candidate.updated_at as string)
      }));
    } catch (error) {
      console.error('Error in getActiveCandidates:', error);
      throw error;
    }
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    try {
      // Map camelCase to snake_case for database
      const mappedData: any = {
        name: candidate.name,
        department: candidate.department,
        position: candidate.position,
        category: candidate.category,
        main_category: candidate.mainCategory,
        sub_category: candidate.subCategory,
        description: candidate.description,
        sort_order: candidate.sortOrder || 0,
        is_active: candidate.isActive !== undefined ? candidate.isActive : true,
      };

      const { data, error } = await supabase
        .from('candidates')
        .insert([mappedData])
        .select()
        .single();

      if (error) {
        console.error('Error creating candidate:', error);
        throw error;
      }

      // Map back to camelCase for frontend
      return {
        id: data.id,
        name: data.name,
        department: data.department,
        position: data.position,
        category: data.category,
        mainCategory: data.main_category,
        subCategory: data.sub_category,
        description: data.description,
        sortOrder: data.sort_order,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in createCandidate:', error);
      throw error;
    }
  }

  async createManyCandidates(candidateList: InsertCandidate[]): Promise<Candidate[]> {
    throw new Error("Not implemented");
  }

  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    try {
      // Map camelCase to snake_case for database
      const mappedData: any = {};
      
      if (candidate.name !== undefined) mappedData.name = candidate.name;
      if (candidate.department !== undefined) mappedData.department = candidate.department;
      if (candidate.position !== undefined) mappedData.position = candidate.position;
      if (candidate.category !== undefined) mappedData.category = candidate.category;
      if (candidate.mainCategory !== undefined) mappedData.main_category = candidate.mainCategory;
      if (candidate.subCategory !== undefined) mappedData.sub_category = candidate.subCategory;
      if (candidate.description !== undefined) mappedData.description = candidate.description;
      if (candidate.sortOrder !== undefined) mappedData.sort_order = candidate.sortOrder;
      if (candidate.isActive !== undefined) mappedData.is_active = candidate.isActive;
      
      // If no data to update, return the existing candidate
      if (Object.keys(mappedData).length === 0) {
        const { data: existingCandidate, error: fetchError } = await supabase
          .from('candidates')
          .select('*')
          .eq('id', id)
          .single();
        
        if (fetchError) {
          console.error('Error fetching candidate:', fetchError);
          throw fetchError;
        }
        
        // Map back to camelCase for frontend
        return {
          id: existingCandidate.id,
          name: existingCandidate.name,
          department: existingCandidate.department,
          position: existingCandidate.position,
          category: existingCandidate.category,
          mainCategory: existingCandidate.main_category,
          subCategory: existingCandidate.sub_category,
          description: existingCandidate.description,
          sortOrder: existingCandidate.sort_order,
          isActive: existingCandidate.is_active,
          createdAt: existingCandidate.created_at,
          updatedAt: existingCandidate.updated_at
        };
      }
      
      const { data, error } = await supabase
        .from('candidates')
        .update(mappedData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating candidate:', error);
        throw error;
      }
      
      // Map back to camelCase for frontend
      return {
        id: data.id,
        name: data.name,
        department: data.department,
        position: data.position,
        category: data.category,
        mainCategory: data.main_category,
        subCategory: data.sub_category,
        description: data.description,
        sortOrder: data.sort_order,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in updateCandidate:', error);
      throw error;
    }
  }

  async deleteCandidate(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting candidate:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteCandidate:', error);
      throw error;
    }
  }

  // Category Options methods
  async getAllCategoryOptions(): Promise<CategoryOption[]> {
    try {
      const { data, error } = await supabase
        .from('category_options')
        .select('*')
        .order('sortOrder', { ascending: true });
      
      if (error) {
        console.error('Error fetching category options:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAllCategoryOptions:', error);
      throw error;
    }
  }

  async createCategoryOption(option: InsertCategoryOption): Promise<CategoryOption> {
    try {
      const { data, error } = await supabase
        .from('category_options')
        .insert([option])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating category option:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in createCategoryOption:', error);
      throw error;
    }
  }

  async updateCategoryOption(id: number, option: Partial<InsertCategoryOption>): Promise<CategoryOption> {
    try {
      const { data, error } = await supabase
        .from('category_options')
        .update(option)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating category option:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateCategoryOption:', error);
      throw error;
    }
  }

  async deleteCategoryOption(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('category_options')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting category option:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteCategoryOption:', error);
      throw error;
    }
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
    try {
      console.log('📊 평가자 진행률 계산 시작 (새 시스템):', evaluatorId);
      
      // 활성 평가대상 수 조회
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('id')
        .eq('is_active', true);

      if (candidatesError) {
        console.error('활성 평가대상 조회 오류:', candidatesError);
        throw candidatesError;
      }

      const total = candidates?.length || 0;
      console.log('📊 총 평가대상 수:', total);

      // 완료된 평가 수 조회 (is_completed 기준)
      const { data: sessions, error: sessionsError } = await supabase
        .from('evaluation_sessions')
        .select('id')
        .eq('evaluator_id', evaluatorId)
        .eq('is_completed', true);

      if (sessionsError) {
        console.error('완료된 평가 조회 오류:', sessionsError);
        const completed = 0;
        const progress = 0;
        console.log('📊 평가자 진행률 (새 시스템):', { completed, total, progress });
        return { completed, total, progress };
      }

      const completed = sessions?.length || 0;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      console.log('📊 평가자 진행률 (새 시스템):', { completed, total, progress });
      return { completed, total, progress };
    } catch (error) {
      console.error('평가자 진행률 계산 오류:', error);
      return { completed: 0, total: 0, progress: 0 };
    }
  }

  // 🔧 새로운 평가 시스템 기반 평가 결과 조회
  async getEvaluationResults(): Promise<any[]> {
    try {
      console.log('📊 평가 결과 집계 시작 (새로운 평가 시스템)...');
      
      // 1. 모든 완료된 평가 세션 조회 (새로운 evaluation_sessions 테이블 사용)
      const { data: sessions, error: sessionsError } = await supabase
        .from('evaluation_sessions')
        .select('*')
        .eq('is_completed', true)
        .order('updated_at', { ascending: false });

      if (sessionsError) {
        console.error('❌ 평가 세션 데이터 조회 오류:', sessionsError);
        throw sessionsError;
      }

      if (!sessions || sessions.length === 0) {
        console.log('📝 완료된 평가 데이터가 없습니다.');
        return [];
      }

      // 2. 활성 평가대상 정보 조회
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .eq('is_active', true);

      if (candidatesError) {
        console.error('❌ 평가대상 데이터 조회 오류:', candidatesError);
        throw candidatesError;
      }

      // 3. 평가대상 맵 생성
      const candidateMap = new Map<number, any>();
      candidates?.forEach(candidate => {
        candidateMap.set(candidate.id, candidate);
      });

      // 4. 중복 제거 및 후보자별 점수 집계
      const candidateScores = new Map<number, {
        candidate: any;
        totalScores: number[];
        evaluatorCount: number;
        maxPossibleScore: number;
      }>();

      // 5. 최대 가능 점수 계산
      const { data: evaluationItems, error: itemsError } = await supabase
        .from('evaluation_items')
        .select('max_score')
        .eq('is_active', true);

      const maxPossibleScore = evaluationItems?.reduce((sum, item) => sum + (item.max_score || 0), 0) || 100;

      // 6. 각 세션별로 개별 점수 합계 계산
      for (const session of sessions) {
        const candidateId = session.candidate_id;
        const candidate = candidateMap.get(candidateId);

        if (!candidate) {
          console.warn(`⚠️ 평가대상 정보 없음: ${candidateId}`);
          continue;
        }

        // 해당 세션의 개별 점수들 조회
        const { data: itemScores } = await supabase
          .from('evaluation_item_scores')
          .select('score')
          .eq('evaluator_id', session.evaluator_id)
          .eq('candidate_id', session.candidate_id);

        // 개별 점수 합계 계산
        const actualTotalScore = itemScores?.reduce((sum, item) => sum + (item.score || 0), 0) || 0;

        if (!candidateScores.has(candidateId)) {
          candidateScores.set(candidateId, {
            candidate: candidate,
            totalScores: [],
            evaluatorCount: 0,
            maxPossibleScore: maxPossibleScore
          });
        }

        const candidateData = candidateScores.get(candidateId)!;
        candidateData.totalScores.push(actualTotalScore);
        candidateData.evaluatorCount++;
      }

      console.log('📊 점수 집계 완료:', candidateScores.size, '명');

      // 7. 후보자별 평균 점수 계산 및 결과 생성
      const results: any[] = [];
      
      for (const [candidateId, data] of candidateScores) {
        const averageScore = data.totalScores.reduce((sum, score) => sum + score, 0) / data.totalScores.length;
        const percentage = (averageScore / data.maxPossibleScore) * 100;

        results.push({
          candidate: {
            id: data.candidate.id,
            name: data.candidate.name,
            department: data.candidate.department || '',
            position: data.candidate.position || '',
            category: data.candidate.category || '일반'
          },
          totalScore: Math.round(averageScore * 100) / 100,
          maxPossibleScore: data.maxPossibleScore,
          percentage: Math.round(percentage * 100) / 100,
          evaluatorCount: data.evaluatorCount,
          completedEvaluations: data.evaluatorCount,
          averageScore: Math.round(averageScore * 100) / 100,
          rank: 0
        });
      }

      // 8. 정렬 및 순위 부여
      results.sort((a, b) => b.percentage - a.percentage);
      
      let currentRank = 1;
      for (let i = 0; i < results.length; i++) {
        if (i > 0 && results[i].percentage < results[i-1].percentage) {
          currentRank = i + 1;
        }
        results[i].rank = currentRank;
      }

      console.log('✅ 평가 결과 집계 완료 (새로운 시스템):', results.length, '명');
      return results;

    } catch (error) {
      console.error('❌ 평가 결과 조회 오류:', error);
      return [];
    }
  }

  async getSystemStatistics(): Promise<{
    totalEvaluators: number;
    activeEvaluators: number;
    totalCandidates: number;
    totalEvaluationItems: number;
    totalCategories: number;
    completionRate: number;
    inProgress: number;
    completed: number;
  }> {
    try {
      console.log('📊 시스템 통계 계산 시작 (새 시스템)');
      
      // 1. 평가자 통계
      const { data: allEvaluators, error: evaluatorsError } = await supabase
        .from('evaluators')
        .select('id, is_active');
      if (evaluatorsError) throw evaluatorsError;
      
      const totalEvaluators = allEvaluators.length;
      const activeEvaluators = allEvaluators.filter(e => e.is_active).length;

      // 2. 활성 평가대상 수
      const { data: activeCandidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('id')
        .eq('is_active', true);
      if (candidatesError) throw candidatesError;
      const totalCandidates = activeCandidates.length;

      // 3. 평가항목 수
      const { data: evaluationItems, error: itemsError } = await supabase
        .from('evaluation_items')
        .select('id')
        .eq('is_active', true);
      if (itemsError) throw itemsError;
      const totalEvaluationItems = evaluationItems?.length || 0;

      // 4. 카테고리 수
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id')
        .eq('is_active', true);
      if (categoriesError) throw categoriesError;
      const totalCategories = categories?.length || 0;

              // 5. 평가 진행 상태 분석 (새로운 시스템 기준)
        let inProgress = 0;
        let completed = 0;
        let completionRate = 0;

        if (totalCandidates > 0 && activeEvaluators > 0) {
          // 완료된 평가 수 (is_completed = true)
          const { data: completedSessions, error: completedError } = await supabase
            .from('evaluation_sessions')
            .select('id')
            .eq('is_completed', true);
          
          if (!completedError && completedSessions) {
            completed = completedSessions.length;
          }

          // 진행 중인 평가 수 (is_completed = false)
          const { data: inProgressSessions, error: inProgressError } = await supabase
            .from('evaluation_sessions')
            .select('id')
            .eq('is_completed', false);

          if (!inProgressError && inProgressSessions) {
            inProgress = inProgressSessions.length;
          }

        // 완료율 계산 (총 가능한 평가 수 대비)
        const totalPossibleEvaluations = totalCandidates * activeEvaluators;
        completionRate = totalPossibleEvaluations > 0 ? Math.round((completed / totalPossibleEvaluations) * 100) : 0;
      }

      console.log('📊 서버 통계 데이터 (새 시스템):', {
        totalEvaluators,
        activeEvaluators,
        totalCandidates,
        totalEvaluationItems,
        totalCategories,
        completionRate,
        inProgress,
        completed
      });

      return {
        totalEvaluators,
        activeEvaluators,
        totalCandidates,
        totalEvaluationItems,
        totalCategories,
        completionRate,
        inProgress,
        completed
      };
    } catch (error) {
      console.error('Error in getSystemStatistics (새 시스템):', error);
      // 오류 시 기본값 반환
      return {
        totalEvaluators: 0,
        activeEvaluators: 0,
        totalCandidates: 0,
        totalEvaluationItems: 0,
        totalCategories: 0,
        completionRate: 0,
        inProgress: 0,
        completed: 0
      };
    }
  }

  async getEvaluatorProgressList(): Promise<any[]> {
    try {
      console.log('📊 평가위원 진행률 목록 조회 시작 (새 시스템)');
      
      // 활성 평가위원 목록 조회
      const activeEvaluators = await this.getActiveEvaluators();
      
      // 활성 평가대상 수 조회
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('id')
        .eq('is_active', true);

      if (candidatesError) {
        console.error('활성 평가대상 조회 오류:', candidatesError);
        throw candidatesError;
      }

      const totalCandidates = candidates?.length || 0;
      
      // 각 평가위원별 진행률 계산
      const progressList = await Promise.all(
        activeEvaluators.map(async (evaluator) => {
          // 완료된 평가 수 조회 (is_completed 기준)
          const { data: completedSessions, error: completedError } = await supabase
            .from('evaluation_sessions')
            .select('id')
            .eq('evaluator_id', evaluator.id)
            .eq('is_completed', true);

          const completedCount = completedSessions?.length || 0;
          const progress = totalCandidates > 0 ? Math.round((completedCount / totalCandidates) * 100) : 0;

          return {
            evaluator: {
              id: evaluator.id,
              name: evaluator.name,
              department: evaluator.department
            },
            completed: completedCount,
            total: totalCandidates,
            progress: progress,
            remaining: totalCandidates - completedCount
          };
        })
      );

      console.log('✅ 평가위원 진행률 목록 조회 완료 (새 시스템):', progressList.length, '명');
      return progressList;
      
    } catch (error) {
      console.error('평가위원 진행률 목록 조회 오류 (새 시스템):', error);
      return [];
    }
  }

  // Private mapper methods for evaluation categories
  private mapEvaluationCategory(data: any): EvaluationCategory {
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      description: data.description,
      sortOrder: data.sort_order,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapToSupabaseEvaluationCategory(category: Partial<InsertEvaluationCategory>): any {
    return {
      name: category.name,
      type: category.type,
      description: category.description,
      sort_order: category.sortOrder,
      is_active: category.isActive
    };
  }

  // Private mapper methods for evaluation items
  private mapEvaluationItem(data: any): EvaluationItem {
    return {
      id: data.id,
      categoryId: data.category_id,
      code: data.code,
      name: data.name,
      description: data.description,
      maxScore: data.max_score,
      weight: data.weight,
      sortOrder: data.sort_order,
      isActive: data.is_active,
      isQuantitative: data.is_quantitative,
      hasPresetScores: data.has_preset_scores,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapToSupabaseEvaluationItem(item: Partial<InsertEvaluationItem>): any {
    return {
      category_id: item.categoryId,
      code: item.code,
      name: item.name,
      description: item.description,
      max_score: item.maxScore,
      weight: item.weight,
      sort_order: item.sortOrder,
      is_active: item.isActive,
      is_quantitative: item.isQuantitative,
      has_preset_scores: item.hasPresetScores
    };
  }

  // 평가 임시저장 메서드 (새 시스템으로 리디렉션)
  async saveTemporaryEvaluation(data: { 
    evaluatorId: number;
    candidateId: number;
    scores: Record<string, number>;
    totalScore: number;
    isCompleted: boolean;
  }): Promise<any> {
    console.log('📝 기존 임시저장 함수 호출됨 - 새 시스템으로 리디렉션:', data);
    
    // 새로운 시스템으로 리디렉션
    return await this.saveTemporaryEvaluationNew(data);
  }

  // 평가 완료 메서드 (새 시스템으로 리디렉션)
  async completeEvaluation(data: { 
    evaluatorId: number;
    candidateId: number;
    scores: Record<string, number>;
    totalScore: number;
    isCompleted: boolean;
  }): Promise<any> {
    console.log('🏁 기존 평가완료 함수 호출됨 - 새 시스템으로 리디렉션:', data);
    
    // 새로운 시스템으로 리디렉션 (완료 상태로 설정)
    return await this.saveTemporaryEvaluationNew({
      ...data,
      isCompleted: true
    });
  }

  async getEvaluationSubmissionsByCandidate(candidateId: number): Promise<any[]> {
    try {
      console.log('📊 후보자별 평가 세션 조회 (새 시스템):', candidateId);
      
      const { data, error } = await supabase
        .from('evaluation_sessions')
        .select(`
          *,
          evaluator:evaluators!inner(id, name),
          candidate:candidates!inner(id, name)
        `)
        .eq('candidate_id', candidateId);

      if (error) throw error;
      
      // 기존 API와 호환성을 위해 필드명 매핑 (is_completed 기준)
      const mappedData = (data || []).map(session => ({
        ...session,
        is_completed: session.is_completed,
        evaluator_id: session.evaluator_id,
        candidate_id: session.candidate_id,
        total_score: session.total_score
      }));
      
      console.log('✅ 후보자별 평가 세션 조회 완료 (새 시스템):', mappedData.length, '건');
      console.log('📋 조회된 세션들:', mappedData.map(s => ({
        evaluator_id: s.evaluator_id,
        is_completed: s.is_completed,
        total_score: s.total_score
      })));
      return mappedData;
      
    } catch (error) {
      console.error('Error fetching evaluation sessions by candidate (새 시스템):', error);
      return [];
    }
  }

  async getEvaluationSubmissionsByEvaluator(evaluatorId: number): Promise<any[]> {
    try {
      console.log('📊 평가자별 평가 세션 조회 (새 시스템):', evaluatorId);
      
      const { data, error } = await supabase
        .from('evaluation_sessions')
        .select(`
          *,
          evaluator:evaluators!inner(id, name),
          candidate:candidates!inner(id, name)
        `)
        .eq('evaluator_id', evaluatorId);

      if (error) throw error;
      
      // 기존 API와 호환성을 위해 필드명 매핑 (is_completed 기준)
      const mappedData = (data || []).map(session => ({
        ...session,
        is_completed: session.is_completed,
        evaluator_id: session.evaluator_id,
        candidate_id: session.candidate_id,
        total_score: session.total_score
      }));
      
      console.log('✅ 평가자별 평가 세션 조회 완료 (새 시스템):', mappedData.length, '건');
      console.log('📋 조회된 세션들:', mappedData.map(s => ({
        candidate_id: s.candidate_id,
        is_completed: s.is_completed,
        total_score: s.total_score
      })));
      return mappedData;
      
    } catch (error) {
      console.error('Error fetching evaluation sessions by evaluator (새 시스템):', error);
      return [];
    }
  }

  async getEvaluationStatus(evaluatorId: number, candidateId: number): Promise<any> {
    console.log('📖 평가 상태 조회 (새 시스템으로 리디렉션):', { evaluatorId, candidateId });
    
    // 새로운 시스템으로 리디렉션
    return await this.getEvaluationStatusNew(evaluatorId, candidateId);
  }

  // 🎯 CODE 기반 점수 조회 메서드 (새 시스템으로 리디렉션)
  async getEvaluationWithCodeBasedScores(evaluatorId: number, candidateId: number): Promise<any> {
    console.log('📖 CODE 기반 평가 데이터 조회 (새 시스템으로 리디렉션):', { evaluatorId, candidateId });
    
    // 새로운 시스템으로 리디렉션
    return await this.getEvaluationStatusNew(evaluatorId, candidateId);
  }

  // 🎯 기존 ID 기반 점수를 CODE 기반으로 마이그레이션
  async migrateScoresToCodeBased(): Promise<void> {
    console.log('🔄 ID 기반 점수를 CODE 기반으로 마이그레이션 시작...');
    
    try {
      // 1. 모든 평가 제출 데이터 가져오기
      const { data: submissions, error: submissionsError } = await supabase
        .from('evaluation_submissions')
        .select('*');
      
      if (submissionsError) throw submissionsError;
      
      // 2. 모든 평가항목 가져오기 (ID와 CODE 매핑용)
      const evaluationItems = await this.getAllEvaluationItems();
      const idToCodeMap = new Map<number, string>();
      
      evaluationItems.forEach(item => {
        idToCodeMap.set(item.id, item.code);
      });
      
      console.log('📋 ID -> CODE 매핑:', Object.fromEntries(idToCodeMap));
      
      // 3. 각 제출 데이터 변환
      for (const submission of submissions || []) {
        const oldScores = submission.scores || {};
        const newScores: Record<string, number> = {};
        let hasChanges = false;
        
        console.log(`🔍 변환 중: 평가자 ${submission.evaluator_id}, 평가대상 ${submission.candidate_id}`);
        console.log('   기존 점수:', oldScores);
        
        // ID 기반 점수를 CODE 기반으로 변환
        for (const [key, score] of Object.entries(oldScores)) {
          const numericKey = parseInt(key);
          
          if (!isNaN(numericKey)) {
            // 숫자 키인 경우 CODE로 변환
            const itemCode = idToCodeMap.get(numericKey);
            if (itemCode) {
              newScores[itemCode] = score;
              hasChanges = true;
              console.log(`   🔄 변환: ID(${numericKey}) -> CODE(${itemCode}) = ${score}점`);
            } else {
              // 매핑되지 않는 ID는 그대로 유지 (호환성)
              newScores[key] = score;
              console.log(`   ⚠️ 매핑 안됨: ID(${numericKey}) = ${score}점 (유지)`);
            }
          } else {
            // 이미 CODE인 경우 그대로 유지
            newScores[key] = score;
            console.log(`   ✅ 이미 CODE: ${key} = ${score}점`);
          }
        }
        
        // 변경사항이 있으면 업데이트
        if (hasChanges) {
          console.log('   새 점수:', newScores);
          
          const { error: updateError } = await supabase
            .from('evaluation_submissions')
            .update({ scores: newScores })
            .eq('evaluator_id', submission.evaluator_id)
            .eq('candidate_id', submission.candidate_id);
          
          if (updateError) {
            console.error(`❌ 업데이트 실패:`, updateError);
          } else {
            console.log(`✅ 업데이트 완료: 평가자 ${submission.evaluator_id}, 평가대상 ${submission.candidate_id}`);
          }
        }
      }
      
      console.log('🎉 ID -> CODE 마이그레이션 완료!');
    } catch (error) {
      console.error('❌ 마이그레이션 실패:', error);
    }
  }

  // ===== PRESET SCORES 관리 메서드 =====
  
  async getPresetScores(): Promise<PresetScore[]> {
    try {
      const { data, error } = await supabase
        .from('preset_scores')
        .select('*')
        .order('candidate_id', { ascending: true });
      
      if (error) {
        console.error('Error fetching preset scores:', error);
        throw error;
      }
      
      return data?.map(this.mapPresetScore) || [];
    } catch (error) {
      console.error('Error in getPresetScores:', error);
      throw error;
    }
  }

  async getPresetScoresByCandidate(candidateId: number): Promise<PresetScore[]> {
    try {
      const { data, error } = await supabase
        .from('preset_scores')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('item_id', { ascending: true });
      
      if (error) {
        console.error('Error fetching preset scores by candidate:', error);
        throw error;
      }
      
      return data?.map(this.mapPresetScore) || [];
    } catch (error) {
      console.error('Error in getPresetScoresByCandidate:', error);
      throw error;
    }
  }

  async getPresetScoresByItem(itemId: number): Promise<PresetScore[]> {
    try {
      const { data, error } = await supabase
        .from('preset_scores')
        .select('*')
        .eq('item_id', itemId)
        .order('candidate_id', { ascending: true });
      
      if (error) {
        console.error('Error fetching preset scores by item:', error);
        throw error;
      }
      
      return data?.map(this.mapPresetScore) || [];
    } catch (error) {
      console.error('Error in getPresetScoresByItem:', error);
      throw error;
    }
  }

  async createPresetScore(presetScore: InsertPresetScore): Promise<PresetScore> {
    try {
      const { data, error } = await supabase
        .from('preset_scores')
        .insert(this.mapToSupabasePresetScore(presetScore))
        .select()
        .single();
      
      if (error) {
        console.error('Error creating preset score:', error);
        throw error;
      }
      
      return this.mapPresetScore(data);
    } catch (error) {
      console.error('Error in createPresetScore:', error);
      throw error;
    }
  }

  async updatePresetScore(id: number, presetScore: Partial<InsertPresetScore>): Promise<PresetScore> {
    try {
      const { data, error } = await supabase
        .from('preset_scores')
        .update(this.mapToSupabasePresetScore(presetScore))
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating preset score:', error);
        throw error;
      }
      
      return this.mapPresetScore(data);
    } catch (error) {
      console.error('Error in updatePresetScore:', error);
      throw error;
    }
  }

  async deletePresetScore(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('preset_scores')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting preset score:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deletePresetScore:', error);
      throw error;
    }
  }

  async upsertPresetScore(candidateId: number, itemId: number, score: number, notes?: string): Promise<PresetScore> {
    try {
      const { data, error } = await supabase
        .from('preset_scores')
        .upsert({
          candidate_id: candidateId,
          item_id: itemId,
          score: score,
          notes: notes,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'candidate_id,item_id'
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error upserting preset score:', error);
        throw error;
      }
      
      return this.mapPresetScore(data);
    } catch (error) {
      console.error('Error in upsertPresetScore:', error);
      throw error;
    }
  }

  // Private mapper methods for preset scores
  private mapPresetScore(data: any): PresetScore {
    return {
      id: data.id,
      candidateId: data.candidate_id,
      itemId: data.item_id,
      score: data.score,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapToSupabasePresetScore(presetScore: Partial<InsertPresetScore>): any {
    return {
      candidate_id: presetScore.candidateId,
      item_id: presetScore.itemId,
      score: presetScore.score,
      notes: presetScore.notes
    };
  }

  // ===== EVALUATION TEMPLATES 관리 메서드 =====
  
  async getEvaluationTemplates(): Promise<EvaluationTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('evaluation_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching evaluation templates:', error);
        throw error;
      }
      
      return data?.map(this.mapEvaluationTemplate) || [];
    } catch (error) {
      console.error('Error in getEvaluationTemplates:', error);
      throw error;
    }
  }

  async getDefaultEvaluationTemplate(): Promise<EvaluationTemplate | undefined> {
    try {
      const { data, error } = await supabase
        .from('evaluation_templates')
        .select('*')
        .eq('is_active', true)
        .eq('is_default', true)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        console.error('Error fetching default evaluation template:', error);
        throw error;
      }
      
      return data ? this.mapEvaluationTemplate(data) : undefined;
    } catch (error) {
      console.error('Error in getDefaultEvaluationTemplate:', error);
      throw error;
    }
  }

  async createEvaluationTemplate(template: InsertEvaluationTemplate): Promise<EvaluationTemplate> {
    try {
      // 새 템플릿이 기본값으로 설정될 경우 기존 기본값 해제
      if (template.isDefault) {
        await supabase
          .from('evaluation_templates')
          .update({ is_default: false })
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('evaluation_templates')
        .insert(this.mapToSupabaseEvaluationTemplate(template))
        .select()
        .single();
      
      if (error) {
        console.error('Error creating evaluation template:', error);
        throw error;
      }
      
      return this.mapEvaluationTemplate(data);
    } catch (error) {
      console.error('Error in createEvaluationTemplate:', error);
      throw error;
    }
  }

  async updateEvaluationTemplate(id: number, template: Partial<InsertEvaluationTemplate>): Promise<EvaluationTemplate> {
    try {
      // 새 템플릿이 기본값으로 설정될 경우 기존 기본값 해제
      if (template.isDefault) {
        await supabase
          .from('evaluation_templates')
          .update({ is_default: false })
          .eq('is_default', true)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('evaluation_templates')
        .update(this.mapToSupabaseEvaluationTemplate(template))
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating evaluation template:', error);
        throw error;
      }
      
      return this.mapEvaluationTemplate(data);
    } catch (error) {
      console.error('Error in updateEvaluationTemplate:', error);
      throw error;
    }
  }

  async deleteEvaluationTemplate(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('evaluation_templates')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting evaluation template:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteEvaluationTemplate:', error);
      throw error;
    }
  }

  // Private mapper methods for evaluation templates
  private mapEvaluationTemplate(data: any): EvaluationTemplate {
    return {
      id: data.id,
      name: data.name,
      title: data.title,
      description: data.description,
      templateData: data.template_data,
      isActive: data.is_active,
      isDefault: data.is_default,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapToSupabaseEvaluationTemplate(template: Partial<InsertEvaluationTemplate>): any {
    return {
      name: template.name,
      title: template.title,
      description: template.description,
      template_data: template.templateData,
      is_active: template.isActive,
      is_default: template.isDefault
    };
  }

  async clearAllEvaluationData(): Promise<void> {
    try {
      console.log('🧹 평가 데이터 정리 시작');
      
      // Delete in order due to foreign key constraints
      await supabase.from('candidate_preset_scores').delete().neq('id', 0);
      await supabase.from('preset_scores').delete().neq('id', 0);
      await supabase.from('evaluation_items').delete().neq('id', 0);
      await supabase.from('evaluation_categories').delete().eq('type', 'evaluation');
      await supabase.from('evaluation_templates').delete().neq('id', 0);
      
      console.log('✅ 평가 데이터 정리 완료');
    } catch (error) {
      console.error('❌ 평가 데이터 정리 오류:', error);
      throw error;
    }
  }

  // ===== 평가대상별 사전 점수 관리 메서드들 =====

  // 모든 평가대상별 사전 점수 조회
  async getAllCandidatePresetScores(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('candidate_preset_scores')
        .select(`
          *,
          candidates:candidate_id (id, name, department),
          evaluation_items:evaluation_item_id (id, name, max_score, is_quantitative)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('getAllCandidatePresetScores error:', error);
      throw error;
    }
  }

  // 평가대상별 사전 점수 등록/수정
  async upsertCandidatePresetScore(data: any): Promise<any> {
    try {
      const { data: result, error } = await supabase
        .from('candidate_preset_scores')
        .upsert({
          candidate_id: data.candidateId,
          evaluation_item_id: data.evaluationItemId,
          preset_score: data.presetScore,
          apply_preset: data.applyPreset || false,
          notes: data.notes || null
        }, {
          onConflict: 'candidate_id,evaluation_item_id'
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('upsertCandidatePresetScore error:', error);
      throw error;
    }
  }

  // 평가대상별 사전 점수 삭제
  async deleteCandidatePresetScore(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('candidate_preset_scores')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('deleteCandidatePresetScore error:', error);
      throw error;
    }
  }

  // 특정 평가대상의 사전 점수 조회 (평가자용)
  async getCandidatePresetScores(candidateId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('candidate_preset_scores')
        .select(`
          *,
          evaluation_items:evaluation_item_id (id, name, max_score, is_quantitative)
        `)
        .eq('candidate_id', candidateId)
        .eq('evaluation_items.is_quantitative', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('getCandidatePresetScores error:', error);
      throw error;
    }
  }

  // 평가자용 후보자별 사전점수 조회
  async getPresetScoresByCandidateId(candidateId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('candidate_preset_scores')
        .select('*')
        .eq('candidate_id', candidateId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('getPresetScoresByCandidateId error:', error);
      throw error;
    }
  }

  // 전체 사전점수 조회
  async getAllPresetScores(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('candidate_preset_scores')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('getAllPresetScores error:', error);
      throw error;
    }
  }

  // 사전점수 등록/수정 (새로운 형식)
  async upsertPresetScore(data: {
    candidateId: number;
    evaluationItemId: number;
    presetScore: number;
    applyPreset: boolean;
  }): Promise<any> {
    try {
      const { data: result, error } = await supabase
        .from('candidate_preset_scores')
        .upsert({
          candidate_id: data.candidateId,
          evaluation_item_id: data.evaluationItemId,
          preset_score: data.presetScore,
          apply_preset: data.applyPreset
        }, {
          onConflict: 'candidate_id,evaluation_item_id'
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('upsertPresetScore error:', error);
      throw error;
    }
  }

  // 🎯 새로운 평가 시스템 - 완전 유연한 구조

  // 평가 세션 저장/업데이트 (템플릿 스냅샷 포함)
  async saveEvaluationSession(data: {
    evaluatorId: number;
    candidateId: number;
    templateSnapshot: any;
    totalScore: number;
    maxPossibleScore: number;
    isCompleted: boolean;
  }): Promise<any> {
    console.log('💾 새 평가 세션 저장:', data);

    const { error } = await supabase
      .from('evaluation_sessions')
      .upsert({
        evaluator_id: data.evaluatorId,
        candidate_id: data.candidateId,
        template_snapshot: data.templateSnapshot,
        total_score: data.totalScore,
        max_possible_score: data.maxPossibleScore,
        is_completed: data.isCompleted,
        has_temporary_data: !data.isCompleted,
        completed_at: data.isCompleted ? new Date().toISOString() : null,
      }, {
        onConflict: 'evaluator_id,candidate_id'
      });

    if (error) {
      console.error('❌ 평가 세션 저장 실패:', error);
      throw new Error(`평가 세션 저장 실패: ${error.message}`);
    }

    console.log('✅ 평가 세션 저장 성공 (완료 상태:', data.isCompleted, ')');
    return { success: true };
  }

  // 개별 항목 점수 저장
  async saveEvaluationItemScore(data: {
    evaluatorId: number;
    candidateId: number;
    evaluationItemId: number;
    evaluationItemSnapshot: any;
    score: number;
    comments?: string;
  }): Promise<any> {
    console.log('💾 개별 항목 점수 저장:', data);

    const { error } = await supabase
      .from('evaluation_item_scores')
      .upsert({
        evaluator_id: data.evaluatorId,
        candidate_id: data.candidateId,
        evaluation_item_id: data.evaluationItemId,
        evaluation_item_snapshot: data.evaluationItemSnapshot,
        score: data.score,
        comments: data.comments || null,
      }, {
        onConflict: 'evaluator_id,candidate_id,evaluation_item_id'
      });

    if (error) {
      console.error('❌ 개별 점수 저장 실패:', error);
      throw new Error(`개별 점수 저장 실패: ${error.message}`);
    }

    console.log('✅ 개별 점수 저장 성공');
    return { success: true };
  }

  // 🎯 기존 API 호환성을 위한 래퍼 메서드 (인터페이스 동일)
  async saveTemporaryEvaluationNew(data: { 
    evaluatorId: number;
    candidateId: number;
    scores: Record<string, number>;
    totalScore: number;
    isCompleted: boolean;
  }): Promise<any> {
    console.log('📝 새 시스템으로 평가 저장 (기존 API 호환):', data);
    
    try {
      // 1. 현재 템플릿 정보 가져오기
      const categories = await this.getAllCategories();
      const evaluationItems = await this.getAllEvaluationItems();
      const systemConfig = await this.getSystemConfig();
      
      // 2. 템플릿 스냅샷 생성
      const templateSnapshot = {
        categories,
        evaluationItems,
        systemConfig,
        createdAt: new Date().toISOString()
      };

      // 3. 총 배점 계산
      const maxPossibleScore = evaluationItems.reduce((sum, item) => sum + (item.maxScore || 0), 0);

      // 4. 평가 세션 저장
      await this.saveEvaluationSession({
        evaluatorId: data.evaluatorId,
        candidateId: data.candidateId,
        templateSnapshot,
        totalScore: data.totalScore,
        maxPossibleScore,
        isCompleted: data.isCompleted
      });

      // 5. 개별 점수들 저장
      for (const [itemIdStr, score] of Object.entries(data.scores)) {
        const itemId = parseInt(itemIdStr);
        const evaluationItem = evaluationItems.find(item => item.id === itemId);
        
        if (evaluationItem) {
          await this.saveEvaluationItemScore({
            evaluatorId: data.evaluatorId,
            candidateId: data.candidateId,
            evaluationItemId: itemId,
            evaluationItemSnapshot: evaluationItem,
            score
          });
        } else {
          console.warn(`⚠️ 평가항목 ID ${itemId}를 찾을 수 없습니다.`);
        }
      }

      console.log('✅ 새 시스템 평가 저장 완료');
      return { success: true, message: '평가가 저장되었습니다.' };

    } catch (error) {
      console.error('❌ 새 시스템 평가 저장 실패:', error);
      throw error;
    }
  }

  // 🎯 기존 API 호환성을 위한 조회 메서드 (인터페이스 동일)
  async getEvaluationStatusNew(evaluatorId: number, candidateId: number): Promise<any> {
    console.log('📖 새 시스템에서 평가 데이터 조회:', { evaluatorId, candidateId });

    try {
      // 1. 평가 세션 조회
      const { data: session, error: sessionError } = await supabase
        .from('evaluation_sessions')
        .select('*')
        .eq('evaluator_id', evaluatorId)
        .eq('candidate_id', candidateId)
        .maybeSingle();

      if (sessionError) {
        console.error('❌ 평가 세션 조회 오류:', sessionError);
        throw sessionError;
      }

      // 2. 개별 점수들 조회 (항상 이것을 기준으로 함)
      const { data: itemScores, error: scoresError } = await supabase
        .from('evaluation_item_scores')
        .select('*')
        .eq('evaluator_id', evaluatorId)
        .eq('candidate_id', candidateId);

      if (scoresError) {
        console.error('❌ 개별 점수 조회 오류:', scoresError);
        throw scoresError;
      }

      // 3. 데이터가 없는 경우
      if (!session) {
        console.log('📝 평가 데이터 없음 - 빈 결과 반환');
        return {
          isCompleted: false,
          hasTemporaryData: false,
          hasTemporarySave: false,
          scores: {},
          totalScore: 0
        };
      }

      // 4. 개별 점수들을 기존 API 형태로 변환
      const scores: Record<string, number> = {};
      let calculatedTotalScore = 0;

      itemScores?.forEach(item => {
        scores[item.evaluation_item_id.toString()] = item.score;
        calculatedTotalScore += item.score; // 🔧 개별 점수 합계로 총점 계산
      });

      // 5. 🔧 수정: 항상 개별 점수 합계 사용
      console.log('✅ 점수 계산 완료:', { 
        세션총점: session.total_score, 
        계산된총점: calculatedTotalScore,
        개별점수수: itemScores?.length || 0
      });

      return {
        isCompleted: session.is_completed || false,
        hasTemporaryData: session.has_temporary_data || false,
        hasTemporarySave: session.has_temporary_data || false,
        scores,
        totalScore: calculatedTotalScore // 🔧 항상 개별 점수 합계 사용
      };

    } catch (error) {
      console.error('❌ 새 시스템 평가 데이터 조회 실패:', error);
      throw error;
    }
  }

  // 🔧 중복 평가 데이터 정리 함수
  async cleanupDuplicateEvaluations(): Promise<void> {
    console.log('🧹 중복 평가 데이터 정리 시작...');
    
    try {
      // 1. 모든 evaluation_sessions 데이터 조회
      const { data: allSessions, error: sessionsError } = await supabase
        .from('evaluation_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (sessionsError) {
        console.error('❌ 평가 세션 조회 오류:', sessionsError);
        return;
      }

      if (!allSessions || allSessions.length === 0) {
        console.log('📝 정리할 세션이 없습니다.');
        return;
      }

      console.log('📊 총 세션 수:', allSessions.length);

      // 2. 평가자-후보자 조합별로 그룹화하고 중복 찾기
      const sessionGroups = new Map<string, any[]>();
      
      for (const session of allSessions) {
        const key = `${session.evaluator_id}-${session.candidate_id}`;
        if (!sessionGroups.has(key)) {
          sessionGroups.set(key, []);
        }
        sessionGroups.get(key)!.push(session);
      }

      // 3. 중복된 세션들 정리 (최신 것만 유지)
      let duplicatesRemoved = 0;
      
      for (const [key, sessions] of sessionGroups) {
        if (sessions.length > 1) {
          console.log(`🔍 중복 발견: ${key} (${sessions.length}개)`);
          
          // 최신 세션 1개만 유지하고 나머지 삭제
          const [keepSession, ...duplicateSessions] = sessions;
          
          for (const duplicateSession of duplicateSessions) {
            const { error: deleteError } = await supabase
              .from('evaluation_sessions')
              .delete()
              .eq('id', duplicateSession.id);
              
            if (deleteError) {
              console.error(`❌ 중복 세션 삭제 오류 (ID: ${duplicateSession.id}):`, deleteError);
            } else {
              duplicatesRemoved++;
              console.log(`🗑️ 중복 세션 삭제: ${duplicateSession.id}`);
            }
          }
        }
      }

      console.log(`✅ 중복 데이터 정리 완료: ${duplicatesRemoved}개 제거`);
      
    } catch (error) {
      console.error('❌ 중복 데이터 정리 실패:', error);
    }
  }

  // 🔄 기존 evaluations 테이블 데이터를 새로운 시스템으로 마이그레이션
  async migrateOldEvaluations(): Promise<void> {
    console.log('🔄 기존 평가 데이터 마이그레이션 시작...');
    
    try {
      // 1. 기존 evaluations 테이블에서 완료된 평가 데이터 조회
      const { data: oldEvaluations, error: oldError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('is_completed', true);

      if (oldError) {
        console.log('📝 기존 evaluations 테이블이 없거나 조회 실패:', oldError.message);
        return;
      }

      if (!oldEvaluations || oldEvaluations.length === 0) {
        console.log('📝 마이그레이션할 기존 데이터가 없습니다.');
        return;
      }

      console.log('📊 마이그레이션할 기존 평가 데이터:', oldEvaluations.length, '건');

      // 2. 현재 템플릿 정보 가져오기
      const categories = await this.getAllCategories();
      const evaluationItems = await this.getAllEvaluationItems();
      const systemConfig = await this.getSystemConfig();
      
      const templateSnapshot = {
        categories,
        evaluationItems,
        systemConfig,
        migratedAt: new Date().toISOString()
      };

      const maxPossibleScore = evaluationItems.reduce((sum, item) => sum + (item.maxScore || 0), 0);

      // 3. 각 기존 평가를 새로운 시스템으로 마이그레이션
      let migratedCount = 0;
      
      for (const oldEvaluation of oldEvaluations) {
        try {
          // 이미 새로운 시스템에 있는지 확인
          const { data: existingSession } = await supabase
            .from('evaluation_sessions')
            .select('id')
            .eq('evaluator_id', oldEvaluation.evaluator_id)
            .eq('candidate_id', oldEvaluation.candidate_id)
            .maybeSingle();

          if (existingSession) {
            console.log(`⏭️ 이미 마이그레이션됨: 평가자 ${oldEvaluation.evaluator_id}, 후보자 ${oldEvaluation.candidate_id}`);
            continue;
          }

          // 새로운 시스템에 평가 세션 저장
          await this.saveEvaluationSession({
            evaluatorId: oldEvaluation.evaluator_id,
            candidateId: oldEvaluation.candidate_id,
            templateSnapshot,
            totalScore: oldEvaluation.total_score || 0,
            maxPossibleScore,
            isCompleted: true
          });

          // 개별 점수들도 저장 (scores JSON에서 추출)
          const scores = oldEvaluation.scores || {};
          for (const [itemIdStr, score] of Object.entries(scores)) {
            const itemId = parseInt(itemIdStr);
            const evaluationItem = evaluationItems.find(item => item.id === itemId);
            
            if (evaluationItem && typeof score === 'number') {
              await this.saveEvaluationItemScore({
                evaluatorId: oldEvaluation.evaluator_id,
                candidateId: oldEvaluation.candidate_id,
                evaluationItemId: itemId,
                evaluationItemSnapshot: evaluationItem,
                score
              });
            }
          }

          migratedCount++;
          console.log(`✅ 마이그레이션 완료: 평가자 ${oldEvaluation.evaluator_id}, 후보자 ${oldEvaluation.candidate_id}`);
          
        } catch (migrationError) {
          console.error(`❌ 개별 마이그레이션 실패 (평가자 ${oldEvaluation.evaluator_id}, 후보자 ${oldEvaluation.candidate_id}):`, migrationError);
        }
      }

      console.log(`✅ 기존 데이터 마이그레이션 완료: ${migratedCount}건 처리`);
      
    } catch (error) {
      console.error('❌ 기존 데이터 마이그레이션 실패:', error);
    }
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