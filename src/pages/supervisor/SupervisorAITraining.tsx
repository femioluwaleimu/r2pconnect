import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SupervisorLayout from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bot, Save, Plus, X, Sparkles, GraduationCap, Shield, BookOpen,
  Pencil, Trash2, Star, FileText, User as UserIcon, Eye, Wand2, Loader2,
} from "lucide-react";

type Tone = "supportive" | "direct" | "strict" | "formal" | "conversational";
type Strict = "lenient" | "balanced" | "strict" | "very_strict";
type Cite = "apa" | "mla" | "harvard" | "ieee" | "chicago" | "other";

interface Preset {
  id?: string;
  name: string;
  description?: string | null;
  is_default: boolean;
  is_active: boolean;
  tone: Tone;
  strictness: Strict;
  citation_style: Cite;
  focus_areas: string[];
  do_rules: string[];
  dont_rules: string[];
  custom_guidance: string;
  example_feedback: string;
  research_field: string;
  preferred_methodology: string;
}

const EMPTY_PRESET: Preset = {
  name: "",
  description: "",
  is_default: false,
  is_active: true,
  tone: "supportive",
  strictness: "balanced",
  citation_style: "apa",
  focus_areas: [],
  do_rules: [],
  dont_rules: [],
  custom_guidance: "",
  example_feedback: "",
  research_field: "",
  preferred_methodology: "",
};

const parseStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch {
      // Fall through to delimiter parsing for older/plain-text values.
    }

    return trimmed
      .split(/\r?\n|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizePreset = (preset: Partial<Preset> | null | undefined): Preset => ({
  ...EMPTY_PRESET,
  ...(preset || {}),
  description: preset?.description || "",
  is_default: Boolean(preset?.is_default),
  is_active: preset?.is_active !== false && preset?.is_active !== 0,
  focus_areas: parseStringList(preset?.focus_areas),
  do_rules: parseStringList(preset?.do_rules),
  dont_rules: parseStringList(preset?.dont_rules),
  custom_guidance: String(preset?.custom_guidance || ""),
  example_feedback: String(preset?.example_feedback || ""),
  research_field: String(preset?.research_field || ""),
  preferred_methodology: String(preset?.preferred_methodology || ""),
});

function ChipInput({
  value, onChange, placeholder,
}: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t].slice(0, 25));
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          maxLength={140}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="rounded-xl"
        />
        <Button type="button" onClick={add} variant="outline" className="rounded-xl shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pl-2 pr-1 py-1 rounded-lg">
              <span className="text-xs">{v}</span>
              <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function PresetEditor({
  preset, onChange,
}: { preset: Preset; onChange: (p: Preset) => void }) {
  const t = preset;
  const set = (patch: Partial<Preset>) => onChange({ ...t, ...patch });
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Preset name</Label>
          <Input
            maxLength={80}
            placeholder="e.g. Strict APA, Supportive Beginner"
            value={t.name}
            onChange={(e) => set({ name: e.target.value })}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Short description</Label>
          <Input
            maxLength={160}
            placeholder="When should you use this preset?"
            value={t.description || ""}
            onChange={(e) => set({ description: e.target.value })}
            className="rounded-xl"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={t.is_active} onCheckedChange={(v) => set({ is_active: v })} />
          <Label className="text-sm">Active</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={t.is_default} onCheckedChange={(v) => set({ is_default: v })} />
          <Label className="text-sm">Use as default for unassigned students</Label>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Tone</Label>
          <Select value={t.tone} onValueChange={(v) => set({ tone: v as Tone })}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="supportive">Supportive</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="strict">Strict</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="conversational">Conversational</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Strictness</Label>
          <Select value={t.strictness} onValueChange={(v) => set({ strictness: v as Strict })}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lenient">Lenient</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="strict">Strict</SelectItem>
              <SelectItem value="very_strict">Very strict</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Citation style</Label>
          <Select value={t.citation_style} onValueChange={(v) => set({ citation_style: v as Cite })}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="apa">APA</SelectItem>
              <SelectItem value="mla">MLA</SelectItem>
              <SelectItem value="harvard">Harvard</SelectItem>
              <SelectItem value="ieee">IEEE</SelectItem>
              <SelectItem value="chicago">Chicago</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Primary research field</Label>
          <Input maxLength={120} value={t.research_field}
            onChange={(e) => set({ research_field: e.target.value })}
            className="rounded-xl" placeholder="e.g. Renewable Energy" />
        </div>
        <div className="space-y-1.5">
          <Label>Preferred methodology</Label>
          <Input maxLength={120} value={t.preferred_methodology}
            onChange={(e) => set({ preferred_methodology: e.target.value })}
            className="rounded-xl" placeholder="e.g. Mixed-method" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Focus areas</Label>
        <ChipInput value={t.focus_areas} onChange={(v) => set({ focus_areas: v })}
          placeholder="e.g. Strong literature review" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-emerald-700 dark:text-emerald-400">Do</Label>
          <ChipInput value={t.do_rules} onChange={(v) => set({ do_rules: v })}
            placeholder="e.g. Demand recent citations" />
        </div>
        <div className="space-y-2">
          <Label className="text-rose-700 dark:text-rose-400">Don't</Label>
          <ChipInput value={t.dont_rules} onChange={(v) => set({ dont_rules: v })}
            placeholder="e.g. Don't accept Wikipedia" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Custom guidance</Label>
        <Textarea rows={4} maxLength={4000} value={t.custom_guidance}
          onChange={(e) => set({ custom_guidance: e.target.value })}
          className="rounded-xl"
          placeholder="Anything you'd tell a new student…" />
      </div>
      <div className="space-y-1.5">
        <Label>Example feedback I usually give</Label>
        <Textarea rows={4} maxLength={4000} value={t.example_feedback}
          onChange={(e) => set({ example_feedback: e.target.value })}
          className="rounded-xl"
          placeholder="Paste a sample of feedback for the AI to mirror your voice." />
      </div>
    </div>
  );
}

