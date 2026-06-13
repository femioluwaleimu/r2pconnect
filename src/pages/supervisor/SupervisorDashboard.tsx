import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import SupervisorLayout from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import FAQHelpModal from "@/components/faq/FAQHelpModal";
import {
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Eye,
  Filter,
  Bell,
  UserPlus,
} from "lucide-react";

interface StudentResearch {
  id: string;
  title: string;
  status: string;
  supervisor_approval_status: string;
  created_at: string;
  author: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

type FilterStatus = "all" | "pending" | "approved" | "revision_requested";

export default function SupervisorDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingReviews: 0,
    approved: 0,
    revisions: 0,
  });
  const [allResearch, setAllResearch] = useState<StudentResearch[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchDashboardData(user.id);
      
      // Subscribe to real-time updates for new student submissions
      const channel = supabase
        .channel('supervisor-research-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'research_papers',
            filter: `supervisor_id=eq.${user.id}`,
          },
          (payload) => {
            toast({
              title: "New Research Submission",
              description: "A student has submitted new research for your review",
            });
            fetchDashboardData(user.id);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'research_papers',
            filter: `supervisor_id=eq.${user.id}`,
          },
          () => {
            fetchDashboardData(user.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [navigate]);

  const fetchDashboardData = async (userId: string) => {
    setLoading(true);

    // Fetch research papers where this user is supervisor
    const { data: papers } = await supabase
      .from("research_papers")
      .select(`
        id, title, status, supervisor_approval_status, created_at, author_id
      `)
      .eq("supervisor_id", userId)
      .eq("research_type", "student")
      .order("created_at", { ascending: false });

    // Also fetch students assigned to this supervisor via profiles
    const { data: assignedStudents } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("assigned_supervisor_id", userId);

    if (papers) {
      // Get unique student IDs from papers
      const paperStudentIds = new Set(papers.map((p) => p.author_id));
      
      // Merge with assigned students from profiles
      const allStudentIds = new Set([
        ...paperStudentIds,
        ...(assignedStudents?.map(s => s.user_id) || []),
      ]);

      // Fetch student profiles
      const studentIdsArray = [...allStudentIds];
      const { data: profiles } = studentIdsArray.length > 0
        ? await supabase
            .from("public_profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", studentIdsArray)
        : { data: [] as { user_id: string; full_name: string; avatar_url: string | null }[] };

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      const researchWithAuthors: StudentResearch[] = papers.map((paper) => ({
        ...paper,
        author: profileMap.get(paper.author_id) || {
          user_id: paper.author_id,
          full_name: "Unknown",
          avatar_url: null,
        },
      }));

      setAllResearch(researchWithAuthors);

      // Calculate stats - use allStudentIds for total count
      setStats({
        totalStudents: allStudentIds.size,
        pendingReviews: papers.filter((p) => p.supervisor_approval_status === "pending").length,
        approved: papers.filter((p) => p.supervisor_approval_status === "approved").length,
        revisions: papers.filter((p) => p.supervisor_approval_status === "revision_requested").length,
      });
    }

    setLoading(false);
  };

  const filteredResearch = allResearch.filter((research) => {
    if (filterStatus === "all") return true;
    return research.supervisor_approval_status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
      case "approved":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approved</Badge>;
      case "revision_requested":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Revisions</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Pending Reviews",
      value: stats.pendingReviews,
      icon: Clock,
      color: "from-amber-500 to-orange-600",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Approved",
      value: stats.approved,
      icon: CheckCircle,
      color: "from-emerald-500 to-green-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Needs Revision",
      value: stats.revisions,
      icon: AlertCircle,
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supervisor Dashboard</h1>
          <p className="text-muted-foreground">Monitor and review your students' research progress</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="rounded-2xl border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Reviews Widget */}
        <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{stats.pendingReviews} Pending Reviews</h3>
                    <p className="text-white/80 text-sm">Research papers awaiting your review</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link to="/supervisor/invite-students">
                  <Button className="bg-white text-indigo-600 hover:bg-white/90 rounded-xl w-full sm:w-auto">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Students
                  </Button>
                </Link>
                <Link to="/supervisor/pending">
                  <Button variant="outline" className="bg-transparent border-white/50 text-white hover:bg-white/10 rounded-xl w-full sm:w-auto">
                    Review Now
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/supervisor/students">
                  <Button variant="outline" className="bg-transparent border-white/50 text-white hover:bg-white/10 rounded-xl w-full sm:w-auto">
                    <Users className="w-4 h-4 mr-2" />
                    View Students
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/supervisor/pending">
            <Card className="rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="font-semibold text-foreground">Pending</h4>
                <p className="text-2xl font-bold text-amber-600">{stats.pendingReviews}</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/supervisor/approved">
            <Card className="rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="font-semibold text-foreground">Approved</h4>
                <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/supervisor/research">
            <Card className="rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <h4 className="font-semibold text-foreground">Revisions</h4>
                <p className="text-2xl font-bold text-orange-600">{stats.revisions}</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/supervisor/students">
            <Card className="rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-foreground">Students</h4>
                <p className="text-2xl font-bold text-blue-600">{stats.totalStudents}</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Research with Filters */}
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardHeader className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Student Research
              </CardTitle>
              <Link to="/supervisor/research">
                <Button variant="ghost" size="sm" className="rounded-xl">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            
            {/* Status Filter Tabs */}
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-flex">
                <TabsTrigger value="all" className="rounded-xl text-xs sm:text-sm">
                  All ({allResearch.length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="rounded-xl text-xs sm:text-sm">
                  <Clock className="w-3 h-3 mr-1 hidden sm:inline" />
                  Pending ({stats.pendingReviews})
                </TabsTrigger>
                <TabsTrigger value="approved" className="rounded-xl text-xs sm:text-sm">
                  <CheckCircle className="w-3 h-3 mr-1 hidden sm:inline" />
                  Approved ({stats.approved})
                </TabsTrigger>
                <TabsTrigger value="revision_requested" className="rounded-xl text-xs sm:text-sm">
                  <AlertCircle className="w-3 h-3 mr-1 hidden sm:inline" />
                  Revisions ({stats.revisions})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredResearch.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {filterStatus === "all" 
                    ? "No student research assigned yet" 
                    : `No ${filterStatus.replace("_", " ")} research`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredResearch.slice(0, 10).map((research) => (
                  <div
                    key={research.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={research.author.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {research.author.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground line-clamp-1">{research.title}</p>
                        <p className="text-sm text-muted-foreground">{research.author.full_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {getStatusBadge(research.supervisor_approval_status)}
                      <Link to={`/supervisor/research/${research.id}`}>
                        <Button variant="ghost" size="icon" className="rounded-xl">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
                {filteredResearch.length > 10 && (
                  <div className="text-center pt-2">
                    <Link to="/supervisor/research">
                      <Button variant="outline" size="sm" className="rounded-xl">
                        View all {filteredResearch.length} items
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Button */}
        <div className="flex justify-end">
          <FAQHelpModal category="supervisors" buttonLabel="Supervision Help" />
        </div>
      </div>
    </SupervisorLayout>
  );
}
