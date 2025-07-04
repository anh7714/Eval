import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create supabase client only if environment variables are available
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database types for type safety
export interface Database {
  public: {
    Tables: {
      system_config: {
        Row: {
          id: number;
          evaluation_title: string;
          system_name: string | null;
          description: string | null;
          admin_email: string | null;
          max_evaluators: number | null;
          max_candidates: number | null;
          evaluation_deadline: string | null;
          allow_partial_submission: boolean;
          enable_notifications: boolean;
          is_evaluation_active: boolean;
          allow_public_results: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          evaluation_title?: string;
          system_name?: string | null;
          description?: string | null;
          admin_email?: string | null;
          max_evaluators?: number | null;
          max_candidates?: number | null;
          evaluation_deadline?: string | null;
          allow_partial_submission?: boolean;
          enable_notifications?: boolean;
          is_evaluation_active?: boolean;
          allow_public_results?: boolean;
        };
      };
      admins: {
        Row: {
          id: number;
          username: string;
          password: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      candidates: {
        Row: {
          id: number;
          name: string;
          department: string;
          position: string;
          category: string;
          description: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          department: string;
          position: string;
          category?: string;
          description?: string;
          sort_order?: number;
          is_active?: boolean;
        };
      };
      evaluators: {
        Row: {
          id: number;
          name: string;
          email: string | null;
          department: string | null;
          password: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          email?: string | null;
          department?: string | null;
          password: string;
          is_active?: boolean;
        };
      };
      evaluation_categories: {
        Row: {
          id: number;
          category_code: string;
          category_name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          category_code: string;
          category_name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
      };
      evaluation_items: {
        Row: {
          id: number;
          category_id: number;
          item_code: string;
          item_name: string;
          description: string | null;
          max_score: number;
          weight: number;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          category_id: number;
          item_code: string;
          item_name: string;
          description?: string | null;
          max_score?: number;
          weight?: number;
          sort_order?: number;
          is_active?: boolean;
        };
      };
    };
  };
}

// Test connection function
export async function testSupabaseConnection() {
  try {
    if (!supabase) {
      throw new Error('Supabase client not available - missing environment variables');
    }
    
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    
    console.log('Supabase connection successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return { success: false, error };
  }
}