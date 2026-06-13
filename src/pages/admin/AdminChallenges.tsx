import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Search, Filter, Info, Plus, CheckCircle, Clock, Edit, Trash2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatLagos } from "@/lib/dateUtils";

interface Challenge {
  id: string;
  title: string;
  description: string;
  reward_amount: number | null;
  reward_currency: string | null;
  deadline: string | null;
  is_active: boolean;
  industry_id: string;
  created_at: string;
}

export default function AdminChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reward_amount: "",
    reward_currency: "NGN",
    deadline: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChallenge = async () => {
    if (!formData.title || !formData.description) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('challenges').insert({
        title: formData.title,
        description: formData.description,
        reward_amount: formData.reward_amount ? parseFloat(formData.reward_amount) : null,
        reward_currency: formData.reward_currency,
        deadline: formData.deadline || null,
        industry_id: user.id,
        is_active: true,
      });

      if (error) throw error;

      toast({ title: "Challenge created successfully" });
      setDialogOpen(false);
      resetForm();
      fetchChallenges();
    } catch (error: any) {
      toast({ title: "Error creating challenge", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateChallenge = async () => {
    if (!editingChallenge || !formData.title || !formData.description) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from('challenges')
        .update({
          title: formData.title,
          description: formData.description,
          reward_amount: formData.reward_amount ? parseFloat(formData.reward_amount) : null,
          reward_currency: formData.reward_currency,
          deadline: formData.deadline || null,
        })
        .eq('id', editingChallenge.id);

      if (error) throw error;

      toast({ title: "Challenge updated successfully" });
      setEditDialogOpen(false);
      setEditingChallenge(null);
      resetForm();
      fetchChallenges();
    } catch (error: any) {
      toast({ title: "Error updating challenge", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this challenge?")) return;

    try {
      const { error } = await supabase.from('challenges').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Challenge deleted" });
      fetchChallenges();
    } catch (error: any) {
      toast({ title: "Error deleting challenge", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (challenge: Challenge) => {
    try {
      const { error } = await supabase
        .from('challenges')
        .update({ is_active: !challenge.is_active })
        .eq('id', challenge.id);

      if (error) throw error;
      toast({ title: challenge.is_active ? "Challenge deactivated" : "Challenge activated" });
      fetchChallenges();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      reward_amount: "",
      reward_currency: "NGN",
      deadline: "",
    });
  };

  const openEditDialog = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      description: challenge.description,
      reward_amount: challenge.reward_amount?.toString() || "",
      reward_currency: challenge.reward_currency || "NGN",
      deadline: challenge.deadline?.split('T')[0] || "",
    });
    setEditDialogOpen(true);
  };

  const filteredChallenges = challenges.filter(challenge =>
    challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    challenge.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const challengeStats = [
    { label: "Total Challenges", value: challenges.length.toString(), icon: Trophy },
    { label: "Active", value: challenges.filter(c => c.is_active).length.toString(), icon: CheckCircle },
    { label: "Inactive", value: challenges.filter(c => !c.is_active).length.toString(), icon: Clock },
  ];

  const ChallengeForm = ({ onSubmit, buttonText }: { onSubmit: () => void; buttonText: string }) => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="title">Challenge Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Enter challenge title"
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the challenge..."
          className="rounded-xl min-h-[100px]"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="reward_amount">Reward Amount</Label>
          <Input
            id="reward_amount"
            type="number"
            value={formData.reward_amount}
            onChange={(e) => setFormData(prev => ({ ...prev, reward_amount: e.target.value }))}
            placeholder="50000"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reward_currency">Currency</Label>
          <select
            id="reward_currency"
            value={formData.reward_currency}
            onChange={(e) => setFormData(prev => ({ ...prev, reward_currency: e.target.value }))}
            className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm"
          >
            <option value="NGN">NGN</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="deadline">Deadline</Label>
        <Input
          id="deadline"
          type="date"
          value={formData.deadline}
          onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
          className="rounded-xl"
        />
      </div>
      <Button onClick={onSubmit} className="w-full rounded-xl">
        {buttonText}
      </Button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Challenge Management</h1>
            <p className="text-muted-foreground">Manage industry challenges</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-red-500 hover:bg-red-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Challenge
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Challenge</DialogTitle>
              </DialogHeader>
              <ChallengeForm onSubmit={handleAddChallenge} buttonText="Create Challenge" />
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { setEditingChallenge(null); resetForm(); } }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Challenge</DialogTitle>
            </DialogHeader>
            <ChallengeForm onSubmit={handleUpdateChallenge} buttonText="Update Challenge" />
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {challengeStats.map((stat) => (
            <Card key={stat.label} className="shadow-card rounded-2xl border-border/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shadow-md">
                    <stat.icon className="w-5 h-5 text-amber-500" />
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
              placeholder="Search challenges by title or description..."
              className="rounded-xl pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Challenge Moderation</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Review and approve industry challenges</li>
                  <li>• Monitor challenge submissions and progress</li>
                  <li>• Handle disputes between parties</li>
                  <li>• Manage reward distributions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Challenges Table */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle>All Challenges ({filteredChallenges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredChallenges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-4">
                  <Trophy className="w-10 h-10 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Challenges</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Create your first challenge to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredChallenges.map((challenge) => (
                  <div key={challenge.id} className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-foreground">{challenge.title}</h4>
                          <Badge className={challenge.is_active ? "bg-emerald-600 text-white" : "bg-gray-500 text-white"}>
                            {challenge.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{challenge.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          {challenge.reward_amount && (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <DollarSign className="w-4 h-4" />
                              {challenge.reward_currency === 'NGN' ? '₦' : '$'}{challenge.reward_amount.toLocaleString()}
                            </span>
                          )}
                          {challenge.deadline && (
                            <span className="text-muted-foreground">
                              Deadline: {formatLagos(challenge.deadline)}
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            Created: {formatLagos(challenge.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(challenge)}
                          className="rounded-xl"
                        >
                          {challenge.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(challenge)}
                          className="rounded-xl"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(challenge.id)}
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
    </AdminLayout>
  );
}
