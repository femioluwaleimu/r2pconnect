import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  Sparkles, 
  Loader2, 
  Copy, 
  Download, 
  Check,
  TrendingUp,
  Target,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RefinedTopic {
  id: string;
  title: string;
  reason: string;
  description: string;
  field?: string;
}

export default function TopicRefiner() {
  const [topic, setTopic] = useState("");
  const [refinedTopics, setRefinedTopics] = useState<RefinedTopic[]>([]);
  const [suggestedTopics, setSuggestedTopics] = useState<RefinedTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRefine = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setRefinedTopics([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-research', {
        body: { 
          type: 'topic_refine', 
          content: `Refine the following research idea into 5 distinct, well-scoped research topics. For each topic, provide:
1. A clear, specific title
2. Why this angle is worth exploring (labeled "Reason:")
3. A brief description of the research scope (labeled "Description:")

Research idea: ${topic}` 
        }
      });

      if (error) throw error;
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      const resultText = data.result || '';
      const topics = parseStructuredTopics(resultText);
      setRefinedTopics(topics);
      toast({ title: "Topics refined successfully!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    setLoadingSuggestions(true);
    setSuggestedTopics([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-research', {
        body: { 
          type: 'topic_suggestions', 
          content: `Generate 6 trending and impactful research topics relevant to Nigeria and Africa. For each topic, provide:
1. A clear, specific title
2. Why this topic is trending or important now (labeled "Reason:")
3. A brief description of the research scope (labeled "Description:")
4. The academic field it belongs to (labeled "Field:")` 
        }
      });

      if (error) throw error;
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      const resultText = data.result || '';
      const topics = parseStructuredTopics(resultText, true);
      setSuggestedTopics(topics);
      toast({ title: "Suggestions generated!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const parseStructuredTopics = (text: string, withField = false): RefinedTopic[] => {
    const topics: RefinedTopic[] = [];
    
    // Split by numbered items (1. 2. 3. etc)
    const sections = text.split(/(?=\d+[.)]\s)/);
    
    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;
      
      // Extract title (first line after number)
      const titleMatch = trimmed.match(/^\d+[.)]\s*\**(.+?)\**\s*$/m);
      if (!titleMatch) continue;
      
      const title = titleMatch[1].replace(/\*\*/g, '').replace(/[:.]$/, '').trim();
      
      // Extract reason
      const reasonMatch = trimmed.match(/\*?\*?Reason\*?\*?[:\s]+(.+?)(?=\*?\*?Description\*?\*?[:\s]|$)/si);
      const reason = reasonMatch ? reasonMatch[1].replace(/\*\*/g, '').replace(/\n/g, ' ').trim() : '';
      
      // Extract description
      const descMatch = trimmed.match(/\*?\*?Description\*?\*?[:\s]+(.+?)(?=\*?\*?Field\*?\*?[:\s]|$)/si);
      const description = descMatch ? descMatch[1].replace(/\*\*/g, '').replace(/\n/g, ' ').trim() : '';
      
      // Extract field
      let field: string | undefined;
      if (withField) {
        const fieldMatch = trimmed.match(/\*?\*?Field\*?\*?[:\s]+(.+?)$/mi);
        field = fieldMatch ? fieldMatch[1].replace(/\*\*/g, '').trim() : undefined;
      }
      
      // Fallback: if no structured sections found, use remaining text
      const fallbackDesc = !reason && !description 
        ? trimmed.replace(/^\d+[.)]\s*\**.*?\**\s*\n?/, '').replace(/\*\*/g, '').trim()
        : '';
      
      topics.push({
        id: `topic-${topics.length}`,
        title,
        reason: reason || 'A promising research direction worth exploring.',
        description: description || fallbackDesc || title,
        field
      });
    }
    
    // Final fallback if parsing fails entirely
    if (topics.length === 0) {
      const lines = text.split('\n').filter(l => l.trim());
      let currentTitle = '';
      let currentBody = '';
      
      for (const line of lines) {
        const numbered = line.match(/^(\d+)[.)]\s*(.+)/);
        if (numbered) {
          if (currentTitle) {
            topics.push({
              id: `topic-${topics.length}`,
              title: currentTitle.replace(/\*\*/g, ''),
              reason: 'A relevant research direction.',
              description: currentBody.replace(/\*\*/g, '').trim() || currentTitle,
              field: withField ? undefined : undefined
            });
          }
          currentTitle = numbered[2];
          currentBody = '';
        } else {
          currentBody += ' ' + line;
        }
      }
      if (currentTitle) {
        topics.push({
          id: `topic-${topics.length}`,
          title: currentTitle.replace(/\*\*/g, ''),
          reason: 'A relevant research direction.',
          description: currentBody.replace(/\*\*/g, '').trim() || currentTitle,
        });
      }
    }
    
    return topics.length > 0 ? topics : [{
      id: 'topic-0',
      title: 'Research Topic',
      reason: 'Generated from your input.',
      description: text,
    }];
  };

  const handleCopyTopic = async (t: RefinedTopic) => {
    await navigator.clipboard.writeText(`${t.title}\n\nReason: ${t.reason}\n\nDescription: ${t.description}`);
    setCopiedId(t.id);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadAll = (topics: RefinedTopic[]) => {
    const content = topics.map((t, i) => 
      `${i + 1}. ${t.title}\n\nReason: ${t.reason}\n\nDescription: ${t.description}${t.field ? `\n\nField: ${t.field}` : ''}\n`
    ).join('\n' + '─'.repeat(50) + '\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'refined-topics.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "All topics downloaded!" });
  };

  const TopicCard = ({ t, index }: { t: RefinedTopic; index: number }) => {
    const isExpanded = expandedId === t.id;
    return (
      <Card 
        className="group rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer"
        onClick={() => setExpandedId(isExpanded ? null : t.id)}
      >
        <CardContent className="p-0">
          {/* Top section */}
          <div className="p-5 pb-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 mt-0.5">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground leading-snug mb-1.5 pr-8">{t.title}</h4>
                {t.field && (
                  <Badge variant="secondary" className="text-xs font-medium">
                    {t.field}
                  </Badge>
                )}
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
            </div>
          </div>

          {/* Reason - always visible */}
          <div className="px-5 pb-3">
            <div className="flex items-start gap-2 bg-primary/5 rounded-xl p-3">
              <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80 leading-relaxed">{t.reason}</p>
            </div>
          </div>

          {/* Description - expandable */}
          {isExpanded && (
            <div className="px-5 pb-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-2 bg-muted/50 rounded-xl p-3 mb-3">
                <BookOpen className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleCopyTopic(t); }}
                  className="h-8 rounded-lg text-xs hover:bg-primary/10"
                >
                  {copiedId === t.id ? <Check className="w-3.5 h-3.5 mr-1.5 text-primary" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  {copiedId === t.id ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="gradient-hero rounded-2xl p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <Lightbulb className="w-8 h-8 text-white" />
            <h1 className="text-2xl lg:text-3xl font-bold text-white">Research Topic Refiner</h1>
          </div>
          <p className="text-white/80">
            Get AI-powered suggestions and refinements for your research topics
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="refine" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl">
            <TabsTrigger value="refine" className="rounded-lg font-semibold">
              <Target className="w-4 h-4 mr-2" />
              Refine Topic
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="rounded-lg font-semibold">
              <Sparkles className="w-4 h-4 mr-2" />
              Suggestions
            </TabsTrigger>
          </TabsList>

          {/* Refine Tab */}
          <TabsContent value="refine" className="space-y-5 mt-5">
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold">Describe Your Research Idea</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Impact of social media on mental health in teenagers, or Renewable energy adoption in developing countries..."
                  className="rounded-xl min-h-[120px] border-2 focus:border-primary resize-none"
                />
                <Button 
                  className="rounded-xl gradient-hero text-white font-bold w-full sm:w-auto" 
                  disabled={!topic.trim() || loading}
                  onClick={handleRefine}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Refining...</>
                  ) : (
                    <><Target className="w-4 h-4 mr-2" />Refine My Topic</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {refinedTopics.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-foreground">
                    Refined Topics
                    <span className="text-muted-foreground font-normal text-sm ml-2">({refinedTopics.length} results)</span>
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadAll(refinedTopics)} className="rounded-lg">
                    <Download className="w-4 h-4 mr-2" />Download All
                  </Button>
                </div>
                <div className="space-y-3">
                  {refinedTopics.map((t, i) => <TopicCard key={t.id} t={t} index={i} />)}
                </div>
              </div>
            )}

            {!loading && refinedTopics.length === 0 && (
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="w-7 h-7 text-amber-500" />
                  </div>
                  <p className="text-muted-foreground font-medium">Enter a topic above to get started</p>
                  <p className="text-sm text-muted-foreground mt-1">AI will refine your idea into focused research topics</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-5 mt-5">
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold">Trending Topic Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  Discover AI-curated trending research topics across Africa
                </p>
                <Button 
                  className="rounded-xl gradient-hero text-white font-bold w-full sm:w-auto" 
                  disabled={loadingSuggestions}
                  onClick={handleGenerateSuggestions}
                >
                  {loadingSuggestions ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Generate Suggestions</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {suggestedTopics.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-foreground">Suggested Topics</h3>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadAll(suggestedTopics)} className="rounded-lg">
                    <Download className="w-4 h-4 mr-2" />Download All
                  </Button>
                </div>
                <div className="space-y-3">
                  {suggestedTopics.map((t, i) => (
                    <div key={t.id} className="relative">
                      {t.field && (
                        <Badge className="absolute top-3 right-3 z-10 bg-orange-500 text-white border-0 text-[10px]">
                          <TrendingUp className="w-3 h-3 mr-1" />Trending
                        </Badge>
                      )}
                      <TopicCard t={t} index={i} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loadingSuggestions && suggestedTopics.length === 0 && (
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-7 h-7 text-purple-500" />
                  </div>
                  <p className="text-muted-foreground font-medium">No suggestions yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Click above to discover trending research topics</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
