import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BatchStats from "@/components/admin/batch-stats";
import StudentTable from "@/components/admin/student-table";
import CacheStatusComponent from "@/components/admin/cache-status";
import { CacheIndicator } from "@/components/ui/cache-indicator";
import { useCachedDashboard } from "@/hooks/use-cached-query";
import type { AdminDashboardData } from "@shared/schema";

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error, isFromCache, cacheAge, refetchInBackground } = useCachedDashboard<AdminDashboardData>('/api/dashboard/admin');



  const syncProfilePhotosMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/sync/profile-photos'),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/admin'] });
      toast({
        title: "Profile photos synced",
        description: `Updated ${data.success} profile photos successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Sync failed",
        description: "Failed to sync profile photos. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateWeek5DataMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/update/week5-data'),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/admin'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-progress'] });
      toast({
        title: "Week 5 data updated",
        description: `Successfully updated ${data.stats.updated} students with Week 5 progress data.`,
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update Week 5 data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateWeek5RealtimeMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/update/week5-realtime'),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/admin'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-progress'] });
      toast({
        title: "Week 5 real-time update completed",
        description: `Updated ${data.stats.updated} students with their current LeetCode progress for Week 5.`,
      });
    },
    onError: () => {
      toast({
        title: "Real-time update failed",
        description: "Failed to update Week 5 data with real-time values. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExportCSV = () => {
    window.open('/api/export/csv', '_blank');
  };

  const handleInitStudents = async () => {
    try {
      await apiRequest('POST', '/api/init-students');
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/admin'] });
      toast({
        title: "Students initialized",
        description: "Student data has been imported successfully.",
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import student data.",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <div className="flex-1 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading dashboard</h3>
          <p className="text-red-600 text-sm mt-1">
            Failed to load admin data. Please try refreshing or initialize students first.
          </p>
          <Button onClick={handleInitStudents} className="mt-3" variant="outline">
            Initialize Students
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.totalStudents === 0) {
    return (
      <div className="flex-1 p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-medium">No students found</h3>
          <p className="text-yellow-600 text-sm mt-1">
            Please initialize the student database first.
          </p>
          <Button onClick={handleInitStudents} className="mt-3">
            Initialize Students
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-6 py-16">
          <div className="flex justify-between items-center">
            <div className="animate-fade-in">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Shield className="text-white" size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
                    <CacheIndicator 
                      isFromCache={isFromCache} 
                      cacheAge={cacheAge}
                      className="bg-white/20 text-white border-white/30"
                    />
                  </div>
                  <p className="text-white/80 text-lg">
                    Management & Analytics Control Center
                  </p>
                </div>
              </div>
              <div className="text-white/90 text-sm">
                Comprehensive monitoring and administration for all student batches
              </div>
            </div>
            <div className="flex gap-3 animate-slide-up">
              <Button 
                onClick={handleExportCSV}
                variant="outline"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                <Download className="mr-2" size={16} />
                Export CSV
              </Button>
              <Button 
                onClick={() => syncProfilePhotosMutation.mutate()}
                disabled={syncProfilePhotosMutation.isPending}
                variant="outline"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                <RefreshCw className={`mr-2 ${syncProfilePhotosMutation.isPending ? 'animate-spin' : ''}`} size={16} />
                {syncProfilePhotosMutation.isPending ? 'Syncing Photos...' : 'Sync Photos'}
              </Button>
              <Button 
                onClick={() => updateWeek5DataMutation.mutate()}
                disabled={updateWeek5DataMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white border-green-600"
              >
                <RefreshCw className={`mr-2 ${updateWeek5DataMutation.isPending ? 'animate-spin' : ''}`} size={16} />
                {updateWeek5DataMutation.isPending ? 'Updating Week 5...' : 'Update Week 5 Data'}
              </Button>
              <Button 
                onClick={() => updateWeek5RealtimeMutation.mutate()}
                disabled={updateWeek5RealtimeMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              >
                <RefreshCw className={`mr-2 ${updateWeek5RealtimeMutation.isPending ? 'animate-spin' : ''}`} size={16} />
                {updateWeek5RealtimeMutation.isPending ? 'Updating Real-time...' : 'Fix Week 5 Zeros'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6 space-y-8 -mt-8">
        <Card className="modern-card border-0 shadow-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm animate-fade-in">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-emerald-50 dark:from-slate-700 dark:to-slate-600 rounded-t-xl border-b border-slate-200 dark:border-slate-600">
            <CardTitle className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Administrative Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <BatchStats data={data} />
            <div className="mt-8">
              <StudentTable data={data} />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Leaderboard */}
        <Card className="modern-card border-0 shadow-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm animate-fade-in">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-yellow-50 dark:from-slate-700 dark:to-slate-600 rounded-t-xl border-b border-slate-200 dark:border-slate-600">
            <CardTitle className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              Weekly Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {data.leaderboard.map((entry, index) => (
                <div 
                  key={entry.student.id}
                  className={`flex items-center justify-between p-4 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl animate-slide-up ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800' : 
                    'bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 border border-slate-200 dark:border-slate-600'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 
                      index === 1 ? 'bg-gradient-to-r from-slate-300 to-slate-400' : 
                      index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                      'bg-gradient-to-r from-blue-400 to-blue-500'
                    }`}>
                      {entry.rank}
                    </div>
                    <Avatar className="w-10 h-10 ring-2 ring-white dark:ring-slate-700 shadow-lg">
                      {entry.student.profilePhoto && (
                        <AvatarImage src={entry.student.profilePhoto} alt={entry.student.name} />
                      )}
                      <AvatarFallback className="bg-gradient-primary text-white font-bold text-sm">
                        {entry.student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{entry.student.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">@{entry.student.leetcodeUsername}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-2xl text-slate-900 dark:text-white">+{entry.weeklyScore}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">this week</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cache Status Component */}
        <CacheStatusComponent />
      </div>
    </div>
  );
}