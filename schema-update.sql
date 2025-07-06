-- Update evaluation_categories table structure
ALTER TABLE evaluation_categories 
DROP COLUMN IF EXISTS category_code,
DROP COLUMN IF EXISTS category_name;

ALTER TABLE evaluation_categories 
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'evaluation',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Update evaluation_items table structure  
ALTER TABLE evaluation_items
DROP COLUMN IF EXISTS item_code,
DROP COLUMN IF EXISTS item_name;

ALTER TABLE evaluation_items
ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Update existing records to have valid names
UPDATE evaluation_categories SET name = 'Default Category' WHERE name IS NULL OR name = '';
UPDATE evaluation_items SET name = 'Default Item' WHERE name IS NULL OR name = '';
UPDATE evaluation_items SET code = 'DEFAULT_' || id WHERE code IS NULL OR code = '';

-- Make name columns NOT NULL after setting default values
ALTER TABLE evaluation_categories ALTER COLUMN name SET NOT NULL;
ALTER TABLE evaluation_items ALTER COLUMN name SET NOT NULL;
ALTER TABLE evaluation_items ALTER COLUMN code SET NOT NULL;