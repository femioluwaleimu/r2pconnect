import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Loader2, ArrowRight, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Supervisor {
  user_id: string;
  full_name: string;
  department: string | null;
  isExternal?: boolean;
}

interface SwitchToHumanSupervisorProps {
  researchId: string;
  onSwitched?: () => void;
}

export default function SwitchToHumanSupervisor({
  researchId,
  onSwitched,
}: SwitchToHumanSupervisorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [invitedSupervisors, setInvitedSupervisors] = useState<Supervisor[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchSupervisors();
      fetchInvitedSupervisors();
    }
  }, [open]);

  const fetchSupervisors = async () => {
    setLoadingSupervisors(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's institution
      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.institution_id) {
        toast({
          title: "No Institution",
          description: "Your institution has not been set up yet.",
          variant: "destructive",
        });
        return;
      }

      // Fetch supervisors from the institution
      const { data: supervisorData, error } = await supabase
        .from('supervisors')
        .select('user_id, department')
        .eq('institution_id', profile.institution_id)
        .eq('is_active', true);

      if (error) throw error;

      if (supervisorData && supervisorData.length > 0) {
        const userIds = supervisorData.map(s => s.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const supervisorList: Supervisor[] = supervisorData.map(s => ({
          user_id: s.user_id,
          department: s.department,
          full_name: profiles?.find(p => p.user_id === s.user_id)?.full_name || 'Unknown',
        }));

        setSupervisors(supervisorList);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
      toast({
        title: "Error",
        description: "Failed to load supervisors",
        variant: "destructive",
      });
    } finally {
      setLoadingSupervisors(false);
    }
  };

  const fetchInvitedSupervisors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: invites } = await supabase
        .from('external_supervisor_invites')
        .select('email, full_name, department')
        .eq('student_id', user.id)
        .eq('status', 'accepted');

      if (!invites || invites.length === 0) return;

      const emails = invites.map(i => i.email);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, department')
        .in('email', emails);

      if (profiles && profiles.length > 0) {
        const list: Supervisor[] = profiles.map(p => ({
          user_id: p.user_id,
          full_name: p.full_name || 'Unknown',
          department: p.department || invites.find(i => i.email === p.email)?.department || null,
          isExternal: true,
        }));
        setInvitedSupervisors(list);
      }
    } catch (error) {
      console.error('Error fetching invited supervisors:', error);
    }
  };

  const handleSwitch = async () => {
    if (!selectedSupervisorId) {
      toast({
        title: "Select Supervisor",
        description: "Please select a supervisor to continue",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update research paper
      const { error: updateError } = await supabase
        .from('research_papers')
        .update({
          supervision_type: 'institution',
          supervisor_id: selectedSupervisorId,
          supervisor_approval_status: 'pending',
        })
        .eq('id', researchId)
        .eq('author_id', user.id);

      if (updateError) throw updateError;

      // Get research details and supervisor info for notification
      const [researchResult, supervisorResult, studentResult] = await Promise.all([
        supabase.from('research_papers').select('title').eq('id', researchId).single(),
        supabase.from('profiles').select('full_name, email').eq('user_id', selectedSupervisorId).maybeSingle(),
        supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle(),
      ]);

      const research = researchResult.data;
      const supervisor = supervisorResult.data;
      const student = studentResult.data;

      // Create notification for supervisor
      if (supervisor) {
        await supabase.rpc('create_notification', {
          _user_id: selectedSupervisorId,
          _title: 'New Research Assignment',
          _message: `${student?.full_name || 'A student'} has assigned you as supervisor for "${research?.title || 'their research'}".`,
          _type: 'info',
          _link: '/supervisor/pending',
        });

        // Send email notification
        if (supervisor.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'new_student_submission',
              to: supervisor.email,
              data: {
                supervisorName: supervisor.full_name,
                studentName: student?.full_name || 'A student',
                title: research?.title || 'Research Paper',
              },
            },
          });
        }
      }

      toast({
        title: "Switched to Human Supervisor",
        description: "Your research is now pending supervisor approval.",
      });

      setOpen(false);
      onSwitched?.();
    } catch (error: any) {
      console.error('Switch error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to switch supervisor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl border-primary/30 text-primary hover:bg-primary/5">
          <Users className="w-4 h-4 mr-1.5" />
          Switch to Supervisor
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Switch to Human Supervisor
          </DialogTitle>
          <DialogDescription>
            Assign a supervisor from your institution to review and guide your research.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-primary/20 bg-primary/5">
            <Info className="w-4 h-4" />
            <AlertDescription className="text-sm">
              Once you switch to a human supervisor, they will be notified and your research 
              will require their approval before publication.
            </AlertDescription>
          </Alert>

          {loadingSupervisors ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : supervisors.length === 0 && invitedSupervisors.length === 0 ? (
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
                No supervisors available at your institution yet. Please contact your 
                institution administrator to add supervisors, or invite an external supervisor.
              </AlertDescription>
            </Alert>
          ) : (
            <div>
              <Label className="text-sm font-medium">
                Select Supervisor <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedSupervisorId}
                onValueChange={setSelectedSupervisorId}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Choose a supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Institution Supervisors</SelectLabel>
                      {supervisors.map(sup => (
                        <SelectItem key={sup.user_id} value={sup.user_id}>
                          {sup.full_name} {sup.department && `(${sup.department})`}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {invitedSupervisors.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Invited Supervisors</SelectLabel>
                      {invitedSupervisors.map(sup => (
                        <SelectItem key={sup.user_id} value={sup.user_id}>
                          {sup.full_name} {sup.department && `(${sup.department})`}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSwitch}
            disabled={loading || (supervisors.length === 0 && invitedSupervisors.length === 0) || !selectedSupervisorId}
            className="rounded-xl bg-gradient-to-r from-primary to-accent"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4 mr-2" />
            )}
            Assign Supervisor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
