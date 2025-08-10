
import { 
  type Student, 
  type InsertStudent,
  type User,
  type InsertUser,
  type DailyProgress,
  type InsertDailyProgress,
  type WeeklyTrend,
  type InsertWeeklyTrend,
  type Badge,
  type InsertBadge,
  type AppSettings,
  type WeeklyProgressData,
  type InsertWeeklyProgressData,
  type LeetcodeRealTimeData,
  type InsertLeetcodeRealTimeData,
  type LeetCodeStats,
  type StudentDashboardData,
  type AdminDashboardData,
  type BatchDashboardData,
  type UniversityDashboardData,
  students,
  users,
  dailyProgress,
  weeklyTrends,
  badges,
  appSettings,
  weeklyProgressData,
  leetcodeRealTimeData
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Students
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByUsername(username: string): Promise<Student | undefined>;
  getAllStudents(): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, updates: Partial<Student>): Promise<Student | undefined>;
  deleteStudent(id: string): Promise<boolean>;
  deleteStudentByUsername(username: string): Promise<boolean>;

  // Daily Progress
  getDailyProgress(studentId: string, date: string): Promise<DailyProgress | undefined>;
  getStudentDailyProgress(studentId: string, days?: number): Promise<DailyProgress[]>;
  createDailyProgress(progress: InsertDailyProgress): Promise<DailyProgress>;
  updateDailyProgress(studentId: string, date: string, updates: Partial<DailyProgress>): Promise<DailyProgress | undefined>;
  deleteDailyProgress(studentId: string, date: string): Promise<boolean>;

  // Weekly Trends
  getWeeklyTrends(studentId: string, weeks?: number): Promise<WeeklyTrend[]>;
  createWeeklyTrend(trend: InsertWeeklyTrend): Promise<WeeklyTrend>;
  getCurrentWeekTrend(studentId: string): Promise<WeeklyTrend | undefined>;
  deleteWeeklyTrend(studentId: string, weekStart: string): Promise<boolean>;

  // Weekly Progress Data
  getWeeklyProgressData(studentId: string): Promise<WeeklyProgressData | undefined>;
  getAllWeeklyProgressData(): Promise<WeeklyProgressData[]>;
  createWeeklyProgressData(data: InsertWeeklyProgressData): Promise<WeeklyProgressData>;
  updateWeeklyProgressData(username: string, updates: Partial<WeeklyProgressData>): Promise<WeeklyProgressData | undefined>;
  deleteWeeklyProgressData(studentId: string): Promise<boolean>;

  // LeetCode Real-time Data
  getLeetcodeRealTimeData(studentId: string): Promise<LeetcodeRealTimeData | undefined>;
  createLeetcodeRealTimeData(data: InsertLeetcodeRealTimeData): Promise<LeetcodeRealTimeData>;
  updateLeetcodeRealTimeData(studentId: string, updates: Partial<LeetcodeRealTimeData>): Promise<LeetcodeRealTimeData | undefined>;
  deleteLeetcodeRealTimeData(studentId: string): Promise<boolean>;

  // Badges
  getStudentBadges(studentId: string): Promise<Badge[]>;
  createBadge(badge: InsertBadge): Promise<Badge>;
  getBadgeByType(studentId: string, badgeType: string): Promise<Badge | undefined>;
  getAllBadgesData(): Promise<any>;

  // App Settings
  getAppSettings(): Promise<AppSettings | undefined>;
  updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings>;

  // Dashboard data
  getStudentDashboard(studentId: string): Promise<StudentDashboardData | undefined>;
  getAdminDashboard(): Promise<AdminDashboardData>;
  getBatchDashboard(batch: string): Promise<BatchDashboardData>;
  getUniversityDashboard(): Promise<UniversityDashboardData>;
  getLeaderboard(): Promise<Array<{ rank: number; student: Student; weeklyScore: number }>>;
  getBatchLeaderboard(batch: string): Promise<Array<{ rank: number; student: Student; weeklyScore: number }>>;
  getUniversityLeaderboard(): Promise<Array<{ rank: number; student: Student; weeklyScore: number; batch: string }>>;

  // Batch-specific methods
  getStudentsByBatch(batch: string): Promise<Student[]>;
  getAllStudentsWithBatch(): Promise<Student[]>;

  // Helper methods
  hasStudentEarnedBadge(studentId: string, badgeType: string): Promise<boolean>;
  calculateStreak(studentId: string): Promise<number>;
  calculateMaxStreak(studentId: string): Promise<number>;
  calculateTotalActiveDays(studentId: string): Promise<number>;
  getWeeklyTrend(studentId: string, weekStart: string): Promise<WeeklyTrend | undefined>;
  getLatestDailyProgress(studentId: string): Promise<DailyProgress | undefined>;
  
  // Cleanup methods
  removeStudentsWithZeroQuestions(): Promise<{ removedCount: number; removedStudents: string[] }>;
  getStudentsWithZeroQuestions(): Promise<Student[]>;
  
  // CSV Import methods  
  importWeeklyProgressFromCSVData(csvData: Array<{
    name: string;
    leetcodeUsername: string;
    currentWeekScore: number;
  }>): Promise<{ imported: number; updated: number; errors: string[] }>;
  
  // Connection check
  checkConnection(): Promise<boolean>;
}

