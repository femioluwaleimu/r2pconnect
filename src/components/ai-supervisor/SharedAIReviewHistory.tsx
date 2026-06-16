import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { formatLagos } from "@/lib/dateUtils";
import { formatRating } from "@/lib/numberFormat";
const createUuid = () => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const fmt = (date?: string | null) => {
  if (!date) return "";
  const value = formatLagos(date, "datetime");
  return value === "Unknown date" ? "" : value;
};
import { History, MessageSquare, Send, Sparkles, Star, Trash2, GraduationCap, User as UserIcon, Shield } from "lucide-react";

interface Review {
  id: string;
  chapter_name: string;
  chapter_number: number | null;
  rating: number | null;
  review_mode: string | null;
  examiner_readiness: string | null;
  summary: string | null;
  created_at: string;
  user_id: string;
}

interface Comment {
  id: string;
  review_id: string;
  user_id: string;
  author_role: "student" | "supervisor" | "admin";
  comment: string;
  created_at: string;
  author_name?: string;
}

interface Props {
  researchId: string;
  /** "student" | "supervisor" — controls the role tag posted with new comments */
  viewerRole: "student" | "supervisor";
}

export default function SharedAIReviewHistory({ researchId, viewerRole }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data: rv, error: rvErr } = await supabase
        .from("research_chapter_reviews")
        .select("id, chapter_name, chapter_number, rating, review_mode, examiner_readiness, summary, created_at, user_id")
        .eq("research_id", researchId)
        .order("created_at", { ascending: false });
      if (rvErr) throw rvErr;
      setReviews(rv || []);

      if (rv && rv.length) {
        const ids = rv.map((r) => r.id);
        const { data: cm } = await supabase
          .from("chapter_review_comments")
          .select("id, review_id, user_id, author_role, comment, created_at")
          .in("review_id", ids)
          .order("created_at", { ascending: true });

        // Author names
        const authorIds = Array.from(new Set((cm || []).map((c) => c.user_id)));
        let nameMap: Record<string, string> = {};
        if (authorIds.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", authorIds);
          nameMap = Object.fromEntries((profs || []).map((p) => [p.user_id, p.full_name || "User"]));
        }
        const grouped: Record<string, Comment[]> = {};
        (cm || []).forEach((c) => {
          const list = grouped[c.review_id] || (grouped[c.review_id] = []);
          list.push({ ...(c as Comment), author_name: nameMap[c.user_id] || "User" });
        });
        setComments(grouped);
      } else {
        setComments({});
      }
    } catch (err) {
      console.error("Failed to load shared review history", err);
    } finally {
      setLoading(false);
    }
  }, [researchId]);

  useEffect(() => {
    fetchData();
    const ch = supabase
      .channel(`shared-review-history-${researchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chapter_review_comments", filter: `research_id=eq.${researchId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "research_chapter_reviews", filter: `research_id=eq.${researchId}` },
        () => fetchData()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [researchId, fetchData]);

  const postComment = async (reviewId: string) => {
    const text = (drafts[reviewId] || "").trim();
    if (!text || !currentUserId) return;
    setPosting(reviewId);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("chapter_review_comments").insert({
        id: createUuid(),
        review_id: reviewId,
        research_id: researchId,
        user_id: currentUserId,
        author_role: viewerRole,
        comment: text,
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
      setDrafts((d) => ({ ...d, [reviewId]: "" }));
      toast({ title: "Comment posted" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Could not post comment", description: err?.message, variant: "destructive" });
    } finally {
      setPosting(null);
    }
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from("chapter_review_comments").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    fetchData();
  };

  const roleIcon = (role: string) => {
    if (role === "supervisor") return <GraduationCap className="w-3.5 h-3.5" />;
    if (role === "admin") return <Shield className="w-3.5 h-3.5" />;
    return <UserIcon className="w-3.5 h-3.5" />;
  };

  if (loading) {
    return <Skeleton className="h-40 rounded-2xl" />;
  }

  return (
    <Card className="rounded-2xl border-border/50 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="w-5 h-5 text-primary" />
          Shared AI Review History
        </CardTitle>
        <CardDescription>
          Visible to the student and assigned supervisor. Add comments to discuss each AI review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No AI reviews yet. Once a chapter is scanned, it will appear here.
          </div>
        ) : (
          <Accordion type="multiple" className="w-full space-y-2">
            {reviews.map((r) => {
              const cs = comments[r.id] || [];
              return (
                <AccordionItem
                  key={r.id}
                  value={r.id}
                  className="border border-border/50 rounded-xl px-3 sm:px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex flex-1 items-start sm:items-center justify-between gap-3 flex-wrap text-left">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm sm:text-base truncate">
                          {r.chapter_name}
                          {r.chapter_number != null && (
                            <span className="text-muted-foreground"> · Ch {r.chapter_number}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {fmt(r.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {r.review_mode && (
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {r.review_mode}
                          </Badge>
                        )}
                        {r.rating != null && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {formatRating(r.rating)}
                          </Badge>
                        )}
                        {cs.length > 0 && (
                          <Badge className="text-[10px] gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {cs.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    {r.summary && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3">
                        {r.summary}
                      </p>
                    )}

                    <div className="space-y-2">
                      {cs.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No comments yet.</p>
                      ) : (
                        cs.map((c) => (
                          <div
                            key={c.id}
                            className="flex gap-2 p-3 rounded-lg bg-muted/40 border border-border/40"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge
                                  variant={c.author_role === "supervisor" ? "default" : "secondary"}
                                  className="text-[10px] gap-1 capitalize"
                                >
                                  {roleIcon(c.author_role)}
                                  {c.author_role}
                                </Badge>
                                <span className="text-xs font-medium">{c.author_name}</span>
                                {fmt(c.created_at) && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {fmt(c.created_at)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap break-words">{c.comment}</p>
                            </div>
                            {c.user_id === currentUserId && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => deleteComment(c.id)}
                                aria-label="Delete comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-2">
                      <Textarea
                        placeholder={
                          viewerRole === "supervisor"
                            ? "Comment as supervisor (visible to student)…"
                            : "Comment as student (visible to your supervisor)…"
                        }
                        value={drafts[r.id] || ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                        rows={2}
                        className="rounded-xl text-sm"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => postComment(r.id)}
                          disabled={!drafts[r.id]?.trim() || posting === r.id}
                          className="rounded-xl"
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          {posting === r.id ? "Posting…" : "Post Comment"}
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
