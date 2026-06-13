import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Clock, CheckCircle, XCircle, MessageSquare, Send, 
  Loader2, ArrowLeft, Sparkles 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface Collaboration {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  match_score: number | null;
  match_reason: string | null;
  research_overlap: string[] | null;
  message: string | null;
  created_at: string;
  updated_at: string;
  partner?: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    institution_name?: string | null;
  };
  isRequester: boolean;
}

interface Message {
  id: string;
  collaboration_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function Collaborations() {
  const [loading, setLoading] = useState(true);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [selectedCollab, setSelectedCollab] = useState<Collaboration | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCollaborations();
  }, []);

  useEffect(() => {
    if (selectedCollab) {
      fetchMessages(selectedCollab.id);
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`collab-messages-${selectedCollab.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'collaboration_messages',
            filter: `collaboration_id=eq.${selectedCollab.id}`,
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message]);
            scrollToBottom();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedCollab]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchCollaborations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: collabs, error } = await supabase
        .from("researcher_collaborations")
        .select("*")
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Get partner profiles
      const partnerIds = collabs?.map(c => 
        c.requester_id === user.id ? c.recipient_id : c.requester_id
      ) || [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, institution_id")
        .in("user_id", partnerIds);

      const institutionIds = profiles?.filter(p => p.institution_id).map(p => p.institution_id) || [];
      const { data: institutions } = await supabase
        .from("institutions")
        .select("id, name")
        .in("id", institutionIds);

      const institutionMap = new Map(institutions?.map(i => [i.id, i.name]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, {
        ...p,
        institution_name: p.institution_id ? institutionMap.get(p.institution_id) : null
      }]) || []);

      const enrichedCollabs: Collaboration[] = (collabs || []).map(c => ({
        ...c,
        partner: profileMap.get(c.requester_id === user.id ? c.recipient_id : c.requester_id),
        isRequester: c.requester_id === user.id,
      }));

      setCollaborations(enrichedCollabs);
    } catch (error: any) {
      console.error('Error fetching collaborations:', error);
      toast({
        title: "Error",
        description: "Failed to load collaborations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (collaborationId: string) => {
    const { data, error } = await supabase
      .from("collaboration_messages")
      .select("*")
      .eq("collaboration_id", collaborationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);

    // Mark unread messages as read
    if (userId) {
      await supabase
        .from("collaboration_messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("collaboration_id", collaborationId)
        .neq("sender_id", userId)
        .eq("is_read", false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedCollab || !newMessage.trim() || !userId) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from("collaboration_messages")
        .insert({
          collaboration_id: selectedCollab.id,
          sender_id: userId,
          message: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStatusUpdate = async (collabId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("researcher_collaborations")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", collabId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Collaboration ${newStatus === 'active' ? 'accepted' : newStatus}!`,
      });

      fetchCollaborations();
      if (selectedCollab?.id === collabId) {
        setSelectedCollab(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update collaboration",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'completed':
        return <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filterCollabs = (status: string) => {
    if (status === 'all') return collaborations;
    return collaborations.filter(c => c.status === status);
  };

  if (selectedCollab) {
    return (
      <DashboardLayout>
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          {/* Chat Header */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <Button variant="ghost" size="icon" onClick={() => setSelectedCollab(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={selectedCollab.partner?.avatar_url || undefined} />
              <AvatarFallback>
                {selectedCollab.partner?.full_name?.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold">{selectedCollab.partner?.full_name}</h3>
              <p className="text-sm text-muted-foreground">{selectedCollab.partner?.institution_name}</p>
            </div>
            {getStatusBadge(selectedCollab.status)}
            {selectedCollab.status === 'active' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleStatusUpdate(selectedCollab.id, 'completed')}
              >
                Mark Complete
              </Button>
            )}
          </div>

          {/* Initial Message / Context */}
          {selectedCollab.message && (
            <div className="p-4 bg-muted/50 rounded-lg mt-4">
              <p className="text-sm text-muted-foreground mb-1">Initial message:</p>
              <p className="text-sm">{selectedCollab.message}</p>
              {selectedCollab.research_overlap && selectedCollab.research_overlap.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedCollab.research_overlap.map((topic, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{topic}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Actions for Recipient */}
          {selectedCollab.status === 'pending' && !selectedCollab.isRequester && (
            <div className="flex gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg mt-4">
              <Button onClick={() => handleStatusUpdate(selectedCollab.id, 'active')} className="flex-1">
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleStatusUpdate(selectedCollab.id, 'rejected')}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Decline
              </Button>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 py-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.sender_id === userId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.sender_id === userId ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          {selectedCollab.status === 'active' && (
            <div className="flex gap-2 pt-4 border-t">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              />
              <Button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
                {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          )}

          {selectedCollab.status === 'pending' && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              {selectedCollab.isRequester 
                ? "Waiting for response before you can start chatting." 
                : "Accept the collaboration to start chatting."}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Collaborations</h1>
            <p className="text-muted-foreground">Manage your research partnerships</p>
          </div>
          <Button onClick={() => navigate('/dashboard/collab')} className="bg-gradient-to-r from-violet-500 to-purple-600">
            <Sparkles className="w-4 h-4 mr-2" />
            Find Collaborators
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : collaborations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Collaborations Yet</h3>
              <p className="text-muted-foreground mb-4">
                Use AI to find researchers with similar interests and start collaborating.
              </p>
              <Button onClick={() => navigate('/dashboard/collab')}>
                <Sparkles className="w-4 h-4 mr-2" />
                Find Collaborators
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({collaborations.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({filterCollabs('pending').length})</TabsTrigger>
              <TabsTrigger value="active">Active ({filterCollabs('active').length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({filterCollabs('completed').length})</TabsTrigger>
            </TabsList>

            {['all', 'pending', 'active', 'completed'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                {filterCollabs(tab).map((collab) => (
                  <Card 
                    key={collab.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedCollab(collab)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={collab.partner?.avatar_url || undefined} />
                          <AvatarFallback>
                            {collab.partner?.full_name?.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold truncate">{collab.partner?.full_name}</h4>
                            {getStatusBadge(collab.status)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {collab.partner?.institution_name || 'Independent Researcher'}
                          </p>
                          {collab.match_reason && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {collab.match_reason}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {collab.match_score && (
                            <Badge variant="secondary" className="mb-1">{collab.match_score}% match</Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(collab.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <MessageSquare className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filterCollabs(tab).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No {tab === 'all' ? '' : tab} collaborations
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
