import { useState, useEffect } from "react";
import IndustryLayout from "@/components/layout/IndustryLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { InfoCard } from "@/components/ui/info-card";
import {
  Trophy,
  Plus,
  Calendar,
  Banknote,
  Edit,
  Trash2,
  Search,
  Users,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Mail,
  FileText,
  Crown,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Lightbulb,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatLagos } from "@/lib/dateUtils";

interface ChallengeMatch {
  id: string;
  relevance_score: number;
  match_reason: string;
  is_contacted: boolean;
  paper: {
    id: string;
    title: string;
    abstract: string;
  } | null;
  researcher: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    email?: string;
  } | null;
}

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
  submissions_count?: number;
  matches?: ChallengeMatch[];
  matchesLoading?: boolean;
  matchesCount?: number;
}

interface SubscriptionLimits {
  tier: string;
  maxChallenges: number;
  aiMatchesPerChallenge: number;
  currentChallenges: number;
}

interface ChallengeFormData {
  title: string;
  description: string;
  reward_amount: string;
  reward_currency: string;
  deadline: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  reward_amount?: string;
  deadline?: string;
}

interface ChallengeFormProps {
  formData: ChallengeFormData;
  setFormData: React.Dispatch<React.SetStateAction<ChallengeFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  buttonText: string;
  errors: FormErrors;
}

interface InviteModalData {
  isOpen: boolean;
  researcher: ChallengeMatch["researcher"] | null;
  challenge: Challenge | null;
}

function ChallengeForm({ formData, setFormData, onSubmit, onCancel, buttonText, errors }: ChallengeFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Challenge Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Enter challenge title"
          className="rounded-xl mt-1"
          autoComplete="off"
        />
        {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
      </div>
      <div>
        <Label htmlFor="description">Description * (minimum 50 characters)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the problem you want solved..."
          className="rounded-xl mt-1 min-h-[100px]"
        />
        <div className="flex justify-between mt-1">
          {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          <p className={`text-sm ml-auto ${formData.description.length < 50 ? "text-muted-foreground" : "text-emerald-600"}`}>
            {formData.description.length}/50
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="reward">Reward Amount</Label>
          <div className="relative mt-1">
            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="reward"
              type="number"
              value={formData.reward_amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, reward_amount: e.target.value }))}
              placeholder="1000"
              className="rounded-xl pl-9"
              autoComplete="off"
              min="0"
            />
          </div>
          {errors.reward_amount && <p className="text-sm text-destructive mt-1">{errors.reward_amount}</p>}
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            value={formData.reward_currency}
            onChange={(e) => setFormData((prev) => ({ ...prev, reward_currency: e.target.value }))}
            className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm mt-1"
          >
            <option value="NGN">NGN</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="deadline">Deadline</Label>
        <div className="relative mt-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="deadline"
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
            className="rounded-xl pl-9"
            min={new Date().toISOString().split("T")[0]}
          />
        </div>
        {errors.deadline && <p className="text-sm text-destructive mt-1">{errors.deadline}</p>}
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
          Cancel
        </Button>
        <Button type="submit" className="rounded-xl gradient-hero">
          {buttonText}
        </Button>
      </div>
    </form>
  );
}

