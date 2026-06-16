import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { useSEO } from "@/hooks/useSEO";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, X, ArrowDownAZ } from "lucide-react";
import ResearchFiltersPanel, { emptyFilters, type ResearchFilters } from "@/components/research/ResearchFiltersPanel";
import ResearchResultCard, { type PublicPaper } from "@/components/research/ResearchResultCard";
import CitationDialog from "@/components/research/CitationDialog";
import ResearchPreviewModal from "@/components/research/ResearchPreviewModal";

type SortKey =
  | "relevance" | "newest" | "oldest" | "most_cited"
  | "most_viewed" | "most_downloaded" | "funding";

const PAGE_SIZE = 12;

const toStringArray = (value: unknown): string[] | null => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      // Fall through to comma-separated legacy data.
    }

    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return null;
};

export default function ResearchPublic() {
  useSEO({
    title: "Research Discovery | R2PConnect",
    description:
      "Search, filter, cite and download peer-reviewed Nigerian research. Discover student, undergraduate, MSc and PhD work across every field on R2PConnect.",
    url: "/research",
    keywords: "Nigerian research, research papers, scholarly articles, R2PConnect, academic search",
  });

  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [debounced, setDebounced] = useState(query);
  const [filters, setFilters] = useState<ResearchFilters>(emptyFilters);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [papers, setPapers] = useState<PublicPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);

  // Cite/preview dialogs
  const [citePaper, setCitePaper] = useState<PublicPaper | null>(null);
  const [previewPaper, setPreviewPaper] = useState<PublicPaper | null>(null);

  // Auth + saved
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setSavedIds(new Set()); return; }
    supabase.from("saved_research").select("paper_id").eq("user_id", userId).then(({ data }) => {
      setSavedIds(new Set((data || []).map((r: any) => r.paper_id)));
    });
  }, [userId]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Sync URL
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (debounced) next.set("q", debounced); else next.delete("q");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Load papers
  const fetchPapers = useCallback(async (resetPage = true) => {
    setLoading(true);
    try {
      const currentPage = resetPage ? 0 : page;

      let q = supabase
        .from("research_papers")
        .select(
          "id,title,abstract,ai_summary,keywords,views_count,downloads_count,citation_count,published_at,year_completed,author_id,author_names,institution_id,supervisor_id,research_field,research_level,research_stage,funding_status,funding_required,file_url,download_credit_cost,sdg_category",
          { count: "exact" }
        )
        .eq("status", "published");

    // Search
    if (debounced.trim()) {
      const raw = debounced.trim();
      const term = `%${raw}%`;

      // Resolve researcher / supervisor names → user_ids so we can match author_id & supervisor_id
      const { data: nameMatches } = await supabase
        .from("public_profiles")
        .select("user_id")
        .ilike("full_name", term)
        .limit(50);
      const matchedIds = (nameMatches || []).map((r: any) => r.user_id).filter(Boolean);

      const orParts = [
        `title.ilike.${term}`,
        `abstract.ilike.${term}`,
        `research_field.ilike.${term}`,
      ];
      if (matchedIds.length) {
        const idList = `(${matchedIds.join(",")})`;
        orParts.push(`author_id.in.${idList}`);
        orParts.push(`supervisor_id.in.${idList}`);
      }
      q = q.or(orParts.join(","));
    }

    // Filters
    if (filters.field !== "all") q = q.eq("research_field", filters.field);
    if (filters.level !== "all") q = q.eq("research_level", filters.level);
    if (filters.stage !== "all") q = q.eq("research_stage", filters.stage);
    if (filters.sdg !== "all") q = q.eq("sdg_category", filters.sdg);
    if (filters.yearFrom) q = q.gte("year_completed", parseInt(filters.yearFrom));
    if (filters.yearTo) q = q.lte("year_completed", parseInt(filters.yearTo));
    if (filters.hasFile) q = q.not("file_url", "is", null);
    if (filters.hasAISummary) q = q.not("ai_summary", "is", null);
    if (filters.fundingNeeded) q = q.eq("funding_status", "needed");
    if (filters.freeOnly) q = q.eq("download_credit_cost", 0);

    // Sort
    switch (sort) {
      case "newest": q = q.order("published_at", { ascending: false, nullsFirst: false }); break;
      case "oldest": q = q.order("published_at", { ascending: true, nullsFirst: false }); break;
      case "most_cited": q = q.order("citation_count", { ascending: false }); break;
      case "most_viewed": q = q.order("views_count", { ascending: false, nullsFirst: false }); break;
      case "most_downloaded": q = q.order("downloads_count", { ascending: false, nullsFirst: false }); break;
      case "funding": q = q.eq("funding_status", "needed").order("funding_required", { ascending: false, nullsFirst: false }); break;
      default: q = q.order("published_at", { ascending: false, nullsFirst: false });
    }

    const from = currentPage * PAGE_SIZE;
    q = q.range(from, from + PAGE_SIZE - 1);

      const { data, error } = await q;
      if (error) {
        throw error;
      }

      const rows = (data || []) as any[];

    // Resolve institution + supervisor + author names
    const instIds = Array.from(new Set(rows.map((r) => r.institution_id).filter(Boolean)));
    const supIds = Array.from(new Set(rows.map((r) => r.supervisor_id).filter(Boolean)));
    const authorIds = Array.from(new Set(rows.map((r) => r.author_id).filter(Boolean)));
    const profileIds = Array.from(new Set([...supIds, ...authorIds]));

    const [instRes, profRes] = await Promise.all([
      instIds.length ? supabase.from("institutions").select("id,name").in("id", instIds) : Promise.resolve({ data: [] as any[] }),
      profileIds.length ? supabase.from("public_profiles").select("user_id,full_name").in("user_id", profileIds) : Promise.resolve({ data: [] as any[] }),
    ]);

      const instMap = new Map((instRes.data || []).map((i: any) => [i.id, i.name]));
      const profMap = new Map((profRes.data || []).map((s: any) => [s.user_id, s.full_name]));

      const enriched: PublicPaper[] = rows.map((r) => {
        const authorNames = toStringArray(r.author_names);
        const fallback = profMap.get(r.author_id);
        return {
          ...r,
          author_names: authorNames?.length ? authorNames : (fallback ? [fallback] : null),
          keywords: toStringArray(r.keywords),
          institutionName: r.institution_id ? instMap.get(r.institution_id) : null,
          supervisorName: r.supervisor_id ? profMap.get(r.supervisor_id) : null,
        };
      });

      if (resetPage) setPapers(enriched);
      else setPapers((prev) => [...prev, ...enriched]);

      setHasMore(enriched.length === PAGE_SIZE);
      if (resetPage) setPage(1); else setPage((p) => p + 1);
    } catch (error: any) {
      toast({ title: "Could not load research", description: error.message, variant: "destructive" });
      if (resetPage) {
        setPapers([]);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [debounced, filters, sort, page, toast]);

  const hasActiveQuery = debounced.trim().length > 0;
  const hasActiveFilter = false; // computed below via activeFilterCount, but we want search-only gating

  useEffect(() => {
    if (!debounced.trim()) {
      setPapers([]);
      setHasMore(false);
      setLoading(false);
      setPage(0);
      return;
    }
    fetchPapers(true);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [debounced, filters, sort]);

  // Suggestions
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("research_papers")
        .select("title")
        .eq("status", "published")
        .ilike("title", `%${query}%`)
        .limit(5);
      setSuggestions((data || []).map((d: any) => d.title));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const fields = useMemo(() => {
    const set = new Set<string>();
    papers.forEach((p) => p.research_field && set.add(p.research_field));
    return Array.from(set).sort();
  }, [papers]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.field !== "all") n++;
    if (filters.level !== "all") n++;
    if (filters.stage !== "all") n++;
    if (filters.sdg !== "all") n++;
    if (filters.yearFrom) n++;
    if (filters.yearTo) n++;
    if (filters.hasFile) n++;
    if (filters.hasAISummary) n++;
    if (filters.fundingNeeded) n++;
    if (filters.freeOnly) n++;
    return n;
  }, [filters]);

  const handleSave = async (paper: PublicPaper) => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Create an account or log in to save research to your library.",
      });
      window.location.href = "/auth?mode=login";
      return;
    }
    if (savedIds.has(paper.id)) {
      await supabase.from("saved_research").delete().eq("user_id", userId).eq("paper_id", paper.id);
      const next = new Set(savedIds); next.delete(paper.id); setSavedIds(next);
      toast({ title: "Removed from your library" });
    } else {
      const { error } = await supabase.from("saved_research").insert({ user_id: userId, paper_id: paper.id });
      if (error) {
        toast({ title: "Could not save", description: error.message, variant: "destructive" });
        return;
      }
      const next = new Set(savedIds); next.add(paper.id); setSavedIds(next);
      toast({ title: "Saved to your library" });
    }
  };

  const handleShare = async (paper: PublicPaper) => {
    const url = `${window.location.origin}/research/${paper.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: paper.title, url }); return; } catch { /* user cancel */ }
    }
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied", description: "Research link copied to clipboard." });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "R2PConnect Research Discovery",
          description: "Search and discover Nigerian research papers across every academic field.",
          url: "https://r2pconnect.com/research",
        }),
      }} />

      {/* Sticky search */}
      <section className="pt-24 pb-6 bg-gradient-to-b from-primary/5 via-background to-background sticky top-0 z-30 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-5">
            <h1 className="text-2xl md:text-4xl font-bold text-foreground">Research Discovery</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Search across thousands of Nigerian research works
            </p>
          </div>
          <div className="max-w-3xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search title, author, institution, keyword, SDG…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSuggest(true); }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              className="pl-12 pr-12 h-12 md:h-14 rounded-2xl shadow-md text-base"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            {showSuggest && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-40">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onMouseDown={() => { setQuery(s); setShowSuggest(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
                  >
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="flex-1 py-6 md:py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row gap-4 lg:gap-6">
          <ResearchFiltersPanel
            filters={filters}
            onChange={setFilters}
            fields={fields}
            activeCount={activeFilterCount}
          />

          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="text-sm text-muted-foreground">
                {loading && papers.length === 0 ? "Searching…" : (
                  <span><span className="font-semibold text-foreground">{papers.length}</span> result{papers.length === 1 ? "" : "s"}{debounced && <> for "<span className="text-foreground">{debounced}</span>"</>}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="w-[170px]">
                    <ArrowDownAZ className="w-4 h-4 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="most_cited">Most cited</SelectItem>
                    <SelectItem value="most_viewed">Most viewed</SelectItem>
                    <SelectItem value="most_downloaded">Most downloaded</SelectItem>
                    <SelectItem value="funding">Funding needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results */}
            {!debounced.trim() ? (
              <div className="text-center py-20 border border-dashed border-border rounded-2xl">
                <Search className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-60" />
                <h3 className="text-lg font-semibold mb-1">Start searching</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Type a title, author, institution, keyword or SDG above to discover Nigerian research.
                </p>
              </div>
            ) : loading && papers.length === 0 ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-2xl" />
                ))}
              </div>
            ) : papers.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border rounded-2xl">
                <FileText className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-60" />
                <h3 className="text-lg font-semibold mb-1">No research found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Try a different search term or clear some filters to broaden your results.
                </p>
                {(activeFilterCount > 0 || debounced) && (
                  <Button variant="outline" className="mt-4" onClick={() => { setFilters(emptyFilters); setQuery(""); }}>
                    Reset search
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {papers.map((p) => (
                    <ResearchResultCard
                      key={p.id}
                      paper={p}
                      saved={savedIds.has(p.id)}
                      onCite={setCitePaper}
                      onSave={handleSave}
                      onShare={handleShare}
                      onPreview={setPreviewPaper}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="text-center mt-8">
                    <Button variant="outline" disabled={loading} onClick={() => fetchPapers(false)}>
                      {loading ? "Loading…" : "Load more"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <PublicFooter />

      <CitationDialog
        open={!!citePaper}
        onOpenChange={(o) => !o && setCitePaper(null)}
        paper={citePaper || { id: "", title: "" }}
      />
      <ResearchPreviewModal
        paper={previewPaper}
        open={!!previewPaper}
        onOpenChange={(o) => !o && setPreviewPaper(null)}
      />
    </div>
  );
}
