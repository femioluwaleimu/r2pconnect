import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Search, Filter, Info, Plus, CheckCircle, Clock, Copy, Trash2, Key, Edit, GraduationCap, Users, Loader2, Wand2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Institution {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  is_verified: boolean | null;
  created_at: string;
  logo_url: string | null;
  admin_user_id: string | null;
  updated_at: string;
  onboarding_type: string | null;
}

interface VerificationCode {
  id: string;
  institution_id: string;
  verification_code: string;
}

interface Department {
  id: string;
  name: string;
  is_active: boolean;
  onboarding_status: string | null;
}

const generateVerificationCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const ONBOARDING_TYPES = [
  { value: "full_institution", label: "Full Institution" },
  { value: "department_only", label: "Department Only" },
  { value: "pilot_program", label: "Pilot Program" },
];

const createUuid = () => {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
};

export default function AdminInstitutions() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [verificationCodes, setVerificationCodes] = useState<VerificationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Department management
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptInstitution, setDeptInstitution] = useState<Institution | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupDepartments, setLookupDepartments] = useState<string[]>([]);
  const [selectedLookupDepartments, setSelectedLookupDepartments] = useState<string[]>([]);
  const [lookupSource, setLookupSource] = useState("");
  const [lookupQuery, setLookupQuery] = useState("");
  const [importingDepartments, setImportingDepartments] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    onboarding_type: "full_institution",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const [institutionsRes, codesRes] = await Promise.all([
        supabase
          .from('institutions')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('institution_verification_codes')
          .select('*')
      ]);

      if (institutionsRes.error) throw institutionsRes.error;
      setInstitutions(institutionsRes.data || []);
      setVerificationCodes(codesRes.data || []);
    } catch (error) {
      console.error('Error fetching institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVerificationCode = (institutionId: string) => {
    const code = verificationCodes.find(c => c.institution_id === institutionId);
    return code?.verification_code || 'N/A';
  };

  const handleAddInstitution = async () => {
    if (!formData.name) {
      toast({ title: "Please enter institution name", variant: "destructive" });
      return;
    }

    try {
      const verificationCode = generateVerificationCode();
      
      // First insert institution
      const { data: instData, error: instError } = await supabase.from('institutions').insert({
        id: createUuid(),
        name: formData.name,
        description: formData.description || null,
        website: formData.website || null,
        onboarding_type: formData.onboarding_type,
        is_verified: false,
      }).select().single();

      if (instError) throw instError;

      // Then insert verification code in separate table
      const { error: codeError } = await supabase.from('institution_verification_codes').insert({
        id: createUuid(),
        institution_id: instData.id,
        verification_code: verificationCode,
      });

      if (codeError) throw codeError;

      toast({ 
        title: "Institution added successfully",
        description: `Verification code: ${verificationCode}`,
      });
      setDialogOpen(false);
      setFormData({ name: "", description: "", website: "", onboarding_type: "full_institution" });
      fetchInstitutions();
    } catch (error: any) {
      toast({ title: "Error adding institution", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateInstitution = async () => {
    if (!editingInstitution || !formData.name) {
      toast({ title: "Please enter institution name", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from('institutions')
        .update({
          name: formData.name,
          description: formData.description || null,
          website: formData.website || null,
          onboarding_type: formData.onboarding_type,
        })
        .eq('id', editingInstitution.id);

      if (error) throw error;

      toast({ title: "Institution updated successfully" });
      setEditDialogOpen(false);
      setEditingInstitution(null);
      setFormData({ name: "", description: "", website: "", onboarding_type: "full_institution" });
      fetchInstitutions();
    } catch (error: any) {
      toast({ title: "Error updating institution", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this institution?")) return;

    try {
      const { error } = await supabase.from('institutions').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Institution deleted" });
      fetchInstitutions();
    } catch (error: any) {
      toast({ title: "Error deleting institution", description: error.message, variant: "destructive" });
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const { error } = await supabase
        .from('institutions')
        .update({ is_verified: true })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Institution verified" });
      fetchInstitutions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRegenerateCode = async (institutionId: string) => {
    try {
      const newCode = generateVerificationCode();
      
      // Check if code exists
      const existingCode = verificationCodes.find(c => c.institution_id === institutionId);
      
      if (existingCode) {
        // Update existing code
        const { error } = await supabase
          .from('institution_verification_codes')
          .update({ verification_code: newCode })
          .eq('institution_id', institutionId);
        if (error) throw error;
      } else {
        // Insert new code
        const { error } = await supabase
          .from('institution_verification_codes')
          .insert({ id: createUuid(), institution_id: institutionId, verification_code: newCode });
        if (error) throw error;
      }

      toast({ title: "Code regenerated", description: `New code: ${newCode}` });
      fetchInstitutions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (institutionId: string) => {
    const code = getVerificationCode(institutionId);
    navigator.clipboard.writeText(code);
    toast({ title: "Copied to clipboard" });
  };

  const openEditDialog = (inst: Institution) => {
    setEditingInstitution(inst);
    setFormData({
      name: inst.name,
      description: inst.description || "",
      website: inst.website || "",
      onboarding_type: inst.onboarding_type || "full_institution",
    });
    setEditDialogOpen(true);
  };

  const openDeptDialog = async (inst: Institution) => {
    setDeptInstitution(inst);
    setDeptDialogOpen(true);
    setLookupDepartments([]);
    setSelectedLookupDepartments([]);
    setLookupSource("");
    setLookupQuery("");
    setLoadingDepts(true);
    const { data } = await supabase
      .from("departments")
      .select("*")
      .eq("institution_id", inst.id)
      .order("name");
    setDepartments((data || []).map(d => ({ ...d, is_active: d.is_active ?? true })));
    setLoadingDepts(false);
  };

  const addDepartment = async () => {
    if (!newDeptName.trim() || !deptInstitution) return;
    const { error } = await supabase.from("departments").insert({
      id: createUuid(),
      name: newDeptName.trim(),
      institution_id: deptInstitution.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewDeptName("");
      openDeptDialog(deptInstitution);
    }
  };

  const toggleDeptActive = async (dept: Department) => {
    if (!deptInstitution) return;
    await supabase.from("departments").update({ is_active: !dept.is_active }).eq("id", dept.id);
    openDeptDialog(deptInstitution);
  };

  const deleteDept = async (deptId: string) => {
    if (!deptInstitution) return;
    await supabase.from("departments").delete().eq("id", deptId);
    openDeptDialog(deptInstitution);
  };

  const fetchDepartmentsOnline = async () => {
    if (!deptInstitution) return;
    setLookupLoading(true);
    setLookupDepartments([]);
    setSelectedLookupDepartments([]);
    setLookupSource("");
    setLookupQuery(`${deptInstitution.name} list of departments`);

    try {
      const { data, error } = await supabase.functions.invoke("department-lookup", {
        body: {
          school_name: deptInstitution.name,
          website: deptInstitution.website,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const current = new Set(departments.map((dept) => dept.name.trim().toLowerCase()));
      const suggestions = Array.from(new Set(((data?.departments || []) as string[])
        .map((name) => name.trim())
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));

      setLookupDepartments(suggestions);
      setSelectedLookupDepartments(suggestions.filter((name) => !current.has(name.toLowerCase())));
      setLookupSource(data?.source || "online");
      setLookupQuery(data?.search_query || `${deptInstitution.name} list of departments`);

      if (suggestions.length === 0) {
        toast({ title: "No departments found", description: "Try adding departments manually." });
      }
    } catch (error: any) {
      toast({ title: "Department lookup failed", description: error.message, variant: "destructive" });
    } finally {
      setLookupLoading(false);
    }
  };

  const toggleLookupDepartment = (name: string) => {
    setSelectedLookupDepartments((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const importSelectedDepartments = async () => {
    if (!deptInstitution || selectedLookupDepartments.length === 0) return;
    setImportingDepartments(true);

    try {
      const current = new Set(departments.map((dept) => dept.name.trim().toLowerCase()));
      const rows = selectedLookupDepartments
        .map((name) => name.trim())
        .filter((name) => name && !current.has(name.toLowerCase()))
        .map((name) => ({
          id: createUuid(),
          institution_id: deptInstitution.id,
          name,
          is_active: true,
          onboarding_status: "imported",
        }));

      if (rows.length === 0) {
        toast({ title: "No new departments", description: "Selected departments already exist." });
        return;
      }

      const { error } = await supabase.from("departments").insert(rows);
      if (error) throw error;

      toast({ title: "Departments imported", description: `${rows.length} department${rows.length === 1 ? "" : "s"} added.` });
      setLookupDepartments([]);
      setSelectedLookupDepartments([]);
      setLookupSource("");
      setLookupQuery("");
      openDeptDialog(deptInstitution);
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    } finally {
      setImportingDepartments(false);
    }
  };

  const filteredInstitutions = institutions.filter(inst =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const institutionStats = [
    { label: "Total Institutions", value: institutions.length.toString(), icon: Building2 },
    { label: "Verified", value: institutions.filter(i => i.is_verified === true).length.toString(), icon: CheckCircle },
    { label: "Pending Verification", value: institutions.filter(i => i.is_verified !== true).length.toString(), icon: Clock },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Institution Management</h1>
            <p className="text-muted-foreground">Manage and verify institutions</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-red-500 hover:bg-red-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Institution
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Institution</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Institution Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="University of Lagos"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description..."
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://www.unilag.edu.ng"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Onboarding Type</Label>
                  <Select value={formData.onboarding_type} onValueChange={(v) => setFormData(prev => ({ ...prev, onboarding_type: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ONBOARDING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">
                    A unique verification code will be generated automatically. Share this code with the institution admin to complete their registration.
                  </p>
                </div>
                <Button onClick={handleAddInstitution} className="w-full rounded-xl">
                  Add Institution & Generate Code
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Institution</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Institution Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="University of Lagos"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description..."
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://www.unilag.edu.ng"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Onboarding Type</Label>
                <Select value={formData.onboarding_type} onValueChange={(v) => setFormData(prev => ({ ...prev, onboarding_type: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ONBOARDING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdateInstitution} className="w-full rounded-xl">
                Update Institution
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {institutionStats.map((stat) => (
            <Card key={stat.label} className="shadow-card rounded-2xl border-border/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                  <div className="w-10 h-10 rounded-xl bg-purple-600/10 flex items-center justify-center shadow-md">
                    <stat.icon className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search institutions..."
              className="rounded-xl pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Institution Verification</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Verify institution credentials before approval</li>
                  <li>• Generate unique verification codes</li>
                  <li>• Manage institution admin assignments</li>
                  <li>• Monitor institution activity and researchers</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Institutions Table */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle>All Institutions ({filteredInstitutions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredInstitutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4">
                  <Building2 className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Institutions</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Add institutions and generate verification codes to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInstitutions.map((inst) => (
                  <div key={inst.id} className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-foreground">{inst.name}</h4>
                          <Badge className={inst.is_verified ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}>
                            {inst.is_verified ? "Verified" : "Pending"}
                          </Badge>
                          {inst.onboarding_type && inst.onboarding_type !== "full_institution" && (
                            <Badge variant="outline" className="rounded-full capitalize">
                              {inst.onboarding_type.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                        {inst.description && (
                          <p className="text-sm text-muted-foreground mb-2">{inst.description}</p>
                        )}
                        {inst.website && (
                          <a href={inst.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                            {inst.website}
                          </a>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border">
                            <Key className="w-4 h-4 text-muted-foreground" />
                            <code className="text-sm font-mono text-foreground">{getVerificationCode(inst.id)}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(inst.id)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Added {new Date(inst.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                        >
                          <Link to={`/institution?institution_id=${inst.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            Impersonate
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeptDialog(inst)}
                          className="rounded-xl"
                        >
                          <Building2 className="w-4 h-4 mr-1" />
                          Departments
                        </Button>
                        {!inst.is_verified && (
                          <Button
                            size="sm"
                            onClick={() => handleVerify(inst.id)}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Verify
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateCode(inst.id)}
                          className="rounded-xl"
                        >
                          <Key className="w-4 h-4 mr-1" />
                          New Code
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(inst)}
                          className="rounded-xl"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(inst.id)}
                          className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Management Dialog */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Departments — {deptInstitution?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="New department name"
                className="rounded-xl"
              />
              <Button onClick={addDepartment} disabled={!newDeptName.trim()} className="rounded-xl">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="rounded-xl border border-dashed border-border p-3 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Online Department Lookup</p>
                  <p className="text-xs text-muted-foreground">
                    Searches "{deptInstitution?.name || "Institution name"} list of departments", then lets you choose which ones to add.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchDepartmentsOnline}
                  disabled={lookupLoading || !deptInstitution}
                  className="rounded-xl"
                >
                  {lookupLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                  Fetch Online
                </Button>
              </div>

              {lookupDepartments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {lookupDepartments.length} found
                      </Badge>
                      {lookupSource && (
                        <span className="text-xs text-muted-foreground">Source: {lookupSource}</span>
                      )}
                    </div>
                    {lookupQuery && (
                      <p className="w-full text-xs text-muted-foreground">
                        Query: {lookupQuery}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLookupDepartments(lookupDepartments.filter((name) => !departments.some((dept) => dept.name.toLowerCase() === name.toLowerCase())))}
                        className="h-8 rounded-lg"
                      >
                        Select new
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLookupDepartments([])}
                        className="h-8 rounded-lg"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-xl border bg-background">
                    {lookupDepartments.map((name) => {
                      const exists = departments.some((dept) => dept.name.trim().toLowerCase() === name.trim().toLowerCase());
                      const checked = selectedLookupDepartments.includes(name);
                      return (
                        <label
                          key={name}
                          className={`flex items-center justify-between gap-3 p-3 border-b last:border-b-0 ${exists ? "opacity-60" : "cursor-pointer hover:bg-muted/50"}`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={checked}
                              disabled={exists}
                              onCheckedChange={() => toggleLookupDepartment(name)}
                            />
                            <span className="text-sm font-medium text-foreground">{name}</span>
                          </div>
                          {exists && <Badge variant="outline" className="rounded-full">Existing</Badge>}
                        </label>
                      );
                    })}
                  </div>

                  <Button
                    type="button"
                    onClick={importSelectedDepartments}
                    disabled={importingDepartments || selectedLookupDepartments.length === 0}
                    className="w-full rounded-xl"
                  >
                    {importingDepartments ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Selected ({selectedLookupDepartments.length})
                  </Button>
                </div>
              )}
            </div>

            {loadingDepts ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : departments.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No departments yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {departments.map((dept) => (
                  <div key={dept.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Switch checked={dept.is_active} onCheckedChange={() => toggleDeptActive(dept)} />
                      <span className="text-sm font-medium text-foreground">{dept.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={dept.is_active ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}>
                        {dept.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDept(dept.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
