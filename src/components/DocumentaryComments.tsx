import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Loader2, Trash2, Clock } from "lucide-react";
import type { User } from "@/integrations/supabase/client";
import { formatLagos } from "@/lib/dateUtils";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  commenter?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface DocumentaryCommentsProps {
  documentaryId: string;
}

export function DocumentaryComments({ documentaryId }: DocumentaryCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, [documentaryId]);

  const fetchComments = async () => {
    setLoading(true);
    const { data: commentsData, error } = await supabase
      .from("documentary_comments")
      .select("*")
      .eq("documentary_id", documentaryId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching comments:", error);
      setLoading(false);
      return;
    }

    // Fetch user profiles for all commenters
    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      
      const enrichedComments = commentsData.map((comment) => ({
        ...comment,
        commenter: profileMap.get(comment.user_id) || { full_name: "Anonymous", avatar_url: null },
      }));
      
      setComments(enrichedComments);
    } else {
      setComments([]);
    }
    
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to leave a comment",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from("documentary_comments")
      .insert({
        documentary_id: documentaryId,
        user_id: user.id,
        content: newComment.trim(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Get user's profile for display
    const { data: profile } = await supabase
      .from("public_profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .single();

    const newCommentWithProfile: Comment = {
      ...data,
      commenter: profile || { full_name: user.email?.split("@")[0] || "User", avatar_url: null },
    };

    setComments([newCommentWithProfile, ...comments]);
    setNewComment("");
    setSubmitting(false);
    toast({ title: "Comment posted" });
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase
      .from("documentary_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
      return;
    }

    setComments(comments.filter((c) => c.id !== commentId));
    toast({ title: "Comment deleted" });
  };

  const formatRelativeDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatLagos(dateStr, "dd MMM yyyy, HH:mm");
  };

  const formatFullDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Date unavailable";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return formatLagos(dateStr, "dd MMM yyyy, HH:mm");
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment Input - Only for signed in users */}
        {user ? (
          <div className="flex gap-3">
            <Textarea
              placeholder="Share your thoughts..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none rounded-xl"
            />
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              size="icon"
              className="h-auto rounded-xl"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center py-4 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground mb-2">Sign in to leave a comment</p>
            <Button variant="outline" size="sm" asChild>
              <a href="/auth">Sign In</a>
            </Button>
          </div>
        )}

        {/* Comments List */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 rounded-xl bg-muted/30">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={comment.commenter?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {comment.commenter?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">
                        {comment.commenter?.full_name || "Anonymous"}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                        title={formatFullDate(comment.created_at)}
                      >
                        <Clock className="w-3 h-3" />
                        {formatRelativeDate(comment.created_at) || formatFullDate(comment.created_at)}
                      </span>
                    </div>
                    {user?.id === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
