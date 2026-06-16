import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Percent, Users, GraduationCap, Building2, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export default function AdminCommissionSettings() {
  const [rates, setRates] = useState({
    supervisor_commission_rate: "5",
    referrer_commission_rate: "5",
    institution_commission_rate: "10",
    download_student_share: "50",
    download_supervisor_share: "20",
    download_institution_share: "20",
    download_platform_share: "10",
    ipn_share_percent: "80",
    ipn_platform_share_percent: "20",
  });
  const [settingIds, setSettingIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("id, key, value")
      .in("key", ["supervisor_commission_rate", "referrer_commission_rate", "institution_commission_rate", "download_student_share", "download_supervisor_share", "download_institution_share", "download_platform_share", "ipn_share_percent", "ipn_platform_share_percent"]);

    if (data) {
      const obj = { ...rates };
      const ids: Record<string, string> = {};
      data.forEach((item) => {
        if (item.id) {
          ids[item.key] = item.id;
        }
        if (item.key in obj) {
          (obj as any)[item.key] = item.value || "0";
        }
      });
      setSettingIds(ids);
      setRates(obj);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const [key, value] of Object.entries(rates)) {
        const numVal = parseFloat(value);
        if (isNaN(numVal) || numVal < 0 || numVal > 100) {
          throw new Error(`${key.replace(/_/g, " ")} must be between 0 and 100`);
        }
      }

      const settingsToSave = Object.entries(rates).map(([key, value]) => ({
        id: settingIds[key] || createUuid(),
        key,
        value: String(parseFloat(value)),
        type: "number",
        updated_by: user.id,
      }));

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from("platform_settings")
          .upsert(setting, { onConflict: "key" });

        if (error) {
          throw new Error(`${setting.key.replace(/_/g, " ")}: ${error.message}`);
        }
      }

      setSettingIds(prev => ({
        ...prev,
        ...Object.fromEntries(settingsToSave.map(setting => [setting.key, setting.id])),
      }));

      toast({ title: "Commission rates saved successfully" });
    } catch (error: any) {
      toast({ title: "Error saving commission rates", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  const rateFields = [
    { key: "supervisor_commission_rate", label: "Supervisor Commission", desc: "Percentage supervisors earn from each student's subscription", icon: GraduationCap, color: "from-indigo-500 to-purple-600" },
    { key: "referrer_commission_rate", label: "Referrer Commission", desc: "Percentage referrers earn monthly from their referee's subscription", icon: Users, color: "from-emerald-500 to-green-600" },
    { key: "institution_commission_rate", label: "Institution Commission", desc: "Percentage institutions earn from their researcher's subscription", icon: Building2, color: "from-blue-500 to-indigo-600" },
  ];

  const downloadShareFields = [
    { key: "download_student_share", label: "Student Share", desc: "Percentage the student (research owner) receives from download proceeds", icon: GraduationCap, color: "from-emerald-500 to-teal-600" },
    { key: "download_supervisor_share", label: "Supervisor Share", desc: "Percentage the student's supervisor receives from download proceeds", icon: Users, color: "from-indigo-500 to-violet-600" },
    { key: "download_institution_share", label: "Institution Share", desc: "Percentage the institution receives from download proceeds", icon: Building2, color: "from-blue-500 to-cyan-600" },
    { key: "download_platform_share", label: "Platform Share (R2P Connect)", desc: "Percentage the platform retains from download proceeds", icon: Percent, color: "from-amber-500 to-orange-600" },
  ];

  const downloadShareTotal = Number(rates.download_student_share || 0) + Number(rates.download_supervisor_share || 0) + Number(rates.download_institution_share || 0) + Number(rates.download_platform_share || 0);
  const ipnShareTotal = Number(rates.ipn_share_percent || 0) + Number(rates.ipn_platform_share_percent || 0);

  const ipnShareFields = [
    { key: "ipn_share_percent", label: "IPN Share", desc: "Percentage the IPN partner receives from paid application fees", icon: Building2, color: "from-orange-500 to-red-600" },
    { key: "ipn_platform_share_percent", label: "Platform Share", desc: "Percentage R2P Connect retains from paid application fees", icon: Percent, color: "from-amber-500 to-orange-600" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commission Settings</h1>
          <p className="text-muted-foreground">Configure commission percentages for subscriptions and downloads</p>
        </div>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Percent className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">How Commissions Work</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• When a student subscribes, commissions are automatically distributed</li>
                  <li>• Supervisors earn from their assigned students' subscriptions</li>
                  <li>• Referrers earn monthly from their referee's active subscription</li>
                  <li>• Institutions earn from researchers under their institution</li>
                  <li>• Download revenue is shared between student, supervisor, institution & platform</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Subscription Commissions</h2>
          <div className="grid gap-6">
            {rateFields.map((field) => (
              <Card key={field.key} className="shadow-card rounded-2xl border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${field.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <field.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-base font-semibold">{field.label}</Label>
                      <p className="text-sm text-muted-foreground mb-3">{field.desc}</p>
                      <div className="flex items-center gap-2 max-w-xs">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={(rates as any)[field.key]}
                          onChange={(e) => setRates(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="rounded-xl"
                        />
                        <span className="text-lg font-bold text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Download Revenue Sharing</h2>
          <p className="text-sm text-muted-foreground mb-4">
            When someone downloads a paid research paper, proceeds are split among these parties.
          </p>
          {downloadShareTotal !== 100 && (
            <Card className="border-destructive/50 bg-destructive/5 mb-4">
              <CardContent className="p-4">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Total shares must equal 100%. Current total: {downloadShareTotal}%
                </p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-6">
            {downloadShareFields.map((field) => (
              <Card key={field.key} className="shadow-card rounded-2xl border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${field.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <field.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-base font-semibold">{field.label}</Label>
                      <p className="text-sm text-muted-foreground mb-3">{field.desc}</p>
                      <div className="flex items-center gap-2 max-w-xs">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={(rates as any)[field.key]}
                          onChange={(e) => setRates(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="rounded-xl"
                        />
                        <span className="text-lg font-bold text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">IPN Application Revenue Sharing</h2>
          <p className="text-sm text-muted-foreground mb-4">
            When someone pays to apply for a paid IPN opportunity, the fee is split between these parties.
          </p>
          {ipnShareTotal !== 100 && (
            <Card className="border-destructive/50 bg-destructive/5 mb-4">
              <CardContent className="p-4">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Total shares must equal 100%. Current total: {ipnShareTotal}%
                </p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-6">
            {ipnShareFields.map((field) => (
              <Card key={field.key} className="shadow-card rounded-2xl border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${field.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <field.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-base font-semibold">{field.label}</Label>
                      <p className="text-sm text-muted-foreground mb-3">{field.desc}</p>
                      <div className="flex items-center gap-2 max-w-xs">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={(rates as any)[field.key]}
                          onChange={(e) => setRates(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="rounded-xl"
                        />
                        <span className="text-lg font-bold text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || downloadShareTotal !== 100 || ipnShareTotal !== 100} className="rounded-xl px-8">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? "Saving..." : "Save Commission Rates"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
