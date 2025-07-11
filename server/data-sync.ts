import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ SUPABASE_URL and SUPABASE_ANON_KEY are required");
  console.error("Please create a .env file with your Supabase credentials:");
  console.error("SUPABASE_URL=your_supabase_url");
  console.error("SUPABASE_ANON_KEY=your_supabase_anon_key");
  console.error("");
  console.error("Or set them as environment variables:");
  console.error("$env:SUPABASE_URL='your_supabase_url'");
  console.error("$env:SUPABASE_ANON_KEY='your_supabase_anon_key'");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ⚠️ 이 파일은 비활성화됨 - 관리자가 평가항목관리에서 설정한 심사표만 사용
// 하드코딩된 기본템플릿이 관리자 설정을 덮어쓰는 것을 방지

/*
// 기본 템플릿 데이터 (관리자 심사표 구조) - 비활성화
const defaultTemplate = {
  // ... 하드코딩된 템플릿 비활성화
};
*/

console.log("⚠️ data-sync는 비활성화됨: 관리자 평가항목관리에서 설정한 심사표를 사용합니다.");

// 모든 동기화 함수 비활성화
async function syncEvaluationItems() {
  console.log("⚠️ syncEvaluationItems 비활성화: 관리자 설정 사용");
  return;
}

async function syncEvaluationTemplate() {
  console.log("⚠️ syncEvaluationTemplate 비활성화: 관리자 설정 사용");  
  return;
}

async function syncAll() {
  console.log("⚠️ data-sync 전체 비활성화: 관리자 평가항목관리에서 설정한 심사표를 사용합니다.");
  return;
}

// 스크립트 실행 시 아무것도 하지 않음
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("⚠️ data-sync 비활성화: 관리자가 평가항목관리에서 설정한 심사표만 사용됩니다.");
  process.exit(0);
}

export { syncAll, syncEvaluationItems, syncEvaluationTemplate }; 