// Note: Client-side Supabase connection is disabled
// All database operations should go through the server API
export const supabase = null;

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

// Note: Direct Supabase connection test is disabled
// All database operations should go through the server API
export async function testSupabaseConnection() {
  console.log('Supabase client connection disabled - using server API instead');
  return { 
    success: true, 
    data: { message: 'Using server API for database operations' } 
  };
}