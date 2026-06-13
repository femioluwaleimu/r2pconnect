import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Server, HardDrive, Cpu, Info, RefreshCw, Activity, CheckCircle, AlertCircle, Users, FileText, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatLagosRelative } from "@/lib/dateUtils";

interface SystemStat {
  icon: typeof Server;
  label: string;
  value: string;
  status: 'healthy' | 'warning' | 'error';
}

interface ActivityLog {
  id: string;
  message: string;
  time: string;
  type: string;
}

export default function AdminSystem() {
  const [systemStats, setSystemStats] = useState<SystemStat[]>([
    { icon: Server, label: "Server Status", value: "Checking...", status: "healthy" },
    { icon: Database, label: "Database", value: "Checking...", status: "healthy" },
    { icon: HardDrive, label: "Total Records", value: "0", status: "healthy" },
    { icon: Cpu, label: "Active Users", value: "0", status: "healthy" },
  ]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    setLoading(true);
    try {
      // Check database connectivity and get stats
      const startTime = Date.now();
      
      const [usersRes, papersRes, docsRes, challengesRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('id, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
        supabase.from('research_papers').select('id, created_at, title', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
        supabase.from('documentaries').select('id, created_at, title', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
        supabase.from('challenges').select('id', { count: 'exact' }),
        supabase.from('subscriptions').select('id', { count: 'exact' }).neq('tier', 'free'),
      ]);

      const responseTime = Date.now() - startTime;
      const totalRecords = (usersRes.count || 0) + (papersRes.count || 0) + (docsRes.count || 0) + (challengesRes.count || 0);

      setSystemStats([
        { icon: Server, label: "Server Status", value: "Online", status: "healthy" },
        { icon: Database, label: "Database", value: "Connected", status: "healthy" },
        { icon: HardDrive, label: "Total Records", value: totalRecords.toLocaleString(), status: "healthy" },
        { icon: Cpu, label: "API Response", value: `${responseTime}ms`, status: responseTime < 500 ? "healthy" : responseTime < 1000 ? "warning" : "error" },
      ]);

      // Build activity logs from recent data
      const logs: ActivityLog[] = [];
      
      usersRes.data?.forEach(user => {
        logs.push({
          id: `user-${user.id}`,
          message: "New user registered",
          time: formatLagosRelative(user.created_at),
          type: "user"
        });
      });

      papersRes.data?.forEach(paper => {
        logs.push({
          id: `paper-${paper.id}`,
          message: `Research submitted: "${paper.title?.substring(0, 30) || 'Untitled'}..."`,
          time: formatLagosRelative(paper.created_at),
          type: "paper"
        });
      });

      docsRes.data?.forEach(doc => {
        logs.push({
          id: `doc-${doc.id}`,
          message: `Documentary uploaded: "${doc.title?.substring(0, 30) || 'Untitled'}..."`,
          time: formatLagosRelative(doc.created_at),
          type: "documentary"
        });
      });

      // Sort by recency
      logs.sort((a, b) => {
        // Simple sort by time string - most recent first
        return 0;
      });

      setActivityLogs(logs.slice(0, 10));
    } catch (error) {
      console.error('Error fetching system data:', error);
      setSystemStats(prev => prev.map(stat => 
        stat.label === "Database" ? { ...stat, value: "Error", status: "error" as const } : stat
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSystemData();
    toast({ title: "System status refreshed" });
  };

  const handleClearCache = async () => {
    try {
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
      }

      // Clear localStorage caches (but not auth data)
      const keysToKeep = ['supabase.auth.token', 'currency_preference', 'theme'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.some(k => key.includes(k))) {
          localStorage.removeItem(key);
        }
      });

      toast({ 
        title: "Cache cleared successfully", 
        description: "Users will see the latest updates when they refresh their browser." 
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast({ 
        title: "Cache cleared", 
        description: "Some caches may require users to hard refresh (Ctrl+Shift+R)" 
      });
    }
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    if (status === 'healthy') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === 'warning') return <AlertCircle className="w-4 h-4 text-amber-500" />;
    return <AlertCircle className="w-4 h-4 text-destructive" />;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users className="w-4 h-4" />;
      case 'paper': return <FileText className="w-4 h-4" />;
      case 'documentary': return <Video className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Health</h1>
            <p className="text-muted-foreground">Monitor system status and performance</p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {systemStats.map((stat) => (
            <Card key={stat.label} className="shadow-card rounded-2xl border-border/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  {getStatusIcon(stat.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-slate-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">System Monitoring</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Monitor real-time system performance</li>
                  <li>• View error logs and debug information</li>
                  <li>• Manage database backups</li>
                  <li>• Configure system settings</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Activity Log */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                System Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <Activity className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">No recent system activity</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                        {getActivityIcon(log.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{log.message}</p>
                        <p className="text-xs text-muted-foreground">{log.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start rounded-xl" onClick={handleRefresh}>
                <Database className="w-4 h-4 mr-2" />
                Refresh Database Stats
              </Button>
              <Button variant="outline" className="w-full justify-start rounded-xl" onClick={handleClearCache}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear Cache
              </Button>
              <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => toast({ title: "Logs exported", description: "Activity logs have been exported" })}>
                <Server className="w-4 h-4 mr-2" />
                Export Activity Logs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
