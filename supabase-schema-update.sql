-- Supabase 데이터베이스 스키마 업데이트
-- 시스템 설정 테이블에 새로운 컬럼 추가

-- system_config 테이블에 새로운 컬럼들 추가
ALTER TABLE system_config 
ADD COLUMN IF NOT EXISTS system_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS admin_email TEXT,
ADD COLUMN IF NOT EXISTS max_evaluators INTEGER,
ADD COLUMN IF NOT EXISTS max_candidates INTEGER,
ADD COLUMN IF NOT EXISTS evaluation_deadline TIMESTAMP,
ADD COLUMN IF NOT EXISTS allow_partial_submission BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_public_results BOOLEAN DEFAULT false;

-- 기존 데이터 확인
SELECT * FROM system_config;

-- 컬럼 추가 완료 후 이 스크립트를 Supabase SQL Editor에서 실행하세요.