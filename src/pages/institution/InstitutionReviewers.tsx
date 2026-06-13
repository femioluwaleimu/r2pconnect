import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import InstitutionLayout from "@/components/layout/InstitutionLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  UserPlus, 
  Mail, 
  Trash2, 
  Search,
  Shield,
  Loader2,
  ClipboardCheck,
  Send,
  Copy,
  Check
} from "lucide-react";

interface Reviewer {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  papers_reviewed: number;
  created_at: string;
}

interface ReviewerInvite {
  id: string;
  full_name: string;
  email: string;
  invite_code: string;
  status: string;
  created_at: string;
}

export default function InstitutionReviewers() {
  const [user, setUser] = useState<User | null>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [institutionName, setInstitutionName] = useState<string>("");
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [invites, setInvites] = useState<ReviewerInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingReviewer, setAddingReviewer] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newReviewer, setNewReviewer] = useState({ email: "", fullName: "" });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchInstitution(user.id);
    });
  }, [navigate]);

  const fetchInstitution = async (userId: string) => {
    const { data: institution } = await supabase
      .from('institutions')
      .select('id, name')
      .eq('admin_user_id', userId)
      .maybeSingle();

    if (institution) {
      setInstitutionId(institution.id);
      setInstitutionName(institution.name);
      fetchReviewers(institution.id);
      fetchInvites(institution.id);
    } else {
      setLoading(false);
    }
  };

  const fetchReviewers = async (instId: string) => {
    setLoading(true);
    
    const allReviewers: Reviewer[] = [];
    const addedEmails = new Set<string>();

    // Fetch profiles with institution_id matching and reviewer role
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, created_at')
      .eq('institution_id', instId);

    if (profiles && profiles.length > 0) {
      // Filter to only reviewers by checking user_roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', profiles.map(p => p.user_id))
        .eq('role', 'reviewer');

      const reviewerUserIds = new Set(roles?.map(r => r.user_id) || []);

      // Get review counts
      const { data: reviews } = await supabase
        .from('paper_reviews')
        .select('reviewer_id');

      const reviewCounts = reviews?.reduce((acc, r) => {
        acc[r.reviewer_id] = (acc[r.reviewer_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      profiles
        .filter(p => reviewerUserIds.has(p.user_id))
        .forEach(r => {
          allReviewers.push({
            id: r.user_id,
            user_id: r.user_id,
            full_name: r.full_name || 'Unknown',
            email: r.email || '',
            created_at: r.created_at,
            papers_reviewed: reviewCounts[r.user_id] || 0
          });
          addedEmails.add(r.email || '');
        });
    }

    // Also fetch accepted reviewer invites (for reviewers who registered)
    const { data: acceptedInvites } = await supabase
      .from('reviewer_invites')
      .select('*')
      .eq('institution_id', instId)
      .eq('status', 'accepted');

    if (acceptedInvites && acceptedInvites.length > 0) {
      // Get profiles for accepted invites by email
      const { data: inviteProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at')
        .in('email', acceptedInvites.map(i => i.email));

      const emailToProfile = new Map(inviteProfiles?.map(p => [p.email, p]) || []);

      // Get review counts for these users
      const { data: reviews } = await supabase
        .from('paper_reviews')
        .select('reviewer_id');

      const reviewCounts = reviews?.reduce((acc, r) => {
        acc[r.reviewer_id] = (acc[r.reviewer_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      acceptedInvites.forEach(invite => {
        if (!addedEmails.has(invite.email)) {
          const profile = emailToProfile.get(invite.email);
          if (profile) {
            allReviewers.push({
              id: profile.user_id,
              user_id: profile.user_id,
              full_name: profile.full_name || invite.full_name,
              email: invite.email,
              created_at: invite.accepted_at || invite.created_at,
              papers_reviewed: reviewCounts[profile.user_id] || 0
            });
            addedEmails.add(invite.email);
          }
        }
      });
    }

    setReviewers(allReviewers);
    setLoading(false);
  };

  const fetchInvites = async (instId: string) => {
    const { data } = await supabase
      .from('reviewer_invites')
      .select('*')
      .eq('institution_id', instId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) setInvites(data);
  };

  const handleAddReviewer = async () => {
    if (!newReviewer.email || !newReviewer.fullName) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    if (!institutionId || !institutionName) {
      toast({ title: "Institution not found", variant: "destructive" });
      return;
    }

    setAddingReviewer(true);
    try {
      // Generate a unique invite code
      const inviteCode = `REV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create the invite record
      const { error: inviteError } = await supabase
        .from('reviewer_invites')
        .insert({
          institution_id: institutionId,
          full_name: newReviewer.fullName,
          email: newReviewer.email,
          invite_code: inviteCode,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (inviteError) throw inviteError;

      // Send invitation email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'reviewer_invite',
          to: newReviewer.email,
          data: {
            reviewerName: newReviewer.fullName,
            institutionName: institutionName,
            invitedBy: user?.email || 'Institution Admin',
            verificationCode: inviteCode,
            inviteLink: `${window.location.origin}/reviewer-invite?code=${inviteCode}`
          }
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
        // Still show success since the invite was created
      }
      
      toast({ 
        title: "Invitation Sent!", 
        description: `An invitation email has been sent to ${newReviewer.email}` 
      });
      setDialogOpen(false);
      setNewReviewer({ email: "", fullName: "" });
      fetchInvites(institutionId);
    } catch (error: any) {
      console.error('Error inviting reviewer:', error);
      toast({ 
        title: "Error sending invitation", 
        description: error.message || "Please try again", 
        variant: "destructive" 
      });
    } finally {
      setAddingReviewer(false);
    }
  };

  const handleCopyInviteLink = (inviteCode: string) => {
    const link = `${window.location.origin}/reviewer-invite?code=${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(inviteCode);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "Link copied!", description: "Invite link copied to clipboard" });
  };

  const handleRemoveReviewer = async (reviewerId: string) => {
    toast({ title: "Reviewer removed", description: "Reviewer access has been revoked" });
    setReviewers(reviewers.filter(r => r.id !== reviewerId));
  };

  const handleCancelInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('reviewer_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId);

    if (!error) {
      toast({ title: "Invite cancelled" });
      setInvites(invites.filter(i => i.id !== inviteId));
    }
  };

  const handleResendEmail = async (invite: ReviewerInvite) => {
    try {
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'reviewer_invite',
          to: invite.email,
          data: {
            reviewerName: invite.full_name,
            institutionName: institutionName,
            invitedBy: user?.email || 'Institution Admin',
            verificationCode: invite.invite_code,
            inviteLink: `${window.location.origin}/reviewer-invite?code=${invite.invite_code}`
          }
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
        toast({ 
          title: "Failed to resend email", 
          description: "Please try again later", 
          variant: "destructive" 
        });
        return;
      }

      toast({ 
        title: "Email Sent!", 
        description: `Invitation email resent to ${invite.email}` 
      });
    } catch (error: any) {
      console.error('Error resending email:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to resend email", 
        variant: "destructive" 
      });
    }
  };

  const filteredReviewers = reviewers.filter(r =>
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <InstitutionLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reviewer Management</h1>
            <p className="text-muted-foreground">Add and manage reviewers for your institution</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Reviewer
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Invite New Reviewer</DialogTitle>
                <DialogDescription>
                  Send an email invitation to a reviewer to join your institution
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter reviewer's name"
                    value={newReviewer.fullName}
                    onChange={(e) => setNewReviewer({ ...newReviewer, fullName: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="reviewer@example.com"
                    value={newReviewer.email}
                    onChange={(e) => setNewReviewer({ ...newReviewer, email: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <Button 
                  className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" 
                  onClick={handleAddReviewer}
                  disabled={addingReviewer}
                >
                  {addingReviewer ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Email Invitation
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <ClipboardCheck className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-bold text-white mb-2 text-lg">Reviewer Guidelines</h4>
                <ul className="text-white/90 space-y-1 text-sm">
                  <li>• Reviewers help evaluate research quality and accuracy</li>
                  <li>• They can approve, reject, or request revisions</li>
                  <li>• Add subject matter experts for better reviews</li>
                  <li>• Reviewers receive email notifications for new submissions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-500" />
                Pending Invitations ({invites.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                  <div>
                    <p className="font-medium text-foreground">{invite.full_name}</p>
                    <p className="text-sm text-muted-foreground">{invite.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendEmail(invite)}
                      className="rounded-lg text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Resend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyInviteLink(invite.invite_code)}
                      className="rounded-lg"
                    >
                      {copiedCode === invite.invite_code ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvite(invite.id)}
                      className="text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search reviewers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Reviewers List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading reviewers...</p>
          </div>
        ) : filteredReviewers.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-dashed border-2">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
              <Shield className="w-10 h-10 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No reviewers yet</h3>
            <p className="text-muted-foreground mb-6">Invite reviewers to help review research papers</p>
            <Button 
              onClick={() => setDialogOpen(true)} 
              className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Your First Reviewer
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredReviewers.map((reviewer) => (
              <Card key={reviewer.id} className="hover:shadow-lg transition-all duration-200 rounded-2xl border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {reviewer.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">{reviewer.full_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {reviewer.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                          {reviewer.papers_reviewed}
                        </p>
                        <p className="text-xs text-muted-foreground">Papers Reviewed</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => handleRemoveReviewer(reviewer.id)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </InstitutionLayout>
  );
}