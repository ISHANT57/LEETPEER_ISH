import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import { authenticateToken, requireRole, requireAdminOrOwnData } from "./middleware/auth";
import { storage } from "./storage";
import { leetCodeService } from "./services/leetcode";
import { schedulerService } from "./services/scheduler";
import { csvImportService } from "./services/csv-import";
import { weeklyProgressImportService } from "./services/weekly-progress-import";
import { cacheService } from "./services/cache";
import path from 'path';
import { insertStudentSchema, students, weeklyProgressData, dailyProgress } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import studentsData from "../attached_assets/students_1753783623487.json";
import batch2027Data from "../attached_assets/batch_2027_real_students.json";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes (no auth required)
  app.use("/api/auth", authRouter);
  // Initialize students from JSON file (Admin only)
  app.post("/api/init-students", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      let importedCount = 0;
      
      for (const studentData of studentsData) {
        const existing = await storage.getStudentByUsername(studentData.leetcodeUsername);
        if (!existing) {
          await storage.createStudent({
            name: studentData.name,
            leetcodeUsername: studentData.leetcodeUsername,
            leetcodeProfileLink: studentData.leetcodeProfileLink,
            batch: "2028", // Explicitly set batch for existing data
          });
          importedCount++;
        }
      }
      
      res.json({ 
        message: `Imported ${importedCount} new students`,
        total: studentsData.length 
      });
    } catch (error) {
      console.error('Error importing students:', error);
      res.status(500).json({ error: "Failed to import students" });
    }
  });

  // Import Batch 2027 students (Admin only)
  app.post("/api/init-batch-2027", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      let importedCount = 0;
      
      for (const studentData of batch2027Data) {
        const existing = await storage.getStudentByUsername(studentData.leetcodeUsername);
        if (!existing) {
          await storage.createStudent({
            name: studentData.name,
            leetcodeUsername: studentData.leetcodeUsername,
            leetcodeProfileLink: studentData.leetcodeProfileLink,
            batch: "2027",
          });
          importedCount++;
        }
      }
      
      res.json({ 
        message: `Imported ${importedCount} new Batch 2027 students`,
        total: batch2027Data.length 
      });
    } catch (error) {
      console.error('Error importing Batch 2027 students:', error);
      res.status(500).json({ error: "Failed to import Batch 2027 students" });
    }
  });

  // Replace existing Batch 2027 students with real data
  app.post("/api/replace-batch-2027", async (req, res) => {
    try {
      // First, delete all existing Batch 2027 students
      const existingStudents = await storage.getStudentsByBatch('2027');
      console.log(`Found ${existingStudents.length} existing Batch 2027 students to replace`);
      
      for (const student of existingStudents) {
        await storage.deleteStudentByUsername(student.leetcodeUsername);
      }
      
      // Import the real Batch 2027 students
      let importedCount = 0;
      for (const studentData of batch2027Data) {
        await storage.createStudent({
          name: studentData.name,
          leetcodeUsername: studentData.leetcodeUsername,
          leetcodeProfileLink: studentData.leetcodeProfileLink,
          batch: "2027",
        });
        importedCount++;
      }
      
      res.json({ 
        message: `Replaced Batch 2027 with ${importedCount} real students`,
        deleted: existingStudents.length,
        imported: importedCount 
      });
    } catch (error) {
      console.error('Error replacing Batch 2027 students:', error);
      res.status(500).json({ error: "Failed to replace Batch 2027 students" });
    }
  });

  // Get all students with enriched data
  app.get("/api/students", async (req, res) => {
    try {
      const students = await storage.getAllStudents();
      
      // Enrich each student with real-time data, stats, and streaks
      const enrichedStudents = await Promise.all(students.map(async (student) => {
        const realTimeData = await storage.getLeetcodeRealTimeData(student.id);
        const weeklyData = await storage.getWeeklyProgressData(student.id);
        const latestProgress = await storage.getLatestDailyProgress(student.id);
        
        // Use real-time data if available, otherwise calculate from daily progress
        const currentStreak = realTimeData?.currentStreak ?? await storage.calculateStreak(student.id);
        const maxStreak = realTimeData?.maxStreak ?? await storage.calculateMaxStreak(student.id);
        const totalActiveDays = realTimeData?.totalActiveDays ?? await storage.calculateTotalActiveDays(student.id);
        

        
        // Get stats from latest daily progress instead of real-time data
        const stats = latestProgress ? {
          totalSolved: latestProgress.totalSolved || 0,
          easySolved: latestProgress.easySolved || 0,
          mediumSolved: latestProgress.mediumSolved || 0,
          hardSolved: latestProgress.hardSolved || 0,
          ranking: latestProgress.ranking || 0,
          acceptanceRate: latestProgress.acceptanceRate || 0,
          totalSubmissions: latestProgress.totalSubmissions || 0,
          totalAccepted: latestProgress.totalAccepted || 0,
        } : {
          totalSolved: 0,
          easySolved: 0,
          mediumSolved: 0,
          hardSolved: 0,
          ranking: 0,
          acceptanceRate: 0,
          totalSubmissions: 0,
          totalAccepted: 0,
        };
        
        return {
          ...student,
          stats,
          streak: currentStreak,
          maxStreak: maxStreak,
          totalActiveDays: totalActiveDays,
          weeklyProgress: Math.max(0, (weeklyData?.week5Score || weeklyData?.currentWeekScore || weeklyData?.week4Score || 0) - (weeklyData?.week4Score || 0)),
          lastSubmissionDate: latestProgress?.date,
          status: latestProgress ? 'Synced' : 'Pending'
        };
      }));
      
      res.json(enrichedStudents);
    } catch (error) {
      console.error('Error fetching enriched students:', error);
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  // Delete student by username
  app.delete("/api/students/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const success = await storage.deleteStudentByUsername(username);
      if (success) {
        res.json({ message: `Student ${username} deleted successfully` });
      } else {
        res.status(404).json({ error: "Student not found or failed to delete" });
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      res.status(500).json({ error: "Failed to delete student" });
    }
  });

  // Bulk delete students
  app.post("/api/students/bulk-delete", async (req, res) => {
    try {
      const { usernames } = req.body;
      if (!Array.isArray(usernames)) {
        return res.status(400).json({ error: "Usernames must be an array" });
      }

      const results = await Promise.allSettled(
        usernames.map(username => storage.deleteStudentByUsername(username))
      );

      const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
      const failed = results.length - successful;

      res.json({ 
        message: `Bulk delete completed: ${successful} successful, ${failed} failed`,
        successful,
        failed,
        total: results.length
      });
    } catch (error) {
      console.error('Error bulk deleting students:', error);
      res.status(500).json({ error: "Failed to bulk delete students" });
    }
  });

  // Get student dashboard data - with caching
  app.get("/api/dashboard/student/:username", authenticateToken, requireAdminOrOwnData, async (req, res) => {
    try {
      const { username } = req.params;
      const student = await storage.getStudentByUsername(username);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      
      const result = await cacheService.getDataWithCache(
        `student_${student.id}`,
        () => storage.getStudentDashboard(student.id)
      );
      
      if (!result.data) {
        return res.status(404).json({ error: "Student dashboard not found" });
      }
      
      res.set('X-Cache-Status', result.fromCache ? 'HIT' : 'MISS');
      res.json(result.data);
    } catch (error) {
      console.error('Error fetching student dashboard:', error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Get admin dashboard data (Admin only) - with caching
  app.get("/api/dashboard/admin", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const result = await cacheService.getDataWithCache(
        'admin',
        () => storage.getAdminDashboard()
      );
      
      // Add cache metadata to response headers
      res.set('X-Cache-Status', result.fromCache ? 'HIT' : 'MISS');
      res.json(result.data);
    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
      res.status(500).json({ error: "Failed to fetch admin dashboard data" });
    }
  });

  // Get batch dashboard data - with caching
  app.get("/api/dashboard/batch/:batch", async (req, res) => {
    try {
      const { batch } = req.params;
      if (!["2027", "2028"].includes(batch)) {
        return res.status(400).json({ error: "Invalid batch. Must be 2027 or 2028" });
      }
      
      const result = await cacheService.getDataWithCache(
        `batch_${batch}`,
        () => storage.getBatchDashboard(batch)
      );
      
      res.set('X-Cache-Status', result.fromCache ? 'HIT' : 'MISS');
      res.json(result.data);
    } catch (error) {
      console.error('Error fetching batch dashboard:', error);
      res.status(500).json({ error: "Failed to fetch batch dashboard data" });
    }
  });

  // Get university dashboard data (combined batches) - with caching
  app.get("/api/dashboard/university", async (req, res) => {
    try {
      const result = await cacheService.getDataWithCache(
        'university',
        () => storage.getUniversityDashboard()
      );
      
      res.set('X-Cache-Status', result.fromCache ? 'HIT' : 'MISS');
      res.json(result.data);
    } catch (error) {
      console.error('Error fetching university dashboard:', error);
      res.status(500).json({ error: "Failed to fetch university dashboard data" });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Get batch-specific leaderboard
  app.get("/api/leaderboard/batch/:batch", async (req, res) => {
    try {
      const { batch } = req.params;
      if (!["2027", "2028"].includes(batch)) {
        return res.status(400).json({ error: "Invalid batch. Must be 2027 or 2028" });
      }
      const leaderboard = await storage.getBatchLeaderboard(batch);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch batch leaderboard" });
    }
  });

  // Get university-wide leaderboard (combined batches)
  app.get("/api/leaderboard/university", async (req, res) => {
    try {
      const leaderboard = await storage.getUniversityLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch university leaderboard" });
    }
  });

  // Get all students with basic stats for directory (Admin only)
  app.get("/api/students/all", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const adminData = await storage.getAdminDashboard();
      res.json(adminData.students);
    } catch (error) {
      console.error('Error fetching all students:', error);
      res.status(500).json({ error: 'Failed to fetch students' });
    }
  });

  // Get students by batch
  app.get("/api/students/batch/:batch", async (req, res) => {
    try {
      const { batch } = req.params;
      if (!["2027", "2028"].includes(batch)) {
        return res.status(400).json({ error: "Invalid batch. Must be 2027 or 2028" });
      }
      const batchData = await storage.getBatchDashboard(batch);
      res.json(batchData.students);
    } catch (error) {
      console.error('Error fetching batch students:', error);
      res.status(500).json({ error: 'Failed to fetch batch students' });
    }
  });

  // Get complete rankings for all students
  app.get("/api/rankings/all", async (req, res) => {
    try {
      const adminData = await storage.getAdminDashboard();
      
      // Sort students by total problems solved in descending order
      const rankedStudents = adminData.students
        .sort((a: any, b: any) => b.stats.totalSolved - a.stats.totalSolved)
        .map((student: any, index: number) => ({
          rank: index + 1,
          student: {
            id: student.id,
            name: student.name,
            leetcodeUsername: student.leetcodeUsername,
            leetcodeProfileLink: student.leetcodeProfileLink || `https://leetcode.com/u/${student.leetcodeUsername}/`
          },
          stats: student.stats,
          weeklyProgress: student.weeklyProgress,
          streak: student.streak,
          status: student.status,
          badges: student.badges?.length || 0
        }));

      res.json(rankedStudents);
    } catch (error) {
      console.error('Error fetching rankings:', error);
      res.status(500).json({ error: 'Failed to fetch rankings' });
    }
  });

  // Sync single student (Admin only)
  app.post("/api/sync/student/:id", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await leetCodeService.syncStudentData(id);
      
      if (success) {
        res.json({ message: "Student data synced successfully" });
      } else {
        res.status(400).json({ error: "Failed to sync student data" });
      }
    } catch (error) {
      console.error('Error syncing student:', error);
      res.status(500).json({ error: "Failed to sync student data" });
    }
  });

  // Sync all students (Admin only)
  // Manual sync endpoint removed - using automatic syncing now

  // Sync profile photos from LeetCode (Admin only)
  app.post("/api/sync/profile-photos", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const result = await leetCodeService.syncAllProfilePhotos();
      res.json({ 
        message: `Profile photos sync completed`, 
        success: result.success, 
        failed: result.failed 
      });
    } catch (error) {
      console.error('Error syncing profile photos:', error);
      res.status(500).json({ error: "Failed to sync profile photos" });
    }
  });

  // Export CSV
  app.get("/api/export/csv", async (req, res) => {
    try {
      const adminData = await storage.getAdminDashboard();
      
      // Create CSV content
      const headers = ['Name', 'LeetCode Username', 'Total Solved', 'Weekly Progress', 'Streak', 'Status'];
      const csvContent = [
        headers.join(','),
        ...adminData.students.map((student: any) => [
          `"${student.name}"`,
          student.leetcodeUsername,
          student.stats.totalSolved,
          student.weeklyProgress,
          student.streak,
          `"${student.status}"`
        ].join(','))
      ].join('\n');
      
      const date = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="leetcode-progress-${date}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  // Get app settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Cache management endpoints (Admin only)
  app.post("/api/cache/warm-up", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      await cacheService.warmUpCache();
      res.json({ message: "Cache warm-up completed successfully" });
    } catch (error) {
      console.error('Error warming up cache:', error);
      res.status(500).json({ error: "Failed to warm up cache" });
    }
  });

  app.post("/api/cache/clear", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const { cacheKey } = req.body;
      if (cacheKey) {
        await cacheService.clearCache(cacheKey);
        res.json({ message: `Cache cleared for key: ${cacheKey}` });
      } else {
        await cacheService.clearAllCache();
        res.json({ message: "All cache cleared successfully" });
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  app.get("/api/cache/status", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const keys = ['admin', 'university', 'batch_2027', 'batch_2028'];
      const status = await Promise.all(
        keys.map(async (key) => ({
          key,
          expired: await cacheService.isCacheExpired(key),
          hasData: (await cacheService.getCachedData(key)) !== null
        }))
      );
      res.json({ cacheStatus: status });
    } catch (error) {
      console.error('Error checking cache status:', error);
      res.status(500).json({ error: "Failed to check cache status" });
    }
  });

  // Get all badges data
  app.get("/api/badges/all", async (req, res) => {
    try {
      const badgesData = await storage.getAllBadgesData();
      res.json(badgesData);
    } catch (error) {
      console.error('Error fetching badges data:', error);
      res.status(500).json({ error: "Failed to fetch badges data" });
    }
  });

  // Import students from CSV
  app.post("/api/import/csv", async (req, res) => {
    try {
      const csvFilePath = path.join(process.cwd(), 'attached_assets', 'LeetCode Details (2024-28) - Sheet1_1753877079641.csv');
      const result = await csvImportService.importFromCSV(csvFilePath);
      
      res.json({
        success: true,
        message: `Import completed: ${result.imported} students imported, ${result.skipped} skipped`,
        ...result
      });
    } catch (error) {
      console.error('CSV import error:', error);
      res.status(500).json({ error: `Failed to import CSV: ${error}` });
    }
  });

  // Import updated students data from new CSV format
  app.post("/api/import/updated-csv", async (req, res) => {
    try {
      const csvFilePath = path.join(process.cwd(), 'attached_assets', 'LEETCODE UPDATED DATA SHEET_1753968848855.csv');
      const result = await csvImportService.importUpdatedCSV(csvFilePath);
      
      res.json({
        success: true,
        message: `Update completed: ${result.updated} students updated, ${result.created} created, ${result.skipped} skipped`,
        ...result
      });
    } catch (error) {
      console.error('CSV update error:', error);
      res.status(500).json({ error: `Failed to update from CSV: ${error}` });
    }
  });

  // Import weekly progress data from CSV
  app.post("/api/import/weekly-progress", async (req, res) => {
    try {
      const csvFilePath = path.join(process.cwd(), 'attached_assets', 'batch of 28 leetcode_2_AUGUST_1754130719740.csv');
      const result = await weeklyProgressImportService.importWeeklyProgressFromCSV(csvFilePath);
      
      res.json({
        success: true,
        message: `Weekly progress import completed: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped`,
        ...result
      });
    } catch (error) {
      console.error('Weekly progress import error:', error);
      res.status(500).json({ error: `Failed to import weekly progress data: ${error}` });
    }
  });

  // Get all weekly progress data
  app.get("/api/weekly-progress", async (req, res) => {
    try {
      const weeklyProgressData = await weeklyProgressImportService.getEnhancedWeeklyProgressData();
      res.json(weeklyProgressData);
    } catch (error) {
      console.error('Weekly progress fetch error:', error);
      res.status(500).json({ error: "Failed to fetch weekly progress data" });
    }
  });

  // Get specific student's weekly progress
  app.get("/api/weekly-progress/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const studentProgress = await weeklyProgressImportService.getStudentWeeklyProgress(username);
      
      if (!studentProgress) {
        return res.status(404).json({ error: "Student not found or no weekly progress data available" });
      }
      
      res.json(studentProgress);
    } catch (error) {
      console.error('Student weekly progress fetch error:', error);
      res.status(500).json({ error: "Failed to fetch student weekly progress data" });
    }
  });

  // Import weekly progress from CSV data
  app.post("/api/import/weekly-progress-csv", async (req, res) => {
    try {
      const { csvData } = req.body;
      
      if (!csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ error: "Invalid CSV data format" });
      }
      
      const result = await weeklyProgressImportService.importFromCSVData(csvData);
      
      res.json({
        success: true,
        message: `Weekly progress import completed: ${result.stats.imported} imported, ${result.stats.updated} updated`,
        stats: result.stats
      });
    } catch (error) {
      console.error('Weekly progress CSV import error:', error);
      res.status(500).json({ error: `Failed to import weekly progress CSV: ${error}` });
    }
  });

  // Remove students with zero questions solved
  app.post("/api/cleanup/remove-zero-students", async (req, res) => {
    try {
      const result = await storage.removeStudentsWithZeroQuestions();
      
      res.json({
        success: true,
        message: `Removed ${result.removedCount} students with zero questions solved`,
        removedCount: result.removedCount
      });
    } catch (error) {
      console.error('Remove zero students error:', error);
      res.status(500).json({ error: "Failed to remove students with zero questions" });
    }
  });

  // Update Week 5 data from CSV - Bulk Update API
  app.post("/api/update/week5-data", async (req, res) => {
    try {
      const week5Data = [
        { name: "Aaditya Raj", username: "aadi2532", week1: 27, week2: 32, week3: 39, week4: 39, week5: 58 },
        { name: "Abhishek Singh", username: "Abhishek_2008", week1: 11, week2: 25, week3: 40, week4: 64, week5: 68 },
        { name: "Aditya", username: "Aadi_Singh_28", week1: 0, week2: 13, week3: 28, week4: 58, week5: 83 },
        { name: "Ajit Yadav", username: "Ajit_Yadav_2908", week1: 6, week2: 21, week3: 36, week4: 62, week5: 76 },
        { name: "Akanksha", username: "Akanksha_kushwaha_a", week1: 22, week2: 29, week3: 48, week4: 72, week5: 84 },
        { name: "Alok Raj", username: "alok-work23", week1: 3, week2: 9, week3: 29, week4: 53, week5: 61 },
        { name: "Aman Verma", username: "aman1640", week1: 0, week2: 4, week3: 15, week4: 15, week5: 51 },
        { name: "Aman Singh", username: "Aman_Singh_Sitare", week1: 123, week2: 140, week3: 176, week4: 217, week5: 243 },
        { name: "Aman Adarsh", username: "amanadarsh1168", week1: 0, week2: 9, week3: 26, week4: 52, week5: 69 },
        { name: "Amit Kumar", username: "Amit_Kumar13", week1: 3, week2: 16, week3: 31, week4: 54, week5: 65 },
        { name: "Anamika Kumari", username: "tanamika", week1: 4, week2: 17, week3: 42, week4: 42, week5: 55 },
        { name: "Anand Singh", username: "of0DUuvBjV", week1: 0, week2: 0, week3: 2, week4: 12, week5: 11 },
        { name: "Anand Kumar Pandey", username: "Anand_Pandey123", week1: 110, week2: 139, week3: 175, week4: 218, week5: 256 },
        { name: "Anoop kumar", username: "Anoop_kumar123", week1: 0, week2: 8, week3: 16, week4: 53, week5: 84 },
        { name: "Anshu Kumar", username: "CodebyAnshu03", week1: 4, week2: 11, week3: 19, week4: 40, week5: 61 },
        { name: "Anuradha Tiwari", username: "anuradha_24", week1: 52, week2: 61, week3: 94, week4: 122, week5: 134 },
        { name: "Anushri Mishra", username: "Anushri_Mishra", week1: 49, week2: 53, week3: 75, week4: 90, week5: 108 },
        { name: "Aradhya patel", username: "aradhya789", week1: 8, week2: 20, week3: 40, week4: 50, week5: 54 },
        { name: "Arjun Kadam", username: "arjunkadampatil", week1: 22, week2: 57, week3: 78, week4: 112, week5: 122 },
        { name: "Arpita Tripathi", username: "Uny60jPJeO", week1: 42, week2: 53, week3: 74, week4: 91, week5: 101 },
        { name: "Arun kumar", username: "Arun_404", week1: 0, week2: 5, week3: 12, week4: 41, week5: 41 },
        { name: "Aryan Saini", username: "aryan8773", week1: 15, week2: 31, week3: 57, week4: 120, week5: 160 },
        { name: "Ashwin yadav", username: "ashwin-tech", week1: 0, week2: 5, week3: 25, week4: 49, week5: 56 },
        { name: "Ayush Kumar", username: "Ayush4Sony", week1: 0, week2: 5, week3: 16, week4: 41, week5: 57 },
        { name: "Ayush Kumar Yadav", username: "Ayush_Yadav_029", week1: 9, week2: 26, week3: 42, week4: 54, week5: 63 },
        { name: "Bhagwati", username: "Bhagwati323", week1: 5, week2: 27, week3: 63, week4: 98, week5: 116 },
        { name: "Bhaskar Mahato", username: "bhaskarmahato03", week1: 1, week2: 11, week3: 27, week4: 52, week5: 67 },
        { name: "Byagari Praveen Kumar", username: "Mr_bpk_4433", week1: 0, week2: 9, week3: 24, week4: 44, week5: 55 },
        { name: "Challa Trivedh Kumar", username: "TrivedhChalla", week1: 27, week2: 41, week3: 61, week4: 87, week5: 103 },
        { name: "Chandan Giri", username: "WelcomeGseries", week1: 12, week2: 16, week3: 31, week4: 47, week5: 47 },
        { name: "Chiranjeet Biswas", username: "Chiranjeet_Biswas", week1: 4, week2: 5, week3: 24, week4: 60, week5: 75 },
        { name: "Debangsu Misra", username: "debangsumisra", week1: 18, week2: 25, week3: 40, week4: 65, week5: 90 },
        { name: "Deepak Mandal", username: "AlgoMandal", week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 },
        { name: "Dilip Vaishnav", username: "Dilip_Vaishnav_07", week1: 4, week2: 8, week3: 21, week4: 56, week5: 56 },
        { name: "Dilip Suthar", username: "Dilip0552", week1: 5, week2: 15, week3: 25, week4: 49, week5: 64 },
        { name: "Disha Sahu", username: "Disha-01-alt", week1: 30, week2: 48, week3: 68, week4: 94, week5: 101 },
        { name: "Divyanshi Sahu", username: "ADHIINSVY13", week1: 0, week2: 8, week3: 22, week4: 54, week5: 58 },
        { name: "Divyanshi Rathour", username: "Divyanshirathour", week1: 15, week2: 21, week3: 42, week4: 62, week5: 66 },
        { name: "Ekta kumari", username: "EktaSaw1212", week1: 20, week2: 25, week3: 48, week4: 63, week5: 83 },
        { name: "Gaurav Rathore", username: "Gaurav_rathore96", week1: 25, week2: 35, week3: 62, week4: 87, week5: 102 },
        { name: "Gaurav kumar", username: "gaurav_vvv", week1: 12, week2: 14, week3: 20, week4: 51, week5: 86 },
        { name: "Gaurav Tiwari", username: "gauravtiwari_70", week1: 5, week2: 10, week3: 20, week4: 33, week5: 55 },
        { name: "Guman Singh Rajpoot", username: "Guman_singh_rajpoot", week1: 8, week2: 16, week3: 52, week4: 97, week5: 120 },
        { name: "Harisingh Rajpoot", username: "HarisinghRaj", week1: 5, week2: 25, week3: 54, week4: 98, week5: 144 },
        { name: "Harsh Chourasiya", username: "harshchourasiya295", week1: 1, week2: 30, week3: 55, week4: 120, week5: 129 },
        { name: "Harshit Chaturvedi", username: "thisharshit", week1: 2, week2: 18, week3: 30, week4: 65, week5: 67 },
        { name: "Himanshu kumar", username: "ansraaz86", week1: 1, week2: 14, week3: 20, week4: 55, week5: 69 },
        { name: "Himanshu Srivastav", username: "codeCrafter777", week1: 33, week2: 56, week3: 71, week4: 167, week5: 178 },
        { name: "Himanshu Kanwar Chundawat", username: "himanshu_chundawat", week1: 16, week2: 23, week3: 28, week4: 67, week5: 69 },
        { name: "Hirak Nath", username: "hirak__", week1: 12, week2: 21, week3: 51, week4: 78, week5: 101 },
        { name: "Hiranya Patil", username: "hiranya_patil", week1: 7, week2: 18, week3: 49, week4: 75, week5: 105 },
        { name: "Ishant Bhoyar", username: "Ishant_57", week1: 38, week2: 85, week3: 121, week4: 143, week5: 156 },
        { name: "Jagriti Pandey", username: "jagriti_Pandey01", week1: 1, week2: 5, week3: 15, week4: 22, week5: 30 },
        { name: "Jamal Akhtar", username: "kKJ7y7Q9Ks", week1: 19, week2: 30, week3: 40, week4: 60, week5: 66 },
        { name: "Janu Chaudhary", username: "Janu_Chaudhary", week1: 41, week2: 67, week3: 89, week4: 124, week5: 131 },
        { name: "KARANPAL SINGH RANAWAT", username: "krtechie", week1: 0, week2: 6, week3: 41, week4: 77, week5: 112 },
        { name: "khushi Narwariya", username: "khushi_narwariya", week1: 18, week2: 29, week3: 50, week4: 79, week5: 101 },
        { name: "Lakhan Rathore", username: "Lakhan_rathore", week1: 0, week2: 14, week3: 19, week4: 41, week5: 63 },
        { name: "Maneesh Sakhwar", username: "Maneesh_Sakhwar", week1: 0, week2: 4, week3: 16, week4: 21, week5: 54 },
        { name: "Mani Kumar", username: "MANIKUMAR7109", week1: 9, week2: 19, week3: 44, week4: 57, week5: 57 },
        { name: "Manish Chhaba", username: "Chhaba_Manish", week1: 0, week2: 10, week3: 21, week4: 36, week5: 50 },
        { name: "Manish Kumar Tiwari", username: "manish__45", week1: 156, week2: 179, week3: 211, week4: 262, week5: 301 },
        { name: "Manoj Kharkar", username: "manojk909", week1: 9, week2: 21, week3: 40, week4: 78, week5: 101 },
        { name: "Manoj Dewda", username: "Manoj_Dewda022", week1: 1, week2: 14, week3: 41, week4: 67, week5: 88 },
        { name: "Mausam kumari", username: "Mausam-kumari", week1: 23, week2: 33, week3: 68, week4: 103, week5: 116 },
        { name: "Mayank Raj", username: "mayankRajRay", week1: 0, week2: 7, week3: 19, week4: 54, week5: 74 },
        { name: "Mehtab Alam", username: "alamehtab", week1: 9, week2: 16, week3: 31, week4: 63, week5: 75 },
        { name: "Mohammad Afzal Raza", username: "Afzl_Raza", week1: 4, week2: 17, week3: 29, week4: 37, week5: 56 },
        { name: "MOHD MONIS", username: "codemon-07", week1: 15, week2: 19, week3: 32, week4: 50, week5: 50 },
        { name: "Mohit Sharma", username: "sharma_Mohit_2005", week1: 13, week2: 21, week3: 37, week4: 57, week5: 71 },
        { name: "Moirangthem Joel Singh", username: "JoelMoirangthem", week1: 1, week2: 10, week3: 33, week4: 68, week5: 120 },
        { name: "Monu Rajpoot", username: "Monurajpoot", week1: 1, week2: 15, week3: 40, week4: 78, week5: 106 },
        { name: "N.Arun Kumar", username: "Arunkumar087", week1: 4, week2: 12, week3: 32, week4: 53, week5: 57 },
        { name: "Neeraj Parmar", username: "Neeru888", week1: 30, week2: 35, week3: 50, week4: 70, week5: 81 },
        { name: "Nidhi Kumari", username: "Nid_Singh", week1: 105, week2: 120, week3: 130, week4: 153, week5: 153 },
        { name: "NIKHIL Chaurasiya", username: "Rdxnikhil", week1: 6, week2: 15, week3: 21, week4: 37, week5: 50 },
        { name: "Nikhil Kumar Mehta", username: "Nikhil_KM_04", week1: 9, week2: 41, week3: 60, week4: 93, week5: 104 },
        { name: "Nirmal Kumar", username: "r2GUlBuyLZ", week1: 18, week2: 27, week3: 39, week4: 46, week5: 46 },
        { name: "Nirmal Mewada", username: "nirmal_M01", week1: 2, week2: 8, week3: 11, week4: 39, week5: 65 },
        { name: "Ompal Yadav", username: "om_codes1", week1: 2, week2: 2, week3: 12, week4: 45, week5: 50 },
        { name: "Pawan Kushwah", username: "pawankushwah", week1: 12, week2: 26, week3: 50, week4: 84, week5: 90 },
        { name: "Pinky Rana", username: "ranapink398", week1: 0, week2: 4, week3: 14, week4: 48, week5: 58 },
        { name: "Pooran Singh", username: "pooransingh01", week1: 8, week2: 26, week3: 35, week4: 55, week5: 68 },
        { name: "Prabhat Patidar", username: "Prabhat7987", week1: 29, week2: 46, week3: 70, week4: 73, week5: 81 },
        { name: "Prachi Dhakad", username: "prachiDhakad", week1: 51, week2: 79, week3: 95, week4: 129, week5: 152 },
        { name: "Pragati Chauhan", username: "Chauhan_Pragati", week1: 31, week2: 51, week3: 87, week4: 116, week5: 116 },
        { name: "Pranjal Dubey", username: "Pranjal428", week1: 10, week2: 20, week3: 33, week4: 53, week5: 76 },
        { name: "Prem Kumar", username: "prem2450", week1: 6, week2: 21, week3: 41, week4: 59, week5: 86 },
        { name: "Prem Shankar Kushwaha", username: "PCodex9", week1: 2, week2: 11, week3: 25, week4: 57, week5: 67 },
        { name: "Prerana Rajnag", username: "preranarajnag", week1: 1, week2: 10, week3: 31, week4: 51, week5: 62 },
        { name: "Priya Saini", username: "Priya_saini2004", week1: 30, week2: 45, week3: 83, week4: 118, week5: 139 },
        { name: "Priyadarshi Kumar", username: "iPriyadarshi", week1: 78, week2: 87, week3: 122, week4: 142, week5: 179 },
        { name: "Pushpraj singh", username: "Pushpraj_DSA", week1: 0, week2: 10, week3: 26, week4: 57, week5: 57 },
        { name: "Rahul Kumar", username: "rahu48", week1: 0, week2: 16, week3: 24, week4: 59, week5: 62 },
        { name: "Rahul Kumar Verma", username: "RahulVermaji", week1: 7, week2: 23, week3: 43, week4: 43, week5: 70 },
        { name: "Rajeev Yadav", username: "kn1gh7t", week1: 7, week2: 10, week3: 32, week4: 62, week5: 67 },
        { name: "Rajiv Kumar", username: "rajiv1478", week1: 10, week2: 16, week3: 26, week4: 61, week5: 63 },
        { name: "Rakshita K Biradar", username: "RakshitaKBiradar", week1: 3, week2: 8, week3: 24, week4: 74, week5: 93 },
        { name: "Ramraj Nagar", username: "Ramrajnagar", week1: 37, week2: 48, week3: 85, week4: 109, week5: 110 },
        { name: "Rani Kumari", username: "123_Rani", week1: 110, week2: 130, week3: 168, week4: 207, week5: 219 },
        { name: "Ranjeet kumar yadav", username: "DL6FbStsPL", week1: 3, week2: 8, week3: 23, week4: 40, week5: 54 },
        { name: "Ravi Mourya", username: "MouryaRavi", week1: 0, week2: 14, week3: 21, week4: 46, week5: 60 },
        { name: "Ravi Rajput", username: "RAVI-RAJPUT-UMATH", week1: 1, week2: 8, week3: 25, week4: 62, week5: 85 },
        { name: "Ritesh jha", username: "RITESH12JHA24", week1: 1, week2: 6, week3: 19, week4: 41, week5: 60 },
        { name: "Ritik Singh", username: "Ritik_Singh_2311", week1: 61, week2: 68, week3: 101, week4: 125, week5: 141 },
        { name: "Rohit Malviya", username: "RohitMelasiya", week1: 7, week2: 10, week3: 35, week4: 59, week5: 59 },
        { name: "Rohit Kumar", username: "rkprasad90600", week1: 0, week2: 8, week3: 23, week4: 52, week5: 52 },
        { name: "Sajan Kumar", username: "Sajan_kumar45", week1: 5, week2: 5, week3: 5, week4: 5, week5: 5 },
        { name: "Samina Sultana", username: "Samina_Sultana", week1: 57, week2: 65, week3: 94, week4: 130, week5: 150 },
        { name: "Sandeep Kumar", username: "sandeepsinu79", week1: 0, week2: 9, week3: 17, week4: 45, week5: 45 },
        { name: "Sandhya Kaushal", username: "Sandhya_Kaushal", week1: 11, week2: 24, week3: 35, week4: 64, week5: 71 },
        { name: "Sandhya Parmar", username: "Sandhya_Parmar", week1: 80, week2: 90, week3: 100, week4: 112, week5: 120 },
        { name: "Sarthaksuman Mishra", username: "sarthak-26", week1: 0, week2: 12, week3: 18, week4: 64, week5: 73 },
        { name: "Satish Mahto", username: "kr_satish", week1: 8, week2: 23, week3: 40, week4: 68, week5: 79 },
        { name: "Saurabh Bisht", username: "bocchi_277", week1: 0, week2: 4, week3: 27, week4: 60, week5: 81 },
        { name: "Shahid Ansari", username: "shahidthisside", week1: 0, week2: 4, week3: 19, week4: 54, week5: 72 },
        { name: "Shalini Priya", username: "Shalini_Priya29", week1: 5, week2: 13, week3: 22, week4: 62, week5: 83 },
        { name: "Shilpi shaw", username: "shilpishaw", week1: 52, week2: 65, week3: 100, week4: 136, week5: 171 },
        { name: "Shivam Shukla", username: "itz_shuklajii", week1: 0, week2: 17, week3: 28, week4: 50, week5: 85 },
        { name: "Shivam Shukla", username: "shivamm-shukla", week1: 0, week2: 7, week3: 16, week4: 52, week5: 90 },
        { name: "Shivang Dubey", username: "Shivangdubey9", week1: 0, week2: 11, week3: 31, week4: 67, week5: 87 },
        { name: "Shlok Gupta", username: "shlokg62", week1: 69, week2: 86, week3: 103, week4: 124, week5: 154 },
        { name: "Shreyank Sthavaramath", username: "shreyank_s", week1: 84, week2: 95, week3: 102, week4: 129, week5: 144 },
        { name: "Shubham Kang", username: "Shubham_Kang", week1: 6, week2: 20, week3: 32, week4: 58, week5: 63 },
        { name: "Sneha Shaw", username: "Sneha6289", week1: 22, week2: 35, week3: 47, week4: 70, week5: 89 },
        { name: "Sunny Kumar", username: "sunny_kumar_1", week1: 38, week2: 47, week3: 59, week4: 94, week5: 97 },
        { name: "Surveer Singh Rao", username: "Surveer686", week1: 22, week2: 40, week3: 69, week4: 106, week5: 130 },
        { name: "Swati Kumari", username: "Swati_Kumari_142", week1: 112, week2: 137, week3: 162, week4: 204, week5: 228 },
        { name: "Suyash Yadav", username: "yadavsuyash723", week1: 83, week2: 91, week3: 102, week4: 123, week5: 132 },
        { name: "Ujjval Baijal", username: "Ujjwal_Baijal", week1: 4, week2: 11, week3: 24, week4: 49, week5: 62 },
        { name: "Uppara Sai Maithreyi", username: "sai_maithri", week1: 11, week2: 23, week3: 44, week4: 72, week5: 83 },
        { name: "Vinay Kumar", username: "Vinay_Prajapati", week1: 2, week2: 18, week3: 41, week4: 69, week5: 97 },
        { name: "Tamnna parveen", username: "Tamnnaparvreen", week1: 8, week2: 13, week3: 40, week4: 55, week5: 71 },
        { name: "Vinay Kumar Gupta", username: "vinay_gupta01", week1: 0, week2: 0, week3: 11, week4: 37, week5: 38 },
        { name: "Vishal Bhardwaj", username: "vishalbhardwaj123", week1: 0, week2: 7, week3: 18, week4: 35, week5: 51 },
        { name: "Vishal Kumar", username: "kumar_vishal_01", week1: 0, week2: 12, week3: 29, week4: 43, week5: 64 },
        { name: "Vivek Kumar", username: "its_vivek_001", week1: 0, week2: 5, week3: 15, week4: 20, week5: 20 },
        { name: "Vivek kumar", username: "vivek_75", week1: 3, week2: 12, week3: 30, week4: 46, week5: 63 },
        { name: "Yuvraj Chirag", username: "Yuvraj_Chirag", week1: 85, week2: 101, week3: 126, week4: 155, week5: 181 },
        { name: "Yuvraj Singh Bhati", username: "yuvrajsinghbhati01", week1: 15, week2: 24, week3: 44, week4: 66, week5: 90 },
        { name: "Naman Damami", username: "namandamami", week1: 0, week2: 7, week3: 14, week4: 51, week5: 84 },
        { name: "Ajay jatav", username: "Ajayjatav", week1: 0, week2: 15, week3: 37, week4: 73, week5: 93 },
        { name: "Kuldeep Saraswat", username: "Kuldeep_Saraswat", week1: 0, week2: 5, week3: 10, week4: 23, week5: 53 }
      ];

      let updated = 0;
      let skipped = 0;

      for (const studentData of week5Data) {
        try {
          // Find the student by username
          const student = await storage.getStudentByUsername(studentData.username);
          if (!student) {
            console.log(`Student not found: ${studentData.username}`);
            skipped++;
            continue;
          }

          // Calculate progress increments
          const week2Progress = studentData.week2 - studentData.week1;
          const week3Progress = studentData.week3 - studentData.week2;
          const week4Progress = studentData.week4 - studentData.week3;
          const week5Progress = studentData.week5 - studentData.week4;
          const totalScore = studentData.week5;
          const averageWeeklyGrowth = Math.round((studentData.week5 - studentData.week1) / 4);

          // Check if weekly progress data exists
          const existingProgress = await storage.getWeeklyProgressData(student.id);
          
          if (existingProgress) {
            // Update existing record
            const result = await storage.updateWeeklyProgressData(
              studentData.username,
              {
                week1Score: studentData.week1,
                week2Score: studentData.week2,
                week3Score: studentData.week3,
                week4Score: studentData.week4,
                week5Score: studentData.week5,
                currentWeekScore: studentData.week5,
                week2Progress,
                week3Progress,
                week4Progress,
                week5Progress,
                totalScore,
                averageWeeklyGrowth,
                updatedAt: new Date()
              }
            );
            updated++;
          } else {
            // Create new record
            await storage.createWeeklyProgressData({
              studentId: student.id,
              week1Score: studentData.week1,
              week2Score: studentData.week2,
              week3Score: studentData.week3,
              week4Score: studentData.week4,
              week5Score: studentData.week5,
              currentWeekScore: studentData.week5,
              week2Progress,
              week3Progress,
              week4Progress,
              week5Progress,
              totalScore,
              averageWeeklyGrowth
            });
            updated++;
          }
        } catch (error) {
          console.error(`Error updating ${studentData.username}:`, error);
          skipped++;
        }
      }

      res.json({
        success: true,
        message: `Week 5 data update completed: ${updated} students updated, ${skipped} skipped`,
        stats: { updated, skipped, total: week5Data.length }
      });
    } catch (error) {
      console.error('Week 5 data update error:', error);
      res.status(500).json({ error: "Failed to update Week 5 data" });
    }
  });

  // Update Week 5 scores for students with zero values using their real-time data
  app.post("/api/update/week5-realtime", async (req, res) => {
    try {
      let updated = 0;
      let skipped = 0;

      // Get students with zero or null Week 5 scores who have current progress
      const studentsNeedingUpdate = await db.select({
        studentId: students.id,
        name: students.name,
        username: students.leetcodeUsername,
        week5Score: weeklyProgressData.week5Score,
        currentTotal: dailyProgress.totalSolved
      })
      .from(students)
      .leftJoin(weeklyProgressData, eq(students.id, weeklyProgressData.studentId))
      .leftJoin(dailyProgress, eq(students.id, dailyProgress.studentId))
      .where(
        and(
          sql`(${weeklyProgressData.week5Score} = 0 OR ${weeklyProgressData.week5Score} IS NULL)`,
          sql`${dailyProgress.totalSolved} > 0`
        )
      )
      .orderBy(sql`${dailyProgress.date} DESC`);

      // Get unique students with their latest daily progress
      const uniqueStudents = new Map();
      for (const student of studentsNeedingUpdate) {
        if (!uniqueStudents.has(student.studentId) && student.currentTotal && student.currentTotal > 0) {
          uniqueStudents.set(student.studentId, student);
        }
      }

      console.log(`Found ${uniqueStudents.size} students needing Week 5 updates`);

      for (const studentEntry of Array.from(uniqueStudents.entries())) {
        const [studentId, studentData] = studentEntry;
        try {
          const newWeek5Score = studentData.currentTotal;
          
          // Check if weekly progress data exists
          const existingProgress = await storage.getWeeklyProgressData(studentId);
          
          if (existingProgress) {
            // Update existing record with real-time data
            await storage.updateWeeklyProgressData(studentData.username, {
              week5Score: newWeek5Score,
              currentWeekScore: newWeek5Score,
              totalScore: newWeek5Score,
              updatedAt: new Date()
            });
            console.log(`Updated ${studentData.name} Week 5 score to ${newWeek5Score}`);
            updated++;
          } else {
            // Create new weekly progress record with real-time data
            await storage.createWeeklyProgressData({
              studentId: studentId,
              week1Score: 0,
              week2Score: 0,
              week3Score: 0,
              week4Score: 0,
              week5Score: newWeek5Score,
              currentWeekScore: newWeek5Score,
              week2Progress: 0,
              week3Progress: 0,
              week4Progress: 0,
              week5Progress: newWeek5Score,
              totalScore: newWeek5Score,
              averageWeeklyGrowth: Math.round(newWeek5Score / 5)
            });
            console.log(`Created Week 5 data for ${studentData.name} with score ${newWeek5Score}`);
            updated++;
          }
        } catch (error) {
          console.error(`Error updating ${studentData.name}:`, error);
          skipped++;
        }
      }

      res.json({
        success: true,
        message: `Week 5 real-time update completed: ${updated} students updated, ${skipped} skipped`,
        stats: { updated, skipped, total: uniqueStudents.size }
      });
    } catch (error) {
      console.error('Week 5 real-time update error:', error);
      res.status(500).json({ error: "Failed to update Week 5 with real-time data" });
    }
  });

  // Recalculate all weekly increment data using present week - last week logic
  app.post("/api/update/weekly-increments", async (req, res) => {
    try {
      // Update weekly progress calculations
      const result = await db.execute(sql`
        UPDATE weekly_progress_data 
        SET 
          week2_progress = COALESCE(week2_score - week1_score, 0),
          week3_progress = COALESCE(week3_score - week2_score, 0),
          week4_progress = COALESCE(week4_score - week3_score, 0),
          week5_progress = COALESCE(week5_score - week4_score, 0),
          average_weekly_growth = ROUND((week5_score - week1_score) / 4.0),
          updated_at = NOW()
        WHERE id IS NOT NULL
      `);

      res.json({
        success: true,
        message: "Weekly increment calculations updated successfully",
        updatedCount: result.rowCount || 0
      });
    } catch (error) {
      console.error('Weekly increments update error:', error);
      res.status(500).json({ error: "Failed to update weekly increments" });
    }
  });

  // Get analytics data with historical and real-time data
  app.get("/api/analytics", async (req, res) => {
    try {
      const analyticsData = await csvImportService.getAnalyticsData();
      
      // Calculate summary statistics
      const totalStudents = analyticsData.length;
      const improved = analyticsData.filter(s => s.status === 'improved').length;
      const declined = analyticsData.filter(s => s.status === 'declined').length;
      const same = analyticsData.filter(s => s.status === 'same').length;
      
      const averageImprovement = analyticsData.reduce((sum, s) => sum + s.improvement, 0) / totalStudents;
      
      // Top 10 students for progress trend chart
      const top10Students = analyticsData
        .sort((a, b) => b.currentSolved - a.currentSolved)
        .slice(0, 10);
      
      // Top 15 students with most improvement
      const top15Improvers = analyticsData
        .filter(s => s.improvement > 0)
        .sort((a, b) => b.improvement - a.improvement)
        .slice(0, 15);
      
      // Calculate class average progression over time
      const classAverageProgression = calculateClassAverageProgression(analyticsData);
      
      res.json({
        summaryStats: {
          totalStudents,
          improved,
          declined,
          same,
          averageImprovement: Math.round(averageImprovement * 100) / 100
        },
        top10Students,
        top15Improvers,
        progressCategories: {
          improved,
          declined,
          same
        },
        classAverageProgression,
        allStudentsData: analyticsData
      });
      
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ error: "Failed to fetch analytics data" });
    }
  });

  // Data export endpoint (Admin only)
  app.post("/api/export", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const { type, format, batches } = req.body;
      
      // Validate inputs
      if (!["students", "progress", "complete"].includes(type)) {
        return res.status(400).json({ error: "Invalid export type" });
      }
      if (!["csv", "excel"].includes(format)) {
        return res.status(400).json({ error: "Invalid export format" });
      }
      if (!Array.isArray(batches) || batches.some(b => !["2027", "2028"].includes(b))) {
        return res.status(400).json({ error: "Invalid batches selection" });
      }

      // Get data based on type and batches
      let exportData: any[] = [];
      const timestamp = new Date().toISOString().split('T')[0];
      
      if (type === "students" || type === "complete") {
        for (const batch of batches) {
          const batchData = await storage.getBatchDashboard(batch);
          const studentsData = batchData.students.map((student: any) => ({
            batch,
            name: student.name,
            leetcodeUsername: student.leetcodeUsername,
            profileLink: student.leetcodeProfileLink,
            totalProblems: student.stats.totalSolved,
            easyProblems: student.stats.easySolved,
            mediumProblems: student.stats.mediumSolved,
            hardProblems: student.stats.hardSolved,
            acceptanceRate: student.stats.acceptanceRate,
            currentStreak: student.currentStreak,
            maxStreak: student.maxStreak,
            activeDays: student.totalActiveDays,
            badgeCount: student.badges?.length || 0,
            lastSync: student.lastSync || 'Never'
          }));
          exportData.push(...studentsData);
        }
      }

      // Convert to CSV format
      if (exportData.length === 0) {
        return res.status(400).json({ error: "No data to export" });
      }

      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => 
            typeof row[header] === 'string' && row[header].includes(',') 
              ? `"${row[header]}"` 
              : row[header]
          ).join(',')
        )
      ].join('\n');

      const filename = `leetcode_export_${type}_${timestamp}.${format}`;
      
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      if (format === 'csv') {
        res.send(csvContent);
      } else {
        // For Excel, we'll just send CSV for now (would need xlsx library for proper Excel)
        res.send(csvContent);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Remove students with zero questions solved (Admin only)
  app.post("/api/cleanup/remove-zero-students", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const result = await storage.removeStudentsWithZeroQuestions();
      res.json({
        message: `Successfully removed ${result.removedCount} students with zero questions solved`,
        removedStudents: result.removedStudents
      });
    } catch (error) {
      console.error('Error removing students with zero questions:', error);
      res.status(500).json({ error: "Failed to remove students" });
    }
  });

  // Get students with zero questions solved (Admin only)
  app.get("/api/cleanup/zero-students", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const students = await storage.getStudentsWithZeroQuestions();
      res.json(students);
    } catch (error) {
      console.error('Error getting students with zero questions:', error);
      res.status(500).json({ error: "Failed to get students with zero questions" });
    }
  });

  // Import weekly progress from CSV data (Admin only)
  app.post("/api/import/weekly-progress-csv", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const { csvData } = req.body;
      
      if (!csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ error: "Invalid CSV data format" });
      }

      const result = await storage.importWeeklyProgressFromCSVData(csvData);
      res.json({
        message: `Successfully processed CSV data: ${result.imported} imported, ${result.updated} updated`,
        stats: result
      });
    } catch (error) {
      console.error('Error importing weekly progress CSV:', error);
      res.status(500).json({ error: "Failed to import CSV data" });
    }
  });

  // Start the scheduler
  schedulerService.startDailySync();

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to calculate class average progression
function calculateClassAverageProgression(analyticsData: any[]) {
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Current'];
  
  return weeks.map((week, index) => {
    let average = 0;
    
    if (index < 3) {
      // Historical weeks from CSV data
      const weekData = analyticsData.map(student => {
        const weeklyTrend = student.weeklyTrends[index];
        return weeklyTrend?.totalProblems || 0;
      });
      average = weekData.reduce((sum, val) => sum + val, 0) / weekData.length;
    } else {
      // Current week from real-time data
      const currentData = analyticsData.map(student => student.currentSolved);
      average = currentData.reduce((sum, val) => sum + val, 0) / currentData.length;
    }
    
    return {
      week,
      average: Math.round(average * 100) / 100
    };
  });
}
