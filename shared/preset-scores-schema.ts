import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 평가항목별 사전 점수 옵션 테이블
export const presetScoreOptions = pgTable("preset_score_options", {
  id: serial("id").primaryKey(),
  evaluationItemId: integer("evaluation_item_id").notNull(), // evaluation_items 테이블 참조
  label: text("label").notNull(), // 예: "우수", "보통", "미흡", "매우미흡"
  score: integer("score").notNull(), // 해당 등급의 점수
  description: text("description"), // 등급 설명
  sortOrder: integer("sort_order").notNull().default(0), // 표시 순서
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 스키마 정의
export const insertPresetScoreOptionSchema = createInsertSchema(presetScoreOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPresetScoreOption = z.infer<typeof insertPresetScoreOptionSchema>;
export type PresetScoreOption = typeof presetScoreOptions.$inferSelect;