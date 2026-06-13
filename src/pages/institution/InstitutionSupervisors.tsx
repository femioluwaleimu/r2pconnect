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
  GraduationCap,
  Loader2,
  Users,
  Send,
  Copy,
  Check
} from "lucide-react";

interface Supervisor {
  id: string;
  user_id: string;
  department: string | null;
  current_students: number;
  max_students: number;
  is_active: boolean;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface SupervisorInvite {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  invite_code: string;
  status: string;
  created_at: string;
}

export default function InstitutionSupervisors() {
  const [user, setUser] = useState<User | null>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [institutionName, setInstitutionName] = useState<string>("");
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [invites, setInvites] = useState<SupervisorInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingSupervisor, setAddingSupervisor] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newSupervisor, setNewSupervisor] = useState({ email: "", fullName: "", department: "" });
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
      fetchSupervisors(institution.id);
      fetchInvites(institution.id);
    } else {
      setLoading(false);
    }
  };

  const fetchSupervisors = async (instId: string) => {
    setLoading(true);
    
    // First try to get from supervisors table
    const { data: supervisorData } = await supabase
      .from('supervisors')
      .select(`
        id,
        user_id,
        department,
        current_students,
        max_students,
        is_active
      `)
      .eq('institution_id', instId)
      .eq('is_active', true);

    // Also get accepted invites (for supervisors who registered but may not have supervisor record)
    const { data: acceptedInvites } = await supabase
      .from('supervisor_invites')
      .select('*')
      .eq('institution_id', instId)
      .eq('status', 'accepted');

    const allSupervisors: Supervisor[] = [];
    const allUserIds: string[] = [];

    // Add supervisors from supervisors table
    if (supervisorData && supervisorData.length > 0) {
      const userIds = supervisorData.map(s => s.user_id);
      allUserIds.push(...userIds);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      supervisorData.forEach(s => {
        allSupervisors.push({
          ...s,
          profile: profileMap.get(s.user_id) || null
        });
      });
    }

    // Add accepted invites that don't have a supervisor record yet
    if (acceptedInvites && acceptedInvites.length > 0) {
      const existingUserIds = new Set(allSupervisors.map(s => s.user_id));
      
      // Get profiles for accepted invites by email
      const { data: inviteProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('email', acceptedInvites.map(i => i.email));

      const emailToProfile = new Map(inviteProfiles?.map(p => [p.email, p]) || []);

      acceptedInvites.forEach(invite => {
        const profile = emailToProfile.get(invite.email);
        if (profile && !existingUserIds.has(profile.user_id)) {
          allUserIds.push(profile.user_id);
          allSupervisors.push({
            id: invite.id,
            user_id: profile.user_id,
            department: invite.department,
            current_students: 0,
            max_students: 10,
            is_active: true,
            profile: {
              full_name: profile.full_name,
              email: profile.email,
              avatar_url: profile.avatar_url
            }
          });
        }
      });
    }

    // Count actual students from research_papers for each supervisor
    if (allUserIds.length > 0) {
      const { data: papers } = await supabase
        .from('research_papers')
        .select('supervisor_id, author_id')
        .in('supervisor_id', allUserIds)
        .eq('research_type', 'student');

      if (papers) {
        // Count unique students per supervisor
        const studentCountMap = new Map<string, Set<string>>();
        papers.forEach(p => {
          if (p.supervisor_id) {
            if (!studentCountMap.has(p.supervisor_id)) {
              studentCountMap.set(p.supervisor_id, new Set());
            }
            studentCountMap.get(p.supervisor_id)!.add(p.author_id);
          }
        });

        // Update current_students with actual counts
        allSupervisors.forEach(s => {
          const studentSet = studentCountMap.get(s.user_id);
          s.current_students = studentSet ? studentSet.size : 0;
        });
      }
    }

    setSupervisors(allSupervisors);
    setLoading(false);
  };

  const fetchInvites = async (instId: string) => {
    // Fetch pending invites (excluding accepted ones which are now active supervisors)
    const { data } = await supabase
      .from('supervisor_invites')
      .select('*')
      .eq('institution_id', instId)
      .in('status', ['pending'])
      .order('created_at', { ascending: false });

    if (data) setInvites(data);
  };

  const handleAddSupervisor = async () => {
    if (!newSupervisor.email || !newSupervisor.fullName) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    if (!institutionId || !institutionName) {
      toast({ title: "Institution not found", variant: "destructive" });
      return;
    }

    setAddingSupervisor(true);
    try {
      // Generate a unique invite code
      const inviteCode = `SUP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create the invite record
      const { error: inviteError } = await supabase
        .from('supervisor_invites')
        .insert({
          institution_id: institutionId,
          full_name: newSupervisor.fullName,
          email: newSupervisor.email,
          department: newSupervisor.department || null,
          invite_code: inviteCode,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (inviteError) throw inviteError;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'supervisor_invite',
          to: newSupervisor.email,
          data: {
            supervisorName: newSupervisor.fullName,
            institutionName: institutionName,
            inviteCode: inviteCode,
            inviteLink: `${window.location.origin}/supervisor-invite?code=${inviteCode}`
          }
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
        // Still show success since the invite was created
      }
      
      toast({ 
        title: "Invitation Sent!", 
        description: `An invitation email has been sent to ${newSupervisor.email}` 
      });
      setDialogOpen(false);
      setNewSupervisor({ email: "", fullName: "", department: "" });
      fetchInvites(institutionId);
    } catch (error: any) {
      console.error('Error inviting supervisor:', error);
      toast({ 
        title: "Error sending invitation", 
        description: error.message || "Please try again", 
        variant: "destructive" 
      });
    } finally {
      setAddingSupervisor(false);
    }
  };

  const handleCopyInviteLink = (inviteCode: string) => {
    const link = `${window.location.origin}/supervisor-invite?code=${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(inviteCode);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "Link copied!", description: "Invite link copied to clipboard" });
  };

  const handleRemoveSupervisor = async (supervisorId: string) => {
    const { error } = await supabase
      .from('supervisors')
      .update({ is_active: false })
      .eq('id', supervisorId);

    if (!error) {
      toast({ title: "Supervisor deactivated", description: "Supervisor access has been revoked" });
      setSupervisors(supervisors.filter(s => s.id !== supervisorId));
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('supervisor_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId);

    if (!error) {
      toast({ title: "Invite cancelled" });
      setInvites(invites.filter(i => i.id !== inviteId));
    }
  };

  const handleResendEmail = async (invite: SupervisorInvite) => {
    try {
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'supervisor_invite',
          to: invite.email,
          data: {
            supervisorName: invite.full_name,
            institutionName: institutionName,
            inviteCode: invite.invite_code,
            department: invite.department,
            inviteLink: `${window.location.origin}/supervisor-invite?code=${invite.invite_code}`
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

  const filteredSupervisors = supervisors.filter(s =>
    s.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <InstitutionLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Supervisor Management</h1>
            <p className="text-muted-foreground">Add and manage supervisors for student research</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Supervisor
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Invite New Supervisor</DialogTitle>
                <DialogDescription>
                  Send an email invitation to a supervisor to join your institution
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter supervisor's name"
                    value={newSupervisor.fullName}
                    onChange={(e) => setNewSupervisor({ ...newSupervisor, fullName: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="supervisor@example.com"
                    value={newSupervisor.email}
                    onChange={(e) => setNewSupervisor({ ...newSupervisor, email: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g., Computer Science"
                    value={newSupervisor.department}
                    onChange={(e) => setNewSupervisor({ ...newSupervisor, department: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <Button 
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600" 
                  onClick={handleAddSupervisor}
                  disabled={addingSupervisor}
                >
                  {addingSupervisor ? (
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
        <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-bold text-white mb-2 text-lg">Supervisor Guidelines</h4>
                <ul className="text-white/90 space-y-1 text-sm">
                  <li>• Supervisors oversee and approve student research projects</li>
                  <li>• They can review, request revisions, or approve student work</li>
                  <li>• Each supervisor can manage multiple students</li>
                  <li>• Student research requires supervisor approval before publication</li>
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
                    {invite.department && (
                      <p className="text-xs text-muted-foreground">{invite.department}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendEmail(invite)}
                      className="rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
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
            placeholder="Search supervisors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Supervisors List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading supervisors...</p>
          </div>
        ) : filteredSupervisors.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-dashed border-2">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-4">
              <GraduationCap className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No supervisors yet</h3>
            <p className="text-muted-foreground mb-6">Invite supervisors to help manage student research</p>
            <Button 
              onClick={() => setDialogOpen(true)} 
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Your First Supervisor
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredSupervisors.map((supervisor) => (
              <Card key={supervisor.id} className="hover:shadow-lg transition-all duration-200 rounded-2xl border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {supervisor.profile?.full_name?.charAt(0).toUpperCase() || 'S'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">
                          {supervisor.profile?.full_name || 'Unknown'}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {supervisor.profile?.email || 'No email'}
                        </p>
                        {supervisor.department && (
                          <p className="text-xs text-muted-foreground mt-0.5">{supervisor.department}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                          {supervisor.current_students}
                        </p>
                        <p className="text-xs text-muted-foreground">Students</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => handleRemoveSupervisor(supervisor.id)}
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