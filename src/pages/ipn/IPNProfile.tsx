import { useState, useEffect } from "react";
import IPNLayout from "@/components/layout/IPNLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function IPNProfile() {
  const [form, setForm] = useState({ company_name: "", bio: "", location: "", phone: "", website: "", means_of_identification: "", what_do_you_do: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("ipn_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setForm({ company_name: data.company_name || "", bio: data.bio || "", location: data.location || "", phone: data.phone || "", website: data.website || "", means_of_identification: data.means_of_identification || "", what_do_you_do: data.what_do_you_do || "" });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("ipn_profiles").upsert({ user_id: user.id, ...form }, { onConflict: "user_id" });
    toast({ title: "Profile updated" });
    setSaving(false);
  };

  if (loading) return <IPNLayout><div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></IPNLayout>;

  return (
    <IPNLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">Update your IPN profile details</p>
        </div>

        <Card className="shadow-card rounded-2xl">
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Network Name</Label>
                <Input value={form.company_name} onChange={(e) => setForm(p => ({ ...p, company_name: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>What do you do?</Label>
                <Input value={form.what_do_you_do} onChange={(e) => setForm(p => ({ ...p, what_do_you_do: e.target.value }))} className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => setForm(p => ({ ...p, bio: e.target.value }))} className="rounded-xl" rows={4} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))} className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))} className="rounded-xl" /></div>
            </div>

            <div className="space-y-2">
              <Label>NIN (Means of Identification)</Label>
              <Input value={form.means_of_identification} onChange={(e) => setForm(p => ({ ...p, means_of_identification: e.target.value }))} className="rounded-xl max-w-sm" />
            </div>

            <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    </IPNLayout>
  );
}
