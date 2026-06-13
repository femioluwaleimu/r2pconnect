import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaperReviewFormProps {
  paperId: string;
  paperTitle: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

interface Ratings {
  methodology: number;
  originality: number;
  clarity: number;
  overall: number;
}

export default function PaperReviewForm({ paperId, paperTitle, onComplete, onCancel }: PaperReviewFormProps) {
  const [ratings, setRatings] = useState<Ratings>({
    methodology: 0,
    originality: 0,
    clarity: 0,
    overall: 0,
  });
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRatingChange = (category: keyof Ratings, value: number) => {
    setRatings(prev => ({ ...prev, [category]: value }));
  };

  const renderStars = (category: keyof Ratings, label: string) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingChange(category, star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= ratings[category]
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const handleSubmit = async (decision: 'approve' | 'reject' | 'revision') => {
    if (!feedback.trim()) {
      toast({ title: "Please provide feedback", variant: "destructive" });
      return;
    }

    if (Object.values(ratings).some(r => r === 0)) {
      toast({ title: "Please rate all categories", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert the review
      const { error: reviewError } = await supabase.from('paper_reviews').insert({
        paper_id: paperId,
        reviewer_id: user.id,
        methodology_rating: ratings.methodology,
        originality_rating: ratings.originality,
        clarity_rating: ratings.clarity,
        overall_rating: ratings.overall,
        feedback,
        decision,
      });

      if (reviewError) throw reviewError;

      // Update the paper status
      const statusMap: Record<string, string> = {
        approve: 'approved',
        reject: 'rejected',
        revision: 'revision_requested',
      };

      const { error: paperError } = await supabase
        .from('research_papers')
        .update({
          status: statusMap[decision] as any,
          reviewer_comments: feedback,
        })
        .eq('id', paperId);

      if (paperError) throw paperError;

      toast({ title: `Paper ${decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'sent for revision'}` });
      onComplete?.();
    } catch (error: any) {
      toast({ title: "Error submitting review", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-xl rounded-2xl">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-xl">Review: {paperTitle}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Ratings */}
        <div className="grid grid-cols-2 gap-6">
          {renderStars('methodology', 'Methodology')}
          {renderStars('originality', 'Originality')}
          {renderStars('clarity', 'Clarity')}
          {renderStars('overall', 'Overall Quality')}
        </div>

        {/* Feedback */}
        <div className="space-y-2">
          <Label htmlFor="feedback" className="text-sm font-medium text-foreground">
            Detailed Feedback
          </Label>
          <Textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Provide constructive feedback for the author..."
            className="min-h-[150px] rounded-xl"
          />
        </div>

        {/* Decision Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={() => handleSubmit('approve')}
            disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve
          </Button>
          <Button
            onClick={() => handleSubmit('revision')}
            disabled={loading}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Request Revision
          </Button>
          <Button
            onClick={() => handleSubmit('reject')}
            disabled={loading}
            variant="destructive"
            className="flex-1 rounded-xl"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
        </div>

        {onCancel && (
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
            className="w-full rounded-xl"
          >
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
