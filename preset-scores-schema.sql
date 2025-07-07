-- 평가 항목에 정량 평가 및 사전 점수 설정 기능 추가
-- evaluation_items 테이블에 새로운 컬럼 추가

ALTER TABLE evaluation_items 
ADD COLUMN IF NOT EXISTS is_quantitative BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_preset_scores BOOLEAN DEFAULT FALSE;

-- 사전 점수 테이블 생성
CREATE TABLE IF NOT EXISTS preset_scores (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidates(id) NOT NULL,
    item_id INTEGER REFERENCES evaluation_items(id) NOT NULL,
    score INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(candidate_id, item_id)  -- 같은 평가대상과 평가항목 조합은 하나의 사전 점수만 허용
);

-- 인덱스 추가 (성능 향상을 위해)
CREATE INDEX IF NOT EXISTS idx_preset_scores_candidate ON preset_scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_preset_scores_item ON preset_scores(item_id);
CREATE INDEX IF NOT EXISTS idx_preset_scores_candidate_item ON preset_scores(candidate_id, item_id);

-- 기존 evaluation_items에 정량/정성 구분 기본값 설정 (예시)
-- 필요시 각 항목별로 수동 업데이트

-- 예시: 기존 평가항목 중 일부를 정량 평가로 설정
-- UPDATE evaluation_items SET is_quantitative = TRUE WHERE name LIKE '%매출%';
-- UPDATE evaluation_items SET is_quantitative = TRUE WHERE name LIKE '%직원%';
-- UPDATE evaluation_items SET is_quantitative = TRUE WHERE name LIKE '%경력%';

-- 정량 평가 항목에 사전 점수 설정 기능 활성화
-- UPDATE evaluation_items SET has_preset_scores = TRUE WHERE is_quantitative = TRUE;

-- 코멘트 추가
COMMENT ON TABLE preset_scores IS '평가대상별 평가항목의 사전 설정 점수를 저장하는 테이블';
COMMENT ON COLUMN preset_scores.candidate_id IS '평가대상 ID (candidates 테이블 참조)';
COMMENT ON COLUMN preset_scores.item_id IS '평가항목 ID (evaluation_items 테이블 참조)';
COMMENT ON COLUMN preset_scores.score IS '사전 설정된 점수';
COMMENT ON COLUMN preset_scores.notes IS '점수 설정 근거나 메모';

COMMENT ON COLUMN evaluation_items.is_quantitative IS '정량 평가 여부 (TRUE: 정량, FALSE: 정성)';
COMMENT ON COLUMN evaluation_items.has_preset_scores IS '사전 점수 설정 사용 여부';