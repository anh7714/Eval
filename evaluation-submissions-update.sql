-- evaluation_submissions 테이블에 필요한 컬럼들 추가
ALTER TABLE evaluation_submissions 
ADD COLUMN IF NOT EXISTS scores JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- 기존 데이터가 있다면 기본값으로 설정
UPDATE evaluation_submissions 
SET scores = '{}', total_score = 0, is_completed = false 
WHERE scores IS NULL OR total_score IS NULL OR is_completed IS NULL;