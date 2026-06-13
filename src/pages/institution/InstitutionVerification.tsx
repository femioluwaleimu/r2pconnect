import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import InstitutionLayout from "@/components/layout/InstitutionLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, CheckCircle, XCircle, Users, ShieldCheck, AlertCircle, Loader2, Eye, GraduationCap } from "lucide-react";

interface StudentProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  matric_number: string | null;
  department: string | null;
  level: string | null;
  researcher_type: string | null;
  is_verified: boolean;
  verified_at: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  cv_url: string | null;
}

export default function InstitutionVerification() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get institution id for this admin
      const { data: institutions } = await supabase
        .from('institutions')
        .select('id')
        .eq('admin_user_id', user.id)
        .single();

      if (!institutions) {
        toast({ title: "No institution found", variant: "destructive" });
        return;
      }

      // Fetch students from this institution
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('institution_id', institutions.id)
        .eq('researcher_type', 'student')
        .order('full_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast({ title: "Error fetching students", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (studentId: string, verified: boolean) => {
    setVerifying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('profiles')
        .update({
          is_verified: verified,
          verified_at: verified ? new Date().toISOString() : null,
          verified_by: verified ? user.id : null,
        })
        .eq('user_id', studentId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("No data returned from update");

      // Update local state immediately for better UX
      setStudents(prev => prev.map(s => 
        s.user_id === studentId 
          ? { ...s, is_verified: verified, verified_at: verified ? new Date().toISOString() : null }
          : s
      ));

      toast({ title: verified ? "Student verified successfully" : "Verification removed" });
      setSelectedStudent(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.matric_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const verifiedCount = students.filter(s => s.is_verified).length;
  const pendingCount = students.filter(s => !s.is_verified).length;

  return (
    <InstitutionLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Verification</h1>
          <p className="text-muted-foreground">Verify students registered under your institution</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Users className="w-10 h-10 opacity-80" />
                <div>
                  <p className="text-3xl font-bold">{students.length}</p>
                  <p className="text-sm opacity-80">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-10 h-10 opacity-80" />
                <div>
                  <p className="text-3xl font-bold">{verifiedCount}</p>
                  <p className="text-sm opacity-80">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="w-10 h-10 opacity-80" />
                <div>
                  <p className="text-3xl font-bold">{pendingCount}</p>
                  <p className="text-sm opacity-80">Pending Verification</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, matric number, or department..."
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Students Table */}
        <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardHeader>
            <CardTitle>Student Records</CardTitle>
            <CardDescription>Manage student verification status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No students found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Matric Number</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-medium">
                            {student.avatar_url ? (
                              <img src={student.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              student.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-1">
                              {student.full_name}
                              {student.is_verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                            </p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{student.matric_number || '-'}</TableCell>
                      <TableCell>{student.department || '-'}</TableCell>
                      <TableCell>{student.level || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={student.is_verified ? 'default' : 'secondary'} className={student.is_verified ? 'bg-emerald-500' : ''}>
                          {student.is_verified ? 'Verified' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStudent(student)}
                            className="rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {student.is_verified ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVerify(student.user_id, false)}
                              className="rounded-lg text-red-500 hover:text-red-600"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVerify(student.user_id, true)}
                              className="rounded-lg text-emerald-500 hover:text-emerald-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Details Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {selectedStudent.avatar_url ? (
                    <img src={selectedStudent.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    selectedStudent.full_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {selectedStudent.full_name}
                    {selectedStudent.is_verified && <ShieldCheck className="w-5 h-5 text-emerald-500" />}
                  </h3>
                  <p className="text-muted-foreground">{selectedStudent.email}</p>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">Matric Number</p>
                  <p className="font-medium">{selectedStudent.matric_number || 'Not set'}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedStudent.department || 'Not set'}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">Level</p>
                  <p className="font-medium">{selectedStudent.level || 'Not set'}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={selectedStudent.is_verified ? 'default' : 'secondary'} className={selectedStudent.is_verified ? 'bg-emerald-500' : ''}>
                    {selectedStudent.is_verified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
              </div>

              {selectedStudent.skills && selectedStudent.skills.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedStudent.skills.map((skill, i) => (
                      <Badge key={i} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedStudent.cv_url && (
                <a href={selectedStudent.cv_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full rounded-xl">
                    View CV
                  </Button>
                </a>
              )}

              <div className="flex gap-2">
                {selectedStudent.is_verified ? (
                  <Button
                    onClick={() => handleVerify(selectedStudent.user_id, false)}
                    disabled={verifying}
                    variant="destructive"
                    className="flex-1 rounded-xl"
                  >
                    {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Remove Verification
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleVerify(selectedStudent.user_id, true)}
                    disabled={verifying}
                    className="flex-1 rounded-xl gradient-hero"
                  >
                    {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Verify Student
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </InstitutionLayout>
  );
}