export class PostgreSQLStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  // Students
  async getStudent(id: string): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
    return result[0];
  }

  async getStudentByUsername(username: string): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.leetcodeUsername, username)).limit(1);
    return result[0];
  }

  async getAllStudents(): Promise<Student[]> {
    return await db.select().from(students);
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const result = await db.insert(students).values(insertStudent).returning();
    return result[0];
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student | undefined> {
    const result = await db.update(students).set(updates).where(eq(students.id, id)).returning();
    return result[0];
  }

  async deleteStudent(id: string): Promise<boolean> {
    try {
      // First delete all related data
      await db.delete(badges).where(eq(badges.studentId, id));
      await db.delete(weeklyTrends).where(eq(weeklyTrends.studentId, id));
      await db.delete(dailyProgress).where(eq(dailyProgress.studentId, id));
      await db.delete(leetcodeRealTimeData).where(eq(leetcodeRealTimeData.studentId, id));
      await db.delete(weeklyProgressData).where(eq(weeklyProgressData.studentId, id));
      
      // Then delete the student
      const result = await db.delete(students).where(eq(students.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting student:', error);
      return false;
    }
  }

  async deleteStudentByUsername(username: string): Promise<boolean> {
    try {
      const student = await this.getStudentByUsername(username);
      if (!student) return false;
      
      return await this.deleteStudent(student.id);
    } catch (error) {
      console.error('Error deleting student by username:', error);
      return false;
    }
  }

  // Daily Progress
  async getDailyProgress(studentId: string, date: string): Promise<DailyProgress | undefined> {
    const result = await db.select().from(dailyProgress)
      .where(and(eq(dailyProgress.studentId, studentId), eq(dailyProgress.date, date)))
      .limit(1);
    return result[0];
  }

  async getStudentDailyProgress(studentId: string, days = 30): Promise<DailyProgress[]> {
    return await db.select().from(dailyProgress)
      .where(eq(dailyProgress.studentId, studentId))
      .orderBy(desc(dailyProgress.date))
      .limit(days);
  }

  async createDailyProgress(insertProgress: InsertDailyProgress): Promise<DailyProgress> {
    const result = await db.insert(dailyProgress).values(insertProgress).returning();
    return result[0];
  }

  async updateDailyProgress(studentId: string, date: string, updates: Partial<DailyProgress>): Promise<DailyProgress | undefined> {
    const result = await db.update(dailyProgress)
      .set(updates)
      .where(and(eq(dailyProgress.studentId, studentId), eq(dailyProgress.date, date)))
      .returning();
    return result[0];
  }

  // Weekly Trends
  async getWeeklyTrends(studentId: string, weeks = 12): Promise<WeeklyTrend[]> {
    return await db.select().from(weeklyTrends)
      .where(eq(weeklyTrends.studentId, studentId))
      .orderBy(desc(weeklyTrends.weekStart))
      .limit(weeks);
  }

  async createWeeklyTrend(insertTrend: InsertWeeklyTrend): Promise<WeeklyTrend> {
    const result = await db.insert(weeklyTrends).values(insertTrend).returning();
    return result[0];
  }

  async getCurrentWeekTrend(studentId: string): Promise<WeeklyTrend | undefined> {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekStart = startOfWeek.toISOString().split('T')[0];
    
    const result = await db.select().from(weeklyTrends)
      .where(and(eq(weeklyTrends.studentId, studentId), eq(weeklyTrends.weekStart, weekStart)))
      .limit(1);
    return result[0];
  }

  async deleteWeeklyTrend(studentId: string, weekStart: string): Promise<boolean> {
    try {
      await db.delete(weeklyTrends)
        .where(and(eq(weeklyTrends.studentId, studentId), eq(weeklyTrends.weekStart, weekStart)));
      return true;
    } catch (error) {
      console.error('Error deleting weekly trend:', error);
      return false;
    }
  }

  async deleteDailyProgress(studentId: string, date: string): Promise<boolean> {
    try {
      await db.delete(dailyProgress)
        .where(and(eq(dailyProgress.studentId, studentId), eq(dailyProgress.date, date)));
      return true;
    } catch (error) {
      console.error('Error deleting daily progress:', error);
      return false;
    }
  }

  // Badges
  async getStudentBadges(studentId: string): Promise<Badge[]> {
    return await db.select().from(badges)
      .where(eq(badges.studentId, studentId))
      .orderBy(desc(badges.earnedAt));
  }

  async createBadge(insertBadge: InsertBadge): Promise<Badge> {
    const result = await db.insert(badges).values(insertBadge).returning();
    return result[0];
  }

  async getBadgeByType(studentId: string, badgeType: string): Promise<Badge | undefined> {
    const result = await db.select().from(badges)
      .where(and(eq(badges.studentId, studentId), eq(badges.badgeType, badgeType)))
      .limit(1);
    return result[0];
  }

  async getAllBadgesData(): Promise<any> {
    // Get all badges with student information
    const allBadges = await db.select({
      id: badges.id,
      studentId: badges.studentId,
      badgeType: badges.badgeType,
      title: badges.title,
      description: badges.description,
      icon: badges.icon,
      earnedAt: badges.earnedAt,
      studentName: students.name,
      studentUsername: students.leetcodeUsername
    })
    .from(badges)
    .innerJoin(students, eq(badges.studentId, students.id))
    .orderBy(desc(badges.earnedAt));

    // Transform badges to include student info
    const badgesWithStudents = allBadges.map(badge => ({
      id: badge.id,
      studentId: badge.studentId,
      badgeType: badge.badgeType,
      title: badge.title,
      description: badge.description,
      icon: badge.icon,
      earnedAt: badge.earnedAt,
      student: {
        id: badge.studentId,
        name: badge.studentName,
        leetcodeUsername: badge.studentUsername
      }
    }));

    // Calculate badge statistics
    const totalBadges = allBadges.length;
    const uniqueRecipients = new Set(allBadges.map(b => b.studentId)).size;
    
    // Find most popular badge type
    const badgeTypeCounts = allBadges.reduce((counts, badge) => {
      counts[badge.badgeType] = (counts[badge.badgeType] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const mostPopularBadge = Object.keys(badgeTypeCounts).reduce((a, b) => 
      badgeTypeCounts[a] > badgeTypeCounts[b] ? a : b, Object.keys(badgeTypeCounts)[0] || ''
    );

    // Get recent badges (last 10)
    const recentBadges = badgesWithStudents.slice(0, 10);

    return {
      allBadges: badgesWithStudents,
      badgeStats: {
        totalBadges,
        totalRecipients: uniqueRecipients,
        mostPopularBadge,
        recentBadges
      }
    };
  }

  // App Settings
  async getAppSettings(): Promise<AppSettings | undefined> {
    const result = await db.select().from(appSettings).limit(1);
    return result[0];
  }

  async updateAppSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    // Try to update first, if no rows affected, insert
    const existing = await this.getAppSettings();
    if (existing) {
      const result = await db.update(appSettings).set(updates).where(eq(appSettings.id, existing.id)).returning();
      return result[0];
    } else {
      const result = await db.insert(appSettings).values(updates as any).returning();
      return result[0];
    }
  }

  // Dashboard methods
  async getStudentDashboard(studentId: string): Promise<StudentDashboardData | undefined> {
    const student = await this.getStudent(studentId);
    if (!student) return undefined;

    const [dailyProgress, badges, weeklyTrends, realTimeData] = await Promise.all([
      this.getStudentDailyProgress(studentId, 30),
      this.getStudentBadges(studentId),
      this.getWeeklyTrends(studentId, 12),
      this.getLeetcodeRealTimeData(studentId)
    ]);

    const latestProgress = dailyProgress[0];
    const stats: LeetCodeStats = latestProgress ? {
      totalSolved: latestProgress.totalSolved,
      easySolved: latestProgress.easySolved,
      mediumSolved: latestProgress.mediumSolved,
      hardSolved: latestProgress.hardSolved,
      acceptanceRate: latestProgress.acceptanceRate || 0,
      ranking: latestProgress.ranking || 0,
      totalSubmissions: latestProgress.totalSubmissions || 0,
      totalAccepted: latestProgress.totalAccepted || 0,
      languageStats: (latestProgress.languageStats as Record<string, number>) || {} as Record<string, number>
    } : {
      totalSolved: 0,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      acceptanceRate: 0,
      ranking: 0,
      totalSubmissions: 0,
      totalAccepted: 0,
      languageStats: {} as Record<string, number>
    };

    // Use real-time data if available, fallback to calculated values
    const currentStreak = realTimeData?.currentStreak ?? this.calculateStreakFromProgress(dailyProgress);
    const maxStreak = realTimeData?.maxStreak ?? await this.calculateMaxStreak(studentId);
    const totalActiveDays = realTimeData?.totalActiveDays ?? await this.calculateTotalActiveDays(studentId);
    const yearlyActivity = realTimeData?.yearlyActivity ? 
      (typeof realTimeData.yearlyActivity === 'string' 
        ? JSON.parse(realTimeData.yearlyActivity) 
        : realTimeData.yearlyActivity) as Array<{ date: string; count: number }> : 
      (await this.getStudentDailyProgress(studentId, 365)).map(p => ({
        date: p.date,
        count: p.dailyIncrement
      }));

    // Calculate batch and university rankings
    const rankings = await this.calculateStudentRankings(studentId, stats.totalSolved);
    
    return {
      student,
      stats,
      currentStreak,
      maxStreak,
      totalActiveDays,
      weeklyRank: 1,
      batchRank: rankings.batchRank,
      universityRank: rankings.universityRank,
      batchSize: rankings.batchSize,
      universitySize: rankings.universitySize,
      badges,
      weeklyProgress: weeklyTrends.map(t => t.weeklyIncrement),
      dailyActivity: dailyProgress.map(p => ({
        date: p.date,
        count: p.dailyIncrement
      })),
      yearlyActivity
    };
  }

  async getAdminDashboard(): Promise<AdminDashboardData> {
    const students = await this.getAllStudents();
    const totalStudents = students.length;

    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const [latestProgressResult, weeklyProgressResult, recentProgressResult] = await Promise.all([
          db.select().from(dailyProgress)
            .where(eq(dailyProgress.studentId, student.id))
            .orderBy(desc(dailyProgress.date))
            .limit(1),
          db.select().from(weeklyProgressData)
            .where(eq(weeklyProgressData.studentId, student.id))
            .limit(1),
          db.select().from(dailyProgress)
            .where(eq(dailyProgress.studentId, student.id))
            .orderBy(desc(dailyProgress.date))
            .limit(7) // Get last 7 days for streak calculation
        ]);
        
        const latestProgress = latestProgressResult[0];
        const weeklyProgress = weeklyProgressResult[0];
        
        const stats: LeetCodeStats = latestProgress ? {
          totalSolved: latestProgress.totalSolved,
          easySolved: latestProgress.easySolved,
          mediumSolved: latestProgress.mediumSolved,
          hardSolved: latestProgress.hardSolved,
          acceptanceRate: latestProgress.acceptanceRate || 0,
          ranking: latestProgress.ranking || 0,
          totalSubmissions: latestProgress.totalSubmissions || 0,
          totalAccepted: latestProgress.totalAccepted || 0,
          languageStats: (latestProgress.languageStats as Record<string, number>) || {} as Record<string, number>
        } : {
          totalSolved: 0,
          easySolved: 0,
          mediumSolved: 0,
          hardSolved: 0,
          acceptanceRate: 0,
          ranking: 0,
          totalSubmissions: 0,
          totalAccepted: 0,
          languageStats: {} as Record<string, number>
        };

        // Calculate real-time weekly progress
        const currentWeeklyProgress = weeklyProgress ? 
          (latestProgress?.totalSolved || 0) - (weeklyProgress.week4Score || 0) : 0;

        // Calculate streak from recent progress
        const streak = this.calculateStreakFromProgress(recentProgressResult);

        // Determine status based on weekly progress thresholds
        let status = 'inactive';
        if (stats.totalSolved > 0) {
          if (currentWeeklyProgress >= 35) {
            status = 'Excellent';
          } else if (currentWeeklyProgress >= 25) {
            status = 'Good';
          } else if (currentWeeklyProgress >= 15) {
            status = 'Active';
          } else {
            status = 'Underperforming';
          }
        }

        // Get real-time data if available, fallback to calculated values
        const realTimeData = await this.getLeetcodeRealTimeData(student.id);
        const maxStreak = realTimeData?.maxStreak ?? await this.calculateMaxStreak(student.id);
        const totalActiveDays = realTimeData?.totalActiveDays ?? await this.calculateTotalActiveDays(student.id);
        const currentStreak = realTimeData?.currentStreak ?? this.calculateStreakFromProgress(recentProgressResult);

        return {
          ...student,
          stats,
          weeklyProgress: Math.max(0, currentWeeklyProgress),
          streak: currentStreak,
          maxStreak,
          totalActiveDays,
          status
        };
      })
    );

    const activeStudents = studentsWithStats.filter(s => s.status !== 'inactive').length;
    const avgProblems = studentsWithStats.reduce((sum, s) => sum + s.stats.totalSolved, 0) / totalStudents;
    const underperforming = studentsWithStats.filter(s => s.stats.totalSolved < avgProblems * 0.7).length;
    
    // Calculate streak statistics
    const maxStreakOverall = Math.max(...studentsWithStats.map(s => s.maxStreak), 0);
    const avgMaxStreak = studentsWithStats.reduce((sum, s) => sum + s.maxStreak, 0) / totalStudents;

    const leaderboard = studentsWithStats
      .sort((a, b) => b.stats.totalSolved - a.stats.totalSolved)
      .slice(0, 10)
      .map((student, index) => ({
        rank: index + 1,
        student: {
          id: student.id,
          name: student.name,
          leetcodeUsername: student.leetcodeUsername,
          leetcodeProfileLink: student.leetcodeProfileLink,
          profilePhoto: student.profilePhoto,
          batch: student.batch,
          createdAt: student.createdAt
        },
        weeklyScore: student.stats.totalSolved
      }));

    return {
      totalStudents,
      activeStudents,
      avgProblems,
      underperforming,
      maxStreakOverall,
      avgMaxStreak,
      students: studentsWithStats,
      leaderboard
    };
  }

  async getLeaderboard(): Promise<Array<{ rank: number; student: Student; weeklyScore: number }>> {
    const students = await this.getAllStudents();
    
    // Get weekly progress data directly from the weeklyProgressData table
    const allWeeklyProgressData = await this.getAllWeeklyProgressData();
    
    const studentsWithScores = students.map((student) => {
      // Find the student's weekly progress data
      const weeklyProgress = allWeeklyProgressData.find(wp => wp.studentId === student.id);
      
      let weeklyScore = 0;
      if (weeklyProgress) {
        // Calculate the latest week's progress from the week scores
        const week1 = weeklyProgress.week1Score || 0;
        const week2 = weeklyProgress.week2Score || 0;
        const week3 = weeklyProgress.week3Score || 0;
        const week4 = weeklyProgress.week4Score || 0;
        
        // The weekly score is the increment from the previous week
        if (week4 > 0 && week3 > 0) {
          weeklyScore = Math.max(0, week4 - week3);
        } else if (week3 > 0 && week2 > 0) {
          weeklyScore = Math.max(0, week3 - week2);
        } else if (week2 > 0 && week1 > 0) {
          weeklyScore = Math.max(0, week2 - week1);
        } else {
          weeklyScore = week1; // First week
        }
      }
      
      return {
        student,
        weeklyScore
      };
    });

    return studentsWithScores
      .sort((a, b) => b.weeklyScore - a.weeklyScore)
      .map((item, index) => ({
        rank: index + 1,
        ...item
      }));
  }



  // Helper methods
  async hasStudentEarnedBadge(studentId: string, badgeType: string): Promise<boolean> {
    const badge = await this.getBadgeByType(studentId, badgeType);
    return badge !== undefined;
  }

  async calculateStreak(studentId: string): Promise<number> {
    const progress = await this.getStudentDailyProgress(studentId, 30);
    let streak = 0;
    for (const p of progress) {
      if (p.dailyIncrement > 0) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  async getWeeklyTrend(studentId: string, weekStart: string): Promise<WeeklyTrend | undefined> {
    const result = await db.select().from(weeklyTrends)
      .where(and(eq(weeklyTrends.studentId, studentId), eq(weeklyTrends.weekStart, weekStart)))
      .limit(1);
    return result[0];
  }

  async getLatestDailyProgress(studentId: string): Promise<DailyProgress | undefined> {
    const result = await db.select().from(dailyProgress)
      .where(eq(dailyProgress.studentId, studentId))
      .orderBy(desc(dailyProgress.date))
      .limit(1);
    return result[0];
  }

  // Weekly Progress Data methods
  async getWeeklyProgressData(studentId: string): Promise<WeeklyProgressData | undefined> {
    const result = await db.select().from(weeklyProgressData)
      .where(eq(weeklyProgressData.studentId, studentId))
      .limit(1);
    return result[0];
  }

  async getAllWeeklyProgressData(): Promise<WeeklyProgressData[]> {
    return await db.select().from(weeklyProgressData);
  }

  async createWeeklyProgressData(data: InsertWeeklyProgressData): Promise<WeeklyProgressData> {
    const result = await db.insert(weeklyProgressData).values(data).returning();
    return result[0];
  }

  async updateWeeklyProgressData(username: string, updates: Partial<WeeklyProgressData>): Promise<WeeklyProgressData | undefined> {
    // First find the student by username
    const student = await this.getStudentByUsername(username);
    if (!student) {
      console.log(`Student not found: ${username}`);
      return undefined;
    }

    const result = await db.update(weeklyProgressData)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(weeklyProgressData.studentId, student.id))
      .returning();
    return result[0];
  }

  async deleteWeeklyProgressData(studentId: string): Promise<boolean> {
    const result = await db.delete(weeklyProgressData)
      .where(eq(weeklyProgressData.studentId, studentId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // LeetCode Real-time Data methods
  async getLeetcodeRealTimeData(studentId: string): Promise<LeetcodeRealTimeData | undefined> {
    const result = await db.select().from(leetcodeRealTimeData)
      .where(eq(leetcodeRealTimeData.studentId, studentId))
      .limit(1);
    return result[0];
  }

  async createLeetcodeRealTimeData(data: InsertLeetcodeRealTimeData): Promise<LeetcodeRealTimeData> {
    const result = await db.insert(leetcodeRealTimeData).values(data).returning();
    return result[0];
  }

  async updateLeetcodeRealTimeData(studentId: string, updates: Partial<LeetcodeRealTimeData>): Promise<LeetcodeRealTimeData | undefined> {
    const result = await db.update(leetcodeRealTimeData)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leetcodeRealTimeData.studentId, studentId))
      .returning();
    return result[0];
  }

  async deleteLeetcodeRealTimeData(studentId: string): Promise<boolean> {
    const result = await db.delete(leetcodeRealTimeData)
      .where(eq(leetcodeRealTimeData.studentId, studentId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Enhanced badge awarding system ensuring minimum 3-4 badges per student
  async awardBadges(studentId: string): Promise<void> {
    const student = await this.getStudent(studentId);
    if (!student) return;

    const latestProgress = await this.getLatestDailyProgress(studentId);
    if (!latestProgress) return;

    // Get real-time data for accurate streak calculations
    const realTimeData = await this.getLeetcodeRealTimeData(studentId);
    const maxStreak = realTimeData?.maxStreak || await this.calculateMaxStreak(studentId);
    const totalActiveDays = realTimeData?.totalActiveDays || await this.calculateTotalActiveDays(studentId);
    const currentStreak = realTimeData?.currentStreak || await this.calculateStreak(studentId);

    const badgesToAward: { type: string; title: string; description: string; earnedDate: Date }[] = [];

    // Get weekly progress for comprehensive badge calculations
    const recentProgress = await this.getStudentDailyProgress(studentId, 30);
    const weeklyProgress = recentProgress.slice(0, 7);
    const weeklyTotal = weeklyProgress.reduce((sum, p) => sum + p.dailyIncrement, 0);

    // GUARANTEED BADGES - Everyone gets these based on participation
    
    // 1. Starter badges (everyone qualifies)
    if (latestProgress.totalSolved >= 1 && !(await this.hasStudentEarnedBadge(studentId, 'first_solver'))) {
      badgesToAward.push({
        type: 'first_solver',
        title: '🌟 First Solver',
        description: 'Solved your first problem',
        earnedDate: new Date()
      });
    }

    if (totalActiveDays >= 1 && !(await this.hasStudentEarnedBadge(studentId, 'active_learner'))) {
      badgesToAward.push({
        type: 'active_learner',
        title: '📚 Active Learner',
        description: 'Actively practicing problems',
        earnedDate: new Date()
      });
    }

    if (latestProgress.easySolved >= 1 && !(await this.hasStudentEarnedBadge(studentId, 'easy_starter'))) {
      badgesToAward.push({
        type: 'easy_starter',
        title: '🟢 Easy Starter',
        description: 'Started with easy problems',
        earnedDate: new Date()
      });
    }

    // 2. Progress-based guaranteed badges
    if (latestProgress.totalSolved >= 10 && !(await this.hasStudentEarnedBadge(studentId, 'problem_explorer'))) {
      badgesToAward.push({
        type: 'problem_explorer',
        title: '🗺️ Problem Explorer',
        description: '10+ problems solved',
        earnedDate: new Date()
      });
    }

    if (latestProgress.totalSolved >= 25 && !(await this.hasStudentEarnedBadge(studentId, 'steady_solver'))) {
      badgesToAward.push({
        type: 'steady_solver',
        title: '⚖️ Steady Solver',
        description: '25+ problems solved',
        earnedDate: new Date()
      });
    }

    if (latestProgress.totalSolved >= 50 && !(await this.hasStudentEarnedBadge(studentId, 'half_century'))) {
      badgesToAward.push({
        type: 'half_century',
        title: '🏏 Half Century',
        description: '50+ problems solved',
        earnedDate: new Date()
      });
    }

    if (latestProgress.totalSolved >= 100 && !(await this.hasStudentEarnedBadge(studentId, 'century_coder'))) {
      badgesToAward.push({
        type: 'century_coder',
        title: '💯 Century Coder',
        description: '100+ total problems solved',
        earnedDate: new Date()
      });
    }

    // 3. Streak-based badges (using real-time data)
    if (currentStreak >= 3 && !(await this.hasStudentEarnedBadge(studentId, 'streak_starter'))) {
      badgesToAward.push({
        type: 'streak_starter',
        title: '🔥 Streak Starter',
        description: '3-day solving streak',
        earnedDate: new Date()
      });
    }

    if (currentStreak >= 7 && !(await this.hasStudentEarnedBadge(studentId, 'streak_master'))) {
      badgesToAward.push({
        type: 'streak_master',
        title: '🧐 Streak Master',
        description: '7-day solving streak',
        earnedDate: new Date()
      });
    }

    if (maxStreak >= 10 && !(await this.hasStudentEarnedBadge(studentId, 'streak_legend'))) {
      badgesToAward.push({
        type: 'streak_legend',
        title: '👑 Streak Legend',
        description: 'Maximum 10+ day streak achieved',
        earnedDate: new Date()
      });
    }

    // 4. Activity-based badges (using real-time data)
    if (totalActiveDays >= 7 && !(await this.hasStudentEarnedBadge(studentId, 'weekly_warrior'))) {
      badgesToAward.push({
        type: 'weekly_warrior',
        title: '⚔️ Weekly Warrior',
        description: '7+ active days of problem solving',
        earnedDate: new Date()
      });
    }

    if (totalActiveDays >= 30 && !(await this.hasStudentEarnedBadge(studentId, 'monthly_master'))) {
      badgesToAward.push({
        type: 'monthly_master',
        title: '📅 Monthly Master',
        description: '30+ active days of coding',
        earnedDate: new Date()
      });
    }

    // 5. Difficulty badges
    if (latestProgress.easySolved >= 10 && !(await this.hasStudentEarnedBadge(studentId, 'easy_champion'))) {
      badgesToAward.push({
        type: 'easy_champion',
        title: '🥉 Easy Champion',
        description: '10+ easy problems mastered',
        earnedDate: new Date()
      });
    }

    if (latestProgress.mediumSolved >= 5 && !(await this.hasStudentEarnedBadge(studentId, 'medium_challenger'))) {
      badgesToAward.push({
        type: 'medium_challenger',
        title: '🥈 Medium Challenger',
        description: '5+ medium problems solved',
        earnedDate: new Date()
      });
    }

    if (latestProgress.hardSolved >= 1 && !(await this.hasStudentEarnedBadge(studentId, 'hard_hero'))) {
      badgesToAward.push({
        type: 'hard_hero',
        title: '🥇 Hard Hero',
        description: 'Conquered a hard problem',
        earnedDate: new Date()
      });
    }

    // 6. Performance badges
    if (weeklyTotal >= 10 && !(await this.hasStudentEarnedBadge(studentId, 'weekly_achiever'))) {
      badgesToAward.push({
        type: 'weekly_achiever',
        title: '📈 Weekly Achiever',
        description: '10+ problems this week',
        earnedDate: new Date()
      });
    }

    // Ensure minimum badges by adding participation badges
    const currentBadgeCount = await this.getStudentBadges(studentId);
    const totalBadgesAfterAwarding = currentBadgeCount.length + badgesToAward.length;

    if (totalBadgesAfterAwarding < 3) {
      // Add participation badges to ensure minimum
      if (!(await this.hasStudentEarnedBadge(studentId, 'dedicated_student'))) {
        badgesToAward.push({
          type: 'dedicated_student',
          title: '🎓 Dedicated Student',
          description: 'Committed to learning',
          earnedDate: new Date()
        });
      }

      if (!(await this.hasStudentEarnedBadge(studentId, 'coding_enthusiast'))) {
        badgesToAward.push({
          type: 'coding_enthusiast',
          title: '💻 Coding Enthusiast',
          description: 'Passionate about coding',
          earnedDate: new Date()
        });
      }

      if (!(await this.hasStudentEarnedBadge(studentId, 'progress_tracker'))) {
        badgesToAward.push({
          type: 'progress_tracker',
          title: '📊 Progress Tracker',
          description: 'Tracking your coding journey',
          earnedDate: new Date()
        });
      }
    }

    // Create badges in database
    for (const badge of badgesToAward) {
      await this.createBadge({
        studentId,
        badgeType: badge.type,
        title: badge.title,
        description: badge.description,
        icon: 'fas fa-trophy'
      });
    }

    if (badgesToAward.length > 0) {
      console.log(`Awarded ${badgesToAward.length} badges to student ${student.name}`);
    }
  }

  // Add method to update student profile photo
  async updateStudentProfilePhoto(studentId: string, profilePhotoUrl: string): Promise<void> {
    try {
      await db.update(students)
        .set({ profilePhoto: profilePhotoUrl })
        .where(eq(students.id, studentId));
    } catch (error) {
      console.error('Failed to update student profile photo:', error);
    }
  }

  private calculateStreakFromProgress(progress: DailyProgress[]): number {
    let streak = 0;
    for (const p of progress) {
      if (p.dailyIncrement > 0) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  private async calculateStudentRankings(studentId: string, totalSolved: number): Promise<{
    batchRank: number;
    universityRank: number;
    batchSize: number;
    universitySize: number;
  }> {
    const student = await this.getStudent(studentId);
    if (!student) {
      return { batchRank: 0, universityRank: 0, batchSize: 0, universitySize: 0 };
    }

    // Get all students in the same batch
    const batchStudents = await this.getStudentsByBatch(student.batch);
    
    // Get all students for university ranking
    const allStudents = await this.getAllStudents();

    // Get current progress for all batch students
    const batchStudentsWithProgress = await Promise.all(
      batchStudents.map(async (s) => {
        const latestProgress = await db.select()
          .from(dailyProgress)
          .where(eq(dailyProgress.studentId, s.id))
          .orderBy(desc(dailyProgress.date))
          .limit(1);
        
        return {
          student: s,
          totalSolved: latestProgress[0]?.totalSolved || 0
        };
      })
    );

    // Get current progress for all students  
    const allStudentsWithProgress = await Promise.all(
      allStudents.map(async (s) => {
        const latestProgress = await db.select()
          .from(dailyProgress)
          .where(eq(dailyProgress.studentId, s.id))
          .orderBy(desc(dailyProgress.date))
          .limit(1);
        
        return {
          student: s,
          totalSolved: latestProgress[0]?.totalSolved || 0
        };
      })
    );

    // Sort by total problems solved (descending)
    batchStudentsWithProgress.sort((a, b) => b.totalSolved - a.totalSolved);
    allStudentsWithProgress.sort((a, b) => b.totalSolved - a.totalSolved);

    // Find rankings
    const batchRank = batchStudentsWithProgress.findIndex(s => s.student.id === studentId) + 1;
    const universityRank = allStudentsWithProgress.findIndex(s => s.student.id === studentId) + 1;

    return {
      batchRank: batchRank || batchStudentsWithProgress.length,
      universityRank: universityRank || allStudentsWithProgress.length,
      batchSize: batchStudentsWithProgress.length,
      universitySize: allStudentsWithProgress.length
    };
  }

  async calculateMaxStreak(studentId: string): Promise<number> {
    // Get all daily progress for the student, sorted by date
    const allProgress = await db.select()
      .from(dailyProgress)
      .where(eq(dailyProgress.studentId, studentId))
      .orderBy(desc(dailyProgress.date));

    if (allProgress.length === 0) return 0;

    let maxStreak = 0;
    let currentStreak = 0;

    // Reverse to go from oldest to newest
    const reversedProgress = allProgress.reverse();
    
    for (const progress of reversedProgress) {
      if (progress.dailyIncrement > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return maxStreak;
  }

  async calculateTotalActiveDays(studentId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(dailyProgress)
      .where(and(
        eq(dailyProgress.studentId, studentId),
        sql`${dailyProgress.dailyIncrement} > 0`
      ));
    
    return result[0]?.count || 0;
  }

  // Batch-specific methods
  async getStudentsByBatch(batch: string): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.batch, batch));
  }

  async getAllStudentsWithBatch(): Promise<Student[]> {
    return await db.select().from(students);
  }

  async getBatchDashboard(batch: string): Promise<BatchDashboardData> {
    const batchStudents = await this.getStudentsByBatch(batch);
    const totalStudents = batchStudents.length;

    if (totalStudents === 0) {
      return {
        batch,
        totalStudents: 0,
        activeStudents: 0,
        avgProblems: 0,
        underperforming: 0,
        maxStreakOverall: 0,
        avgMaxStreak: 0,
        students: [],
        leaderboard: []
      };
    }

    const studentsWithStats = await Promise.all(
      batchStudents.map(async (student) => {
        const latestProgressResult = await db.select().from(dailyProgress)
          .where(eq(dailyProgress.studentId, student.id))
          .orderBy(desc(dailyProgress.date))
          .limit(1);
        
        const latestProgress = latestProgressResult[0];
        
        const stats: LeetCodeStats = {
          totalSolved: latestProgress?.totalSolved || 0,
          easySolved: latestProgress?.easySolved || 0,
          mediumSolved: latestProgress?.mediumSolved || 0,
          hardSolved: latestProgress?.hardSolved || 0,
          acceptanceRate: latestProgress?.acceptanceRate || 0,
          ranking: latestProgress?.ranking || 0,
          totalSubmissions: latestProgress?.totalSubmissions || 0,
          totalAccepted: latestProgress?.totalAccepted || 0,
          languageStats: latestProgress?.languageStats as Record<string, number> || {}
        };

        // Calculate weekly progress
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
        
        const weeklyProgressResult = await db.select().from(dailyProgress)
          .where(and(
            eq(dailyProgress.studentId, student.id),
            sql`${dailyProgress.date} >= ${oneWeekAgoStr}`
          ))
          .orderBy(dailyProgress.date);
        
        const currentWeeklyProgress = weeklyProgressResult.length > 0 
          ? (latestProgress?.totalSolved || 0) - (weeklyProgressResult[0]?.totalSolved || 0)
          : 0;

        // Recent progress for streak calculation
        const recentProgressResult = await db.select().from(dailyProgress)
          .where(eq(dailyProgress.studentId, student.id))
          .orderBy(desc(dailyProgress.date))
          .limit(30);

        const status = this.calculateStatus(stats.totalSolved, currentWeeklyProgress);

        // PRIORITY: Use real-time LeetCode data when available
        const realTimeData = await this.getLeetcodeRealTimeData(student.id);
        let maxStreak = 0;
        let totalActiveDays = 0;
        let currentStreak = 0;

        if (realTimeData) {
          // Use real-time data from LeetCode API
          maxStreak = realTimeData.maxStreak || 0;
          totalActiveDays = realTimeData.totalActiveDays || 0;
          currentStreak = realTimeData.currentStreak || 0;
        }
        
        // If no real-time data or values are 0, calculate from progress data
        if (maxStreak === 0) {
          maxStreak = await this.calculateMaxStreak(student.id);
        }
        if (totalActiveDays === 0) {
          totalActiveDays = await this.calculateTotalActiveDays(student.id);
        }
        if (currentStreak === 0) {
          currentStreak = this.calculateStreakFromProgress(recentProgressResult);
        }

        return {
          ...student,
          stats,
          weeklyProgress: Math.max(0, currentWeeklyProgress),
          streak: currentStreak,
          maxStreak,
          totalActiveDays,
          status
        };
      })
    );

    const activeStudents = studentsWithStats.filter(s => s.status !== 'inactive').length;
    const avgProblems = studentsWithStats.reduce((sum, s) => sum + s.stats.totalSolved, 0) / totalStudents;
    const underperforming = studentsWithStats.filter(s => s.stats.totalSolved < avgProblems * 0.7).length;
    
    // Calculate streak statistics
    const maxStreakOverall = Math.max(...studentsWithStats.map(s => s.maxStreak), 0);
    const avgMaxStreak = studentsWithStats.reduce((sum, s) => sum + s.maxStreak, 0) / totalStudents;

    const leaderboard = studentsWithStats
      .sort((a, b) => b.stats.totalSolved - a.stats.totalSolved)
      .map((student, index) => ({
        rank: index + 1,
        student: {
          id: student.id,
          name: student.name,
          leetcodeUsername: student.leetcodeUsername,
          leetcodeProfileLink: student.leetcodeProfileLink,
          profilePhoto: student.profilePhoto,
          batch: student.batch,
          createdAt: student.createdAt
        },
        weeklyScore: student.stats.totalSolved
      }));

    return {
      batch,
      totalStudents,
      activeStudents,
      avgProblems,
      underperforming,
      maxStreakOverall,
      avgMaxStreak,
      students: studentsWithStats,
      leaderboard
    };
  }

  async getBatchLeaderboard(batch: string): Promise<Array<{ rank: number; student: Student; weeklyScore: number }>> {
    const batchStudents = await this.getStudentsByBatch(batch);
    
    const studentsWithScores = await Promise.all(
      batchStudents.map(async (student) => {
        // Get latest total solved count (using weeklyScore field for total problems)
        const latestProgressResult = await db.select().from(dailyProgress)
          .where(eq(dailyProgress.studentId, student.id))
          .orderBy(desc(dailyProgress.date))
          .limit(1);
        
        const latestProgress = latestProgressResult[0];
        
        return {
          student,
          weeklyScore: latestProgress?.totalSolved || 0 // Using weeklyScore field to store total solved
        };
      })
    );

    return studentsWithScores
      .sort((a, b) => b.weeklyScore - a.weeklyScore)
      .map((item, index) => ({
        rank: index + 1,
        ...item
      }));
  }

  async getUniversityLeaderboard(): Promise<Array<{ rank: number; student: Student; weeklyScore: number; batch: string }>> {
    const allStudents = await this.getAllStudents();
    
    const studentsWithScores = await Promise.all(
      allStudents.map(async (student) => {
        const latestProgressResult = await db.select().from(dailyProgress)
          .where(eq(dailyProgress.studentId, student.id))
          .orderBy(desc(dailyProgress.date))
          .limit(1);
        
        const latestProgress = latestProgressResult[0];
        
        return {
          student,
          weeklyScore: latestProgress?.totalSolved || 0, // Using weeklyScore to match interface
          batch: student.batch
        };
      })
    );

    return studentsWithScores
      .sort((a, b) => b.weeklyScore - a.weeklyScore)
      .map((item, index) => ({
        rank: index + 1,
        student: {
          id: item.student.id,
          name: item.student.name,
          leetcodeUsername: item.student.leetcodeUsername,
          createdAt: item.student.createdAt,
          leetcodeProfileLink: item.student.leetcodeProfileLink,
          profilePhoto: item.student.profilePhoto,
          batch: item.student.batch,
        },
        weeklyScore: item.weeklyScore,
        batch: item.batch
      }));
  }

  async getUniversityDashboard(): Promise<UniversityDashboardData> {
    const [batch2027Data, batch2028Data] = await Promise.all([
      this.getBatchDashboard("2027"),
      this.getBatchDashboard("2028")
    ]);

    const universityLeaderboard = await this.getUniversityLeaderboard();

    const combined = {
      totalStudents: batch2027Data.totalStudents + batch2028Data.totalStudents,
      activeStudents: batch2027Data.activeStudents + batch2028Data.activeStudents,
      avgProblems: (batch2027Data.avgProblems * batch2027Data.totalStudents + batch2028Data.avgProblems * batch2028Data.totalStudents) / 
                   (batch2027Data.totalStudents + batch2028Data.totalStudents) || 0,
      underperforming: batch2027Data.underperforming + batch2028Data.underperforming,
      maxStreakOverall: Math.max(batch2027Data.maxStreakOverall, batch2028Data.maxStreakOverall),
      avgMaxStreak: (batch2027Data.avgMaxStreak * batch2027Data.totalStudents + batch2028Data.avgMaxStreak * batch2028Data.totalStudents) / 
                    (batch2027Data.totalStudents + batch2028Data.totalStudents) || 0,
      universityLeaderboard: universityLeaderboard.slice(0, 20).map(item => ({
        rank: item.rank,
        student: item.student,
        totalSolved: item.weeklyScore, // Using weeklyScore as totalSolved for compatibility
        batch: item.batch
      })) // Top 20 university-wide
    };

    return {
      batch2027: batch2027Data,
      batch2028: batch2028Data,
      combined
    };
  }

  private calculateStatus(totalSolved: number, weeklyProgress: number): string {
    if (totalSolved >= 100 && weeklyProgress >= 15) return 'Excellent';
    if (totalSolved >= 50 && weeklyProgress >= 10) return 'Good';
    if (weeklyProgress >= 5) return 'Active';
    return 'Underperforming';
  }

  // New method to get students with zero questions solved
  async getStudentsWithZeroQuestions(): Promise<Student[]> {
    const allStudents = await this.getAllStudents();
    const studentsWithZero: Student[] = [];

    for (const student of allStudents) {
      const latestProgress = await this.getLatestDailyProgress(student.id);
      if (!latestProgress || latestProgress.totalSolved === 0) {
        studentsWithZero.push(student);
      }
    }

    return studentsWithZero;
  }

  // New method to remove students with zero questions solved
  async removeStudentsWithZeroQuestions(): Promise<{ removedCount: number; removedStudents: string[] }> {
    const studentsWithZero = await this.getStudentsWithZeroQuestions();
    const removedStudents: string[] = [];

    for (const student of studentsWithZero) {
      const success = await this.deleteStudent(student.id);
      if (success) {
        removedStudents.push(student.name);
      }
    }

    return {
      removedCount: removedStudents.length,
      removedStudents
    };
  }

  // New CSV import method for weekly progress data
  async importWeeklyProgressFromCSVData(csvData: Array<{
    name: string;
    leetcodeUsername: string;
    currentWeekScore: number;
  }>): Promise<{ imported: number; updated: number; errors: string[] }> {
    const stats = { imported: 0, updated: 0, errors: [] as string[] };

    for (const record of csvData) {
      try {
        // Find student by username or name
        let student = await this.getStudentByUsername(record.leetcodeUsername);
        
        if (!student) {
          // Try to find by name if username doesn't match
          const allStudents = await this.getAllStudents();
          student = allStudents.find(s => 
            s.name.toLowerCase().trim() === record.name.toLowerCase().trim()
          );
        }

        if (!student) {
          stats.errors.push(`Student not found: ${record.name} (${record.leetcodeUsername})`);
          continue;
        }

        // Get existing weekly progress data
        const existingData = await this.getWeeklyProgressData(student.id);
        
        if (existingData) {
          // Calculate the increment from last recorded week
          const lastWeekScore = existingData.week4Score || 0;
          const increment = record.currentWeekScore - lastWeekScore;

          // Update existing record with new current week data
          await this.updateWeeklyProgressData(student.id, {
            currentWeekScore: record.currentWeekScore,
            lastWeekToCurrentIncrement: increment,
            updatedAt: new Date()
          });
          stats.updated++;
        } else {
          // Create new weekly progress data
          await this.createWeeklyProgressData({
            studentId: student.id,
            currentWeekScore: record.currentWeekScore,
            lastWeekToCurrentIncrement: record.currentWeekScore, // First time, so increment equals current score
            week1Score: 0,
            week2Score: 0,
            week3Score: 0,
            week4Score: 0,
            week2Progress: 0,
            week3Progress: 0,
            week4Progress: 0,
            totalScore: record.currentWeekScore,
            averageWeeklyGrowth: 0
          });
          stats.imported++;
        }
      } catch (error) {
        stats.errors.push(`Error processing ${record.name}: ${error}`);
      }
    }

    return stats;
  }

  // Connection check method
  async checkConnection(): Promise<boolean> {
    try {
      await db.select().from(students).limit(1);
      return true;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }
}

export const storage = new PostgreSQLStorage();
