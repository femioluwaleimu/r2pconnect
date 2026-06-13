import { useState, useEffect, useRef } from "react";
import IPNLayout from "@/components/layout/IPNLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Edit, Trash2, Loader2, MapPin, Briefcase, Upload, Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  industry: string | null;
  location: string | null;
  state: string | null;
  description: string | null;
  is_active: boolean;
}

export default function IPNCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: "", industry: "", location: "", state: "", description: "", logo_url: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("ipn_companies").select("*").eq("ipn_user_id", user.id).order("created_at", { ascending: false });
    setCompanies((data as Company[]) || []);
    setLoading(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image file", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Max file size is 2MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `company-logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("platform-assets").upload(fileName, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("platform-assets").getPublicUrl(fileName);
    setForm(p => ({ ...p, logo_url: publicUrl }));
    setUploading(false);
    toast({ title: "Logo uploaded" });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Company name is required", variant: "destructive" }); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      name: form.name,
      industry: form.industry || null,
      location: form.location || null,
      state: form.state || null,
      description: form.description || null,
      logo_url: form.logo_url || null,
    };

    if (editingId) {
      await supabase.from("ipn_companies").update(payload).eq("id", editingId);
      toast({ title: "Company updated" });
    } else {
      await supabase.from("ipn_companies").insert({ ipn_user_id: user.id, ...payload });
      toast({ title: "Company added" });
    }
    resetForm();
    setSaving(false);
    fetchCompanies();
  };

  const resetForm = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ name: "", industry: "", location: "", state: "", description: "", logo_url: "" });
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("ipn_companies").update({ is_active: !current }).eq("id", id);
    fetchCompanies();
  };

  const handleEdit = (c: Company) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      industry: c.industry || "",
      location: c.location || "",
      state: c.state || "",
      description: c.description || "",
      logo_url: c.logo_url || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this company? All linked opportunities will also be removed.")) return;
    await supabase.from("ipn_companies").delete().eq("id", id);
    toast({ title: "Company deleted" });
    fetchCompanies();
  };

  return (
    <IPNLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Companies</h1>
            <p className="text-muted-foreground text-sm">Manage companies in your network</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2 w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" /> Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? "Edit Company" : "Add Company"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-3">
                    {form.logo_url ? (
                      <div className="relative">
                        <img src={form.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-border" />
                        <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-5 h-5 rounded-full" onClick={() => setForm(p => ({ ...p, logo_url: "" }))}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                        <Image className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                        Upload
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2"><Label>Company Name *</Label><Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Company name" className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Industry</Label><Input value={form.industry} onChange={(e) => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="e.g., Technology" className="rounded-xl" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>City / Location</Label><Input value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))} placeholder="City" className="rounded-xl" /></div>
                  <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => setForm(p => ({ ...p, state: e.target.value }))} placeholder="e.g., Lagos" className="rounded-xl" /></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" className="rounded-xl" /></div>
                <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {editingId ? "Update" : "Add"} Company
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : companies.length === 0 ? (
          <Card className="shadow-card rounded-2xl border-none">
            <CardContent className="p-8 sm:p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No companies yet</h3>
              <p className="text-muted-foreground mb-4 text-sm">Add your first company to start posting opportunities.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((c) => (
              <Card key={c.id} className="shadow-card rounded-2xl border-border/50 overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Card Header with Logo */}
                  <div className="p-4 pb-3 flex items-start gap-3">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt={c.name} className="w-12 h-12 rounded-xl object-contain border border-border flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{c.name}</h3>
                      {c.industry && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Briefcase className="w-3 h-3" />
                          <span className="truncate">{c.industry}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location Info */}
                  {(c.location || c.state) && (
                    <div className="px-4 pb-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{[c.location, c.state].filter(Boolean).join(", ")}</span>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {c.description && (
                    <div className="px-4 pb-3">
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between bg-muted/20">
                    <Badge
                      variant={c.is_active ? "default" : "secondary"}
                      className="cursor-pointer rounded-full text-xs"
                      onClick={() => toggleActive(c.id, c.is_active)}
                    >
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={() => handleEdit(c)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
