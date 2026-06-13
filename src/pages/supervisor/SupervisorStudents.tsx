import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import SupervisorLayout from "@/components/layout/SupervisorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Search, FileText, Eye, GraduationCap, MessageSquare } from "lucide-react";

interface Student {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
  level: string | null;
  research_count: number;
  pending_count: number;
  unread_messages: number;
}

export default function SupervisorStudents() {
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchStudents(user.id);
    });
  }, [navigate]);

  const fetchStudents = async (userId: string) => {
    setLoading(true);

    // Fetch research papers where this user is supervisor
    const { data: papers } = await supabase
      .from("research_papers")
      .select("author_id, supervisor_approval_status")
      .eq("supervisor_id", userId)
      .eq("research_type", "student");

    // Also fetch students assigned via profiles
    const { data: assignedProfiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("assigned_supervisor_id", userId);

    // Get unique student IDs from both sources
    const studentStats = new Map<string, { total: number; pending: number }>();
    papers?.forEach((p) => {
      const current = studentStats.get(p.author_id) || { total: 0, pending: 0 };
      current.total++;
      if (p.supervisor_approval_status === "pending") current.pending++;
      studentStats.set(p.author_id, current);
    });

    // Merge assigned students (they may not have research yet)
    const allStudentIds = new Set([
      ...studentStats.keys(),
      ...(assignedProfiles?.map(p => p.user_id) || []),
    ]);

    // Ensure all students have stats entries
    allStudentIds.forEach(id => {
      if (!studentStats.has(id)) {
        studentStats.set(id, { total: 0, pending: 0 });
      }
    });

    const studentIds = [...allStudentIds];

    if (studentIds.length > 0) {
      // Fetch student profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, department, level")
        .in("user_id", studentIds);

      // Fetch unread message counts for each student
      const { data: unreadMessages } = await supabase
        .from("supervisor_student_messages")
        .select("student_id")
        .eq("supervisor_id", userId)
        .eq("is_read", false)
        .neq("sender_id", userId);

      // Count unread per student
      const unreadCounts = new Map<string, number>();
      unreadMessages?.forEach((m) => {
        unreadCounts.set(m.student_id, (unreadCounts.get(m.student_id) || 0) + 1);
      });

      const studentsWithStats: Student[] = (profiles || []).map((p) => ({
        ...p,
        research_count: studentStats.get(p.user_id)?.total || 0,
        pending_count: studentStats.get(p.user_id)?.pending || 0,
        unread_messages: unreadCounts.get(p.user_id) || 0,
      }));

      setStudents(studentsWithStats);
    } else {
      setStudents([]);
    }

    setLoading(false);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Students</h1>
            <p className="text-muted-foreground">Students assigned to your supervision</p>
          </div>
          <Badge className="w-fit rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 px-4 py-1">
            {students.length} Student{students.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 rounded-xl h-12 border-none shadow-md"
          />
        </div>

        {/* Students List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-none shadow-lg">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No students yet</h3>
            <p className="text-muted-foreground">
              Students will appear here when they select you as their supervisor
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredStudents.map((student) => (
              <Card key={student.user_id} className="rounded-2xl border-none shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-14 h-14 border-2 border-primary/20 shadow-lg">
                      <AvatarImage src={student.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xl">
                        {student.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-foreground">{student.full_name}</h3>
                      {student.department && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {student.department} {student.level && `• ${student.level}`}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium">{student.research_count} Research</span>
                        </div>
                        {student.pending_count > 0 && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            {student.pending_count} Pending
                          </Badge>
                        )}
                        {student.unread_messages > 0 && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {student.unread_messages}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Link to={`/supervisor/students/${student.user_id}`}>
                      <Button variant="outline" size="icon" className="rounded-xl">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SupervisorLayout>
  );
}
