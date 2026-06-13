import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, FileText, Trophy, TrendingUp, AlertTriangle, Shield, Video, Briefcase, CreditCard, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatLagosRelative } from "@/lib/dateUtils";
import InstitutionRegistrations from "@/components/admin/InstitutionRegistrations";

interface ActivityItem {
  id: string;
  type: 'user' | 'paper' | 'institution' | 'challenge' | 'subscription' | 'documentary' | 'job';
  message: string;
  time: string;
  createdAt: Date;
  icon: typeof Users;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalInstitutions: 0,
    totalPapers: 0,
    activeChallenges: 0,
    totalDocumentaries: 0,
    activeJobs: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();

    // Set up realtime subscriptions
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload) => {
          const newUser = payload.new as any;
          setRecentActivity(prev => [{
            id: `user-${newUser.id}-${Date.now()}`,
            type: 'user',
            message: `New user registered: ${newUser.full_name}`,
            time: 'just now',
            createdAt: new Date(),
            icon: Users,
          }, ...prev.slice(0, 7)]);
          setStats(prev => ({ ...prev, totalUsers: prev.totalUsers + 1 }));
          setIsRealtime(true);
          setTimeout(() => setIsRealtime(false), 3000);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'research_papers' },
        (payload) => {
          const newPaper = payload.new as any;
          setRecentActivity(prev => [{
            id: `paper-${newPaper.id}-${Date.now()}`,
            type: 'paper',
            message: `Research paper submitted: "${(newPaper.title || '').substring(0, 40)}..."`,
            time: 'just now',
            createdAt: new Date(),
            icon: FileText,
          }, ...prev.slice(0, 7)]);
          setStats(prev => ({ ...prev, totalPapers: prev.totalPapers + 1 }));
          setIsRealtime(true);
          setTimeout(() => setIsRealtime(false), 3000);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'challenges' },
        (payload) => {
          const newChallenge = payload.new as any;
          setRecentActivity(prev => [{
            id: `challenge-${newChallenge.id}-${Date.now()}`,
            type: 'challenge',
            message: `New challenge created: "${(newChallenge.title || '').substring(0, 40)}..."`,
            time: 'just now',
            createdAt: new Date(),
            icon: Trophy,
          }, ...prev.slice(0, 7)]);
          if (newChallenge.is_active) {
            setStats(prev => ({ ...prev, activeChallenges: prev.activeChallenges + 1 }));
          }
          setIsRealtime(true);
          setTimeout(() => setIsRealtime(false), 3000);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'documentaries' },
        (payload) => {
          const newDoc = payload.new as any;
          setRecentActivity(prev => [{
            id: `doc-${newDoc.id}-${Date.now()}`,
            type: 'documentary',
            message: `Documentary uploaded: "${(newDoc.title || '').substring(0, 40)}..."`,
            time: 'just now',
            createdAt: new Date(),
            icon: Video,
          }, ...prev.slice(0, 7)]);
          setStats(prev => ({ ...prev, totalDocumentaries: prev.totalDocumentaries + 1 }));
          setIsRealtime(true);
          setTimeout(() => setIsRealtime(false), 3000);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'subscriptions' },
        (payload) => {
          const newSub = payload.new as any;
          if (newSub.tier !== 'free') {
            setRecentActivity(prev => [{
              id: `sub-${newSub.id}-${Date.now()}`,
              type: 'subscription',
              message: `New ${newSub.tier} subscription activated`,
              time: 'just now',
              createdAt: new Date(),
              icon: CreditCard,
            }, ...prev.slice(0, 7)]);
            setIsRealtime(true);
            setTimeout(() => setIsRealtime(false), 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const [profilesRes, institutionsRes, papersRes, challengesRes, documentariesRes, jobsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('institutions').select('id', { count: 'exact', head: true }),
        supabase.from('research_papers').select('id', { count: 'exact', head: true }),
        supabase.from('challenges').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('documentaries').select('id', { count: 'exact', head: true }),
        supabase.from('job_postings').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      setStats({
        totalUsers: profilesRes.count || 0,
        totalInstitutions: institutionsRes.count || 0,
        totalPapers: papersRes.count || 0,
        activeChallenges: challengesRes.count || 0,
        totalDocumentaries: documentariesRes.count || 0,
        activeJobs: jobsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const activities: ActivityItem[] = [];

      // Fetch recent users (last 5)
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentUsers) {
        recentUsers.forEach(user => {
          activities.push({
            id: `user-${user.id}`,
            type: 'user',
            message: `New user registered: ${user.full_name}`,
            time: formatLagosRelative(user.created_at),
            createdAt: new Date(user.created_at),
            icon: Users,
          });
        });
      }

      // Fetch recent research papers
      const { data: recentPapers } = await supabase
        .from('research_papers')
        .select('id, title, created_at, status')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentPapers) {
        recentPapers.forEach(paper => {
          activities.push({
            id: `paper-${paper.id}`,
            type: 'paper',
            message: `Research paper ${paper.status === 'published' ? 'published' : 'submitted'}: "${paper.title.substring(0, 40)}${paper.title.length > 40 ? '...' : ''}"`,
            time: formatLagosRelative(paper.created_at),
            createdAt: new Date(paper.created_at),
            icon: FileText,
          });
        });
      }

      // Fetch recent challenges
      const { data: recentChallenges } = await supabase
        .from('challenges')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentChallenges) {
        recentChallenges.forEach(challenge => {
          activities.push({
            id: `challenge-${challenge.id}`,
            type: 'challenge',
            message: `New challenge created: "${challenge.title.substring(0, 40)}${challenge.title.length > 40 ? '...' : ''}"`,
            time: formatLagosRelative(challenge.created_at),
            createdAt: new Date(challenge.created_at),
            icon: Trophy,
          });
        });
      }

      // Fetch recent subscriptions
      const { data: recentSubs } = await supabase
        .from('subscriptions')
        .select('id, tier, created_at, user_id')
        .neq('tier', 'free')
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentSubs) {
        recentSubs.forEach(sub => {
          activities.push({
            id: `sub-${sub.id}`,
            type: 'subscription',
            message: `New ${sub.tier} subscription activated`,
            time: formatLagosRelative(sub.created_at),
            createdAt: new Date(sub.created_at),
            icon: CreditCard,
          });
        });
      }

      // Fetch recent documentaries
      const { data: recentDocs } = await supabase
        .from('documentaries')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentDocs) {
        recentDocs.forEach(doc => {
          activities.push({
            id: `doc-${doc.id}`,
            type: 'documentary',
            message: `Documentary uploaded: "${doc.title.substring(0, 40)}${doc.title.length > 40 ? '...' : ''}"`,
            time: formatLagosRelative(doc.created_at),
            createdAt: new Date(doc.created_at),
            icon: Video,
          });
        });
      }

      // Sort by most recent using createdAt and limit to 8 items
      activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setRecentActivity(activities.slice(0, 8));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const statsCards = [
    { icon: Users, label: "Total Users", value: stats.totalUsers.toString(), change: "All registered users", color: "bg-blue-100 dark:bg-blue-950/30", textColor: "text-blue-600", iconBg: "bg-blue-600" },
    { icon: Building2, label: "Institutions", value: stats.totalInstitutions.toString(), change: "Registered institutions", color: "bg-purple-100 dark:bg-purple-950/30", textColor: "text-purple-600", iconBg: "bg-purple-600" },
    { icon: FileText, label: "Research Papers", value: stats.totalPapers.toString(), change: "Total submissions", color: "bg-emerald-100 dark:bg-emerald-950/30", textColor: "text-emerald-600", iconBg: "bg-emerald-600" },
    { icon: Trophy, label: "Active Challenges", value: stats.activeChallenges.toString(), change: "Open challenges", color: "bg-amber-100 dark:bg-amber-950/30", textColor: "text-amber-600", iconBg: "bg-amber-600" },
    { icon: Video, label: "Documentaries", value: stats.totalDocumentaries.toString(), change: "Total uploads", color: "bg-rose-100 dark:bg-rose-950/30", textColor: "text-rose-600", iconBg: "bg-rose-600" },
    { icon: Briefcase, label: "Active Jobs", value: stats.activeJobs.toString(), change: "Open positions", color: "bg-cyan-100 dark:bg-cyan-950/30", textColor: "text-cyan-600", iconBg: "bg-cyan-600" },
  ];

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'user': return Users;
      case 'paper': return FileText;
      case 'institution': return Building2;
      case 'challenge': return Trophy;
      case 'subscription': return CreditCard;
      case 'documentary': return Video;
      case 'job': return Briefcase;
      default: return Users;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'user': return 'bg-blue-500';
      case 'paper': return 'bg-emerald-500';
      case 'institution': return 'bg-purple-500';
      case 'challenge': return 'bg-amber-500';
      case 'subscription': return 'bg-green-500';
      case 'documentary': return 'bg-rose-500';
      case 'job': return 'bg-cyan-500';
      default: return 'bg-primary';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">R2P CONNECT Admin Center</h1>
          <p className="text-slate-300 mb-4">
            Monitor platform activity, manage users, and maintain system health.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statsCards.map((stat) => (
            <Card key={stat.label} className={`${stat.color} border-none shadow-card rounded-2xl`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-foreground/70">{stat.label}</span>
                  <div className={`w-10 h-10 ${stat.iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "..." : stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Admin Guidelines</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Review pending user registrations daily</li>
                  <li>• Verify institution requests within 48 hours</li>
                  <li>• Monitor system health and performance</li>
                  <li>• Keep audit logs for all administrative actions</li>
                  <li>• Escalate security incidents immediately</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Recent Activity
                {isRealtime && (
                  <span className="flex items-center gap-1 text-xs font-normal text-emerald-500 animate-pulse">
                    <Radio className="w-3 h-3" />
                    Live
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-muted-foreground text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {recentActivity.map((activity) => {
                    const IconComponent = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                        <div className={`w-8 h-8 rounded-lg ${getActivityColor(activity.type)} flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center mb-3 shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <p className="text-foreground font-medium">All Systems Operational</p>
                <p className="text-sm text-muted-foreground">No critical alerts</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Registrations by Institution */}
        <InstitutionRegistrations />
      </div>
    </AdminLayout>
  );
}
