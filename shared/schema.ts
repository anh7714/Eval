import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// System Configuration
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  evaluationTitle: text("evaluation_title").notNull().default("종합평가시스템"),
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
  categoryCode: text("category_code").notNull(),
  categoryName: text("category_name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// Evaluation Items
export const evaluationItems = pgTable("evaluation_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => evaluationCategories.id).notNull(),
  itemCode: text("item_code").notNull(),
  itemName: text("item_name").notNull(),
  description: text("description"),
  maxScore: integer("max_score").notNull().default(10),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull().default("1.00"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// Candidates
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  position: text("position").notNull(),
  category: text("category"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
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

export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;

export type EvaluationSubmission = typeof evaluationSubmissions.$inferSelect;
export type InsertEvaluationSubmission = z.infer<typeof insertEvaluationSubmissionSchema>;
