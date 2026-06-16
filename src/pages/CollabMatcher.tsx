import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Users, Loader2, RefreshCw, Lightbulb, ChevronRight, GraduationCap, Send, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AI_CREDIT_EXHAUSTED_MESSAGE, friendlyErrorMessage } from "@/lib/errorMessage";

interface ResearcherMatch {
  userId: string;
  name: string;
  avatar: string | null;
  institution: string | null;
  researchField: string | null;
  matchScore: number;
  matchReason: string;
  overlappingTopics: string[];
  paperTitles: string[];
}

export default function CollabMatcher() {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<ResearcherMatch[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [selectedResearcher, setSelectedResearcher] = useState<ResearcherMatch | null>(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFindMatches = async () => {
    setLoading(true);
    setMatches([]);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-collab-matcher');

      if (error) {
        if (error.message?.includes('AI_CREDITS_EXHAUSTED') || error.message?.includes('429')) {
          toast({
            title: "No AI Credits",
            description: AI_CREDIT_EXHAUSTED_MESSAGE,
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      if (data?.message) {
        setMessage(data.message);
      }

      if (data?.matches && data.matches.length > 0) {
        setMatches(data.matches);
        toast({ title: "Success", description: `Found ${data.matches.length} potential collaborators!` });
      } else if (!data?.message) {
        setMessage("No matching researchers found. Try uploading more research papers.");
      }
    } catch (error: any) {
      console.error('Error finding matches:', error);
      toast({
        title: "Error",
        description: friendlyErrorMessage(error.message, "Failed to find researcher matches"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteClick = (researcher: ResearcherMatch) => {
    setSelectedResearcher(researcher);
    setInviteMessage(`Hi ${researcher.name.split(' ')[0]}, I noticed we share similar research interests in ${researcher.overlappingTopics.slice(0, 2).join(' and ')}. I would love to explore potential collaboration opportunities with you.`);
    setInviteDialog(true);
  };

  const handleSendInvite = async () => {
    if (!selectedResearcher || !inviteMessage.trim()) return;
    
    setSendingInvite(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get sender profile
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", user.id)
        .single();

      // Get recipient email
      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", selectedResearcher.userId)
        .single();

      if (!recipientProfile) throw new Error("Recipient not found");

      // Check if collaboration already exists
      const { data: existingCollab } = await supabase
        .from("researcher_collaborations")
        .select("id")
        .or(`and(requester_id.eq.${user.id},recipient_id.eq.${selectedResearcher.userId}),and(requester_id.eq.${selectedResearcher.userId},recipient_id.eq.${user.id})`)
        .single();

      if (existingCollab) {
        toast({
          title: "Already Connected",
          description: "You already have a collaboration with this researcher.",
          variant: "destructive",
        });
        return;
      }

      // Create collaboration record
      const { data: collab, error: collabError } = await supabase
        .from("researcher_collaborations")
        .insert({
          requester_id: user.id,
          recipient_id: selectedResearcher.userId,
          status: "pending",
          match_score: selectedResearcher.matchScore,
          match_reason: selectedResearcher.matchReason,
          research_overlap: selectedResearcher.overlappingTopics,
          message: inviteMessage,
        })
        .select()
        .single();

      if (collabError) throw collabError;

      // Send email notification
      await supabase.functions.invoke('send-collaboration-invite', {
        body: {
          collaborationId: collab.id,
          recipientEmail: recipientProfile.email,
          recipientName: selectedResearcher.name,
          senderName: senderProfile?.full_name || "A Researcher",
          message: inviteMessage,
        }
      });

      toast({
        title: "Invitation Sent!",
        description: `Your collaboration request has been sent to ${selectedResearcher.name}.`,
      });

      setInviteDialog(false);
      setSelectedResearcher(null);
      setInviteMessage("");
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 75) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-orange-500";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Find Collaborators</h1>
            <p className="text-muted-foreground">Discover researchers working on similar topics</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/collaborations')}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            My Collaborations
          </Button>
        </div>

        {/* Hero Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-2">AI-Powered Researcher Matching</h3>
                <p className="text-muted-foreground mb-4">
                  Our AI analyzes your research papers to find other researchers with similar interests, 
                  methodologies, or complementary expertise. Connect and collaborate on joint publications!
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 border-violet-500/20">
                    <BookOpen className="w-3 h-3 mr-1" />
                    Based on your papers
                  </Badge>
                  <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 border-violet-500/20">
                    <GraduationCap className="w-3 h-3 mr-1" />
                    Find similar researchers
                  </Badge>
                  <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 border-violet-500/20">
                    <Send className="w-3 h-3 mr-1" />
                    Send invitations
                  </Badge>
                </div>
                <Button
                  onClick={handleFindMatches}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Finding Collaborators...
                    </>
                  ) : matches.length > 0 ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Matches
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Find Collaborators
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message */}
        {message && !matches.length && (
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-6 flex items-center gap-3">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              <p className="text-amber-700">{message}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {matches.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Potential Collaborators</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {matches.map((match, index) => (
                <Card 
                  key={index} 
                  className="bg-card border-border/50 hover:shadow-lg transition-all duration-300"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 border-2 border-primary/20">
                        <AvatarImage src={match.avatar || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {match.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-foreground truncate">{match.name}</h4>
                            {match.institution && (
                              <p className="text-sm text-muted-foreground truncate">{match.institution}</p>
                            )}
                          </div>
                          <Badge className={`${getScoreColor(match.matchScore)} text-white flex-shrink-0`}>
                            {match.matchScore}% Match
                          </Badge>
                        </div>
                        
                        {match.researchField && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {match.researchField}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mt-4">{match.matchReason}</p>
                    
                    {match.overlappingTopics.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-foreground mb-1.5">Overlapping Topics:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {match.overlappingTopics.slice(0, 4).map((topic, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {match.paperTitles.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-foreground mb-1.5">Recent Papers:</p>
                        <ul className="space-y-1">
                          {match.paperTitles.slice(0, 2).map((title, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <ChevronRight className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                              <span className="line-clamp-1">{title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button
                      onClick={() => handleInviteClick(match)}
                      className="w-full mt-4"
                      variant="outline"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Collaboration Invite
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        {!loading && !matches.length && !message && (
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Tips for Better Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  Upload research papers with detailed abstracts and keywords
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  Specify your research field for more accurate recommendations
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  The more papers you upload, the better the AI understands your expertise
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  Check your collaborations page to manage pending and active collaborations
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Collaboration Invite</DialogTitle>
            <DialogDescription>
              Send a personalized message to {selectedResearcher?.name} to start collaborating.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedResearcher?.avatar || undefined} />
                <AvatarFallback>
                  {selectedResearcher?.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{selectedResearcher?.name}</p>
                <p className="text-xs text-muted-foreground">{selectedResearcher?.institution}</p>
              </div>
            </div>
            <Textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder="Write your message..."
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvite} disabled={sendingInvite || !inviteMessage.trim()}>
              {sendingInvite ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
