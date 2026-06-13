import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAICredits } from "@/hooks/useAICredits";
import ReviewModeSelector from "@/components/ai-supervisor/ReviewModeSelector";
import StyleMatchMeter from "@/components/ai-supervisor/StyleMatchMeter";
import ExaminerReadinessLabel from "@/components/ai-supervisor/ExaminerReadinessLabel";
import RevisionChecklist from "@/components/ai-supervisor/RevisionChecklist";
import EthicsBanner from "@/components/ai-supervisor/EthicsBanner";
import {
  Sparkles,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Star,
  Download,
  Copy,
  Loader2,
  FileText,
  ChevronRight,
  BarChart3,
  Plus,
  GraduationCap,
  HelpCircle,
  RefreshCw,
  Maximize2,
  Telescope,
  Target,
  ListChecks,
  Heart,
  ShieldAlert,
  Quote,
  Languages,
  Microscope,
  Library,
  Eye,
} from "lucide-react";

interface ChapterReview {
  id: string;
  chapter_name: string;
  chapter_number: number | null;
  rating: number;
  academic_clarity_score: number;
  methodology_alignment: number | null;
  strengths: string[];
  weak_areas: string[];
  recommendations: string[];
  summary: string;
  created_at: string;
  // Enhanced fields
  review_mode?: string;
  style_match_score?: number;
  examiner_readiness?: string;
  required_fixes?: string[];
  optional_improvements?: string[];
  what_to_change?: string[];
  why_it_matters?: string[];
  examiner_expectations?: string[];
  generic_examples?: string[];
  academic_level_feedback?: string[];
  purpose_based_recommendations?: string[];
  // Advanced mode fields
  suggested_improvements?: string[];
  structure_review?: string | null;
  methodology_assessment?: string | null;
  literature_review_quality?: string | null;
  clarity_readability?: string | null;
  academic_language_tone?: string | null;
  referencing_check?: string | null;
  originality_critical_thinking?: string | null;
  practical_relevance?: string | null;
  risk_gap_identification?: string[];
  ai_confidence_score?: number | null;
  ai_confidence_explanation?: string | null;
  priority_fix_list?: string[];
  next_action_steps?: string[];
  supervisor_insight?: string | null;
  encouragement_note?: string | null;
}

interface ChapterReviewPanelProps {
  researchId: string;
  researchStatus: string;
  fileUrl?: string | null;
  isOwner: boolean;
  isSupervisor?: boolean;
  supervisionType?: "institution" | "ai";
}

const DEFAULT_CHAPTERS = [
  "Chapter 1 – Introduction",
  "Chapter 2 – Literature Review",
  "Chapter 3 – Methodology",
  "Chapter 4 – Results and Findings",
  "Chapter 5 – Discussion",
  "Chapter 6 – Conclusion and Recommendations",
];

