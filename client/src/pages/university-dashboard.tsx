import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCachedDashboard } from '@/hooks/use-cached-query';
import { CacheIndicator } from '@/components/ui/cache-indicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { UniversityDashboardData } from '@shared/schema';
import { Search, ExternalLink, Flame, Activity, Trophy, Users, Building2, Target, Upload, RefreshCw, TrendingUp, Star, BarChart } from 'lucide-react';
import { Link } from 'wouter';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from 'recharts';

// Weekly Progress Chart Component


// Batch Progress Component
const BatchProgressCard = ({ batchData, batchNumber }: { batchData: any; batchNumber: string }) => {
  const totalProblems = batchData?.students?.reduce((sum: number, s: any) => sum + (s.stats?.totalSolved || 0), 0) || 0;
  const topPerformers = batchData?.students?.filter((s: any) => (s.stats?.totalSolved || 0) > 50).length || 0;
  const topStudents = batchData?.students?.sort((a: any, b: any) => (b.stats?.totalSolved || 0) - (a.stats?.totalSolved || 0)).slice(0, 3) || [];

  return (
    <Card className="modern-card border-0 shadow-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm animate-fade-in">
      <CardHeader className={`${batchNumber === '2027' 
        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-b border-blue-200 dark:border-blue-800'
        : 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-b border-purple-200 dark:border-purple-800'
      } rounded-t-2xl`}>
        <CardTitle className="text-xl font-bold text-slate-800 dark:text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${batchNumber === '2027' 
              ? 'bg-blue-100 dark:bg-blue-900' 
              : 'bg-purple-100 dark:bg-purple-900'
            } rounded-xl flex items-center justify-center`}>
              <Building2 className={`h-6 w-6 ${batchNumber === '2027' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-purple-600 dark:text-purple-400'
              }`} />
            </div>
            Batch {batchNumber}
            <Badge className={`${batchNumber === '2027' 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
              : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
            }`}>
              {batchData?.totalStudents || 0} Students
            </Badge>
          </div>
          <Link href={`/batch/${batchNumber}`}>
            <Button variant="outline" size="sm" className="gap-2">
              View Details <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Batch Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Problems</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalProblems}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Active Students</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{batchData?.activeStudents || 0}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Top Performers</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{topPerformers}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Avg Score</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(totalProblems / (batchData?.totalStudents || 1))}
              </p>
            </div>
          </div>

          {/* Top Performers List */}
          {topStudents.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Top 3 Champions
              </p>
              <div className="space-y-3">
                {topStudents.map((student: any, index: number) => (
                  <div key={student.id} className={`flex items-center gap-3 p-3 rounded-xl ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800' :
                    index === 1 ? 'bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-700 dark:to-gray-700 border border-slate-200 dark:border-slate-600' :
                    'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-slate-400 text-slate-900' :
                      'bg-amber-400 text-amber-900'
                    }`}>
                      {index + 1}
                    </div>
                    <Avatar className="w-10 h-10">
                      {student.profilePhoto && (
                        <AvatarImage src={student.profilePhoto} alt={student.name} />
                      )}
                      <AvatarFallback className="text-sm">
                        {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{student.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">@{student.leetcodeUsername}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-slate-400 text-slate-900' :
                        'bg-amber-400 text-amber-900'
                      }`}>
                        {student.stats?.totalSolved || 0}
                      </Badge>
                      {index === 0 && <Star className="h-4 w-4 text-yellow-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function UniversityDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<UniversityDashboardData>({
    queryKey: ['/api/dashboard/university'],
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/sync/all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/university'] });
      toast({
        title: "Sync completed",
        description: "All university data has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Sync failed",
        description: "Failed to sync student data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const syncPhotosMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/sync/profile-photos'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/university'] });
      toast({
        title: "Profile photos synced",
        description: "Student profile photos have been updated from LeetCode.",
      });
    },
    onError: () => {
      toast({
        title: "Photo sync failed",
        description: "Failed to sync profile photos. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (error) {
    return (
      <div className="flex-1 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading university dashboard</h3>
          <p className="text-red-600 text-sm mt-1">
            Failed to load university data. Please try refreshing.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-slate-200 rounded-2xl loading-shimmer"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-96 bg-slate-200 rounded-2xl loading-shimmer"></div>
              <div className="h-96 bg-slate-200 rounded-2xl loading-shimmer"></div>
            </div>
            <div className="h-64 bg-slate-200 rounded-2xl loading-shimmer"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-6 py-16">
            <div className="text-center animate-fade-in">
              <div className="mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm mx-auto">
                  <Building2 className="text-white" size={32} />
                </div>
              </div>
              <h1 className="text-5xl font-bold text-white mb-4">University Dashboard</h1>
              <p className="text-white/90 text-xl max-w-2xl mx-auto">
                No university data available yet
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const allStudents = [
    ...(data.batch2027?.students || []).map(s => ({ ...s, batch: '2027' })),
    ...(data.batch2028?.students || []).map(s => ({ ...s, batch: '2028' }))
  ];

  const filteredStudents = allStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.leetcodeUsername.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate combined stats
  const combinedStats = {
    totalStudents: (data.batch2027?.totalStudents || 0) + (data.batch2028?.totalStudents || 0),
    totalProblems: allStudents.reduce((sum, s) => sum + (s.stats?.totalSolved || 0), 0),
    activeStudents: (data.batch2027?.activeStudents || 0) + (data.batch2028?.activeStudents || 0),
    topPerformers: allStudents.filter(s => (s.stats?.totalSolved || 0) > 50).length
  };

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-6 py-16">
          <div className="flex justify-between items-center animate-fade-in">
            <div>
              <div className="mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Building2 className="text-white" size={32} />
                </div>
              </div>
              <h1 className="text-5xl font-bold text-white mb-4">University Overview</h1>
              <p className="text-white/90 text-xl max-w-2xl">
                Comprehensive analytics across all batches and students
              </p>
              <div className="text-white/80 text-sm mt-2">
                Tracking {combinedStats.totalStudents} students across multiple batches
              </div>
            </div>
            
            <div className="flex gap-3 animate-slide-in-right">
              <Button 
                onClick={() => syncPhotosMutation.mutate()}
                disabled={syncPhotosMutation.isPending}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                variant="outline"
              >
                <Upload className={`mr-2 h-4 w-4 ${syncPhotosMutation.isPending ? 'animate-spin' : ''}`} />
                Sync Photos
              </Button>
              <Button 
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="bg-white text-indigo-600 hover:bg-white/90 font-semibold"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                Sync All Data
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8 -mt-8">
        {/* University Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="modern-card hover-lift bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-0 shadow-xl animate-fade-in">
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-blue-500" />
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{combinedStats.totalStudents}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Students</p>
            </CardContent>
          </Card>

          <Card className="modern-card hover-lift bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-0 shadow-xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-6 text-center">
              <Activity className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{combinedStats.activeStudents}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active Students</p>
            </CardContent>
          </Card>

          <Card className="modern-card hover-lift bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-0 shadow-xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6 text-center">
              <Target className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{combinedStats.totalProblems.toLocaleString()}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Problems Solved</p>
            </CardContent>
          </Card>

          <Card className="modern-card hover-lift bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-0 shadow-xl animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-purple-500" />
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{combinedStats.topPerformers}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Top Performers</p>
            </CardContent>
          </Card>
        </div>



        {/* Batch Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BatchProgressCard batchData={data.batch2027} batchNumber="2027" />
          <BatchProgressCard batchData={data.batch2028} batchNumber="2028" />
        </div>

        {/* All Students Table */}
        <Card className="modern-card border-0 shadow-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm animate-fade-in">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-700 dark:to-gray-700 rounded-t-2xl border-b border-slate-200 dark:border-slate-600">
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-600 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                </div>
                All Students Directory
                <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                  {filteredStudents.length} Students
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Problems Solved</TableHead>
                    <TableHead>Streak</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            {student.profilePhoto && (
                              <AvatarImage src={student.profilePhoto} alt={student.name} />
                            )}
                            <AvatarFallback className="text-sm">
                              {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{student.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">@{student.leetcodeUsername}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          student.batch === '2027' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                        }`}>
                          {student.batch}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                          {student.stats?.totalSolved || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span className="font-semibold text-slate-900 dark:text-white">{student.streak || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          (student.stats?.totalSolved || 0) > 50 ? 'status-excellent' :
                          (student.stats?.totalSolved || 0) > 20 ? 'status-good' :
                          (student.stats?.totalSolved || 0) > 0 ? 'status-active' :
                          'status-underperforming'
                        }`}>
                          {(student.stats?.totalSolved || 0) > 50 ? 'Excellent' :
                           (student.stats?.totalSolved || 0) > 20 ? 'Good' :
                           (student.stats?.totalSolved || 0) > 0 ? 'Active' :
                           'Need Support'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/student/${student.leetcodeUsername}`}>
                          <Button variant="outline" size="sm" className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}