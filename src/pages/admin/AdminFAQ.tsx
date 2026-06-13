import { useState } from "react";
import { useFAQAdmin, FAQ_CATEGORIES, FAQ_LOCATIONS, type FAQ } from "@/hooks/useFAQ";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, HelpCircle, Search } from "lucide-react";

export default function AdminFAQ() {
  const { data: faqs, isLoading } = useFAQAdmin();
  const [search, setSearch] = useState("");
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "general",
    display_location: "full_page",
    is_active: true,
    sort_order: 0,
  });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filtered = (faqs || []).filter(
    (f) =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditingFAQ(null);
    setFormData({ question: "", answer: "", category: "general", display_location: "full_page", is_active: true, sort_order: 0 });
    setIsDialogOpen(true);
  };

  const openEdit = (faq: FAQ) => {
    setEditingFAQ(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      display_location: faq.display_location,
      is_active: faq.is_active,
      sort_order: faq.sort_order,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast({ title: "Please fill in question and answer", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingFAQ) {
        const { error } = await supabase.from("faq").update(formData).eq("id", editingFAQ.id);
        if (error) throw error;
        toast({ title: "FAQ updated" });
      } else {
        const { error } = await supabase.from("faq").insert(formData);
        if (error) throw error;
        toast({ title: "FAQ created" });
      }
      queryClient.invalidateQueries({ queryKey: ["faq-admin"] });
      queryClient.invalidateQueries({ queryKey: ["faq"] });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    const { error } = await supabase.from("faq").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "FAQ deleted" });
    queryClient.invalidateQueries({ queryKey: ["faq-admin"] });
    queryClient.invalidateQueries({ queryKey: ["faq"] });
  };

  const toggleActive = async (faq: FAQ) => {
    const { error } = await supabase.from("faq").update({ is_active: !faq.is_active }).eq("id", faq.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["faq-admin"] });
    queryClient.invalidateQueries({ queryKey: ["faq"] });
  };

  const getCategoryLabel = (val: string) => FAQ_CATEGORIES.find((c) => c.value === val)?.label || val;
  const getLocationLabel = (val: string) => FAQ_LOCATIONS.find((l) => l.value === val)?.label || val;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-primary" />
              FAQ Management
            </h1>
            <p className="text-muted-foreground">Manage frequently asked questions across the platform</p>
          </div>
          <Button onClick={openNew} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Add FAQ
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search FAQs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>

        {/* FAQ List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border-none shadow-soft">
            <CardContent className="p-12 text-center">
              <HelpCircle className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No FAQs Yet</h3>
              <p className="text-muted-foreground mb-6">Create your first FAQ to help users find answers.</p>
              <Button onClick={openNew} className="rounded-xl gap-2">
                <Plus className="w-4 h-4" />
                Add FAQ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((faq) => (
              <Card key={faq.id} className="rounded-xl border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground mb-1 line-clamp-1">{faq.question}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{faq.answer}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="rounded-full text-xs">{getCategoryLabel(faq.category)}</Badge>
                        <Badge variant="outline" className="rounded-full text-xs">{getLocationLabel(faq.display_location)}</Badge>
                        <Badge variant={faq.is_active ? "default" : "destructive"} className="rounded-full text-xs">
                          {faq.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch checked={faq.is_active} onCheckedChange={() => toggleActive(faq)} />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(faq)} className="rounded-xl">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(faq.id)} className="rounded-xl text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingFAQ ? "Edit FAQ" : "Add New FAQ"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Question</Label>
                <Input value={formData.question} onChange={(e) => setFormData((p) => ({ ...p, question: e.target.value }))} placeholder="Enter the question..." />
              </div>
              <div>
                <Label>Answer</Label>
                <Textarea value={formData.answer} onChange={(e) => setFormData((p) => ({ ...p, answer: e.target.value }))} placeholder="Enter the answer..." rows={5} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FAQ_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Display Location</Label>
                  <Select value={formData.display_location} onValueChange={(v) => setFormData((p) => ({ ...p, display_location: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FAQ_LOCATIONS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={formData.sort_order} onChange={(e) => setFormData((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData((p) => ({ ...p, is_active: v }))} />
                  <Label>Active</Label>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
                {saving ? "Saving..." : editingFAQ ? "Update FAQ" : "Create FAQ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
