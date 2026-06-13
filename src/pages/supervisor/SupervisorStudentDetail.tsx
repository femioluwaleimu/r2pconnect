import { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import SupervisorLayout from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  ArrowLeft,
  FileText,
  Eye,
  GraduationCap,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import StudentChatDrawer from "@/components/supervisor/StudentChatDrawer";
import SupervisorStyleReferenceUpload from "@/components/supervisor/SupervisorStyleReferenceUpload";

interface StudentProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  department: string | null;
  level: string | null;
  matric_number: string | null;
  created_at: string;
}

interface StudentResearch {
  id: string;
  title: string;
  research_field: string | null;
  status: string;
  supervisor_approval_status: string | null;
  created_at: string;
  year_completed: number | null;
}

export default function SupervisorStudentDetail() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [researchPapers, setResearchPapers] = useState<StudentResearch[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      if (id) fetchStudentDetails(user.id, id);
    });
  }, [navigate, id]);

  const fetchStudentDetails = async (supervisorId: string, studentId: string) => {
    setLoading(true);

    // First verify this student is assigned to this supervisor
    const { data: papers } = await supabase
      .from("research_papers")
      .select("id, title, research_field, status, supervisor_approval_status, created_at, year_completed")
      .eq("supervisor_id", supervisorId)
      .eq("author_id", studentId)
      .eq("research_type", "student")
      .order("created_at", { ascending: false });

    if (!papers || papers.length === 0) {
      navigate("/supervisor/students");
      return;
    }

    setResearchPapers(papers);

    // Fetch student profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, email, department, level, matric_number, created_at")
      .eq("user_id", studentId)
      .maybeSingle();

    if (profile) {
      setStudent(profile);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CheckCircle className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case "revision_requested":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" /> Revision
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status || "Draft"}
          </Badge>
        );
    }
  };

  const stats = {
    total: researchPapers.length,
    pending: researchPapers.filter((r) => r.supervisor_approval_status === "pending").length,
    approved: researchPapers.filter((r) => r.supervisor_approval_status === "approved").length,
    revision: researchPapers.filter((r) => r.supervisor_approval_status === "revision_requested").length,
  };

  if (loading) {
    return (
      <SupervisorLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </SupervisorLayout>
    );
  }

  if (!student) {
    return (
      <SupervisorLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Student not found</p>
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/supervisor">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/supervisor/students">My Students</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{student.full_name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Link to="/supervisor/students">
            <Button variant="ghost" size="icon" className="rounded-xl shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          
          <Card className="flex-1 rounded-2xl border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Avatar className="w-20 h-20 border-4 border-primary/20 shadow-xl">
                  <AvatarImage src={student.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-2xl">
                    {student.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">{student.full_name}</h1>
                      {student.matric_number && (
                        <p className="text-muted-foreground text-sm">{student.matric_number}</p>
                      )}
                    </div>
                    {user && (
                      <StudentChatDrawer
                        supervisorId={user.id}
                        studentId={student.user_id}
                        studentName={student.full_name}
                        studentAvatar={student.avatar_url}
                      />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {student.department && (
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4" />
                        <span>{student.department} {student.level && `• ${student.level}`}</span>
                      </div>
                    )}
                    {student.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4" />
                        <span>{student.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {format(new Date(student.created_at), "MMM yyyy")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-none shadow-md">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-foreground">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Research</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-md">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-md">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-emerald-600">{stats.approved}</div>
              <p className="text-sm text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-md">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-amber-600">{stats.revision}</div>
              <p className="text-sm text-muted-foreground">Revisions</p>
            </CardContent>
          </Card>
        </div>

        {/* Supervisor Style References */}
        {user && (
          <SupervisorStyleReferenceUpload
            supervisorId={user.id}
            studentId={student.user_id}
            studentName={student.full_name}
          />
        )}

        {/* Research Papers Table */}
        <Card className="rounded-2xl border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Research Papers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile view */}
            <div className="sm:hidden space-y-4">
              {researchPapers.map((paper) => (
                <Card key={paper.id} className="rounded-xl border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground line-clamp-2">{paper.title}</h3>
                      {paper.research_field && (
                        <p className="text-sm text-muted-foreground mt-1">{paper.research_field}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      {getStatusBadge(paper.supervisor_approval_status)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(paper.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    <Link to={`/supervisor/research/${paper.id}`}>
                      <Button variant="outline" size="sm" className="w-full rounded-lg">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop view */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {researchPapers.map((paper) => (
                    <TableRow key={paper.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {paper.title}
                      </TableCell>
                      <TableCell>{paper.research_field || "-"}</TableCell>
                      <TableCell>{getStatusBadge(paper.supervisor_approval_status)}</TableCell>
                      <TableCell>
                        {format(new Date(paper.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/supervisor/research/${paper.id}`}>
                          <Button variant="outline" size="sm" className="rounded-lg">
                            <Eye className="w-4 h-4 mr-1" />
                            View
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
    </SupervisorLayout>
  );
}