interface StudentRow { user_id: string; full_name: string; }
interface ResearchRow { id: string; title: string; author_id: string; author_name?: string; }
interface Assignment {
  id: string;
  preset_id: string;
  student_id: string | null;
  research_id: string | null;
}

export default function SupervisorAITraining() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [researches, setResearches] = useState<ResearchRow[]>([]);

  // editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Preset>(EMPTY_PRESET);

  // preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPreset, setPreviewPreset] = useState<Preset | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [previewExcerpt, setPreviewExcerpt] = useState("");

  // bulk actions
  const [bulkStudentIds, setBulkStudentIds] = useState<Set<string>>(new Set());
  const [bulkResearchIds, setBulkResearchIds] = useState<Set<string>>(new Set());
  const [bulkPresetId, setBulkPresetId] = useState<string>("");
  const [bulkApplying, setBulkApplying] = useState(false);

  const toggleSet = (set: Set<string>, id: string) => {
    const n = new Set(set);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  };

  const runPreview = async (preset: Preset) => {
    setPreviewPreset(preset);
    setPreviewOpen(true);
    setPreviewText("");
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("preview-training-preset", {
        body: { preset, excerpt: previewExcerpt || undefined },
      });
      if (error) throw error;
      setPreviewText((data as any)?.preview || "No preview returned.");
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
      setPreviewText("");
    } finally {
      setPreviewLoading(false);
    }
  };

  const applyBulk = async (mode: "students" | "research") => {
    if (!userId || !bulkPresetId) {
      toast({ title: "Pick a preset first", variant: "destructive" });
      return;
    }
    const ids = mode === "students" ? [...bulkStudentIds] : [...bulkResearchIds];
    if (ids.length === 0) {
      toast({ title: "Select at least one item", variant: "destructive" });
      return;
    }
    setBulkApplying(true);
    try {
      const rows = ids.map((id) => ({
        supervisor_id: userId,
        preset_id: bulkPresetId,
        student_id: mode === "students" ? id : null,
        research_id: mode === "research" ? id : null,
      }));
      const conflict = mode === "students" ? "supervisor_id,student_id" : "supervisor_id,research_id";
      const { error } = await supabase
        .from("supervisor_training_assignments")
        .upsert(rows as any, { onConflict: conflict });
      if (error) throw error;
      toast({ title: `Preset applied to ${ids.length} ${mode === "students" ? "student(s)" : "project(s)"}` });
      if (mode === "students") setBulkStudentIds(new Set());
      else setBulkResearchIds(new Set());
      await loadAll(userId);
    } catch (e: any) {
      toast({ title: "Bulk apply failed", description: e.message, variant: "destructive" });
    } finally {
      setBulkApplying(false);
    }
  };


  const loadAll = async (uid: string) => {
    const [{ data: ps }, { data: as }, { data: papers }, { data: profileAssigned }] = await Promise.all([
      supabase.from("supervisor_ai_training_presets").select("*").eq("supervisor_id", uid).order("created_at", { ascending: true }),
      supabase.from("supervisor_training_assignments").select("*").eq("supervisor_id", uid),
      supabase.from("research_papers").select("id,title,author_id").eq("supervisor_id", uid).eq("research_type", "student").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id").eq("assigned_supervisor_id", uid),
    ]);

    setPresets(((ps as any) || []).map(normalizePreset));
    setAssignments((as as any) || []);

    const studentIds = new Set<string>([
      ...((papers || []).map((p) => p.author_id)),
      ...((profileAssigned || []).map((p) => p.user_id)),
    ]);
    const idArr = [...studentIds];
    let studentRows: StudentRow[] = [];
    if (idArr.length) {
      const { data: profs } = await supabase
        .from("profiles").select("user_id, full_name").in("user_id", idArr);
      studentRows = (profs || []).map((p) => ({ user_id: p.user_id, full_name: p.full_name || "Unnamed" }));
    }
    setStudents(studentRows);

    const nameMap = new Map(studentRows.map((s) => [s.user_id, s.full_name]));
    setResearches(((papers as any) || []).map((p: any) => ({
      id: p.id, title: p.title, author_id: p.author_id, author_name: nameMap.get(p.author_id) || "Student",
    })));
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await loadAll(user.id);
      setLoading(false);
    })();
  }, []);

  const openCreate = () => { setEditing({ ...EMPTY_PRESET }); setEditorOpen(true); };
  const openEdit = (p: Preset) => { setEditing(normalizePreset(p)); setEditorOpen(true); };

  const savePreset = async () => {
    if (!userId) return;
    if (!editing.name.trim()) {
      toast({ title: "Name required", description: "Give the preset a short name.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        supervisor_id: userId,
        name: editing.name.trim(),
        description: editing.description?.toString().trim() || null,
        is_default: editing.is_default,
        is_active: editing.is_active,
        tone: editing.tone,
        strictness: editing.strictness,
        citation_style: editing.citation_style,
        focus_areas: parseStringList(editing.focus_areas),
        do_rules: parseStringList(editing.do_rules),
        dont_rules: parseStringList(editing.dont_rules),
        custom_guidance: String(editing.custom_guidance || "").trim() || null,
        example_feedback: String(editing.example_feedback || "").trim() || null,
        research_field: String(editing.research_field || "").trim() || null,
        preferred_methodology: String(editing.preferred_methodology || "").trim() || null,
      };

      // Only one default at a time
      if (editing.is_default) {
        await supabase.from("supervisor_ai_training_presets")
          .update({ is_default: false }).eq("supervisor_id", userId);
      }

      if (editing.id) {
        const { error } = await supabase.from("supervisor_ai_training_presets")
          .update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("supervisor_ai_training_presets").insert(payload);
        if (error) throw error;
      }
      toast({ title: "Preset saved" });
      setEditorOpen(false);
      await loadAll(userId);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deletePreset = async (id: string) => {
    if (!confirm("Delete this preset? Assignments using it will be removed.")) return;
    const { error } = await supabase.from("supervisor_ai_training_presets").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Preset deleted" });
    if (userId) loadAll(userId);
  };

  const setStudentPreset = async (studentId: string, presetId: string) => {
    if (!userId) return;
    if (presetId === "__none") {
      await supabase.from("supervisor_training_assignments")
        .delete().eq("supervisor_id", userId).eq("student_id", studentId);
    } else {
      await supabase.from("supervisor_training_assignments").upsert({
        supervisor_id: userId, student_id: studentId, preset_id: presetId, research_id: null,
      } as any, { onConflict: "supervisor_id,student_id" });
    }
    toast({ title: "Student preset updated" });
    loadAll(userId);
  };

  const setResearchPreset = async (researchId: string, presetId: string) => {
    if (!userId) return;
    if (presetId === "__none") {
      await supabase.from("supervisor_training_assignments")
        .delete().eq("supervisor_id", userId).eq("research_id", researchId);
    } else {
      await supabase.from("supervisor_training_assignments").upsert({
        supervisor_id: userId, research_id: researchId, preset_id: presetId, student_id: null,
      } as any, { onConflict: "supervisor_id,research_id" });
    }
    toast({ title: "Research preset updated" });
    loadAll(userId);
  };

  const studentPresetMap = new Map(
    assignments.filter(a => a.student_id).map(a => [a.student_id!, a.preset_id])
  );
  const researchPresetMap = new Map(
    assignments.filter(a => a.research_id).map(a => [a.research_id!, a.preset_id])
  );

  if (loading) {
    return <SupervisorLayout><Skeleton className="h-96 rounded-2xl" /></SupervisorLayout>;
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bot className="w-7 h-7 text-primary" /> Train AI Supervisor
            </h1>
            <p className="text-sm text-muted-foreground">
              Build training presets and apply different ones per student or per research project.
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <GraduationCap className="w-3 h-3" /> {students.length} students
          </Badge>
        </div>

        <Tabs defaultValue="presets" className="space-y-4">
          <TabsList className="rounded-xl">
            <TabsTrigger value="presets" className="rounded-lg gap-1"><Sparkles className="w-4 h-4" />Presets</TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg gap-1"><UserIcon className="w-4 h-4" />Per student</TabsTrigger>
            <TabsTrigger value="research" className="rounded-lg gap-1"><FileText className="w-4 h-4" />Per research</TabsTrigger>
          </TabsList>

          {/* PRESETS */}
          <TabsContent value="presets" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Create reusable training profiles. Mark one as default for unassigned students.
              </p>
              <Button onClick={openCreate} className="rounded-xl">
                <Plus className="w-4 h-4 mr-1" /> New preset
              </Button>
            </div>

            {presets.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="p-10 text-center text-muted-foreground">
                  <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  No presets yet. Create your first training preset.
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {presets.map((p) => (
                  <Card key={p.id} className="rounded-2xl">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{p.name}</h3>
                            {p.is_default && (
                              <Badge className="gap-1 rounded-md"><Star className="w-3 h-3" />Default</Badge>
                            )}
                            {!p.is_active && <Badge variant="secondary">Inactive</Badge>}
                          </div>
                          {p.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" title="Preview AI feedback" onClick={() => runPreview(p)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => p.id && deletePreset(p.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="capitalize">{p.tone}</Badge>
                        <Badge variant="outline" className="capitalize">{p.strictness.replace("_", " ")}</Badge>
                        <Badge variant="outline" className="uppercase">{p.citation_style}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PER STUDENT */}
          <TabsContent value="students" className="space-y-3">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Apply preset per student</CardTitle>
                <CardDescription>
                  Students remain here even after their research is approved.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {students.length === 0 && (
                  <p className="text-sm text-muted-foreground">No students yet.</p>
                )}

                {students.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-muted/40 border">
                    <Checkbox
                      checked={bulkStudentIds.size === students.length && students.length > 0}
                      onCheckedChange={(v) =>
                        setBulkStudentIds(v ? new Set(students.map(s => s.user_id)) : new Set())
                      }
                    />
                    <span className="text-xs text-muted-foreground mr-2">
                      {bulkStudentIds.size} selected
                    </span>
                    <Select value={bulkPresetId} onValueChange={setBulkPresetId}>
                      <SelectTrigger className="w-[200px] rounded-xl h-9">
                        <SelectValue placeholder="Choose preset…" />
                      </SelectTrigger>
                      <SelectContent>
                        {presets.filter(p => p.is_active).map((p) => (
                          <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm" className="rounded-xl"
                      disabled={bulkApplying || bulkStudentIds.size === 0 || !bulkPresetId}
                      onClick={() => applyBulk("students")}
                    >
                      {bulkApplying ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
                      Apply to selected
                    </Button>
                  </div>
                )}

                {students.map((s) => (
                  <div key={s.user_id} className="flex items-center justify-between gap-3 p-3 rounded-xl border">
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        checked={bulkStudentIds.has(s.user_id)}
                        onCheckedChange={() => setBulkStudentIds(toggleSet(bulkStudentIds, s.user_id))}
                      />
                      <UserIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{s.full_name}</span>
                    </div>
                    <Select
                      value={studentPresetMap.get(s.user_id) || "__none"}
                      onValueChange={(v) => setStudentPreset(s.user_id, v)}
                    >
                      <SelectTrigger className="w-[200px] rounded-xl"><SelectValue placeholder="Default" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Use default</SelectItem>
                        {presets.filter(p => p.is_active).map((p) => (
                          <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PER RESEARCH */}
          <TabsContent value="research" className="space-y-3">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Apply preset per research project</CardTitle>
                <CardDescription>
                  Project-level presets override student-level presets.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {researches.length === 0 && (
                  <p className="text-sm text-muted-foreground">No research projects assigned to you yet.</p>
                )}

                {researches.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-muted/40 border">
                    <Checkbox
                      checked={bulkResearchIds.size === researches.length && researches.length > 0}
                      onCheckedChange={(v) =>
                        setBulkResearchIds(v ? new Set(researches.map(r => r.id)) : new Set())
                      }
                    />
                    <span className="text-xs text-muted-foreground mr-2">
                      {bulkResearchIds.size} selected
                    </span>
                    <Select value={bulkPresetId} onValueChange={setBulkPresetId}>
                      <SelectTrigger className="w-[200px] rounded-xl h-9">
                        <SelectValue placeholder="Choose preset…" />
                      </SelectTrigger>
                      <SelectContent>
                        {presets.filter(p => p.is_active).map((p) => (
                          <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm" className="rounded-xl"
                      disabled={bulkApplying || bulkResearchIds.size === 0 || !bulkPresetId}
                      onClick={() => applyBulk("research")}
                    >
                      {bulkApplying ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
                      Apply to selected
                    </Button>
                  </div>
                )}

                {researches.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border">
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        checked={bulkResearchIds.has(r.id)}
                        onCheckedChange={() => setBulkResearchIds(toggleSet(bulkResearchIds, r.id))}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.author_name}</p>
                      </div>
                    </div>
                    <Select
                      value={researchPresetMap.get(r.id) || "__none"}
                      onValueChange={(v) => setResearchPreset(r.id, v)}
                    >
                      <SelectTrigger className="w-[200px] rounded-xl"><SelectValue placeholder="Inherit" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Inherit (student/default)</SelectItem>
                        {presets.filter(p => p.is_active).map((p) => (
                          <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Editor dialog */}
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                {editing.id ? "Edit preset" : "New preset"}
              </DialogTitle>
              <DialogDescription>
                Configure how the AI mentors students using this profile.
              </DialogDescription>
            </DialogHeader>
            <PresetEditor preset={editing} onChange={setEditing} />
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)} className="rounded-xl">Cancel</Button>
              <Button variant="outline" onClick={() => runPreview(editing)} className="rounded-xl">
                <Eye className="w-4 h-4 mr-1" /> Preview AI feedback
              </Button>
              <Button onClick={savePreset} disabled={saving} className="rounded-xl">
                <Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save preset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Preview: {previewPreset?.name || "Untitled preset"}
              </DialogTitle>
              <DialogDescription>
                See how the AI will speak to your students with this preset — before applying it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Sample student excerpt (optional)</Label>
                <Textarea
                  rows={4} maxLength={3000}
                  value={previewExcerpt}
                  onChange={(e) => setPreviewExcerpt(e.target.value)}
                  placeholder="Paste a paragraph from a student's chapter, or leave blank to use a built-in sample."
                  className="rounded-xl"
                />
                <Button
                  size="sm" variant="outline" className="rounded-xl"
                  disabled={previewLoading || !previewPreset}
                  onClick={() => previewPreset && runPreview(previewPreset)}
                >
                  {previewLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  Re-generate preview
                </Button>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4 min-h-[160px]">
                {previewLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating sample feedback…
                  </div>
                ) : previewText ? (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{previewText}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No preview yet.</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)} className="rounded-xl">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SupervisorLayout>
  );
}
