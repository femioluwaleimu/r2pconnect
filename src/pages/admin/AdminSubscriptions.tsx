import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreditTopupPackages from "@/components/admin/CreditTopupPackages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Crown, 
  Building2, 
  Star,
  Banknote,
  Users,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SubscriptionPlan {
  id: string;
  plan_id: string;
  name: string;
  description: string | null;
  amount_ngn: number;
  period: string;
  features: string[];
  max_challenges: number;
  ai_matches_per_challenge: number;
  ai_credits_per_day: number;
  max_research_uploads: number;
  is_popular: boolean;
  is_active: boolean;
  user_type: string;
  sort_order: number;
}

const defaultPlan: Omit<SubscriptionPlan, 'id'> = {
  plan_id: '',
  name: '',
  description: '',
  amount_ngn: 0,
  period: 'month',
  features: [],
  max_challenges: 1,
  ai_matches_per_challenge: 3,
  ai_credits_per_day: 3,
  max_research_uploads: 1,
  is_popular: false,
  is_active: true,
  user_type: 'researcher',
  sort_order: 0,
};

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<Omit<SubscriptionPlan, 'id'>>(defaultPlan);
  const [featuresText, setFeaturesText] = useState('');
  const [activeTab, setActiveTab] = useState('researcher');
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('user_type')
      .order('sort_order');

    if (error) {
      toast({ title: "Error fetching plans", description: error.message, variant: "destructive" });
    } else {
      // Cast features from Json to string[]
      const parsedPlans = (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features as string[] : []
      }));
      setPlans(parsedPlans);
    }
    setLoading(false);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      plan_id: plan.plan_id,
      name: plan.name,
      description: plan.description || '',
      amount_ngn: plan.amount_ngn,
      period: plan.period,
      features: plan.features,
      max_challenges: plan.max_challenges,
      ai_matches_per_challenge: plan.ai_matches_per_challenge,
      ai_credits_per_day: plan.ai_credits_per_day,
      max_research_uploads: plan.max_research_uploads,
      is_popular: plan.is_popular,
      is_active: plan.is_active,
      user_type: plan.user_type,
      sort_order: plan.sort_order,
    });
    setFeaturesText(plan.features.join('\n'));
    setDialogOpen(true);
  };

  const handleCreate = (userType: string) => {
    setEditingPlan(null);
    setFormData({ ...defaultPlan, user_type: userType });
    setFeaturesText('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.plan_id || !formData.name) {
      toast({ title: "Validation Error", description: "Plan ID and Name are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const features = featuresText.split('\n').filter(f => f.trim());
    const dataToSave = { ...formData, features };

    let error;
    if (editingPlan) {
      const { error: updateError } = await supabase
        .from('subscription_plans')
        .update(dataToSave)
        .eq('id', editingPlan.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('subscription_plans')
        .insert(dataToSave);
      error = insertError;
    }

    if (error) {
      toast({ title: "Error saving plan", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingPlan ? "Plan updated" : "Plan created" });
      setDialogOpen(false);
      fetchPlans();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Error deleting plan", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plan deleted" });
      fetchPlans();
    }
  };

  const toggleActive = async (plan: SubscriptionPlan) => {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ is_active: !plan.is_active })
      .eq('id', plan.id);

    if (error) {
      toast({ title: "Error updating plan", description: error.message, variant: "destructive" });
    } else {
      fetchPlans();
    }
  };

  const filteredPlans = plans.filter(p => p.user_type === activeTab);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subscription Plans</h1>
            <p className="text-muted-foreground">Manage subscription tiers for researchers and industry</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Plans</p>
                  <p className="text-2xl font-bold text-foreground">{plans.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stat-green/10 rounded-lg">
                  <Users className="w-5 h-5 text-stat-green" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Researcher Plans</p>
                  <p className="text-2xl font-bold text-foreground">{plans.filter(p => p.user_type === 'researcher').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stat-blue/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-stat-blue" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Industry Plans</p>
                  <p className="text-2xl font-bold text-foreground">{plans.filter(p => p.user_type === 'industry').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stat-purple/10 rounded-lg">
                  <Star className="w-5 h-5 text-stat-purple" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Plans</p>
                  <p className="text-2xl font-bold text-foreground">{plans.filter(p => p.is_active).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plans Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <TabsList className="rounded-xl">
              <TabsTrigger value="researcher" className="rounded-lg">
                <Users className="w-4 h-4 mr-2" />
                Researcher Plans
              </TabsTrigger>
              <TabsTrigger value="industry" className="rounded-lg">
                <Building2 className="w-4 h-4 mr-2" />
                Industry Plans
              </TabsTrigger>
              <TabsTrigger value="topup" className="rounded-lg">
                <Zap className="w-4 h-4 mr-2" />
                Credit Top-Ups
              </TabsTrigger>
            </TabsList>
            {activeTab !== 'topup' && (
              <Button onClick={() => handleCreate(activeTab)} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Add Plan
              </Button>
            )}
          </div>

          <TabsContent value="researcher">
            <PlanTable 
              plans={filteredPlans} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              onToggleActive={toggleActive}
            />
          </TabsContent>
          <TabsContent value="industry">
            <PlanTable 
              plans={filteredPlans} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              onToggleActive={toggleActive}
            />
          </TabsContent>
          <TabsContent value="topup">
            <CreditTopupPackages />
          </TabsContent>
        </Tabs>

        {/* Edit/Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plan ID (unique)</Label>
                  <Input
                    value={formData.plan_id}
                    onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                    placeholder="e.g., researcher_pro"
                    disabled={!!editingPlan}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Pro"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the plan"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Amount (₦ NGN)</Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={formData.amount_ngn}
                      onChange={(e) => setFormData({ ...formData, amount_ngn: parseFloat(e.target.value) || 0 })}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Input
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    placeholder="month, year, forever"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>AI Credits/Month (-1 = unlimited)</Label>
                  <Input
                    type="number"
                    value={formData.ai_credits_per_day}
                    onChange={(e) => setFormData({ ...formData, ai_credits_per_day: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Monthly AI credit allowance for this plan</p>
                </div>
                <div className="space-y-2">
                  <Label>Max Research Uploads (-1 = unlimited)</Label>
                  <Input
                    type="number"
                    value={formData.max_research_uploads}
                    onChange={(e) => setFormData({ ...formData, max_research_uploads: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Challenges/Month</Label>
                  <Input
                    type="number"
                    value={formData.max_challenges}
                    onChange={(e) => setFormData({ ...formData, max_challenges: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>AI Matches per Challenge</Label>
                  <Input
                    type="number"
                    value={formData.ai_matches_per_challenge}
                    onChange={(e) => setFormData({ ...formData, ai_matches_per_challenge: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features (one per line)</Label>
                <Textarea
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="Enter each feature on a new line"
                  rows={5}
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_popular}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
                  />
                  <Label>Mark as Popular</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-xl">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingPlan ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function PlanTable({ 
  plans, 
  onEdit, 
  onDelete, 
  onToggleActive 
}: { 
  plans: SubscriptionPlan[]; 
  onEdit: (plan: SubscriptionPlan) => void;
  onDelete: (id: string) => void;
  onToggleActive: (plan: SubscriptionPlan) => void;
}) {
  return (
    <Card className="rounded-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead>Price (USD)</TableHead>
            <TableHead>AI Credits</TableHead>
            <TableHead>Challenges</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <TableRow key={plan.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-medium text-foreground">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.plan_id}</p>
                  </div>
                  {plan.is_popular && (
                    <Badge variant="default" className="text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-semibold">₦{plan.amount_ngn?.toLocaleString()}</span>
                <span className="text-muted-foreground">/{plan.period}</span>
              </TableCell>
              <TableCell>
                {plan.ai_credits_per_day === -1 ? 'Unlimited' : `${plan.ai_credits_per_day}/month`}
              </TableCell>
              <TableCell>
                {plan.max_challenges === 999 ? 'Unlimited' : `${plan.max_challenges}/month`}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={plan.is_active ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => onToggleActive(plan)}
                >
                  {plan.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(plan)} className="rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(plan.id)} className="rounded-lg text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {plans.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No plans found. Click "Add Plan" to create one.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}