export default function IndustryChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedChallenges, setExpandedChallenges] = useState<Set<string>>(new Set());
  const [subscriptionLimits, setSubscriptionLimits] = useState<SubscriptionLimits | null>(null);
  const [formData, setFormData] = useState<ChallengeFormData>({
    title: "",
    description: "",
    reward_amount: "",
    reward_currency: "NGN",
    deadline: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [inviteModal, setInviteModal] = useState<InviteModalData>({ isOpen: false, researcher: null, challenge: null });
  const [inviteMessage, setInviteMessage] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchChallenges();
    fetchSubscriptionLimits();
  }, []);

  const fetchSubscriptionLimits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("tier, max_challenges_per_month, ai_matches_per_challenge")
        .eq("user_id", user.id)
        .single();

      const tierLimits: Record<string, { challenges: number; matches: number }> = {
        free: { challenges: 1, matches: 3 },
        basic: { challenges: 5, matches: 10 },
        pro: { challenges: 20, matches: 25 },
        enterprise: { challenges: 999, matches: 100 },
      };

      const tier = subscription?.tier || "free";
      const limits = tierLimits[tier] || tierLimits.free;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("challenges")
        .select("*", { count: "exact", head: true })
        .eq("industry_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      setSubscriptionLimits({
        tier,
        maxChallenges: subscription?.max_challenges_per_month || limits.challenges,
        aiMatchesPerChallenge: subscription?.ai_matches_per_challenge || limits.matches,
        currentChallenges: count || 0,
      });
    } catch (error) {
      console.error("Error fetching subscription limits:", error);
    }
  };

  const fetchChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("industry_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const challengesWithCounts = await Promise.all(
        (data || []).map(async (challenge) => {
          const [submissionsResult, matchesResult] = await Promise.all([
            supabase.from("challenge_submissions").select("*", { count: "exact", head: true }).eq("challenge_id", challenge.id),
            supabase.from("challenge_matches").select("*", { count: "exact", head: true }).eq("challenge_id", challenge.id),
          ]);
          return {
            ...challenge,
            submissions_count: submissionsResult.count || 0,
            matchesCount: matchesResult.count || 0,
          };
        }),
      );

      setChallenges(challengesWithCounts);
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.title.trim()) errors.title = "Title is required";
    else if (formData.title.trim().length < 5) errors.title = "Title must be at least 5 characters";
    if (!formData.description.trim()) errors.description = "Description is required";
    else if (formData.description.trim().length < 50) errors.description = "Description must be at least 50 characters";
    if (formData.reward_amount && parseFloat(formData.reward_amount) < 0) errors.reward_amount = "Reward amount cannot be negative";
    if (formData.deadline) {
      const deadlineDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate < today) errors.deadline = "Deadline cannot be in the past";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canCreateChallenge = () => {
    if (!subscriptionLimits) return true;
    return subscriptionLimits.currentChallenges < subscriptionLimits.maxChallenges;
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateChallenge()) {
      toast({ title: "Challenge limit reached", description: "Upgrade your subscription to post more challenges.", variant: "destructive" });
      return;
    }
    if (!validateForm()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("challenges").insert({
        title: formData.title.trim(),
        description: formData.description.trim(),
        reward_amount: formData.reward_amount ? parseFloat(formData.reward_amount) : null,
        reward_currency: formData.reward_currency,
        deadline: formData.deadline || null,
        industry_id: user.id,
        is_active: true,
      });

      if (error) throw error;
      toast({ title: "Challenge created successfully!" });
      setIsDialogOpen(false);
      resetForm();
      fetchChallenges();
      fetchSubscriptionLimits();
    } catch (error: any) {
      toast({ title: "Error creating challenge", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallenge || !validateForm()) return;

    try {
      const { error } = await supabase
        .from("challenges")
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          reward_amount: formData.reward_amount ? parseFloat(formData.reward_amount) : null,
          reward_currency: formData.reward_currency,
          deadline: formData.deadline || null,
        })
        .eq("id", editingChallenge.id);

      if (error) throw error;
      toast({ title: "Challenge updated successfully!" });
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
      const { error } = await supabase.from("challenges").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Challenge deleted" });
      fetchChallenges();
      fetchSubscriptionLimits();
    } catch (error: any) {
      toast({ title: "Error deleting challenge", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (challenge: Challenge) => {
    try {
      const { error } = await supabase.from("challenges").update({ is_active: !challenge.is_active }).eq("id", challenge.id);
      if (error) throw error;
      toast({ title: challenge.is_active ? "Challenge deactivated" : "Challenge activated" });
      fetchChallenges();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAIMatch = async (challengeId: string) => {
    const challenge = challenges.find((c) => c.id === challengeId);
    if (subscriptionLimits && challenge?.matchesCount && challenge.matchesCount >= subscriptionLimits.aiMatchesPerChallenge) {
      toast({ title: "Match limit reached", description: `Upgrade to get more matches.`, variant: "destructive" });
      return;
    }

    setChallenges((prev) => prev.map((c) => (c.id === challengeId ? { ...c, matchesLoading: true } : c)));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("ai-match-challenge", {
        body: { challengeId },
      });

      if (error) {
        const status = (error as any).status;
        if (status === 429) {
          toast({ title: "Match limit reached", description: (error as any).error || "Upgrade your subscription for more matches.", variant: "destructive" });
        }
        setChallenges((prev) => prev.map((c) => (c.id === challengeId ? { ...c, matchesLoading: false } : c)));
        return;
      }

      setChallenges((prev) =>
        prev.map((c) => (c.id === challengeId ? { ...c, matches: data.matches, matchesLoading: false, matchesCount: data.total_matches } : c)),
      );
      setExpandedChallenges((prev) => new Set([...prev, challengeId]));
      toast({ title: "AI Matching Complete", description: `Found ${data.new_matches} new researcher matches!` });
    } catch (error: any) {
      console.error("AI Match error:", error);
      setChallenges((prev) => prev.map((c) => (c.id === challengeId ? { ...c, matchesLoading: false } : c)));
      toast({ title: "Error finding matches", description: error.message, variant: "destructive" });
    }
  };

  const toggleExpanded = (challengeId: string) => {
    setExpandedChallenges((prev) => {
      const next = new Set(prev);
      if (next.has(challengeId)) next.delete(challengeId);
      else next.add(challengeId);
      return next;
    });
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", reward_amount: "", reward_currency: "NGN", deadline: "" });
    setFormErrors({});
  };

  const openEditDialog = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      description: challenge.description,
      reward_amount: challenge.reward_amount?.toString() || "",
      reward_currency: challenge.reward_currency || "NGN",
      deadline: challenge.deadline?.split("T")[0] || "",
    });
    setEditDialogOpen(true);
  };

  const filteredChallenges = challenges.filter(
    (challenge) =>
      challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      challenge.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditDialogOpen(false);
    resetForm();
  };

  const openInviteModal = (researcher: ChallengeMatch["researcher"], challenge: Challenge) => {
    setInviteModal({ isOpen: true, researcher, challenge });
    setInviteMessage("");
  };

  const handleSendInvite = async () => {
    if (!inviteModal.researcher || !inviteModal.challenge || !inviteMessage.trim() || !companyName.trim()) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setSendingInvite(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get researcher email
      const { data: researcherProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", inviteModal.researcher.user_id)
        .single();

      // Create invite record
      const { error: inviteError } = await supabase.from("researcher_invites").insert({
        industry_id: user.id,
        researcher_id: inviteModal.researcher.user_id,
        challenge_id: inviteModal.challenge.id,
        company_name: companyName.trim(),
        message: inviteMessage.trim(),
        status: "pending",
      });
      if (inviteError) throw inviteError;

      // Send email via edge function
      if (researcherProfile?.email) {
        await supabase.functions.invoke("send-researcher-invite", {
          body: {
            researcherEmail: researcherProfile.email,
            researcherName: inviteModal.researcher.full_name,
            companyName: companyName.trim(),
            challengeTitle: inviteModal.challenge.title,
            message: inviteMessage.trim(),
          },
        });
      }

      toast({ title: "Invite sent successfully!", description: "The researcher will receive an email notification." });
      setInviteModal({ isOpen: false, researcher: null, challenge: null });
      setInviteMessage("");
    } catch (error: any) {
      toast({ title: "Error sending invite", description: error.message, variant: "destructive" });
    } finally {
      setSendingInvite(false);
    }
  };

  const tierLabels: Record<string, string> = { free: "Free", basic: "Basic", pro: "Pro", enterprise: "Enterprise" };
  const challengeUsagePercent = subscriptionLimits ? Math.min(100, (subscriptionLimits.currentChallenges / subscriptionLimits.maxChallenges) * 100) : 0;
  const isAtLimit = subscriptionLimits && subscriptionLimits.currentChallenges >= subscriptionLimits.maxChallenges;

  return (
    <IndustryLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">My Challenges</h1>
            <p className="text-sm text-muted-foreground">Manage your research challenges</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-lg gradient-hero" disabled={isAtLimit}>
                <Plus className="w-4 h-4 mr-1" />
                Post Challenge
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Challenge</DialogTitle>
                <DialogDescription>Fill in the details to post a new research challenge.</DialogDescription>
              </DialogHeader>
              <ChallengeForm formData={formData} setFormData={setFormData} onSubmit={handleCreateChallenge} onCancel={handleCancel} buttonText="Create Challenge" errors={formErrors} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { setEditingChallenge(null); resetForm(); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Challenge</DialogTitle>
              <DialogDescription>Update the challenge details below.</DialogDescription>
            </DialogHeader>
            <ChallengeForm formData={formData} setFormData={setFormData} onSubmit={handleUpdateChallenge} onCancel={handleCancel} buttonText="Update Challenge" errors={formErrors} />
          </DialogContent>
        </Dialog>

        {/* Subscription Limits Card */}
        {subscriptionLimits && (
          <Card className={`border-none shadow-sm ${isAtLimit ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30" : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30"}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isAtLimit ? "bg-amber-500" : "bg-blue-500"}`}>
                  {isAtLimit ? <AlertCircle className="w-4 h-4 text-white" /> : <Crown className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{tierLabels[subscriptionLimits.tier]}</span>
                    <Badge variant="secondary" className="text-xs">{subscriptionLimits.currentChallenges}/{subscriptionLimits.maxChallenges}</Badge>
                  </div>
                  <Progress value={challengeUsagePercent} className={`h-1.5 mt-1 ${isAtLimit ? "[&>div]:bg-amber-500" : ""}`} />
                </div>
                {isAtLimit && (
                  <Button size="sm" onClick={() => navigate("/industry/subscriptions")} className="rounded-lg text-xs bg-gradient-to-r from-amber-500 to-orange-500">
                    Upgrade
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        {challenges.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search challenges..." className="rounded-lg pl-9 h-9 text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        )}

        {/* Challenges List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredChallenges.length === 0 ? (
          <Card className="shadow-sm rounded-xl">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-3">
                  <Trophy className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{challenges.length === 0 ? "No Challenges Yet" : "No matching challenges"}</h3>
                <p className="text-sm text-muted-foreground mb-3 max-w-sm">{challenges.length === 0 ? "Post your first challenge to connect with researchers." : "Try adjusting your search."}</p>
                {challenges.length === 0 && !isAtLimit && (
                  <Button size="sm" onClick={() => setIsDialogOpen(true)} className="rounded-lg gradient-hero">
                    <Plus className="w-4 h-4 mr-1" />
                    Create Challenge
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredChallenges.map((challenge) => {
              const matchLimitReached = subscriptionLimits && (challenge.matchesCount || 0) >= subscriptionLimits.aiMatchesPerChallenge;

              return (
                <Card key={challenge.id} className="shadow-sm rounded-xl overflow-hidden">
                  <CardContent className="p-3 md:p-4">
                    {/* Title Row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-foreground text-sm md:text-base line-clamp-1">{challenge.title}</h4>
                      <Badge className={`flex-shrink-0 text-xs ${challenge.is_active ? "bg-emerald-600 text-white" : "bg-gray-500 text-white"}`}>
                        {challenge.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">{challenge.description}</p>

                    {/* Stats Row */}
                    <div className="flex items-center gap-3 text-xs flex-wrap mb-3">
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <Users className="w-3.5 h-3.5" />
                        {challenge.submissions_count || 0}
                      </span>
                      {(challenge.matchesCount || 0) > 0 && (
                        <span className="flex items-center gap-1 text-violet-600 font-medium">
                          <Sparkles className="w-3.5 h-3.5" />
                          {challenge.matchesCount}
                        </span>
                      )}
                      {challenge.reward_amount && (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <Banknote className="w-3.5 h-3.5" />
                          {challenge.reward_currency === "NGN" ? "₦" : "$"}{challenge.reward_amount.toLocaleString()}
                        </span>
                      )}
                      {challenge.deadline && (
                        <span className="text-muted-foreground">{formatLagos(challenge.deadline)}</span>
                      )}
                    </div>

                    {/* Action Buttons - Mobile Optimized */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => (matchLimitReached ? navigate("/industry/subscriptions") : handleAIMatch(challenge.id))}
                        disabled={challenge.matchesLoading}
                        className={`rounded-lg text-xs h-8 ${matchLimitReached ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-violet-600 to-purple-600"} text-white`}
                      >
                        {challenge.matchesLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : matchLimitReached ? <Crown className="w-3.5 h-3.5 mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                        {matchLimitReached ? "Upgrade" : "Find"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggleActive(challenge)} className="rounded-lg text-xs h-8">
                        {challenge.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(challenge)} className="rounded-lg text-xs h-8">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(challenge.id)} className="rounded-lg text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Matches Section */}
                    {challenge.matches && challenge.matches.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <button onClick={() => toggleExpanded(challenge.id)} className="flex items-center gap-2 text-xs font-medium text-primary hover:underline">
                          <Sparkles className="w-3.5 h-3.5" />
                          {challenge.matches.length} Matched Researcher{challenge.matches.length !== 1 ? "s" : ""}
                          {expandedChallenges.has(challenge.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {expandedChallenges.has(challenge.id) && (
                          <div className="mt-2 space-y-2">
                            {challenge.matches.map((match) => (
                              <div key={match.id} className="flex flex-col md:flex-row md:items-start gap-2 p-2 bg-muted/50 rounded-lg">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarImage src={match.researcher?.avatar_url || undefined} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{match.researcher?.full_name?.charAt(0) || "?"}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="font-medium text-foreground text-xs">{match.researcher?.full_name || "Unknown"}</span>
                                      <Badge variant="secondary" className={`text-[10px] ${match.relevance_score >= 80 ? "bg-emerald-100 text-emerald-700" : match.relevance_score >= 60 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}>
                                        {match.relevance_score}%
                                      </Badge>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground line-clamp-1">{match.paper?.title}</p>
                                  </div>
                                </div>
                                <div className="flex gap-1.5 flex-shrink-0">
                                  <Button variant="outline" size="sm" className="rounded-lg text-[10px] h-7 px-2" onClick={() => navigate(`/research/${match.paper?.id}`)}>
                                    <FileText className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" className="rounded-lg text-[10px] h-7 px-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white" onClick={() => openInviteModal(match.researcher, challenge)}>
                                    <Send className="w-3 h-3 mr-1" />
                                    Invite
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Invite Modal */}
        <Dialog open={inviteModal.isOpen} onOpenChange={(open) => { if (!open) setInviteModal({ isOpen: false, researcher: null, challenge: null }); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Invite Researcher
              </DialogTitle>
              <DialogDescription>
                Send a collaboration invitation to {inviteModal.researcher?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Challenge</Label>
                <Input value={inviteModal.challenge?.title || ""} disabled className="rounded-lg mt-1 bg-muted/50" />
              </div>
              <div>
                <Label className="text-sm">Your Company Name *</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                  className="rounded-lg mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Message *</Label>
                <Textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Write a personalized message to the researcher..."
                  className="rounded-lg mt-1 min-h-[100px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setInviteModal({ isOpen: false, researcher: null, challenge: null })} className="rounded-lg">
                  Cancel
                </Button>
                <Button onClick={handleSendInvite} disabled={sendingInvite || !inviteMessage.trim() || !companyName.trim()} className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                  Send Invite
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </IndustryLayout>
  );
}
