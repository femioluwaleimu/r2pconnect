import { useState, useMemo } from "react";
import { useFAQ, FAQ_CATEGORIES } from "@/hooks/useFAQ";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpCircle, Search, BookOpen } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

export default function FAQ() {
  const { data: faqs, isLoading } = useFAQ();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useSEO({
    title: "FAQ - Frequently Asked Questions",
    description: "Find answers to frequently asked questions about R2PConnect — for students, supervisors, institutions, and industry partners.",
    url: "/faq",
  });
  // Group FAQs by category
  const grouped = useMemo(() => {
    const map: Record<string, typeof faqs> = {};
    (faqs || []).forEach((faq) => {
      if (!map[faq.category]) map[faq.category] = [];
      map[faq.category]!.push(faq);
    });
    return map;
  }, [faqs]);

  // Filter
  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const result: Record<string, typeof faqs> = {};
    Object.entries(grouped).forEach(([cat, items]) => {
      const filtered = (items || []).filter(
        (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
      );
      if (filtered.length > 0) result[cat] = filtered;
    });
    return result;
  }, [grouped, search]);

  const displayGroups = activeCategory
    ? { [activeCategory]: filteredGrouped[activeCategory] || [] }
    : filteredGrouped;

  // JSON-LD structured data for FAQPage
  const jsonLd = useMemo(() => {
    const allFaqs = faqs || [];
    if (allFaqs.length === 0) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: allFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };
  }, [faqs]);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* JSON-LD */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* Hero */}
      <section className="gradient-hero py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <HelpCircle className="w-4 h-4 text-white" />
            <span className="text-white/90 text-sm font-medium">Help Center</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            Find answers to common questions about R2PConnect for students, supervisors, institutions, and industry partners.
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 rounded-xl bg-white border-none shadow-lg text-foreground"
            />
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="py-6 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={activeCategory === null ? "default" : "outline"}
              className="cursor-pointer rounded-full px-4 py-1.5 text-sm"
              onClick={() => setActiveCategory(null)}
            >
              All
            </Badge>
            {FAQ_CATEGORIES.map((cat) => (
              <Badge
                key={cat.value}
                variant={activeCategory === cat.value ? "default" : "outline"}
                className="cursor-pointer rounded-full px-4 py-1.5 text-sm"
                onClick={() => setActiveCategory(activeCategory === cat.value ? null : cat.value)}
              >
                {cat.label}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <main className="py-12">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : Object.keys(displayGroups).length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No questions found</h3>
              <p className="text-muted-foreground">
                {search ? "Try a different search term." : "FAQ content is being prepared."}
              </p>
            </div>
          ) : (
            FAQ_CATEGORIES.filter((cat) => displayGroups[cat.value] && displayGroups[cat.value]!.length > 0).map((cat) => (
              <section key={cat.value}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">{cat.label}</h2>
                  <Badge variant="secondary" className="rounded-full text-xs">
                    {displayGroups[cat.value]!.length}
                  </Badge>
                </div>
                <div className="bg-card rounded-2xl border border-border p-6 shadow-soft">
                  <Accordion type="single" collapsible className="w-full">
                    {displayGroups[cat.value]!.map((faq, idx) => (
                      <AccordionItem key={faq.id} value={faq.id} className="border-border">
                        <AccordionTrigger className="text-left text-foreground hover:no-underline hover:text-primary transition-colors text-sm font-medium">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                          <div dangerouslySetInnerHTML={{ __html: faq.answer.replace(/\n/g, "<br/>") }} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </section>
            ))
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
