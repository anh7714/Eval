-- 평가표 템플릿 테이블 생성
CREATE TABLE IF NOT EXISTS evaluation_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 템플릿 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_evaluation_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evaluation_templates_updated_at
  BEFORE UPDATE ON evaluation_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_evaluation_templates_updated_at();

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_evaluation_templates_is_active ON evaluation_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_evaluation_templates_is_default ON evaluation_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_evaluation_templates_created_at ON evaluation_templates(created_at);

-- 기본값 설정을 위한 unique constraint (하나의 기본 템플릿만 허용)
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluation_templates_unique_default 
  ON evaluation_templates(is_default) 
  WHERE is_default = true AND is_active = true;

-- 권한 설정 (필요한 경우)
-- ALTER TABLE evaluation_templates ENABLE ROW LEVEL SECURITY;