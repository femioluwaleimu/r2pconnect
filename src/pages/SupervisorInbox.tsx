import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  Loader2,
  ArrowLeft,
  User as UserIcon,
  Bell,
  BellOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatLagos } from "@/lib/dateUtils";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { MessageAttachment } from "@/components/messaging/MessageAttachment";
import { AttachmentUpload, uploadAttachment } from "@/components/messaging/AttachmentUpload";
import { MessageSearch } from "@/components/messaging/MessageSearch";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface Supervisor {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  department: string | null;
}

interface Message {
  id: string;
  supervisor_id: string;
  student_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
}

interface Conversation {
  supervisor: Supervisor;
  lastMessage: Message | null;
  unreadCount: number;
}

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const databaseTimestamp = () => new Date().toISOString().slice(0, 19).replace("T", " ");

const formatMessageDate = (date: string | null | undefined) => {
  if (!date) return "Date unavailable";

  const formatted = formatLagos(date, "datetime");
  return formatted === "Unknown date" ? "Date unavailable" : formatted;
};

export default function SupervisorInbox() {
  const [user, setUser] = useState<User | null>(null);
  const [studentName, setStudentName] = useState("Student");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSupported, permission, requestPermission, showNotification, isGranted } = useBrowserNotifications();

  const channelName = selectedConversation
    ? `sup-${selectedConversation.supervisor.user_id}-stu-${user?.id}`
    : "";
  const { setTyping, isOtherTyping, typingUserNames } = useTypingIndicator(
    channelName,
    user?.id || "",
    studentName
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchConversations(user.id);
      
      // Fetch student name
      supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.full_name) {
            setStudentName(data.full_name);
          }
        });
    });
  }, [navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedConversation && user) {
      fetchMessages(selectedConversation.supervisor.user_id);
      markMessagesAsRead(selectedConversation.supervisor.user_id);

      const channel = supabase
        .channel(`student-supervisor-${user.id}-${selectedConversation.supervisor.user_id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "supervisor_student_messages",
            filter: `student_id=eq.${user.id}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.supervisor_id === selectedConversation.supervisor.user_id) {
              setMessages((prev) => [...prev, newMsg]);
              markMessagesAsRead(selectedConversation.supervisor.user_id);
              
              if (newMsg.sender_id !== user.id && document.hidden) {
                showNotification("New message from supervisor", {
                  body: newMsg.message.substring(0, 100) + (newMsg.message.length > 100 ? "..." : ""),
                  tag: `msg-${newMsg.id}`,
                  data: { url: "/dashboard/supervisor-inbox" },
                });
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation?.supervisor.user_id, user?.id]);

  const fetchConversations = async (userId: string) => {
    setLoading(true);

    const { data: messagesData } = await supabase
      .from("supervisor_student_messages")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: false });

    if (messagesData && messagesData.length > 0) {
      const supervisorIds = [...new Set(messagesData.map((m) => m.supervisor_id))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, department")
        .in("user_id", supervisorIds);

      const conversationList: Conversation[] = supervisorIds.map((supId) => {
        const supervisorMessages = messagesData.filter((m) => m.supervisor_id === supId);
        const lastMessage = supervisorMessages[0] || null;
        const unreadCount = supervisorMessages.filter(
          (m) => !m.is_read && m.sender_id !== userId
        ).length;
        const profile = profiles?.find((p) => p.user_id === supId);

        return {
          supervisor: {
            user_id: supId,
            full_name: profile?.full_name || "Unknown Supervisor",
            avatar_url: profile?.avatar_url || null,
            department: profile?.department || null,
          },
          lastMessage,
          unreadCount,
        };
      });

      setConversations(conversationList);
    }

    setLoading(false);
  };

  const fetchMessages = async (supervisorId: string) => {
    if (!user) return;
    setMessagesLoading(true);

    const { data, error } = await supabase
      .from("supervisor_student_messages")
      .select("*")
      .eq("supervisor_id", supervisorId)
      .eq("student_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      setMessages(data || []);
    }
    setMessagesLoading(false);
  };

  const markMessagesAsRead = async (supervisorId: string) => {
    if (!user) return;

    const now = new Date().toISOString();
    await supabase
      .from("supervisor_student_messages")
      .update({ is_read: true, read_at: now })
      .eq("supervisor_id", supervisorId)
      .eq("student_id", user.id)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    setConversations((prev) =>
      prev.map((c) =>
        c.supervisor.user_id === supervisorId ? { ...c, unreadCount: 0 } : c
      )
    );
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(
      (msg) =>
        msg.message.toLowerCase().includes(query) ||
        msg.attachment_name?.toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || !user) return;

    setSending(true);
    setTyping(false);
    
    try {
      let attachmentData = null;
      
      if (selectedFile) {
        attachmentData = await uploadAttachment(user.id, selectedFile);
      }

      const { error } = await supabase.from("supervisor_student_messages").insert({
        id: createId(),
        supervisor_id: selectedConversation.supervisor.user_id,
        student_id: user.id,
        sender_id: user.id,
        is_read: false,
        created_at: databaseTimestamp(),
        message: newMessage.trim() || (attachmentData ? `📎 ${attachmentData.name}` : ""),
        attachment_url: attachmentData?.url || null,
        attachment_name: attachmentData?.name || null,
        attachment_type: attachmentData?.type || null,
      });

      if (error) throw error;

      await fetchMessages(selectedConversation.supervisor.user_id);
      await fetchConversations(user.id);

      const messagePreview =
        newMessage.trim().substring(0, 150) ||
        (attachmentData ? `Attachment: ${attachmentData.name}` : "You received an attachment.");

      try {
        await supabase.from("notifications").insert({
          id: createId(),
          user_id: selectedConversation.supervisor.user_id,
          title: "New message from a student",
          message: `${studentName}: ${messagePreview}`,
          type: "message",
          link: `/supervisor/students/${user.id}`,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      } catch (notificationError) {
        console.error("Error creating supervisor app notification:", notificationError);
      }

      try {
        const { data: supervisorProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", selectedConversation.supervisor.user_id)
          .maybeSingle();

        if (supervisorProfile?.email) {
          await supabase.functions.invoke("send-email", {
            body: {
              type: "student_message",
              to: supervisorProfile.email,
              data: {
                supervisorName: supervisorProfile.full_name || selectedConversation.supervisor.full_name || "Supervisor",
                studentName,
                messagePreview: messagePreview + (newMessage.length > 150 ? "..." : ""),
                studentId: user.id,
              },
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending supervisor email notification:", emailError);
      }

      setNewMessage("");
      setSelectedFile(null);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value && selectedConversation) {
      setTyping(true);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Supervisor Inbox</h1>
              <p className="text-muted-foreground">
                Messages from your supervisors
              </p>
            </div>
            {totalUnread > 0 && (
              <Badge className="rounded-full bg-primary text-primary-foreground">
                {totalUnread} unread
              </Badge>
            )}
          </div>
          {isSupported && (
            <Button
              variant={isGranted ? "outline" : "default"}
              size="sm"
              className="rounded-xl gap-2"
              onClick={requestPermission}
              disabled={permission === "denied"}
            >
              {isGranted ? (
                <>
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Notifications On</span>
                </>
              ) : permission === "denied" ? (
                <>
                  <BellOff className="w-4 h-4" />
                  <span className="hidden sm:inline">Blocked</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Enable Notifications</span>
                </>
              )}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="lg:col-span-1 rounded-2xl border-none shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Your supervisor will contact you here
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="divide-y divide-border">
                    {conversations.map((conv) => (
                      <button
                        key={conv.supervisor.user_id}
                        onClick={() => setSelectedConversation(conv)}
                        className={`w-full p-4 text-left hover:bg-accent/50 transition-colors ${
                          selectedConversation?.supervisor.user_id === conv.supervisor.user_id
                            ? "bg-accent"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10 shrink-0">
                            <AvatarImage src={conv.supervisor.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-sm font-semibold">
                              {conv.supervisor.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-foreground truncate">
                                {conv.supervisor.full_name}
                              </span>
                              {conv.unreadCount > 0 && (
                                <Badge className="rounded-full bg-primary text-primary-foreground text-xs h-5 min-w-[20px] flex items-center justify-center">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            {conv.supervisor.department && (
                              <p className="text-xs text-muted-foreground truncate">
                                {conv.supervisor.department}
                              </p>
                            )}
                            {conv.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {conv.lastMessage.sender_id === user?.id ? "You: " : ""}
                                {conv.lastMessage.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 rounded-2xl border-none shadow-lg">
            <CardHeader className="pb-3 border-b">
              {selectedConversation ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden rounded-xl"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedConversation.supervisor.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
                        {selectedConversation.supervisor.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {selectedConversation.supervisor.full_name}
                      </CardTitle>
                      {selectedConversation.supervisor.department && (
                        <p className="text-xs text-muted-foreground">
                          {selectedConversation.supervisor.department}
                        </p>
                      )}
                    </div>
                  </div>
                  <MessageSearch onSearch={setSearchQuery} />
                </div>
              ) : (
                <CardTitle className="text-base text-muted-foreground">
                  Select a conversation
                </CardTitle>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {selectedConversation ? (
                <div className="flex flex-col h-[450px]">
                  <ScrollArea className="flex-1 p-4">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <MessageSquare className="w-12 h-12 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {searchQuery ? "No messages found" : "No messages yet"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredMessages.map((msg) => {
                          const isStudent = msg.sender_id === user?.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isStudent ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                                  isStudent
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted rounded-bl-md"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {msg.message}
                                </p>
                                {msg.attachment_url && msg.attachment_name && msg.attachment_type && (
                                  <MessageAttachment
                                    attachmentUrl={msg.attachment_url}
                                    attachmentName={msg.attachment_name}
                                    attachmentType={msg.attachment_type}
                                    isSender={isStudent}
                                  />
                                )}
                                <p
                                  className={`text-[10px] mt-1 ${
                                    isStudent
                                      ? "text-primary-foreground/70"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {formatMessageDate(msg.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        {isOtherTyping && (
                          <div className="flex justify-start">
                            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                              <TypingIndicator name={typingUserNames[0]} />
                            </div>
                          </div>
                        )}
                        <div ref={scrollRef} />
                      </div>
                    )}
                  </ScrollArea>
                  <div className="p-4 border-t">
                    <div className="flex gap-2 items-center">
                      <AttachmentUpload
                        userId={user?.id || ""}
                        onAttachmentSelect={setSelectedFile}
                        selectedFile={selectedFile}
                        disabled={sending}
                      />
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        className="flex-1 rounded-xl"
                        disabled={sending}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sending || (!newMessage.trim() && !selectedFile)}
                        size="icon"
                        className="rounded-xl shrink-0"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[450px] text-center">
                  <UserIcon className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    Select a conversation to view messages
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
