import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { MessageSquare, Send, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatLagos } from "@/lib/dateUtils";
import { MessageReadReceipt } from "@/components/ui/message-read-receipt";
import { MessageAttachment } from "@/components/messaging/MessageAttachment";
import { AttachmentUpload, uploadAttachment } from "@/components/messaging/AttachmentUpload";
import { MessageSearch } from "@/components/messaging/MessageSearch";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface Message {
  id: string;
  supervisor_id: string;
  student_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
}

interface StudentChatDrawerProps {
  supervisorId: string;
  studentId: string;
  studentName: string;
  studentAvatar: string | null;
}

export default function StudentChatDrawer({
  supervisorId,
  studentId,
  studentName,
  studentAvatar,
}: StudentChatDrawerProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [supervisorName, setSupervisorName] = useState("Supervisor");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const channelName = `sup-${supervisorId}-stu-${studentId}`;
  const { setTyping, isOtherTyping, typingUserNames } = useTypingIndicator(
    channelName,
    supervisorId,
    supervisorName
  );

  useEffect(() => {
    // Fetch supervisor name for typing indicator
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", supervisorId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) {
          setSupervisorName(data.full_name);
        }
      });
  }, [supervisorId]);

  useEffect(() => {
    if (open) {
      fetchMessages();
      
      const channel = supabase
        .channel(`supervisor-student-${supervisorId}-${studentId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "supervisor_student_messages",
            filter: `supervisor_id=eq.${supervisorId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.student_id === studentId) {
              setMessages((prev) => [...prev, newMsg]);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "supervisor_student_messages",
            filter: `supervisor_id=eq.${supervisorId}`,
          },
          (payload) => {
            const updatedMsg = payload.new as Message;
            if (updatedMsg.student_id === studentId) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === updatedMsg.id ? updatedMsg : msg
                )
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, supervisorId, studentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("supervisor_student_messages")
      .select("*")
      .eq("supervisor_id", supervisorId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } else {
      setMessages(data || []);
    }
    setLoading(false);
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
    if (!newMessage.trim() && !selectedFile) return;

    setSending(true);
    setTyping(false);
    
    try {
      let attachmentData = null;
      
      if (selectedFile) {
        attachmentData = await uploadAttachment(supervisorId, selectedFile);
      }

      const { error } = await supabase.from("supervisor_student_messages").insert({
        supervisor_id: supervisorId,
        student_id: studentId,
        sender_id: supervisorId,
        message: newMessage.trim() || (attachmentData ? `📎 ${attachmentData.name}` : ""),
        attachment_url: attachmentData?.url || null,
        attachment_name: attachmentData?.name || null,
        attachment_type: attachmentData?.type || null,
      });

      if (error) throw error;

      // Get student email and supervisor name for notification
      const { data: studentProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", studentId)
        .maybeSingle();

      const { data: supervisorProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", supervisorId)
        .maybeSingle();

      // Send email notification to student
      if (studentProfile?.email) {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              type: "supervisor_message",
              to: studentProfile.email,
              data: {
                studentName: studentProfile.full_name || "Student",
                supervisorName: supervisorProfile?.full_name || "Your Supervisor",
                messagePreview: newMessage.trim().substring(0, 150) + (newMessage.length > 150 ? "..." : "") + (attachmentData ? ` [Attachment: ${attachmentData.name}]` : ""),
              },
            },
          });
        } catch (emailError) {
          console.error("Error sending email notification:", emailError);
        }
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
    if (e.target.value) {
      setTyping(true);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl gap-2">
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Message</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={studentAvatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
                  {studentName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DrawerTitle className="text-left">{studentName}</DrawerTitle>
                <DrawerDescription className="text-left">
                  Direct message your student
                </DrawerDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MessageSearch onSearch={setSearchQuery} />
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <X className="w-4 h-4" />
                </Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex flex-col h-[50vh] p-4">
          <ScrollArea className="flex-1 pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No messages found" : "No messages yet"}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Start a conversation with your student
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMessages.map((msg) => {
                  const isSupervisor = msg.sender_id === supervisorId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSupervisor ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          isSupervisor
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
                            isSender={isSupervisor}
                          />
                        )}
                        <div
                          className={`flex items-center gap-1.5 mt-1 ${
                            isSupervisor
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span className="text-[10px]">
                            {formatLagos(msg.created_at, "datetime")}
                          </span>
                          {isSupervisor && (
                            <MessageReadReceipt
                              isRead={msg.is_read}
                              readAt={msg.read_at}
                            />
                          )}
                        </div>
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
        </div>

        <DrawerFooter className="border-t pt-4">
          <div className="flex gap-2 w-full items-center">
            <AttachmentUpload
              userId={supervisorId}
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
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
