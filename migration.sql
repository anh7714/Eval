-- Data Migration SQL for Supabase
-- Execute this in Supabase SQL Editor

-- Clean up existing data
DELETE FROM evaluation_submissions;
DELETE FROM evaluations;
DELETE FROM evaluation_items;
DELETE FROM evaluation_categories;
DELETE FROM candidates;
DELETE FROM evaluators;
UPDATE system_config SET evaluation_title = '종합평가시스템', is_evaluation_active = false WHERE id = 1;

-- Migration completed