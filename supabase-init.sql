-- 평가 시스템 테이블 생성 스크립트
-- Supabase SQL Editor에서 실행하세요

-- 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  evaluation_title TEXT NOT NULL DEFAULT '종합평가시스템',
  is_evaluation_active BOOLEAN NOT NULL DEFAULT false,
  evaluation_start_date TIMESTAMP,
  evaluation_end_date TIMESTAMP,
  max_score INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 관리자 테이블
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 평가위원 테이블
CREATE TABLE IF NOT EXISTS evaluators (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  department TEXT NOT NULL,
  password TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 평가 카테고리 테이블
CREATE TABLE IF NOT EXISTS evaluation_categories (
  id SERIAL PRIMARY KEY,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 평가 항목 테이블
CREATE TABLE IF NOT EXISTS evaluation_items (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES evaluation_categories(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  max_score INTEGER NOT NULL,
  weight TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 평가대상 테이블 (기관명, 소속, 직책으로 필드명 변경)
CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL, -- 기관명(성명)
  department TEXT NOT NULL, -- 소속(부서)
  position TEXT NOT NULL, -- 직책(직급)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 평가 결과 테이블
CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  evaluator_id INTEGER NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES evaluation_items(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  comments TEXT,
  is_final BOOLEAN NOT NULL DEFAULT false,
  max_score INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(evaluator_id, candidate_id, item_id)
);

-- 평가 제출 테이블
CREATE TABLE IF NOT EXISTS evaluation_submissions (
  id SERIAL PRIMARY KEY,
  evaluator_id INTEGER NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(evaluator_id, candidate_id)
);

-- 기본 관리자 계정 생성
INSERT INTO admins (username, password, name, is_active, created_at) 
VALUES ('admin', 'admin123', '시스템 관리자', true, NOW())
ON CONFLICT (username) DO NOTHING;

-- 기본 시스템 설정
INSERT INTO system_config (evaluation_title, is_evaluation_active, created_at, updated_at)
VALUES ('종합평가시스템', false, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_candidate ON evaluations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_item ON evaluations(item_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_items_category ON evaluation_items(category_id);
CREATE INDEX IF NOT EXISTS idx_evaluators_active ON evaluators(is_active);
CREATE INDEX IF NOT EXISTS idx_candidates_active ON candidates(is_active);

-- 성공 메시지
SELECT 'Supabase 평가 시스템 데이터베이스가 성공적으로 초기화되었습니다!' as message;