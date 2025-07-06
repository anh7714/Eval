-- Supabase 데이터베이스 수동 설정 SQL
-- 이 SQL을 Supabase SQL Editor에서 실행하세요

-- 1. 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  evaluation_title VARCHAR(255) DEFAULT '종합평가시스템',
  is_evaluation_active BOOLEAN DEFAULT false,
  evaluation_start_date TIMESTAMP,
  evaluation_end_date TIMESTAMP,
  max_score INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 관리자 테이블
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 3. 평가자 테이블
CREATE TABLE IF NOT EXISTS evaluators (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  department VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. 평가 카테고리 테이블
CREATE TABLE IF NOT EXISTS evaluation_categories (
  id SERIAL PRIMARY KEY,
  category_code VARCHAR(50) NOT NULL,
  category_name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 5. 평가 항목 테이블
CREATE TABLE IF NOT EXISTS evaluation_items (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES evaluation_categories(id) ON DELETE CASCADE,
  item_code VARCHAR(50) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  max_score INTEGER DEFAULT 10,
  weight DECIMAL(5,2) DEFAULT 1.0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 6. 후보자 테이블
CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  category VARCHAR(255) DEFAULT '',
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. 평가 테이블
CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  evaluator_id INTEGER REFERENCES evaluators(id) ON DELETE CASCADE,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES evaluation_items(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  comments TEXT,
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(evaluator_id, candidate_id, item_id)
);

-- 8. 평가 제출 테이블
CREATE TABLE IF NOT EXISTS evaluation_submissions (
  id SERIAL PRIMARY KEY,
  evaluator_id INTEGER REFERENCES evaluators(id) ON DELETE CASCADE,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  scores JSONB DEFAULT '{}',
  total_score INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(evaluator_id, candidate_id)
);

-- 기본 데이터 삽입
INSERT INTO system_config (evaluation_title, is_evaluation_active, max_score) 
VALUES ('종합평가시스템', false, 100)
ON CONFLICT DO NOTHING;

INSERT INTO admins (username, password, name) 
VALUES ('admin', 'admin123', '시스템 관리자')
ON CONFLICT (username) DO NOTHING;

-- 예시 평가 카테고리
INSERT INTO evaluation_categories (category_code, category_name, description, sort_order) VALUES
('COMPETENCY', '역량평가', '업무 수행 역량 평가', 1),
('ATTITUDE', '태도평가', '근무 태도 및 협업 능력 평가', 2),
('PERFORMANCE', '성과평가', '업무 성과 및 결과 평가', 3)
ON CONFLICT DO NOTHING;

-- 예시 평가 항목
INSERT INTO evaluation_items (category_id, item_code, item_name, description, max_score, weight, sort_order) VALUES
(1, 'COMP_01', '전문성', '담당 업무 전문 지식 보유', 10, 1.0, 1),
(1, 'COMP_02', '문제해결력', '업무상 문제 해결 능력', 10, 1.2, 2),
(2, 'ATT_01', '책임감', '업무에 대한 책임감과 성실함', 10, 0.8, 3),
(2, 'ATT_02', '협업능력', '동료와의 협업 및 소통 능력', 10, 1.0, 4),
(3, 'PERF_01', '목표달성', '설정된 목표 달성도', 10, 1.5, 5),
(3, 'PERF_02', '품질관리', '업무 품질 관리 능력', 10, 1.0, 6)
ON CONFLICT DO NOTHING;

-- 테이블 생성 확인
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'system_config', 'admins', 'evaluators', 'evaluation_categories', 
    'evaluation_items', 'candidates', 'evaluations', 'evaluation_submissions'
  )
ORDER BY table_name;