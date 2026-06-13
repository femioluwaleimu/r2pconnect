import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import InstitutionLayout from "@/components/layout/InstitutionLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Trash2, Edit, Users, GraduationCap, Loader2 } from "lucide-react";

interface Department {
  id: string;
  name: string;
  is_active: boolean;
  onboarding_status: string | null;
  created_at: string;
  supervisor_count?: number;
  student_count?: number;
}

export default function InstitutionDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [onboardingType, setOnboardingType] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInstitution();
  }, []);

  const fetchInstitution = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: inst } = await supabase
      .from("institutions")
      .select("id, onboarding_type")
      .eq("admin_user_id", user.id)
      .maybeSingle();

    if (inst) {
      setInstitutionId(inst.id);
      setOnboardingType(inst.onboarding_type);
      fetchDepartments(inst.id);
    } else {
      setLoading(false);
    }
  };

  const fetchDepartments = async (instId: string) => {
    setLoading(true);
    const { data: depts } = await supabase
      .from("departments")
      .select("*")
      .eq("institution_id", instId)
      .order("name");

    if (depts) {
      // Get counts per department
      const deptsWithCounts = await Promise.all(
        depts.map(async (dept) => {
          const [supRes, studRes] = await Promise.all([
            supabase.from("supervisors").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("department", dept.name),
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("institution_id", instId).eq("department", dept.name),
          ]);
          return {
            ...dept,
            is_active: dept.is_active ?? true,
            supervisor_count: supRes.count || 0,
            student_count: studRes.count || 0,
          };
        })
      );
      setDepartments(deptsWithCounts);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!deptName.trim() || !institutionId) return;
    setSaving(true);

    try {
      if (editingDept) {
        const { error } = await supabase
          .from("departments")
          .update({ name: deptName.trim() })
          .eq("id", editingDept.id);
        if (error) throw error;
        toast({ title: "Department updated" });
      } else {
        const { error } = await supabase
          .from("departments")
          .insert({ name: deptName.trim(), institution_id: institutionId });
        if (error) throw error;
        toast({ title: "Department created" });
      }
      setDialogOpen(false);
      setEditingDept(null);
      setDeptName("");
      fetchDepartments(institutionId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (dept: Department) => {
    if (!institutionId) return;
    const { error } = await supabase
      .from("departments")
      .update({ is_active: !dept.is_active })
      .eq("id", dept.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: dept.is_active ? "Department deactivated" : "Department activated" });
      fetchDepartments(institutionId);
    }
  };

  const handleDelete = async (deptId: string) => {
    if (!confirm("Are you sure? This will not affect existing users.")) return;
    if (!institutionId) return;

    const { error } = await supabase.from("departments").delete().eq("id", deptId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Department deleted" });
      fetchDepartments(institutionId);
    }
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingDept(null);
    setDeptName("");
    setDialogOpen(true);
  };

  return (
    <InstitutionLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Departments</h1>
            <p className="text-muted-foreground">Manage departments for your institution</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDept ? "Edit Department" : "Add Department"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Department Name</Label>
                  <Input
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g., Computer Science"
                    className="rounded-xl"
                  />
                </div>
                <Button onClick={handleSave} disabled={saving || !deptName.trim()} className="w-full rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingDept ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {onboardingType && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Onboarding Type:</span>
            <Badge variant="secondary" className="rounded-full capitalize">
              {onboardingType?.replace(/_/g, " ")}
            </Badge>
          </div>
        )}

        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              All Departments ({departments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold text-foreground mb-1">No Departments</h3>
                <p className="text-sm text-muted-foreground">Create departments to manage onboarding by department.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Supervisors</TableHead>
                    <TableHead className="text-center">Students</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={dept.is_active}
                            onCheckedChange={() => toggleActive(dept)}
                          />
                          <Badge className={dept.is_active ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}>
                            {dept.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          {dept.supervisor_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {dept.student_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(dept)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(dept.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
    </InstitutionLayout>
  );
}
