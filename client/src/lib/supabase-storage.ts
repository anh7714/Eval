import { supabase } from './supabase';

// Supabase Direct Storage Service
// 백엔드 연결이 안될 때 프론트엔드에서 직접 Supabase를 사용

export class SupabaseDirectStorage {
  // System Config
  async getSystemConfig() {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return data;
  }

  async updateSystemConfig(config: any) {
    const existing = await this.getSystemConfig();
    
    if (existing) {
      const { data, error } = await supabase
        .from('system_config')
        .update({ ...config, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('system_config')
        .insert(config)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  }

  // Admin Management
  async getAdminByUsername(username: string) {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Candidates Management
  async getAllCandidates() {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async createCandidate(candidate: any) {
    const { data, error } = await supabase
      .from('candidates')
      .insert(candidate)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateCandidate(id: number, candidate: any) {
    const { data, error } = await supabase
      .from('candidates')
      .update({ ...candidate, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteCandidate(id: number) {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Evaluators Management
  async getAllEvaluators() {
    const { data, error } = await supabase
      .from('evaluators')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async createEvaluator(evaluator: any) {
    const { data, error } = await supabase
      .from('evaluators')
      .insert(evaluator)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateEvaluator(id: number, evaluator: any) {
    const { data, error } = await supabase
      .from('evaluators')
      .update({ ...evaluator, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteEvaluator(id: number) {
    const { error } = await supabase
      .from('evaluators')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Categories Management
  async getAllCategories() {
    const { data, error } = await supabase
      .from('evaluation_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async createCategory(category: any) {
    const { data, error } = await supabase
      .from('evaluation_categories')
      .insert(category)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateCategory(id: number, category: any) {
    const { data, error } = await supabase
      .from('evaluation_categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteCategory(id: number) {
    const { error } = await supabase
      .from('evaluation_categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Evaluation Items Management
  async getAllEvaluationItems() {
    const { data, error } = await supabase
      .from('evaluation_items')
      .select(`
        *,
        category:evaluation_categories(*)
      `)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async createEvaluationItem(item: any) {
    const { data, error } = await supabase
      .from('evaluation_items')
      .insert(item)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateEvaluationItem(id: number, item: any) {
    const { data, error } = await supabase
      .from('evaluation_items')
      .update(item)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteEvaluationItem(id: number) {
    const { error } = await supabase
      .from('evaluation_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Test connection
  async testConnection() {
    try {
      const { data } = await supabase
        .from('system_config')
        .select('id')
        .limit(1);
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  }
}

export const supabaseStorage = new SupabaseDirectStorage();