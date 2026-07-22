import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bot, HelpCircle, Loader2, MessageCircle, Send, X } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  needsHandoff?: boolean;
  suggestedActions?: string[];
};

type Props = {
  userRole: "researcher" | "supervisor";
};

type ChatSessionState = {
  open?: boolean;
  messages?: ChatMessage[];
  input?: string;
  handoffOpen?: boolean;
  handoffMessage?: string;
  contactName?: string;
  contactEmail?: string;
};

const isFunctionMissingError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.toLowerCase().includes("not implemented yet");
};

const initialAssistantMessage = (userRole: Props["userRole"]): ChatMessage => ({
  role: "assistant",
  content:
    userRole === "supervisor"
      ? "Hi, I can guide you around your supervisor dashboard, student reviews, invites, AI training, revenue, and profile settings."
      : "Hi, I can guide you around research uploads, AI tools, saved history, subscriptions, wallet, referrals, jobs, and supervisor workflows.",
});

const readChatSession = (userRole: Props["userRole"]): ChatSessionState => {
  if (typeof window === "undefined") return {};

  try {
    const stored = window.sessionStorage.getItem(`r2p_support_chat_${userRole}`);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as ChatSessionState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const resolveSuggestedActionPath = (action: string, userRole: Props["userRole"]) => {
  const text = action.toLowerCase();

  if (text.includes("topic")) return "/dashboard/topic-refiner";
  if (text.includes("gap")) return "/dashboard/gap-detector";
  if (text.includes("ai assistant") || text.includes("assistant")) return "/dashboard/ai-assistant";
  if (text.includes("subscription") || text.includes("subscribe") || text.includes("package")) return "/dashboard/subscriptions";
  if (text.includes("wallet") || text.includes("credit")) return "/dashboard/student-wallet";
  if (text.includes("profile")) return userRole === "supervisor" ? "/supervisor/profile" : "/dashboard/profile";

  if (userRole === "supervisor") {
    if (text.includes("invite")) return "/supervisor/invite-students";
    if (text.includes("student")) return "/supervisor/students";
    if (text.includes("pending")) return "/supervisor/pending";
    if (text.includes("approved")) return "/supervisor/approved";
    if (text.includes("research")) return "/supervisor/research";
    if (text.includes("revenue") || text.includes("commission")) return "/supervisor/revenue";
    if (text.includes("withdraw")) return "/supervisor/withdrawals";
    if (text.includes("training")) return "/supervisor/ai-training";
  }

  if (text.includes("supervised") || text.includes("start student")) return "/dashboard/research/start-student";
  if (text.includes("completed")) return "/dashboard/research/upload-completed";
  if (text.includes("upload")) return "/dashboard/research/upload-completed";
  if (text.includes("research")) return "/dashboard/research/start-student";
  if (text.includes("browse")) return "/dashboard/browse";
  if (text.includes("collab")) return "/dashboard/collab";
  if (text.includes("challenge")) return "/dashboard/challenges";
  if (text.includes("documentary")) return "/dashboard/documentaries";
  if (text.includes("job")) return "/dashboard/job-board";

  return "";
};

export default function SupportChatbot({ userRole }: Props) {
  const [sessionStorageKey] = useState(() => `r2p_support_chat_${userRole}`);
  const [open, setOpen] = useState(() => readChatSession(userRole).open || false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const storedMessages = readChatSession(userRole).messages;
    return Array.isArray(storedMessages) && storedMessages.length ? storedMessages : [initialAssistantMessage(userRole)];
  });
  const [input, setInput] = useState(() => readChatSession(userRole).input || "");
  const [loading, setLoading] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(() => readChatSession(userRole).handoffOpen || false);
  const [handoffMessage, setHandoffMessage] = useState(() => readChatSession(userRole).handoffMessage || "");
  const [contactName, setContactName] = useState(() => readChatSession(userRole).contactName || "");
  const [contactEmail, setContactEmail] = useState(() => readChatSession(userRole).contactEmail || "");
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const lastAssistant = useMemo(() => [...messages].reverse().find((message) => message.role === "assistant"), [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open, handoffOpen]);

  useEffect(() => {
    const session: ChatSessionState = {
      open,
      messages,
      input,
      handoffOpen,
      handoffMessage,
      contactName,
      contactEmail,
    };
    window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(session));
  }, [contactEmail, contactName, handoffMessage, handoffOpen, input, messages, open, sessionStorageKey]);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setContactEmail(user.email || "");

      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", user.id)
        .maybeSingle();
      setContactName(data?.full_name || "");
      setContactEmail(data?.email || user.email || "");
    };

    loadProfile();
  }, []);

  const askQuestion = async (question = input.trim()) => {
    if (!question || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("support-chatbot", {
        body: {
          message: question,
          page_path: location.pathname,
          history: nextMessages.slice(-8),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data?.answer || "I could not answer that confidently. You can send it to admin support.",
          needsHandoff: Boolean(data?.needs_handoff),
          suggestedActions: Array.isArray(data?.suggested_actions) ? data.suggested_actions : [],
        },
      ]);

      if (data?.needs_handoff) {
        setHandoffMessage(question);
      }
    } catch (error: any) {
      setHandoffMessage(question);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I am having trouble answering right now. Send this to admin support and the team will follow up.",
          needsHandoff: true,
        },
      ]);
      toast({ title: "Assistant unavailable", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const submitHandoff = async () => {
    if (!handoffMessage.trim()) {
      toast({ title: "Enter your question", variant: "destructive" });
      return;
    }

    const requestPayload = {
      title: "Chatbot support request",
      message: handoffMessage,
      bot_answer: lastAssistant?.content || "",
      page_path: location.pathname,
      contact_name: contactName,
      contact_email: contactEmail,
    };

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("support-request", {
        body: requestPayload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setHandoffOpen(false);
      setHandoffMessage("");
      toast({ title: "Sent to admin", description: "Your question has been sent to support." });
    } catch (error: any) {
      if (!isFunctionMissingError(error)) {
        toast({ title: "Could not send request", description: error?.message || "Please try again.", variant: "destructive" });
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error: insertError } = await supabase.from("support_requests").insert({
          id: crypto.randomUUID(),
          user_id: user?.id || null,
          user_role: userRole,
          ...requestPayload,
          status: "open",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (insertError) throw insertError;

        setHandoffOpen(false);
        setHandoffMessage("");
        toast({
          title: "Sent to admin",
          description: "Your question has been saved for admin review.",
        });
      } catch (fallbackError: any) {
        toast({
          title: "Could not send request",
          description: fallbackError?.message || "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuggestedAction = (action: string, previousQuestion?: string) => {
    const text = action.toLowerCase();
    if (text.includes("admin support") || (text.includes("send") && text.includes("admin"))) {
      setHandoffMessage(handoffMessage || previousQuestion || input || "");
      setHandoffOpen(true);
      return;
    }

    const path = resolveSuggestedActionPath(action, userRole);
    if (path) {
      navigate(path);
      setOpen(false);
      return;
    }

    askQuestion(action);
  };

  return (
    <>
      {open && (
        <Card className="fixed bottom-24 right-4 z-50 flex h-[min(640px,calc(100vh-120px))] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl sm:right-6">
          <CardHeader className="border-b bg-primary text-primary-foreground p-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-5 w-5" />
                R2P Help Assistant
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/15" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border bg-muted/60 text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.suggestedActions?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {message.suggestedActions.slice(0, 3).map((action) => (
                          <Button
                            key={action}
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 rounded-full px-2.5 text-[11px]"
                            onClick={() => handleSuggestedAction(action, messages[index - 1]?.content)}
                          >
                            {action}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                    {message.needsHandoff && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 h-8 rounded-lg bg-background text-foreground"
                        onClick={() => {
                          setHandoffMessage(handoffMessage || input || messages[index - 1]?.content || "");
                          setHandoffOpen(true);
                        }}
                      >
                        <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
                        Send to admin
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {handoffOpen ? (
              <div className="border-t bg-background p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Send question to admin</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setHandoffOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="support-name">Name</Label>
                    <Input id="support-name" value={contactName} onChange={(event) => setContactName(event.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="support-email">Email</Label>
                    <Input id="support-email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="support-question">Question</Label>
                    <Textarea id="support-question" rows={3} value={handoffMessage} onChange={(event) => setHandoffMessage(event.target.value)} />
                  </div>
                  <Button onClick={submitHandoff} disabled={submitting} className="rounded-lg">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send to Admin
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-t bg-background p-3">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        askQuestion();
                      }
                    }}
                    placeholder="Ask how to use R2P Connect..."
                    className="rounded-xl"
                  />
                  <Button size="icon" onClick={() => askQuestion()} disabled={!input.trim() || loading} className="shrink-0 rounded-xl">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button
        size="icon"
        className="fixed bottom-5 right-4 z-50 h-14 w-14 rounded-full shadow-2xl sm:right-6"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </>
  );
}
