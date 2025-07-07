-- 평가대상별 사전 점수 테이블 생성
CREATE TABLE IF NOT EXISTS candidate_preset_scores (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  evaluation_item_id INTEGER REFERENCES evaluation_items(id) ON DELETE CASCADE NOT NULL,
  preset_score INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(candidate_id, evaluation_item_id)  -- 같은 평가대상과 평가항목 조합은 하나의 사전 점수만 허용
);

-- 인덱스 추가 (성능 향상을 위해)
CREATE INDEX IF NOT EXISTS idx_candidate_preset_scores_candidate ON candidate_preset_scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_preset_scores_item ON candidate_preset_scores(evaluation_item_id);
CREATE INDEX IF NOT EXISTS idx_candidate_preset_scores_candidate_item ON candidate_preset_scores(candidate_id, evaluation_item_id);

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_candidate_preset_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidate_preset_scores_updated_at
  BEFORE UPDATE ON candidate_preset_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_candidate_preset_scores_updated_at();

-- 코멘트 추가
COMMENT ON TABLE candidate_preset_scores IS '평가대상별 정량 평가항목 사전 점수';
COMMENT ON COLUMN candidate_preset_scores.candidate_id IS '평가대상 ID';
COMMENT ON COLUMN candidate_preset_scores.evaluation_item_id IS '평가항목 ID (정량 평가항목만)';
COMMENT ON COLUMN candidate_preset_scores.preset_score IS '사전 설정된 점수';
COMMENT ON COLUMN candidate_preset_scores.notes IS '점수 설정 근거나 메모';