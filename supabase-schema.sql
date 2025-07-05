-- Supabase Schema Creation Script
-- Execute this in the Supabase SQL Editor

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS evaluation_submissions;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS evaluation_items;
DROP TABLE IF EXISTS evaluation_categories;
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS evaluators;
DROP TABLE IF EXISTS system_config;
DROP TABLE IF EXISTS admins;

-- Create admins table
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Create system_config table
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    evaluation_title VARCHAR(255) DEFAULT '종합평가시스템',
    system_name VARCHAR(255),
    description TEXT,
    admin_email VARCHAR(255),
    max_evaluators INTEGER,
    max_candidates INTEGER,
    evaluation_deadline TIMESTAMP,
    allow_partial_submission BOOLEAN DEFAULT false,
    enable_notifications BOOLEAN DEFAULT true,
    is_evaluation_active BOOLEAN DEFAULT false,
    allow_public_results BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create evaluators table
CREATE TABLE evaluators (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    department VARCHAR(100) DEFAULT '',
    email VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create evaluation_categories table
CREATE TABLE evaluation_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create evaluation_items table
CREATE TABLE evaluation_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES evaluation_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'score',
    max_score INTEGER DEFAULT 100,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create candidates table
CREATE TABLE candidates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) DEFAULT '',
    position VARCHAR(100) DEFAULT '',
    email VARCHAR(255),
    phone VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    main_category TEXT,
    sub_category TEXT
);

-- Create evaluations table
CREATE TABLE evaluations (
    id SERIAL PRIMARY KEY,
    evaluator_id INTEGER REFERENCES evaluators(id) ON DELETE CASCADE,
    candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES evaluation_items(id) ON DELETE CASCADE,
    score VARCHAR(10) DEFAULT '0',
    comment TEXT,
    is_submitted BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(evaluator_id, candidate_id, item_id)
);

-- Create evaluation_submissions table
CREATE TABLE evaluation_submissions (
    id SERIAL PRIMARY KEY,
    evaluator_id INTEGER REFERENCES evaluators(id) ON DELETE CASCADE,
    candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
    submitted_at TIMESTAMP DEFAULT NOW(),
    is_completed BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(evaluator_id, candidate_id)
);

-- Insert default admin account
INSERT INTO admins (username, password, name, is_active) 
VALUES ('admin', 'admin123', '시스템 관리자', true)
ON CONFLICT (username) DO NOTHING;

-- Insert default system config
INSERT INTO system_config (
    evaluation_title, 
    allow_partial_submission, 
    enable_notifications, 
    is_evaluation_active, 
    allow_public_results
) VALUES (
    '종합평가시스템', 
    false, 
    true, 
    false, 
    false
);

-- Create indexes for better performance
CREATE INDEX idx_evaluations_evaluator ON evaluations(evaluator_id);
CREATE INDEX idx_evaluations_candidate ON evaluations(candidate_id);
CREATE INDEX idx_evaluations_item ON evaluations(item_id);
CREATE INDEX idx_evaluation_items_category ON evaluation_items(category_id);
CREATE INDEX idx_evaluation_submissions_evaluator ON evaluation_submissions(evaluator_id);
CREATE INDEX idx_evaluation_submissions_candidate ON evaluation_submissions(candidate_id);