export default function ChapterReviewPanel({
  researchId,
  researchStatus,
  fileUrl,
  isOwner,
  isSupervisor = false,
  supervisionType = "institution",
}: ChapterReviewPanelProps) {
  const [reviews, setReviews] = useState<ChapterReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<ChapterReview | null>(null);
  const [customChapterOpen, setCustomChapterOpen] = useState(false);
  const [customChapter, setCustomChapter] = useState({ name: "", content: "" });
  const [chapters, setChapters] = useState<string[]>(DEFAULT_CHAPTERS);
  const [extractingFile, setExtractingFile] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<"quick" | "learning" | "advanced">("quick");
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const { toast } = useToast();
  const { creditsRemaining, refresh: refetchCredits } = useAICredits();

  const allowedStatuses = ["draft", "ongoing", "revision_requested", "under_review"];
  const canScan = isOwner && allowedStatuses.includes(researchStatus);
  const hasFile = Boolean(fileUrl);
  const isAISupervised = supervisionType === "ai";

  useEffect(() => {
    fetchReviews();
  }, [researchId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("research_chapter_reviews")
        .select("*")
        .eq("research_id", researchId)
        .order("chapter_number", { ascending: true });

      if (error) throw error;
      setReviews((data as ChapterReview[]) || []);

      const reviewedChapters = (data || []).map((r: ChapterReview) => r.chapter_name);
      const allChapters = [...new Set([...DEFAULT_CHAPTERS, ...reviewedChapters])];
      setChapters(allChapters);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const extractFileContent = async () => {
    if (!fileUrl) {
      toast({
        title: "No file uploaded",
        description: "Please upload a research document first.",
        variant: "destructive",
      });
      return;
    }

    setExtractingFile(true);
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Failed to fetch file");
      
      const blob = await response.blob();
      const fileName = fileUrl.split("/").pop()?.toLowerCase() || "";
      
      if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
        const text = await blob.text();
        setFileContent(text);
        toast({
          title: "File content extracted",
          description: "You can now scan chapters from your document.",
        });
      } else if (fileName.endsWith(".pdf") || fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
        toast({
          title: "Document detected",
          description: "Please copy the chapter text from your document and paste it in the scan dialog.",
          variant: "default",
        });
        setFileContent("DOCUMENT_DETECTED");
      } else {
        toast({
          title: "Unsupported format",
          description: "Please copy content from your document and paste it manually.",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Error extracting file:", error);
      toast({
        title: "Extraction failed",
        description: "Please copy the chapter content manually from your document.",
        variant: "destructive",
      });
    } finally {
      setExtractingFile(false);
    }
  };

  const handleScanChapter = async (chapterName: string, chapterContent: string, chapterNumber?: number) => {
    if (!canScan) {
      toast({
        title: "Cannot scan chapter",
        description: "Chapter scanning is only available for draft, ongoing, or revision_requested research.",
        variant: "destructive",
      });
      return;
    }

    if (!chapterContent.trim()) {
      toast({
        title: "Content required",
        description: "Please paste the chapter content to analyze.",
        variant: "destructive",
      });
      return;
    }

    const creditCost = reviewMode === "advanced" ? 3 : reviewMode === "learning" ? 2 : 1;
    if ((creditsRemaining || 0) < creditCost) {
      toast({
        title: "Not enough AI credits",
        description: `${reviewMode === "advanced" ? "Advanced mode requires 3 credits." : reviewMode === "learning" ? "Learning mode requires 2 credits." : "Quick review requires 1 credit."}`,
        variant: "destructive",
      });
      return;
    }

    setScanning(chapterName);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: result, error } = await supabase.functions.invoke("ai-chapter-review", {
        body: {
          research_id: researchId,
          chapter_name: chapterName,
          chapter_number: chapterNumber,
          chapter_content: chapterContent,
          review_mode: reviewMode,
        },
      });

      if (error) {
        if ((error as any).error === "AI_CREDITS_EXHAUSTED") {
          toast({
            title: "No AI Credits",
            description: (error as any).message || "Please upgrade your plan for more credits.",
            variant: "destructive",
          });
        } else {
          throw new Error((error as any).error || "Failed to scan chapter");
        }
        return;
      }

      const readinessLabel = result.review.examiner_readiness === "supervisor_ready" 
        ? "Supervisor-Ready!" 
        : result.review.examiner_readiness === "needs_revision" 
        ? "Needs some revision" 
        : "Needs work";

      toast({
        title: "Chapter analyzed!",
        description: `${chapterName}: ${result.review.rating}/5 - ${readinessLabel}`,
      });

      refetchCredits();
      fetchReviews();
      setSelectedReview(result.review);
      setCustomChapterOpen(false);
      setCustomChapter({ name: "", content: "" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setScanning(null);
    }
  };

  const getReviewForChapter = (chapterName: string) => {
    return reviews.find((r) => r.chapter_name === chapterName);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600 dark:text-green-400";
    if (rating >= 3) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRatingBadgeClass = (rating: number) => {
    if (rating >= 4) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (rating >= 3) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  const copyRecommendations = (review: ChapterReview) => {
    const text = `
${review.chapter_name} - AI Review
Rating: ${review.rating}/5
${review.examiner_readiness ? `Examiner Readiness: ${review.examiner_readiness.replace("_", " ")}` : ""}
${review.style_match_score ? `Style Match: ${review.style_match_score}%` : ""}

Summary:
${review.summary}

Strengths:
${review.strengths.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Areas for Improvement:
${review.weak_areas.map((w, i) => `${i + 1}. ${w}`).join("\n")}

${review.required_fixes?.length ? `Required Fixes:\n${review.required_fixes.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n` : ""}
${review.optional_improvements?.length ? `Optional Improvements:\n${review.optional_improvements.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n` : ""}

Recommendations:
${review.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}
    `.trim();

    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const downloadRecommendations = (review: ChapterReview) => {
    const text = `
================================================================================
AI PRE-SUPERVISOR REVIEW REPORT
${review.chapter_name.toUpperCase()}
Generated: ${new Date(review.created_at).toLocaleDateString()}
================================================================================

OVERALL RATING: ${review.rating}/5
ACADEMIC CLARITY: ${review.academic_clarity_score}/5
${review.methodology_alignment ? `METHODOLOGY ALIGNMENT: ${review.methodology_alignment}/5` : ""}
${review.style_match_score ? `STYLE MATCH: ${review.style_match_score}%` : ""}
${review.examiner_readiness ? `EXAMINER READINESS: ${review.examiner_readiness.replace("_", " ").toUpperCase()}` : ""}

--------------------------------------------------------------------------------
SUMMARY
--------------------------------------------------------------------------------
${review.summary}

--------------------------------------------------------------------------------
STRENGTHS
--------------------------------------------------------------------------------
${review.strengths.map((s, i) => `${i + 1}. ${s}`).join("\n\n")}

--------------------------------------------------------------------------------
AREAS FOR IMPROVEMENT
--------------------------------------------------------------------------------
${review.weak_areas.map((w, i) => `${i + 1}. ${w}`).join("\n\n")}

${review.required_fixes?.length ? `
--------------------------------------------------------------------------------
REQUIRED FIXES
--------------------------------------------------------------------------------
${review.required_fixes.map((r, i) => `${i + 1}. ${r}`).join("\n\n")}
` : ""}

${review.optional_improvements?.length ? `
--------------------------------------------------------------------------------
OPTIONAL IMPROVEMENTS
--------------------------------------------------------------------------------
${review.optional_improvements.map((r, i) => `${i + 1}. ${r}`).join("\n\n")}
` : ""}

${review.what_to_change?.length ? `
--------------------------------------------------------------------------------
WHAT TO CHANGE
--------------------------------------------------------------------------------
${review.what_to_change.map((r, i) => `${i + 1}. ${r}`).join("\n\n")}
` : ""}

${review.why_it_matters?.length ? `
--------------------------------------------------------------------------------
WHY IT MATTERS ACADEMICALLY
--------------------------------------------------------------------------------
${review.why_it_matters.map((r, i) => `${i + 1}. ${r}`).join("\n\n")}
` : ""}

${review.examiner_expectations?.length ? `
--------------------------------------------------------------------------------
WHAT EXAMINERS EXPECT
--------------------------------------------------------------------------------
${review.examiner_expectations.map((r, i) => `${i + 1}. ${r}`).join("\n\n")}
` : ""}

--------------------------------------------------------------------------------
RECOMMENDATIONS
--------------------------------------------------------------------------------
${review.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n\n")}

================================================================================
DISCLAIMER
================================================================================
This AI-generated review is advisory only. AI guidance is meant to assist your 
learning and preparation but does NOT replace human supervision. Final academic 
decisions and approvals remain with your assigned supervisor.

Approved projects typically include certain patterns and structures. This report
references general academic standards only - no specific content from other 
works has been used or shown.
================================================================================
    `.trim();

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${review.chapter_name.replace(/[^a-zA-Z0-9]/g, "_")}_AI_Review.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const supervisorReadyCount = reviews.filter(r => r.examiner_readiness === "supervisor_ready").length;

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading chapter reviews...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
      <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/20 flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap">
                AI Chapter Review
                {isAISupervised && (
                  <Badge variant="secondary" className="text-xs">
                    <GraduationCap className="w-3 h-3 mr-1" />
                    AI Supervised
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Get detailed feedback on each chapter
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {supervisorReadyCount > 0 && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                {supervisorReadyCount} Ready
              </Badge>
            )}
            {averageRating && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 text-sm">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="font-semibold">{averageRating}/5</span>
              </div>
            )}
            {canScan && (
              <Badge variant="outline" className="bg-background/80 text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                {creditsRemaining || 0} credits
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Ethics Banner for AI Supervised */}
        {isAISupervised && (
          <div className="p-3 border-b border-border/50">
            <EthicsBanner variant="compact" />
          </div>
        )}

        {/* File Extraction Banner */}
        {canScan && hasFile && !fileContent && (
          <div className="p-3 border-b border-border/50 bg-primary/5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  A research document is uploaded. Extract content to scan chapters.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={extractFileContent}
                disabled={extractingFile}
                className="h-8"
              >
                {extractingFile ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <FileText className="w-3 h-3 mr-1" />
                    Load Document
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
        
        {fileContent === "DOCUMENT_DETECTED" && (
          <div className="p-3 border-b border-border/50 bg-amber-500/10">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span>
                PDF/Word detected. Please copy each chapter's text from your document and paste it in the scan dialog.
              </span>
            </div>
          </div>
        )}

        {/* Review Mode Selector - Show when scanning is available */}
        {canScan && (
          <div className="p-4 border-b border-border/50 bg-muted/20">
            <ReviewModeSelector
              value={reviewMode}
              onChange={setReviewMode}
              creditsRemaining={creditsRemaining || 0}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5">
          {/* Chapter List */}
          <div className="lg:col-span-2 border-b lg:border-b-0 lg:border-r border-border/50">
            <div className="p-3 border-b border-border/50 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Chapters</span>
                {canScan && (
                  <Dialog open={customChapterOpen} onOpenChange={setCustomChapterOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        Custom
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Scan Custom Chapter</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Chapter Name</Label>
                          <Input
                            placeholder="e.g., Chapter 7 – Appendix"
                            value={customChapter.name}
                            onChange={(e) => setCustomChapter((p) => ({ ...p, name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Chapter Content</Label>
                          <Textarea
                            placeholder="Paste the chapter text here..."
                            value={customChapter.content}
                            onChange={(e) => setCustomChapter((p) => ({ ...p, content: e.target.value }))}
                            className="min-h-[200px] font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            {customChapter.content.length.toLocaleString()} characters
                          </p>
                        </div>
                        <Button
                          onClick={() => handleScanChapter(customChapter.name, customChapter.content)}
                          disabled={!customChapter.name || !customChapter.content || scanning !== null}
                          className="w-full"
                        >
                          {scanning ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Scan with AI ({reviewMode === "learning" ? 2 : 1} credit{reviewMode === "learning" ? "s" : ""})
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            <ScrollArea className="h-[300px] lg:h-[400px]">
              <div className="p-2 space-y-1">
                {chapters.map((chapter, idx) => {
                  const review = getReviewForChapter(chapter);
                  const isSelected = selectedReview?.chapter_name === chapter;

                  return (
                    <ChapterListItem
                      key={chapter}
                      chapterName={chapter}
                      chapterNumber={idx + 1}
                      review={review}
                      isSelected={isSelected}
                      canScan={canScan}
                      isScanning={scanning === chapter}
                      reviewMode={reviewMode}
                      onSelect={() => review && setSelectedReview(review)}
                      onScan={(content) => handleScanChapter(chapter, content, idx + 1)}
                      onRescan={(content) => handleScanChapter(chapter, content, idx + 1)}
                      getRatingBadgeClass={getRatingBadgeClass}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Review Details */}
          <div className="lg:col-span-3">
            {selectedReview ? (
              <ReviewDetails
                review={selectedReview}
                onCopy={() => copyRecommendations(selectedReview)}
                onDownload={() => downloadRecommendations(selectedReview)}
                onFullscreen={() => setFullscreenOpen(true)}
                getRatingColor={getRatingColor}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] lg:h-[400px] text-muted-foreground p-6">
                <BookOpen className="w-12 h-12 mb-4 opacity-40" />
                <p className="text-center">
                  {reviews.length > 0
                    ? "Select a reviewed chapter to view feedback"
                    : canScan
                    ? "Scan a chapter to get AI-powered feedback"
                    : "No chapter reviews available yet"}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Fullscreen Review Dialog */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[100vw] sm:max-w-5xl w-full h-[100vh] sm:h-[92vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="p-4 border-b border-border/50 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Maximize2 className="w-4 h-4 text-primary" />
              {selectedReview ? selectedReview.chapter_name : "Review"} — Full Scan
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {selectedReview && (
              <ReviewDetails
                review={selectedReview}
                onCopy={() => copyRecommendations(selectedReview)}
                onDownload={() => downloadRecommendations(selectedReview)}
                getRatingColor={getRatingColor}
                variant="fullscreen"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Sub-components
interface ChapterListItemProps {
  chapterName: string;
  chapterNumber: number;
  review?: ChapterReview;
  isSelected: boolean;
  canScan: boolean;
  isScanning: boolean;
  reviewMode: "quick" | "learning" | "advanced";
  onSelect: () => void;
  onScan: (content: string) => void;
  onRescan: (content: string) => void;
  getRatingBadgeClass: (rating: number) => string;
}

function ChapterListItem({
  chapterName,
  chapterNumber,
  review,
  isSelected,
  canScan,
  isScanning,
  reviewMode,
  onSelect,
  onScan,
  onRescan,
  getRatingBadgeClass,
}: ChapterListItemProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [content, setContent] = useState("");
  const [rescanDialogOpen, setRescanDialogOpen] = useState(false);

  const handleScan = () => {
    onScan(content);
    setDialogOpen(false);
    setContent("");
  };

  const handleRescan = () => {
    onRescan(content);
    setRescanDialogOpen(false);
    setContent("");
  };

  const creditCost = reviewMode === "advanced" ? 3 : reviewMode === "learning" ? 2 : 1;

  return (
    <div
      className={`p-3 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? "border-primary bg-primary/5"
          : review
          ? "border-border/50 hover:border-primary/50 bg-card"
          : "border-dashed border-border/50 hover:border-border bg-transparent"
      }`}
      onClick={review ? onSelect : undefined}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
              review ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {chapterNumber}
          </div>
          <span className="text-sm break-words flex-1">{chapterName}</span>
          {review && (
            <Badge className={`${getRatingBadgeClass(review.rating)} flex-shrink-0`}>
              <Star className="w-3 h-3 mr-1 fill-current" />
              {review.rating}
            </Badge>
          )}
        </div>

        {review?.examiner_readiness && (
          <div className="ml-8">
            <ExaminerReadinessLabel 
              readiness={review.examiner_readiness as "not_ready" | "needs_revision" | "supervisor_ready"} 
              size="sm" 
            />
          </div>
        )}

        <div className="flex items-center gap-2 ml-8">
          {review ? (
            <>
              {canScan && (
                <Dialog open={rescanDialogOpen} onOpenChange={setRescanDialogOpen}>
                  <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      disabled={isScanning}
                      title="Rescan chapter"
                    >
                      {isScanning ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5" />
                        Rescan {chapterName}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Alert className="border-amber-500/20 bg-amber-500/5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <AlertDescription>
                          This will replace the existing review with a new analysis. Use this after making revisions to see your improvement.
                        </AlertDescription>
                      </Alert>
                      <div className="space-y-2">
                        <Label>Paste Updated Chapter Content</Label>
                        <Textarea
                          placeholder="Paste the updated text content of this chapter here..."
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          className="min-h-[250px] font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          {content.length.toLocaleString()} characters (up to {reviewMode === "advanced" ? "25,000" : reviewMode === "learning" ? "20,000" : "15,000"} will be analyzed)
                        </p>
                      </div>
                      <Button
                        onClick={handleRescan}
                        disabled={!content.trim() || isScanning}
                        className="w-full"
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Rescan with AI ({creditCost} credit{creditCost > 1 ? "s" : ""})
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          ) : canScan ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Scan
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>Scan {chapterName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Paste Chapter Content</Label>
                    <Textarea
                      placeholder="Paste the text content of this chapter here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[250px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {content.length.toLocaleString()} characters (up to {reviewMode === "advanced" ? "25,000" : reviewMode === "learning" ? "20,000" : "15,000"} will be analyzed)
                    </p>
                  </div>
                  <Button
                    onClick={handleScan}
                    disabled={!content.trim() || isScanning}
                    className="w-full"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Scan with AI ({creditCost} credit{creditCost > 1 ? "s" : ""})
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Badge variant="outline" className="text-xs">
              Not scanned
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReviewDetailsProps {
  review: ChapterReview;
  onCopy: () => void;
  onDownload: () => void;
  onFullscreen?: () => void;
  getRatingColor: (rating: number) => string;
  variant?: "panel" | "fullscreen";
}

function ReviewDetails({ review, onCopy, onDownload, onFullscreen, getRatingColor, variant = "panel" }: ReviewDetailsProps) {
  const hasEnhancedData = review.required_fixes?.length || review.what_to_change?.length;
  const isAdvanced = review.review_mode === "advanced";
  const modeLabel = review.review_mode === "advanced"
    ? "Advanced Mode"
    : review.review_mode === "learning"
    ? "Learning Mode"
    : "Quick Review";

  const containerClass = variant === "fullscreen"
    ? "h-full overflow-y-auto"
    : "h-auto max-h-[80vh] lg:max-h-[500px] overflow-y-auto";

  return (
    <div className={containerClass}>
      <div className="p-3 sm:p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold">{review.chapter_name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-xs text-muted-foreground">
                Reviewed {new Date(review.created_at).toLocaleDateString()}
              </p>
              {review.review_mode && (
                <Badge variant="outline" className="text-xs">
                  {isAdvanced && <Telescope className="w-3 h-3 mr-1" />}
                  {modeLabel}
                </Badge>
              )}
              {typeof review.ai_confidence_score === "number" && (
                <Badge className="text-xs bg-primary text-primary-foreground">
                  AI Confidence: {review.ai_confidence_score}/100
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {onFullscreen && variant === "panel" && (
              <Button size="sm" variant="outline" onClick={onFullscreen} title="Open fullscreen">
                <Maximize2 className="w-3 h-3 mr-1" />
                Fullscreen
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onCopy}>
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
            <Button size="sm" variant="outline" onClick={onDownload}>
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Examiner Readiness */}
        {review.examiner_readiness && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-sm font-medium">Examiner Readiness</span>
            <ExaminerReadinessLabel 
              readiness={review.examiner_readiness as "not_ready" | "needs_revision" | "supervisor_ready"} 
              size="md" 
              showIcon 
            />
          </div>
        )}

        {/* Style Match Meter */}
        {review.style_match_score !== undefined && review.style_match_score !== null && (
          <StyleMatchMeter score={review.style_match_score} />
        )}

        {/* Ratings */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className={`text-2xl font-bold ${getRatingColor(review.rating)}`}>
              {review.rating}
            </div>
            <div className="text-xs text-muted-foreground">Overall</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className={`text-2xl font-bold ${getRatingColor(review.academic_clarity_score)}`}>
              {review.academic_clarity_score}
            </div>
            <div className="text-xs text-muted-foreground">Clarity</div>
          </div>
          {review.methodology_alignment && (
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className={`text-2xl font-bold ${getRatingColor(review.methodology_alignment)}`}>
                {review.methodology_alignment}
              </div>
              <div className="text-xs text-muted-foreground">Methodology</div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="p-3 rounded-lg border border-border/50 bg-card">
          <p className="text-sm leading-relaxed">{review.summary}</p>
        </div>

        {/* Revision Checklist - Show if we have required fixes */}
        {hasEnhancedData && (review.required_fixes?.length || review.optional_improvements?.length) && (
          <RevisionChecklist
            chapterName={review.chapter_name}
            requiredFixes={review.required_fixes || []}
            optionalImprovements={review.optional_improvements || []}
          />
        )}

        {/* Tabs for details */}
        <Tabs defaultValue="strengths" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="strengths" className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Strengths
            </TabsTrigger>
            <TabsTrigger value="weak" className="text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              Weak Areas
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs">
              <Lightbulb className="w-3 h-3 mr-1" />
              Tips
            </TabsTrigger>
          </TabsList>

          <TabsContent value="strengths" className="mt-3 space-y-2">
            {review.strengths.map((item, idx) => (
              <div
                key={idx}
                className="flex gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
              >
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{item}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="weak" className="mt-3 space-y-2">
            {review.weak_areas.map((item, idx) => (
              <div
                key={idx}
                className="flex gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
              >
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{item}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="recommendations" className="mt-3 space-y-2">
            {review.recommendations.map((item, idx) => (
              <div
                key={idx}
                className="flex gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
              >
                <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{item}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {/* Adaptive Feedback (always shown when present) */}
        {review.academic_level_feedback?.length ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              Academic Level Feedback
            </h4>
            {review.academic_level_feedback.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-sm">
                {item}
              </div>
            ))}
          </div>
        ) : null}

        {review.purpose_based_recommendations?.length ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-emerald-600" />
              Purpose-Based Recommendations
            </h4>
            {review.purpose_based_recommendations.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm">
                {item}
              </div>
            ))}
          </div>
        ) : null}

        {/* Learning Mode Extra Content */}
        {review.review_mode === "learning" && (
          <>
            {review.why_it_matters?.length ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  Why It Matters Academically
                </h4>
                {review.why_it_matters.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                    {item}
                  </div>
                ))}
              </div>
            ) : null}

            {review.examiner_expectations?.length ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  What Examiners Expect
                </h4>
                {review.examiner_expectations.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50 border border-border/50 text-sm">
                    {item}
                  </div>
                ))}
              </div>
            ) : null}

            {review.generic_examples?.length ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Generic Examples
                </h4>
                <p className="text-xs text-muted-foreground">
                  Approved projects typically include patterns like:
                </p>
                {review.generic_examples.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border/50 text-sm italic">
                    "{item}"
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}

        {/* Advanced Mode Deep Sections */}
        {isAdvanced && (
          <div className="space-y-4">
            {review.suggested_improvements?.length ? (
              <DeepListSection title="Suggested Improvements" icon={Lightbulb} color="blue" items={review.suggested_improvements} />
            ) : null}

            {review.structure_review ? (
              <DeepTextSection title="Structure & Organization" icon={ListChecks} text={review.structure_review} />
            ) : null}

            {review.methodology_assessment ? (
              <DeepTextSection title="Methodology Assessment" icon={Microscope} text={review.methodology_assessment} />
            ) : null}

            {review.literature_review_quality ? (
              <DeepTextSection title="Literature Review Quality" icon={Library} text={review.literature_review_quality} />
            ) : null}

            {review.clarity_readability ? (
              <DeepTextSection title="Clarity & Readability" icon={Eye} text={review.clarity_readability} />
            ) : null}

            {review.academic_language_tone ? (
              <DeepTextSection title="Academic Language & Tone" icon={Languages} text={review.academic_language_tone} />
            ) : null}

            {review.referencing_check ? (
              <DeepTextSection title="Referencing & Citation Check" icon={Quote} text={review.referencing_check} />
            ) : null}

            {review.originality_critical_thinking ? (
              <DeepTextSection title="Originality & Critical Thinking" icon={Sparkles} text={review.originality_critical_thinking} />
            ) : null}

            {review.practical_relevance ? (
              <DeepTextSection title="Practical Relevance" icon={Target} text={review.practical_relevance} />
            ) : null}

            {review.risk_gap_identification?.length ? (
              <DeepListSection title="Risk & Gap Identification" icon={ShieldAlert} color="red" items={review.risk_gap_identification} />
            ) : null}

            {(typeof review.ai_confidence_score === "number" || review.ai_confidence_explanation) && (
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  AI Confidence Score
                </h4>
                {typeof review.ai_confidence_score === "number" && (
                  <>
                    <div className="text-3xl font-bold text-primary">{review.ai_confidence_score}/100</div>
                    <Progress value={review.ai_confidence_score} className="h-2" />
                  </>
                )}
                {review.ai_confidence_explanation && (
                  <p className="text-sm text-muted-foreground">{review.ai_confidence_explanation}</p>
                )}
              </div>
            )}

            {review.priority_fix_list?.length ? (
              <DeepListSection title="Priority Fix List" icon={AlertCircle} color="amber" items={review.priority_fix_list} ordered />
            ) : null}

            {review.next_action_steps?.length ? (
              <DeepListSection title="Next Action Steps" icon={ChevronRight} color="emerald" items={review.next_action_steps} ordered />
            ) : null}

            {review.supervisor_insight ? (
              <DeepTextSection title="Supervisor Insight" icon={GraduationCap} text={review.supervisor_insight} />
            ) : null}

            {review.encouragement_note ? (
              <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-emerald-600" />
                  Encouragement
                </h4>
                <p className="text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">{review.encouragement_note}</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border/50">
          ⚠️ AI guidance is advisory only. Final academic decisions remain with your supervisor.
        </p>
      </div>
    </div>
  );
}

// Deep section helpers (used by Advanced Mode)
type DeepColor = "blue" | "amber" | "red" | "emerald" | "indigo";

const COLOR_CLASSES: Record<DeepColor, string> = {
  blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  amber: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  emerald: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
  indigo: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
};

function DeepListSection({
  title,
  icon: Icon,
  color,
  items,
  ordered = false,
}: {
  title: string;
  icon: any;
  color: DeepColor;
  items: string[];
  ordered?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h4>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className={`flex gap-2 p-3 rounded-lg border text-sm ${COLOR_CLASSES[color]}`}>
            {ordered && (
              <span className="font-semibold text-primary flex-shrink-0">{idx + 1}.</span>
            )}
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeepTextSection({
  title,
  icon: Icon,
  text,
}: {
  title: string;
  icon: any;
  text: string;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h4>
      <div className="p-3 rounded-lg border border-border/50 bg-muted/30 text-sm leading-relaxed whitespace-pre-line">
        {text}
      </div>
    </div>
  );
}
