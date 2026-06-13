import { useState, useEffect } from "react";
import IndustryLayout from "@/components/layout/IndustryLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Loader2, Users, Clock, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatLagos } from "@/lib/dateUtils";

interface Invite {
  id: string;
  industry_id: string;
  researcher_id: string;
  challenge_id: string;
  company_name: string;
  message: string;
  status: string;
  created_at: string;
  researcher?: { full_name: string; avatar_url: string | null; email: string; institution_id: string | null };
  challenge?: { title: string };
  institution?: { name: string } | null;
}

interface Message {
  id: string;
  invite_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export default function IndustryInvites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvites();
  }, []);

  useEffect(() => {
    if (selectedInvite) {
      fetchMessages(selectedInvite.id);
      const channel = supabase
        .channel(`invite-${selectedInvite.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'invite_messages', filter: `invite_id=eq.${selectedInvite.id}` }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedInvite?.id]);

  const fetchInvites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from("researcher_invites")
        .select("*")
        .eq("industry_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enrichedInvites = await Promise.all((data || []).map(async (invite) => {
        const [profileRes, challengeRes] = await Promise.all([
          supabase.from("profiles").select("full_name, avatar_url, email, institution_id").eq("user_id", invite.researcher_id).single(),
          supabase.from("challenges").select("title").eq("id", invite.challenge_id).single()
        ]);
        
        let institution = null;
        if (profileRes.data?.institution_id) {
          const { data: instData } = await supabase.from("institutions").select("name").eq("id", profileRes.data.institution_id).single();
          institution = instData;
        }
        
        return { ...invite, researcher: profileRes.data, challenge: challengeRes.data, institution };
      }));

      setInvites(enrichedInvites);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (inviteId: string) => {
    const { data } = await supabase
      .from("invite_messages")
      .select("*")
      .eq("invite_id", inviteId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedInvite || !userId) return;
    setSending(true);
    try {
      const { error } = await supabase.from("invite_messages").insert({
        invite_id: selectedInvite.id,
        sender_id: userId,
        message: newMessage.trim()
      });
      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted": return <Badge className="bg-emerald-100 text-emerald-700 text-xs">Accepted</Badge>;
      case "declined": return <Badge className="bg-red-100 text-red-700 text-xs">Declined</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-700 text-xs">Pending</Badge>;
    }
  };

  return (
    <IndustryLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Researcher Invites</h1>
          <p className="text-sm text-muted-foreground">Manage invitations and conversations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-lg font-bold">{invites.length}</p>
                  <p className="text-[10px] opacity-80">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-lg font-bold">{invites.filter(i => i.status === 'pending').length}</p>
                  <p className="text-[10px] opacity-80">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 opacity-80" />
                <div>
                  <p className="text-lg font-bold">{invites.filter(i => i.status === 'accepted').length}</p>
                  <p className="text-[10px] opacity-80">Accepted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Invites List */}
          <Card className="shadow-card rounded-xl border-border/50">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold">Invitations ({invites.length})</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : invites.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No invites yet</p>
                  <p className="text-xs text-muted-foreground">Use AI matcher to find researchers</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        onClick={() => setSelectedInvite(invite)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedInvite?.id === invite.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 hover:bg-muted'}`}
                      >
                        <div className="flex items-start gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={invite.researcher?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{invite.researcher?.full_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm truncate">{invite.researcher?.full_name || 'Unknown Researcher'}</span>
                              {getStatusBadge(invite.status)}
                            </div>
                            {invite.institution && (
                              <p className="text-[10px] text-primary truncate">{invite.institution.name}</p>
                            )}
                            <p className="text-xs text-muted-foreground truncate">{invite.challenge?.title}</p>
                            <p className="text-[10px] text-muted-foreground">{formatLagos(invite.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="shadow-card rounded-xl border-border/50">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold">
                {selectedInvite ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={selectedInvite.researcher?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{selectedInvite.researcher?.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <span className="block truncate">{selectedInvite.researcher?.full_name}</span>
                      {selectedInvite.institution && (
                        <span className="text-[10px] text-muted-foreground font-normal">{selectedInvite.institution.name}</span>
                      )}
                    </div>
                  </div>
                ) : 'Select an invite'}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {selectedInvite ? (
                <div className="flex flex-col h-[400px]">
                  <ScrollArea className="flex-1 mb-3">
                    <div className="space-y-2">
                      {/* Initial invite message */}
                      <div className="bg-primary/10 rounded-lg p-2 text-xs">
                        <p className="font-medium text-primary mb-1">Initial Invite</p>
                        <p className="text-muted-foreground">{selectedInvite.message}</p>
                      </div>
                      {messages.map((msg) => (
                        <div key={msg.id} className={`p-2 rounded-lg text-xs ${msg.sender_id === userId ? 'bg-primary text-primary-foreground ml-8' : 'bg-muted mr-8'}`}>
                          {msg.message}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="rounded-lg text-xs h-9"
                    />
                    <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()} size="sm" className="rounded-lg h-9">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Select an invitation to view chat</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </IndustryLayout>
  );
}
