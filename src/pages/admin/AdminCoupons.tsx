import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatLagos } from "@/lib/dateUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Tag, Percent, Calendar, Users, Loader2, 
  Trash2, Edit, Copy, CheckCircle2, XCircle
} from "lucide-react";

interface CouponCode {
  id: string;
  code: string;
  description: string | null;
  discount_percentage: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  user_type: string;
  institution_id: string | null;
  plan_id: string | null;
  created_at: string;
}

interface InstitutionOption { id: string; name: string; }
interface PlanOption { plan_id: string; name: string; }
interface FreeActivationAudit {
  id: string;
  coupon_id: string;
  user_id: string;
  subscription_id: string | null;
  activation_month: string | null;
  used_at: string;
  coupon_code?: string;
  coupon_user_type?: string;
  user_name?: string;
  user_email?: string;
  tier?: string;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<CouponCode[]>([]);
  const [freeActivationLogs, setFreeActivationLogs] = useState<FreeActivationAudit[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponCode | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_percentage: 10,
    max_uses: "",
    max_uses_per_user: "",
    valid_until: "",
    is_active: true,
    user_type: "researcher",
    institution_id: "all",
    plan_id: "all",
  });

  useEffect(() => {
    fetchCoupons();
    fetchFreeActivationLogs();
    fetchInstitutionsAndPlans();
  }, []);

  const fetchFreeActivationLogs = async () => {
    const { data, error } = await (supabase as any)
      .from("coupon_usages")
      .select("id, coupon_id, user_id, subscription_id, activation_month, used_at, coupon_codes!inner(code, discount_percentage, user_type), subscriptions(tier)")
      .eq("coupon_codes.discount_percentage", 100)
      .order("used_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching free coupon activation logs:", error);
      return;
    }

    const rows = (data || []) as any[];
    const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map((profile) => [profile.user_id, profile]));

    setFreeActivationLogs(rows.map((row) => {
      const profile = profileMap.get(row.user_id);
      const tier = row.subscriptions?.tier || "—";
      return {
        id: row.id,
        coupon_id: row.coupon_id,
        user_id: row.user_id,
        subscription_id: row.subscription_id,
        activation_month: row.activation_month,
        used_at: row.used_at,
        coupon_code: row.coupon_codes?.code,
        coupon_user_type: row.coupon_codes?.user_type,
        user_name: profile?.full_name,
        user_email: profile?.email,
        tier,
      };
    }));
  };

  const fetchInstitutionsAndPlans = async () => {
    const [instRes, planRes] = await Promise.all([
      supabase.from("institutions").select("id, name").order("name"),
      supabase
        .from("subscription_plans")
        .select("plan_id, name")
        .eq("is_active", true)
        .like("plan_id", "researcher_%")
        .order("amount_ngn"),
    ]);
    setInstitutions(instRes.data || []);
    setPlans(planRes.data || []);
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupon_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const handleSubmit = async () => {
    if (!formData.code.trim()) {
      toast({ title: "Code required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const couponData = {
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        discount_percentage: formData.discount_percentage,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        max_uses_per_user: formData.max_uses_per_user ? parseInt(formData.max_uses_per_user) : null,
        valid_until: formData.valid_until || null,
        is_active: formData.is_active,
        user_type: formData.user_type,
        institution_id: formData.institution_id === "all" ? null : formData.institution_id,
        plan_id: formData.plan_id === "all" ? null : formData.plan_id,
        created_by: user?.id
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from("coupon_codes")
          .update(couponData)
          .eq("id", editingCoupon.id);
        if (error) throw error;
        toast({ title: "Coupon updated" });
      } else {
        const { error } = await supabase
          .from("coupon_codes")
          .insert(couponData);
        if (error) throw error;
        toast({ title: "Coupon created" });
      }

      setDialogOpen(false);
      resetForm();
      fetchCoupons();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (coupon: CouponCode) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || "",
      discount_percentage: coupon.discount_percentage,
      max_uses: coupon.max_uses?.toString() || "",
      max_uses_per_user: coupon.max_uses_per_user?.toString() || "",
      valid_until: coupon.valid_until ? coupon.valid_until.split("T")[0] : "",
      is_active: coupon.is_active,
      user_type: coupon.user_type,
      institution_id: coupon.institution_id || "all",
      plan_id: coupon.plan_id || "all",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;

    try {
      const { error } = await supabase
        .from("coupon_codes")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Coupon deleted" });
      fetchCoupons();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("coupon_codes")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
      fetchCoupons();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code copied!" });
  };

  const resetForm = () => {
    setEditingCoupon(null);
    setFormData({
      code: "",
      description: "",
      discount_percentage: 10,
      max_uses: "",
      max_uses_per_user: "",
      valid_until: "",
      is_active: true,
      user_type: "researcher",
      institution_id: "all",
      plan_id: "all",
    });
  };

  const planName = (id: string | null) => id ? (plans.find(p => p.plan_id === id)?.name || id) : "All plans";
  const institutionName = (id: string | null) => id ? (institutions.find(i => i.id === id)?.name || "—") : "All institutions";

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Coupon Codes</h1>
            <p className="text-muted-foreground">Manage discount codes for subscriptions</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
                <DialogDescription>
                  Set up a discount code for researchers
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Coupon Code</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., SAVE20"
                      className="uppercase rounded-xl"
                    />
                    <Button type="button" variant="outline" onClick={generateCode} className="rounded-xl shrink-0">
                      Generate
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., New year promotion"
                    className="mt-1.5 rounded-xl"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Discount %</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) || 10 })}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Max Uses (blank = unlimited)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.max_uses}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                      placeholder="∞"
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <Label>Max Uses Per User (blank = unlimited)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.max_uses_per_user}
                    onChange={(e) => setFormData({ ...formData, max_uses_per_user: e.target.value })}
                    placeholder="∞"
                    className="mt-1.5 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground mt-1">How many times a single user can redeem this coupon.</p>
                </div>

                <div>
                  <Label>Valid Until (blank = no expiry)</Label>
                  <Input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <div>
                  <Label>Restrict to Institution (optional)</Label>
                  <Select
                    value={formData.institution_id}
                    onValueChange={(v) => setFormData({ ...formData, institution_id: v })}
                  >
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="All institutions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All institutions</SelectItem>
                      {institutions.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Only users from this institution can use the coupon.</p>
                </div>

                <div>
                  <Label>Restrict to Plan (optional)</Label>
                  <Select
                    value={formData.plan_id}
                    onValueChange={(v) => setFormData({ ...formData, plan_id: v })}
                  >
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="All plans" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All plans</SelectItem>
                      {plans.map(p => (
                        <SelectItem key={p.plan_id} value={p.plan_id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Coupon only applies to this subscription plan.</p>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving} className="rounded-xl">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingCoupon ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="stat-blue text-white rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Tag className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{coupons.length}</p>
                  <p className="text-sm opacity-80">Total Coupons</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-green text-white rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{coupons.filter(c => c.is_active).length}</p>
                  <p className="text-sm opacity-80">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-yellow text-white rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{coupons.reduce((sum, c) => sum + c.current_uses, 0)}</p>
                  <p className="text-sm opacity-80">Total Uses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-mint text-white rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Percent className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">
                    {coupons.length > 0 
                      ? Math.round(coupons.reduce((sum, c) => sum + c.discount_percentage, 0) / coupons.length)
                      : 0}%
                  </p>
                  <p className="text-sm opacity-80">Avg Discount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coupons Table */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>All Coupons</CardTitle>
            <CardDescription>Manage your discount codes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No coupons yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                              {coupon.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyCode(coupon.code)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          {coupon.description && (
                            <p className="text-xs text-muted-foreground mt-1">{coupon.description}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            {coupon.discount_percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {coupon.institution_id ? (
                            <Badge variant="outline" className="rounded-full">{institutionName(coupon.institution_id)}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">All</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {coupon.plan_id ? (
                            <Badge variant="outline" className="rounded-full">{planName(coupon.plan_id)}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">All</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {coupon.current_uses} / {coupon.max_uses || "∞"}
                        </TableCell>
                        <TableCell>
                          {coupon.valid_until ? (
                            <span className={isExpired(coupon.valid_until) ? "text-destructive" : ""}>
                              {formatLagos(coupon.valid_until)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No expiry</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={coupon.is_active && !isExpired(coupon.valid_until) ? "default" : "secondary"}
                            className={coupon.is_active && !isExpired(coupon.valid_until) 
                              ? "bg-stat-green/10 text-stat-green border-stat-green/20" 
                              : ""}
                          >
                            {isExpired(coupon.valid_until) ? "Expired" : coupon.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleActive(coupon.id, coupon.is_active)}
                              className="h-8 w-8"
                            >
                              {coupon.is_active ? (
                                <XCircle className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-stat-green" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(coupon)}
                              className="h-8 w-8"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(coupon.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>100% Coupon Activation Audit</CardTitle>
            <CardDescription>Monthly free-plan activations by user, plan, and timestamp</CardDescription>
          </CardHeader>
          <CardContent>
            {freeActivationLogs.length === 0 ? (
              <div className="text-center py-10">
                <Percent className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No free coupon activations recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activation Month</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Coupon</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {freeActivationLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">
                            {log.activation_month ? formatLagos(log.activation_month) : "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-48">
                            <p className="font-medium text-sm">{log.user_name || "Unnamed user"}</p>
                            <p className="text-xs text-muted-foreground">{log.user_email || log.user_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium capitalize">
                              {log.tier && log.tier !== "—" ? planName(`${log.coupon_user_type === "industry" ? "industry" : "researcher"}_${log.tier}`) : "—"}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">{log.tier}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded font-mono text-sm">{log.coupon_code || "—"}</code>
                        </TableCell>
                        <TableCell className="text-sm">{formatLagos(log.used_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
