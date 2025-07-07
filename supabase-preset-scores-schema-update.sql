-- 사전점수 적용 여부 필드 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. candidate_preset_scores 테이블에 apply_preset 컬럼 추가
ALTER TABLE candidate_preset_scores 
ADD COLUMN IF NOT EXISTS apply_preset BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. 기존 데이터의 apply_preset 기본값 설정 (혹시 NULL이 있을 경우)
UPDATE candidate_preset_scores 
SET apply_preset = FALSE 
WHERE apply_preset IS NULL;

-- 3. 컬럼 코멘트 추가
COMMENT ON COLUMN candidate_preset_scores.apply_preset IS '사전점수 적용 여부 (true: 적용, false: 미적용)';

-- 4. 테이블 구조 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'candidate_preset_scores' 
ORDER BY ordinal_position;

-- 5. 샘플 데이터 확인 (있다면)
SELECT * FROM candidate_preset_scores LIMIT 5;