import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("student"), // 'student' or 'admin'
  leetcodeUsername: varchar("leetcode_username", { length: 100}), // Only for students
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  leetcodeUsername: text("leetcode_username").notNull().unique(),
  leetcodeProfileLink: text("leetcode_profile_link").notNull(),
  profilePhoto: text("profile_photo"), // URL to LeetCode profile photo
  batch: text("batch").notNull().default("2028"), // "2027" or "2028"
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyProgress = pgTable("daily_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  totalSolved: integer("total_solved").notNull().default(0),
  easySolved: integer("easy_solved").notNull().default(0),
  mediumSolved: integer("medium_solved").notNull().default(0),
  hardSolved: integer("hard_solved").notNull().default(0),
  dailyIncrement: integer("daily_increment").notNull().default(0),
  ranking: integer("ranking").default(0),
  acceptanceRate: integer("acceptance_rate").default(0), // Stored as percentage * 100
  totalSubmissions: integer("total_submissions").default(0),
  totalAccepted: integer("total_accepted").default(0),
  languageStats: jsonb("language_stats").default({}), // Store language-wise submission counts
  createdAt: timestamp("created_at").defaultNow(),
});

export const weeklyTrends = pgTable("weekly_trends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id).notNull(),
  weekStart: text("week_start").notNull(), // YYYY-MM-DD format
  weekEnd: text("week_end").notNull(),
  totalProblems: integer("total_problems").notNull().default(0),
  weeklyIncrement: integer("weekly_increment").notNull().default(0),
  ranking: integer("ranking").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id).notNull(),
  badgeType: text("badge_type").notNull(), // streak_master, century_coder, comeback_coder, weekly_topper
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lastSyncTime: timestamp("last_sync_time"),
  isAutoSyncEnabled: boolean("is_auto_sync_enabled").default(true),
});

export const weeklyProgressData = pgTable("weekly_progress_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id).notNull(),
  week1Score: integer("week1_score").default(0),
  week2Score: integer("week2_score").default(0),
  week3Score: integer("week3_score").default(0),
  week4Score: integer("week4_score").default(0),
  week5Score: integer("week5_score").default(0),
  currentWeekScore: integer("current_week_score").default(0), // Latest week score from CSV
  lastWeekToCurrentIncrement: integer("last_week_to_current_increment").default(0), // New increment column
  week2Progress: integer("week2_progress").default(0), // W2 - W1
  week3Progress: integer("week3_progress").default(0), // W3 - W2
  week4Progress: integer("week4_progress").default(0), // W4 - W3
  week5Progress: integer("week5_progress").default(0), // W5 - W4
  totalScore: integer("total_score").default(0),
  averageWeeklyGrowth: integer("average_weekly_growth").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Real-time LeetCode data from submission calendar
export const leetcodeRealTimeData = pgTable("leetcode_realtime_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id).notNull(),
  submissionCalendar: text("submission_calendar").notNull().default('{}'), // JSON string from LeetCode
  currentStreak: integer("current_streak").notNull().default(0),
  maxStreak: integer("max_streak").notNull().default(0),
  totalActiveDays: integer("total_active_days").notNull().default(0),
  yearlyActivity: jsonb("yearly_activity").notNull().default([]), // Array of {date, count}
  lastSyncAt: timestamp("last_sync_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboard cache table for instant loading
export const dashboardCache = pgTable("dashboard_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cacheKey: text("cache_key").notNull().unique(), // 'admin', 'university', 'batch_2027', 'batch_2028', 'student_{id}'
  cacheData: jsonb("cache_data").notNull(), // Stores the complete dashboard data as JSON
  lastUpdated: timestamp("last_updated").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // Auto-expire cached data
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
}).extend({
  batch: z.enum(["2027", "2028"]).default("2028"),
});

export const insertDailyProgressSchema = createInsertSchema(dailyProgress).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklyTrendSchema = createInsertSchema(weeklyTrends).omit({
  id: true,
  createdAt: true,
});

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  earnedAt: true,
});

export const insertWeeklyProgressDataSchema = createInsertSchema(weeklyProgressData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeetcodeRealTimeDataSchema = createInsertSchema(leetcodeRealTimeData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});

export const insertDashboardCacheSchema = createInsertSchema(dashboardCache).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type DailyProgress = typeof dailyProgress.$inferSelect;
export type InsertDailyProgress = z.infer<typeof insertDailyProgressSchema>;

export type WeeklyTrend = typeof weeklyTrends.$inferSelect;
export type InsertWeeklyTrend = z.infer<typeof insertWeeklyTrendSchema>;

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;

export type WeeklyProgressData = typeof weeklyProgressData.$inferSelect;
export type InsertWeeklyProgressData = z.infer<typeof insertWeeklyProgressDataSchema>;

export type LeetcodeRealTimeData = typeof leetcodeRealTimeData.$inferSelect;
export type InsertLeetcodeRealTimeData = z.infer<typeof insertLeetcodeRealTimeDataSchema>;

export type DashboardCache = typeof dashboardCache.$inferSelect;
export type InsertDashboardCache = z.infer<typeof insertDashboardCacheSchema>;

export type AppSettings = typeof appSettings.$inferSelect;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// API Response types
export interface LeetCodeStats {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptanceRate: number;
  ranking: number;
  totalSubmissions: number;
  totalAccepted: number;
  languageStats: Record<string, number>;
}

export interface StudentDashboardData {
  student: Student;
  stats: LeetCodeStats;
  currentStreak: number;
  maxStreak: number;
  totalActiveDays: number;
  weeklyRank: number;
  batchRank: number;
  universityRank: number;
  batchSize: number;
  universitySize: number;
  badges: Badge[];
  weeklyProgress: number[];
  dailyActivity: { date: string; count: number }[];
  yearlyActivity: { date: string; count: number }[];
}

export interface AdminDashboardData {
  totalStudents: number;
  activeStudents: number;
  avgProblems: number;
  underperforming: number;
  maxStreakOverall: number;
  avgMaxStreak: number;
  students: (Student & {
    stats: LeetCodeStats;
    weeklyProgress: number;
    streak: number;
    maxStreak: number;
    totalActiveDays: number;
    status: string;
  })[];
  leaderboard: {
    rank: number;
    student: Student;
    weeklyScore: number;
  }[];
}

export interface BatchDashboardData {
  batch: string;
  totalStudents: number;
  activeStudents: number;
  avgProblems: number;
  underperforming: number;
  maxStreakOverall: number;
  avgMaxStreak: number;
  students: (Student & {
    stats: LeetCodeStats;
    weeklyProgress: number;
    streak: number;
    maxStreak: number;
    totalActiveDays: number;
    status: string;
  })[];
  leaderboard: {
    rank: number;
    student: Student;
    weeklyScore: number;
  }[];
}

export interface UniversityDashboardData {
  batch2027: BatchDashboardData;
  batch2028: BatchDashboardData;
  combined: {
    totalStudents: number;
    activeStudents: number;
    avgProblems: number;
    underperforming: number;
    maxStreakOverall: number;
    avgMaxStreak: number;
    universityLeaderboard: {
      rank: number;
      student: {
        id: string;
        name: string;
        leetcodeUsername: string;
        createdAt: Date | null;
        leetcodeProfileLink: string;
        profilePhoto: string | null;
        batch: string;
      };
      totalSolved: number;
      batch: string;
    }[];
  };
}
