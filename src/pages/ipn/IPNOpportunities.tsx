import { useState, useEffect } from "react";
import IPNLayout from "@/components/layout/IPNLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Briefcase, Plus, Edit, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyAmount, toNumber } from "@/lib/numberFormat";

const STUDENT_LEVELS = ['ND1', 'ND2', 'HND1', 'HND2', '100L', '200L', '300L', '400L', '500L', 'Graduate HND', 'Graduate BSc', 'Masters', 'PhD'];

interface Company { id: string; name: string; }
interface Opportunity {
  id: string; company_id: string; title: string; description: string; job_type: string;
  location: string | null; is_paid: boolean; application_fee_ngn: number; is_published: boolean;
  deadline: string | null; slots_available: number | null; requirements: string[] | null;
  responsibilities: string[] | null; duration: string | null;
  ipn_companies?: { name: string };
}

export default function IPNOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    company_id: "", title: "", description: "", job_type: "internship",
    location: "", is_paid: false, application_fee_ngn: "0", deadline: "",
    slots_available: "1", duration: "",
    requirements: [] as string[], responsibilities: [] as string[],
    required_level: [] as string[],
    newRequirement: "", newResponsibility: "",
    requires_cv: false,
    work_mode: "",
  });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [oppsRes, compsRes] = await Promise.all([
      supabase.from("ipn_opportunities").select("*, ipn_companies(name)").eq("ipn_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("ipn_companies").select("id, name").eq("ipn_user_id", user.id).eq("is_active", true),
    ]);
    setOpportunities(((oppsRes.data || []) as any[]).map((opportunity) => ({
      ...opportunity,
      application_fee_ngn: toNumber(opportunity.application_fee_ngn),
    })) as any);
    setCompanies(compsRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.company_id) {
      toast({ title: "Title and company are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      company_id: form.company_id, title: form.title, description: form.description,
      job_type: form.job_type, location: form.location || null,
      is_paid: form.is_paid, application_fee_ngn: form.is_paid ? parseFloat(form.application_fee_ngn) || 0 : 0,
      deadline: form.deadline || null, slots_available: parseInt(form.slots_available) || 1,
      duration: form.duration || null,
      requirements: form.requirements.length > 0 ? form.requirements : null,
      responsibilities: form.responsibilities.length > 0 ? form.responsibilities : null,
      requires_cv: form.requires_cv,
      work_mode: form.work_mode || null,
    };

    if (editingId) {
      await supabase.from("ipn_opportunities").update(payload).eq("id", editingId);
      toast({ title: "Opportunity updated" });
    } else {
      await supabase.from("ipn_opportunities").insert({ ...payload, ipn_user_id: user.id });
      toast({ title: "Opportunity created" });
    }
    setDialogOpen(false);
    resetForm();
    setSaving(false);
    fetchData();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ company_id: "", title: "", description: "", job_type: "internship", location: "", is_paid: false, application_fee_ngn: "0", deadline: "", slots_available: "1", duration: "", requirements: [], responsibilities: [], required_level: [], newRequirement: "", newResponsibility: "", requires_cv: false, work_mode: "" });
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from("ipn_opportunities").update({ is_published: !current }).eq("id", id);
    fetchData();
  };

  const handleEdit = (o: Opportunity) => {
    setEditingId(o.id);
    setForm({
      company_id: o.company_id, title: o.title, description: o.description, job_type: o.job_type,
      location: o.location || "", is_paid: o.is_paid, application_fee_ngn: String(o.application_fee_ngn),
      deadline: o.deadline ? o.deadline.split("T")[0] : "", slots_available: String(o.slots_available || 1),
      duration: o.duration || "",
      requirements: o.requirements || [], responsibilities: o.responsibilities || [],
      required_level: [],
      newRequirement: "", newResponsibility: "",
      requires_cv: (o as any).requires_cv || false,
      work_mode: (o as any).work_mode || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this opportunity?")) return;
    await supabase.from("ipn_opportunities").delete().eq("id", id);
    toast({ title: "Opportunity deleted" });
    fetchData();
  };

  const addRequirement = () => {
    if (!form.newRequirement.trim()) return;
    setForm(p => ({ ...p, requirements: [...p.requirements, p.newRequirement.trim()], newRequirement: "" }));
  };

  const addResponsibility = () => {
    if (!form.newResponsibility.trim()) return;
    setForm(p => ({ ...p, responsibilities: [...p.responsibilities, p.newResponsibility.trim()], newResponsibility: "" }));
  };

  const toggleLevel = (level: string) => {
    setForm(prev => ({
      ...prev,
      required_level: prev.required_level.includes(level)
        ? prev.required_level.filter(l => l !== level)
        : [...prev.required_level, level]
    }));
  };

  const typeLabels: Record<string, string> = {
    siwes: "SIWES", internship: "Internship", part_time: "Part-time", full_time: "Full-time", industrial_training: "Industrial Training",
  };

  return (
    <IPNLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Opportunities</h1>
            <p className="text-muted-foreground">Post and manage job opportunities</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2" disabled={companies.length === 0}>
                <Plus className="w-4 h-4" /> Post Opportunity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? "Edit" : "Post"} Opportunity</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Company *</Label>
                  <Select value={form.company_id} onValueChange={(v) => setForm(p => ({ ...p, company_id: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Job title" className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Job description" className="rounded-xl" rows={4} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.job_type} onValueChange={(v) => setForm(p => ({ ...p, job_type: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="siwes">SIWES</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="part_time">Part-time</SelectItem>
                        <SelectItem value="full_time">Full-time</SelectItem>
                        <SelectItem value="industrial_training">Industrial Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))} placeholder="City" className="rounded-xl" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Duration</Label><Input value={form.duration} onChange={(e) => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 3 months" className="rounded-xl" /></div>
                  <div className="space-y-2"><Label>Slots</Label><Input type="number" min="1" value={form.slots_available} onChange={(e) => setForm(p => ({ ...p, slots_available: e.target.value }))} className="rounded-xl" /></div>
                </div>
                <div className="space-y-2"><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm(p => ({ ...p, deadline: e.target.value }))} className="rounded-xl" /></div>

                {/* Required Level */}
                <div className="space-y-2">
                  <Label>Required Level</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {STUDENT_LEVELS.map(level => (
                      <Badge key={level} variant={form.required_level.includes(level) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleLevel(level)}>{level}</Badge>
                    ))}
                  </div>
                </div>

                {/* Requirements */}
                <div className="space-y-2">
                  <Label>Requirements</Label>
                  <div className="flex gap-2">
                    <Input value={form.newRequirement} onChange={(e) => setForm(p => ({ ...p, newRequirement: e.target.value }))} placeholder="Add requirement" className="rounded-xl" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())} />
                    <Button type="button" variant="outline" size="sm" onClick={addRequirement} className="rounded-xl">Add</Button>
                  </div>
                  {form.requirements.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 text-muted-foreground">• {r}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setForm(p => ({ ...p, requirements: p.requirements.filter((_, idx) => idx !== i) }))}>✕</Button>
                    </div>
                  ))}
                </div>

                {/* Responsibilities */}
                <div className="space-y-2">
                  <Label>Responsibilities</Label>
                  <div className="flex gap-2">
                    <Input value={form.newResponsibility} onChange={(e) => setForm(p => ({ ...p, newResponsibility: e.target.value }))} placeholder="Add responsibility" className="rounded-xl" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addResponsibility())} />
                    <Button type="button" variant="outline" size="sm" onClick={addResponsibility} className="rounded-xl">Add</Button>
                  </div>
                  {form.responsibilities.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 text-muted-foreground">• {r}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setForm(p => ({ ...p, responsibilities: p.responsibilities.filter((_, idx) => idx !== i) }))}>✕</Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border">
                  <Label>Paid Application?</Label>
                  <Switch checked={form.is_paid} onCheckedChange={(v) => setForm(p => ({ ...p, is_paid: v }))} />
                </div>
                {form.is_paid && (
                  <div className="space-y-2"><Label>Application Fee (₦)</Label><Input type="number" min="0" value={form.application_fee_ngn} onChange={(e) => setForm(p => ({ ...p, application_fee_ngn: e.target.value }))} className="rounded-xl" /></div>
                )}

                <div className="flex items-center justify-between p-3 rounded-xl border">
                  <div>
                    <Label>Require CV Upload</Label>
                    <p className="text-xs text-muted-foreground">Ask applicants to upload their CV (PDF)</p>
                  </div>
                  <Switch checked={form.requires_cv} onCheckedChange={(v) => setForm(p => ({ ...p, requires_cv: v }))} />
                </div>

                <div className="space-y-2">
                  <Label>Work Mode</Label>
                  <Select value={form.work_mode || "none"} onValueChange={(v) => setForm(p => ({ ...p, work_mode: v === "none" ? "" : v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select work mode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="Fully Remote Work">Fully Remote Work</SelectItem>
                      <SelectItem value="Fully Office Work">Fully Office Work</SelectItem>
                      <SelectItem value="Partly Remote Work">Partly Remote Work</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "Update" : "Post"} Opportunity
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {companies.length === 0 && !loading && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded-2xl">
            <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-400">
              Add a company first before posting opportunities.
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : opportunities.length === 0 ? (
          <Card className="shadow-card rounded-2xl"><CardContent className="p-12 text-center"><Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold text-lg mb-2">No opportunities yet</h3><p className="text-muted-foreground">Post your first opportunity to start receiving applicants.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {opportunities.map((o) => (
              <Card key={o.id} className="shadow-card rounded-2xl border-border/50">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{o.title}</h3>
                        <Badge variant="outline" className="text-xs">{typeLabels[o.job_type] || o.job_type}</Badge>
                        {o.is_paid && <Badge className="bg-amber-500 text-xs">Paid</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(o as any).ipn_companies?.name}{o.location ? ` • ${o.location}` : ""}
                        {o.is_paid ? ` • ${formatCurrencyAmount(o.application_fee_ngn)}` : " • Free"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="rounded-xl gap-1" onClick={() => togglePublish(o.id, o.is_published)}>
                        {o.is_published ? <><EyeOff className="w-3 h-3" /> Unpublish</> : <><Eye className="w-3 h-3" /> Publish</>}
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => handleEdit(o)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="rounded-xl text-destructive" onClick={() => handleDelete(o.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </IPNLayout>
  );
}
