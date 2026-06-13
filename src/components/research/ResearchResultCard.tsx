import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye, Download, Quote, Bookmark, BookmarkCheck, Share2,
  FileText, Sparkles, Film, Banknote, GraduationCap, Building2, User
} from "lucide-react";

export interface PublicPaper {
  id: string;
  title: string;
  abstract: string | null;
  ai_summary?: string | null;
  keywords: string[] | null;
  views_count: number | null;
  downloads_count: number | null;
  citation_count?: number | null;
  published_at: string | null;
  year_completed?: number | null;
  author_id: string;
  author_names?: string[] | null;
  institution_id?: string | null;
  supervisor_id?: string | null;
  research_field?: string | null;
  research_level?: string | null;
  research_stage?: string | null;
  funding_status?: string | null;
  funding_required?: number | null;
  file_url?: string | null;
  download_credit_cost?: number;
  sdg_category?: string | null;
  institutionName?: string | null;
  supervisorName?: string | null;
}

interface Props {
  paper: PublicPaper;
  saved: boolean;
  onCite: (p: PublicPaper) => void;
  onSave: (p: PublicPaper) => void;
  onShare: (p: PublicPaper) => void;
  onPreview: (p: PublicPaper) => void;
}

export default function ResearchResultCard({ paper, saved, onCite, onSave, onShare, onPreview }: Props) {
  const year =
    paper.year_completed ??
    (paper.published_at ? new Date(paper.published_at).getFullYear() : null);
  const isFree = !paper.download_credit_cost || paper.download_credit_cost === 0;
  const fundingNeeded = paper.funding_status === "needed" || (paper.funding_required ?? 0) > 0;

  return (
    <Card className="p-5 md:p-6 rounded-2xl border-border/60 hover:border-primary/40 hover:shadow-md transition-all">
      <div className="flex flex-col gap-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <Link to={`/research/${paper.id}`} className="flex-1 min-w-0 group">
            <h3 className="text-lg md:text-xl font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
              {paper.title}
            </h3>
          </Link>
          <button
            onClick={() => onSave(paper)}
            className="p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
            aria-label={saved ? "Remove from library" : "Save to library"}
          >
            {saved ? (
              <BookmarkCheck className="w-5 h-5 text-primary" />
            ) : (
              <Bookmark className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Author / institution / year line */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {paper.author_names && paper.author_names.length > 0 && (
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <Link to={`/researcher/${paper.author_id}`} className="hover:text-primary hover:underline">
                {paper.author_names.join(", ")}
              </Link>
            </span>
          )}
          {paper.institutionName && (
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> {paper.institutionName}
            </span>
          )}
          {paper.supervisorName && (
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> Supervised by {paper.supervisorName}
            </span>
          )}
          {year && <span>· {year}</span>}
        </div>

        {/* Abstract */}
        {(paper.ai_summary || paper.abstract) && (
          <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed">
            {paper.ai_summary || paper.abstract}
          </p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {paper.research_field && (
            <Badge variant="secondary" className="rounded-full text-xs">{paper.research_field}</Badge>
          )}
          {paper.research_level && (
            <Badge variant="outline" className="rounded-full text-xs">{paper.research_level}</Badge>
          )}
          {paper.research_stage && (
            <Badge variant="outline" className="rounded-full text-xs">{paper.research_stage}</Badge>
          )}
          {paper.sdg_category && (
            <Badge className="rounded-full text-xs bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-0">
              SDG · {paper.sdg_category}
            </Badge>
          )}
          {paper.ai_summary && (
            <Badge className="rounded-full text-xs bg-violet-500/15 text-violet-700 hover:bg-violet-500/20 border-0">
              <Sparkles className="w-3 h-3" /> AI summary
            </Badge>
          )}
          {fundingNeeded && (
            <Badge className="rounded-full text-xs bg-amber-500/15 text-amber-800 hover:bg-amber-500/20 border-0">
              <Banknote className="w-3 h-3" /> Funding needed
            </Badge>
          )}
          {paper.file_url && (
            <Badge className="rounded-full text-xs bg-blue-500/15 text-blue-700 hover:bg-blue-500/20 border-0">
              <FileText className="w-3 h-3" /> {isFree ? "Free PDF" : "Paid PDF"}
            </Badge>
          )}
          {paper.keywords?.slice(0, 3).map((k, i) => (
            <Badge key={i} variant="secondary" className="rounded-full text-xs font-normal">{k}</Badge>
          ))}
        </div>

        {/* Stats + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 mt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {paper.views_count || 0}</span>
            <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" /> {paper.downloads_count || 0}</span>
            <span className="flex items-center gap-1"><Quote className="w-3.5 h-3.5" /> {paper.citation_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button size="sm" variant="ghost" onClick={() => onPreview(paper)} className="h-8 px-2.5 text-xs">
              Preview
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onCite(paper)} className="h-8 px-2.5 text-xs">
              <Quote className="w-3.5 h-3.5" /> Cite
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onShare(paper)} className="h-8 px-2.5 text-xs">
              <Share2 className="w-3.5 h-3.5" />
            </Button>
            <Link to={`/research/${paper.id}`}>
              <Button size="sm" className="h-8 px-3 text-xs">View</Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
