# Supabase 수동 설정 가이드

## 1. Supabase SQL Editor에서 테이블 생성

다음 SQL을 Supabase SQL Editor에서 실행하세요:

```sql
-- 관리자 테이블
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 후보자 테이블
CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  category VARCHAR(255) DEFAULT '',
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 평가자 테이블
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

-- 평가 카테고리 테이블
CREATE TABLE IF NOT EXISTS evaluation_categories (
  id SERIAL PRIMARY KEY,
  category_code VARCHAR(50) NOT NULL,
  category_name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 평가 항목 테이블
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

-- 평가 테이블
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

-- 평가 제출 테이블
CREATE TABLE IF NOT EXISTS evaluation_submissions (
  id SERIAL PRIMARY KEY,
  evaluator_id INTEGER REFERENCES evaluators(id) ON DELETE CASCADE,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(evaluator_id, candidate_id)
);

-- 시스템 설정 테이블
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

-- 기본 데이터 삽입
INSERT INTO admins (username, password, name) 
VALUES ('admin', 'admin123', '시스템 관리자')
ON CONFLICT (username) DO NOTHING;

INSERT INTO system_config (evaluation_title, is_evaluation_active) 
VALUES ('종합평가시스템', false)
ON CONFLICT DO NOTHING;
```

## 2. 연결 확인

테이블 생성 후 다음으로 연결 확인:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

## 3. 현재 상태

- ✅ 파일 기반 저장소 완전 작동
- ✅ 모든 기능 정상 (후보자 관리, 엑셀 업로드/다운로드)
- ⏳ Supabase 연결 문제 해결 중 (네트워크 제한)