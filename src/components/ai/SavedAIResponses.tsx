import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Clock, History, Loader2, Save, Trash2, Undo2 } from "lucide-react";

type SavedAIResponse = {
  id: string;
  tool_type: string;
  title: string;
  prompt: string | null;
  response: string;
  metadata?: Record<string, unknown>;
  tier_at_save?: string | null;
  created_at: string;
};

type SaveStatus = {
  tier: string;
  saved_count: number;
  free_limit: number;
  remaining_free_saves: number | null;
  can_save: boolean;
  message: string;
};

type Props = {
  toolType: string;
  toolLabel: string;
  currentTitle?: string;
  currentPrompt?: string;
  currentResponse?: string;
  currentMetadata?: Record<string, unknown>;
  onRestore?: (item: SavedAIResponse) => void;
};

export default function SavedAIResponses({
  toolType,
  toolLabel,
  currentTitle,
  currentPrompt,
  currentResponse,
  currentMetadata,
  onRestore,
}: Props) {
  const [items, setItems] = useState<SavedAIResponse[]>([]);
  const [status, setStatus] = useState<SaveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SavedAIResponse | null>(null);
  const { toast } = useToast();

  const hasCurrentResponse = Boolean(currentResponse?.trim());
  const saveDescription = useMemo(() => {
    if (!status) return "Loading save access...";
    if (status.tier === "free") {
      return `${status.saved_count}/${status.free_limit} free saves used`;
    }
    return status.can_save ? "Unlimited saves on active paid subscription" : "Subscription required to save";
  }, [status]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-saved-responses", {
        body: { action: "list", tool_type: toolType },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setItems(data?.responses || []);
      setStatus(data?.subscription || null);
    } catch (error: any) {
      toast({
        title: "Unable to load history",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [toolType]);

  const handleSave = async () => {
    if (!hasCurrentResponse) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-saved-responses", {
        body: {
          action: "save",
          tool_type: toolType,
          title: currentTitle || toolLabel,
          prompt: currentPrompt || "",
          response: currentResponse,
          metadata: currentMetadata || {},
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setItems((prev) => [data.response, ...prev]);
      setStatus(data.subscription || status);
      toast({ title: "Response saved", description: "You can find it in History." });
    } catch (error: any) {
      toast({
        title: "Unable to save",
        description: error?.message || "Please subscribe to continue saving AI responses.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("ai-saved-responses", {
        body: { action: "delete", id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setItems((prev) => prev.filter((item) => item.id !== id));
      await loadHistory();
      toast({ title: "Saved response deleted" });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestore = (item: SavedAIResponse) => {
    onRestore?.(item);
    toast({ title: "Response restored", description: "The saved response is now back on this page." });
  };

  return (
    <>
      <Card className="rounded-2xl border border-border/70 shadow-sm">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <History className="h-5 w-5 text-primary" />
              History
            </CardTitle>
            <CardDescription>{toolLabel} saved responses</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Badge variant={status?.can_save ? "default" : "secondary"} className="w-fit rounded-full">
              {saveDescription}
            </Badge>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasCurrentResponse || saving || !status?.can_save}
              className="rounded-lg"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Response
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {status && !status.can_save && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {status.message}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading history...
            </div>
          ) : items.length ? (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-border/70 bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{item.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(item.created_at)}
                        </span>
                        {item.tier_at_save && <Badge variant="outline" className="rounded-full capitalize">{item.tier_at_save}</Badge>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setSelected(item)}>
                        Open
                      </Button>
                      {onRestore && (
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => handleRestore(item)}>
                          <Undo2 className="mr-1.5 h-4 w-4" />
                          Restore
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.response}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border py-8 text-center">
              <Check className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No saved responses yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Generate a response, then save it here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] rounded-lg border bg-muted/20 p-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{selected?.response}</div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved recently";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
