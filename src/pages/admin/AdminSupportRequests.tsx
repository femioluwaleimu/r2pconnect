import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bot, CheckCircle, Clock, Inbox, Loader2, Mail, MapPin, User } from "lucide-react";

type SupportRequest = {
  id: string;
  user_id: string | null;
  user_role: string | null;
  contact_name: string | null;
  contact_email: string | null;
  title: string;
  message: string;
  bot_answer: string | null;
  page_path: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

const statuses = ["open", "in_progress", "resolved", "closed"];

export default function AdminSupportRequests() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const visibleRequests = useMemo(
    () => requests.filter((request) => statusFilter === "all" || request.status === statusFilter),
    [requests, statusFilter],
  );

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      const rows = (data || []) as SupportRequest[];
      setRequests(rows);
      setNotes(Object.fromEntries(rows.map((row) => [row.id, row.admin_notes || ""])));
    } catch (error: any) {
      toast({ title: "Unable to load support requests", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateRequest = async (request: SupportRequest, status: string) => {
    setSavingId(request.id);
    try {
      const { error } = await supabase
        .from("support_requests")
        .update({
          status,
          admin_notes: notes[request.id] || null,
          resolved_at: status === "resolved" || status === "closed" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id ? { ...item, status, admin_notes: notes[request.id] || null, updated_at: new Date().toISOString() } : item,
        ),
      );
      toast({ title: "Support request updated" });
    } catch (error: any) {
      toast({ title: "Update failed", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Inbox className="h-6 w-6 text-primary" />
              Chatbot Support Inbox
            </h1>
            <p className="text-muted-foreground">Questions the assistant could not answer confidently.</p>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchRequests} className="rounded-xl">Refresh</Button>
          </div>
        </div>

        {loading ? (
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="flex items-center justify-center py-14 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading support requests...
            </CardContent>
          </Card>
        ) : visibleRequests.length === 0 ? (
          <Card className="rounded-2xl border-none shadow-sm">
            <CardContent className="py-14 text-center">
              <CheckCircle className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
              <p className="text-lg font-semibold text-foreground">No support requests here</p>
              <p className="text-sm text-muted-foreground">New unanswered chatbot questions will appear in this inbox.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleRequests.map((request) => (
              <Card key={request.id} className="rounded-2xl border shadow-sm">
                <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{request.contact_name || "User"}</span>
                      {request.contact_email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{request.contact_email}</span>}
                      {request.page_path && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{request.page_path}</span>}
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDate(request.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="rounded-full capitalize">{request.user_role || "user"}</Badge>
                    <Badge className={`rounded-full ${statusClass(request.status)}`}>{statusLabel(request.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border bg-background p-4">
                    <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">User Question</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{request.message}</p>
                  </div>

                  {request.bot_answer && (
                    <div className="rounded-xl border bg-muted/40 p-4">
                      <p className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground">
                        <Bot className="h-3.5 w-3.5" />
                        Bot Answer
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{request.bot_answer}</p>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">Admin notes</p>
                      <Textarea
                        value={notes[request.id] || ""}
                        onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                        placeholder="Add internal notes or resolution details..."
                        rows={3}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => updateRequest(request, "in_progress")} disabled={savingId === request.id} className="rounded-xl">
                        In Progress
                      </Button>
                      <Button onClick={() => updateRequest(request, "resolved")} disabled={savingId === request.id} className="rounded-xl">
                        {savingId === request.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Resolve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status: string) {
  if (status === "resolved" || status === "closed") return "bg-emerald-600 text-white";
  if (status === "in_progress") return "bg-amber-500 text-white";
  return "bg-primary text-primary-foreground";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
