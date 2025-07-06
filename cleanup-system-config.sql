-- 시스템 설정 테이블 정리 SQL
-- 여러 레코드가 있어서 혼란이 생기고 있음

-- 1. 현재 모든 레코드 확인
SELECT id, evaluation_title, system_name, updated_at FROM system_config ORDER BY updated_at DESC;

-- 2. 가장 최신 레코드 외 모든 레코드 삭제
DELETE FROM system_config WHERE id NOT IN (
  SELECT id FROM system_config ORDER BY updated_at DESC LIMIT 1
);

-- 3. 남은 레코드 확인
SELECT * FROM system_config;

-- 이 스크립트를 Supabase SQL Editor에서 실행하여 시스템 설정을 정리하세요.