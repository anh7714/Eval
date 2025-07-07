-- 사전점수 적용 여부 필드 추가 (기존 테이블이 있는 경우)
ALTER TABLE candidate_preset_scores 
ADD COLUMN IF NOT EXISTS apply_preset BOOLEAN NOT NULL DEFAULT FALSE;

-- 기존 데이터의 apply_preset 기본값 설정
UPDATE candidate_preset_scores 
SET apply_preset = FALSE 
WHERE apply_preset IS NULL;

-- 코멘트 업데이트
COMMENT ON COLUMN candidate_preset_scores.apply_preset IS '사전점수 적용 여부 (true: 적용, false: 미적용)';