import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// System Configuration
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  evaluationTitle: text("evaluation_title").notNull().default("종합평가시스템"),
  systemName: text("system_name"),
  description: text("description"),
  adminEmail: text("admin_email"),
  maxEvaluators: integer("max_evaluators"),
  maxCandidates: integer("max_candidates"),
  evaluationDeadline: timestamp("evaluation_deadline"),
  allowPartialSubmission: boolean("allow_partial_submission").default(false),
  enableNotifications: boolean("enable_notifications").default(false),
  allowPublicResults: boolean("allow_public_results").default(false),
  isEvaluationActive: boolean("is_evaluation_active").notNull().default(false),
  evaluationStartDate: timestamp("evaluation_start_date"),
  evaluationEndDate: timestamp("evaluation_end_date"),
  maxScore: integer("max_score").default(100),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admin Users
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Evaluators
export const evaluators = pgTable("evaluators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  department: text("department").notNull(),
  password: text("password").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Evaluation Categories
export const evaluationCategories = pgTable("evaluation_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("evaluation"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Evaluation Items
export const evaluationItems = pgTable("evaluation_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => evaluationCategories.id).notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  maxScore: integer("max_score").notNull().default(10),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull().default("1.00"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isQuantitative: boolean("is_quantitative").notNull().default(false),
  hasPresetScores: boolean("has_preset_scores").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Category Options (for candidate categorization)
export const categoryOptions = pgTable("category_options", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "main" or "sub"
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Candidates
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  position: text("position").notNull(),
  category: text("category"),
  mainCategory: text("main_category"),
  subCategory: text("sub_category"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Evaluations (Scores)
export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  evaluatorId: integer("evaluator_id").references(() => evaluators.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  itemId: integer("item_id").references(() => evaluationItems.id).notNull(),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  comments: text("comments"),
  isFinal: boolean("is_final").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Evaluation Submissions (Track completion status)
export const evaluationSubmissions = pgTable("evaluation_submissions", {
  id: serial("id").primaryKey(),
  evaluatorId: integer("evaluator_id").references(() => evaluators.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

// Preset Score Options (Pre-configured score options for quantitative evaluation items)
export const presetScoreOptions = pgTable("preset_score_options", {
  id: serial("id").primaryKey(),
  evaluationItemId: integer("evaluation_item_id").references(() => evaluationItems.id).notNull(),
  label: text("label").notNull(), // 예: "우수", "보통", "미흡", "매우미흡"
  score: integer("score").notNull(), // 해당 등급의 점수
  description: text("description"), // 등급 설명
  sortOrder: integer("sort_order").notNull().default(0), // 표시 순서
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Candidate Preset Scores (Individual preset scores for each candidate and evaluation item)
export const candidatePresetScores = pgTable("candidate_preset_scores", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  evaluationItemId: integer("evaluation_item_id").references(() => evaluationItems.id).notNull(),
  presetScore: integer("preset_score").notNull(), // 사전 점수 (숫자 직접 입력)
  applyPreset: boolean("apply_preset").notNull().default(false), // 사전점수 적용 여부
  notes: text("notes"), // 메모
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Preset Scores (Deprecated - keeping for backward compatibility)
export const presetScores = pgTable("preset_scores", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  itemId: integer("item_id").references(() => evaluationItems.id).notNull(),
  score: integer("score").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Evaluation Templates (Templates for evaluation forms)
export const evaluationTemplates = pgTable("evaluation_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  templateData: jsonb("template_data").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Create insert schemas
export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
});

export const insertEvaluatorSchema = createInsertSchema(evaluators).omit({
  id: true,
  createdAt: true,
});

export const insertEvaluationCategorySchema = createInsertSchema(evaluationCategories).omit({
  id: true,
});

export const insertEvaluationItemSchema = createInsertSchema(evaluationItems).omit({
  id: true,
});

export const insertCategoryOptionSchema = createInsertSchema(categoryOptions).omit({
  id: true,
  createdAt: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEvaluationSchema = createInsertSchema(evaluations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEvaluationSubmissionSchema = createInsertSchema(evaluationSubmissions).omit({
  id: true,
  createdAt: true,
});

export const insertPresetScoreSchema = createInsertSchema(presetScores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPresetScoreOptionSchema = createInsertSchema(presetScoreOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCandidatePresetScoreSchema = createInsertSchema(candidatePresetScores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEvaluationTemplateSchema = createInsertSchema(evaluationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Infer types
export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type Evaluator = typeof evaluators.$inferSelect;
export type InsertEvaluator = z.infer<typeof insertEvaluatorSchema>;

export type EvaluationCategory = typeof evaluationCategories.$inferSelect;
export type InsertEvaluationCategory = z.infer<typeof insertEvaluationCategorySchema>;

export type EvaluationItem = typeof evaluationItems.$inferSelect;
export type InsertEvaluationItem = z.infer<typeof insertEvaluationItemSchema>;

export type CategoryOption = typeof categoryOptions.$inferSelect;
export type InsertCategoryOption = z.infer<typeof insertCategoryOptionSchema>;

export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;

export type EvaluationSubmission = typeof evaluationSubmissions.$inferSelect;
export type InsertEvaluationSubmission = z.infer<typeof insertEvaluationSubmissionSchema>;

export type PresetScore = typeof presetScores.$inferSelect;
export type InsertPresetScore = z.infer<typeof insertPresetScoreSchema>;

export type PresetScoreOption = typeof presetScoreOptions.$inferSelect;
export type InsertPresetScoreOption = z.infer<typeof insertPresetScoreOptionSchema>;

export type CandidatePresetScore = typeof candidatePresetScores.$inferSelect;
export type InsertCandidatePresetScore = z.infer<typeof insertCandidatePresetScoreSchema>;

export type EvaluationTemplate = typeof evaluationTemplates.$inferSelect;
export type InsertEvaluationTemplate = z.infer<typeof insertEvaluationTemplateSchema>;
