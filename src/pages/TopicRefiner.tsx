import { type ReactNode, useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAICredits } from "@/hooks/useAICredits";
import SavedAIResponses from "@/components/ai/SavedAIResponses";

interface RefinedTopic {
  id: string;
  title: string;
  reason: string;
  description: string;
  field?: string;
  scope?: string;
  gapPotential?: string;
  noveltyAngle?: string;
  dataSources?: string[];
  objectives?: string[];
  researchQuestions?: string[];
  method?: string;
  tips?: string[];
}

type TopicMode = "refine" | "suggestions";

const TOPIC_COUNT = 10;

const topicShape = `{
  "topics": [
    {
      "title": "A precise academic project/research topic title",
      "field": "Academic field",
      "reason": "Why this topic is strong, useful, and department-aligned",
      "description": "A short explanation of the research direction",
      "scope": "Population/context/location/variables or boundary",
      "gapPotential": "Why this topic is less likely to be overworked or how to differentiate it",
      "noveltyAngle": "The fresh angle, local setting, variable combination, technology, policy issue, or neglected population",
      "dataSources": ["Practical data source 1", "Practical data source 2", "Practical data source 3"],
      "objectives": ["Objective 1", "Objective 2", "Objective 3"],
      "researchQuestions": ["Question 1", "Question 2", "Question 3"],
      "method": "Suggested research approach or data direction",
      "tips": ["How to keep it manageable", "What to review", "What to avoid"]
    }
  ]
}`;

export default function TopicRefiner() {
  const [topic, setTopic] = useState("");
  const [researcherDepartment, setResearcherDepartment] = useState("");
  const [refinedTopics, setRefinedTopics] = useState<RefinedTopic[]>([]);
  const [suggestedTopics, setSuggestedTopics] = useState<RefinedTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refineMessage, setRefineMessage] = useState("");
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const { toast } = useToast();
  const { refresh: refreshCredits } = useAICredits();

  useEffect(() => {
    const loadResearcherDepartment = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("department")
        .eq("user_id", user.id)
        .maybeSingle();

      setResearcherDepartment((data?.department || "").trim());
    };

    loadResearcherDepartment();
  }, []);

  const runTopicRequest = async (mode: TopicMode) => {
    const isRefine = mode === "refine";
    const userIdea = topic.trim();

    if (isRefine && !userIdea) return;

    if (isRefine) {
      setLoading(true);
      setRefinedTopics([]);
      setRefineMessage("");
    } else {
      setLoadingSuggestions(true);
      setSuggestedTopics([]);
      setSuggestionMessage("");
    }
    setExpandedId(null);

    try {
      const content = isRefine
        ? buildRefinePrompt(userIdea)
        : buildSuggestionPrompt(researcherDepartment || "General academic research");

      const { data, error } = await supabase.functions.invoke("ai-research", {
        body: {
          type: isRefine ? "topic_refine" : "topic_suggestions",
          content,
          requested_count: TOPIC_COUNT,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const topics = parseTopicResult(String(data?.result || "")).slice(0, TOPIC_COUNT);

      if (isRefine) {
        setRefinedTopics(topics);
        setRefineMessage(topics.length ? "" : "The AI returned a response, but no readable topic list was found. Please try again.");
      } else {
        setSuggestedTopics(topics);
        setSuggestionMessage(topics.length ? "" : "The AI returned a response, but no readable topic list was found. Please try again.");
      }

      refreshCredits();
      toast({
        title: topics.length ? (isRefine ? "Topics refined" : "Suggestions generated") : "No topics found",
        description: topics.length
          ? `${topics.length} topics ready${typeof data?.credits_remaining === "number" ? `, ${data.credits_remaining} credits remaining` : ""}`
          : "Try again with a little more detail.",
        variant: topics.length ? "default" : "destructive",
      });
    } catch (error: any) {
      const message = error?.message || "Unable to generate topics right now.";
      if (isRefine) {
        setRefineMessage(message);
      } else {
        setSuggestionMessage(message);
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      if (isRefine) {
        setLoading(false);
      } else {
        setLoadingSuggestions(false);
      }
    }
  };

  const buildRefinePrompt = (idea: string) => `Act as a senior Nigerian academic project supervisor. Refine this rough idea into exactly ${TOPIC_COUNT} normal final-year/project-style research topics.

Return ONLY valid JSON. Do not include markdown, explanations before the JSON, or text after the JSON.

Required JSON shape:
${topicShape}

Rules:
- Generate exactly ${TOPIC_COUNT} topics. If the rough idea is narrow, vary the population, location, variables, method, or fresh angle instead of returning fewer topics.
- Each title must sound like a real undergraduate/HND/BSc/MSc project topic.
- Do not use broad textbook headings or generic blog titles.
- Make each topic specific enough for one academic session.
- Prefer measurable variables, clear population, clear context/location, and practical data.
- Avoid overworked topics unless you add a fresh local angle, variable, technology, policy, sustainability issue, or neglected population.

Rough research idea: ${idea}`;

  const buildSuggestionPrompt = (department: string) => `Act as a senior Nigerian academic researcher and departmental project coordinator. Generate exactly ${TOPIC_COUNT} professional, researchable, department-aligned project topics for this department: ${department}.

Return ONLY valid JSON. Do not include markdown, explanations before the JSON, or text after the JSON.

Required JSON shape:
${topicShape}

Rules:
- Generate exactly ${TOPIC_COUNT} topics. If the department is broad, cover different practical sub-areas instead of returning fewer topics.
- Every topic must fit the department named above.
- Every topic must be suitable for research in Nigeria.
- Prefer local populations, institutions, industries, communities, policies, datasets, or development problems.
- Avoid generic titles like "The impact of X on Y" unless context, variables, and population are specific.
- Include practical reasons, scope, objectives, research questions, method direction, data sources, and tips.
- Prefer topics that feel useful for policy, business, community development, or industry collaboration.`;

  const parseTopicResult = (text: string): RefinedTopic[] => {
    const cleaned = normalizeAiText(text);
    if (!cleaned) return [];

    const parsedJson = parseTopicJson(cleaned);
    if (parsedJson.length) return parsedJson;

    const recoveredObjects = parseTopicObjects(cleaned);
    if (recoveredObjects.length) return recoveredObjects;

    return parseNumberedTopics(cleaned);
  };

  const parseTopicJson = (text: string): RefinedTopic[] => {
    for (const block of getBalancedBlocks(text)) {
      const parsed = parseJsonSafely(block);
      const topics = topicsFromParsedValue(parsed);
      if (topics.length) return topics;
    }

    const directParsed = parseJsonSafely(text);
    return topicsFromParsedValue(directParsed);
  };

  const parseTopicObjects = (text: string): RefinedTopic[] => {
    const objects = getBalancedBlocks(text).filter((block) => block.trim().startsWith("{"));
    const topics = objects
      .map((block, index) => normalizeTopic(parseJsonSafely(block) || parseLooseTopicObject(block), index))
      .filter((item): item is RefinedTopic => Boolean(item));

    return dedupeTopics(topics);
  };

  const parseNumberedTopics = (text: string): RefinedTopic[] => {
    const sections = text
      .split(/(?=^\s*\d+[.)]\s+)/m)
      .map((section) => section.trim())
      .filter(Boolean);

    const topics = sections
      .map((section, index) => {
        const lines = section.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const title = (lines[0] || "")
          .replace(/^\d+[.)]\s*/, "")
          .replace(/\*\*/g, "")
          .replace(/^title:\s*/i, "")
          .trim();
        if (!title || title.length < 8 || title.includes("{") || title.includes("}")) return null;

        const body = lines.slice(1).join(" ");
        return normalizeTopic(
          {
            title,
            reason: extractLabel(body, "reason") || extractLabel(body, "rationale") || body,
            description: extractLabel(body, "description") || body || title,
            field: extractLabel(body, "field"),
            scope: extractLabel(body, "scope"),
            method: extractLabel(body, "method"),
          },
          index,
        );
      })
      .filter((item): item is RefinedTopic => Boolean(item));

    return dedupeTopics(topics);
  };

  const normalizeTopic = (value: unknown, index: number): RefinedTopic | null => {
    if (typeof value === "string") {
      const title = cleanField(value);
      return title ? baseTopic(title, index) : null;
    }

    if (!value || typeof value !== "object") return null;

    const item = value as Record<string, unknown>;
    const title = cleanField(firstString(item, ["title", "topic", "researchTopic", "research_topic", "name"]));
    if (!title || title.toLowerCase() === "research topic" || title.includes("{") || title.includes("}")) return null;

    return {
      id: `topic-${index}`,
      title,
      field: cleanField(firstString(item, ["field", "discipline", "department"])) || undefined,
      reason: cleanField(firstString(item, ["reason", "why", "rationale", "importance"])) || "This is a focused and researchable topic.",
      description: cleanField(firstString(item, ["description", "summary", "direction", "overview"])) || title,
      scope: cleanField(firstString(item, ["scope", "boundary", "context"])) || undefined,
      gapPotential: cleanField(firstString(item, ["gapPotential", "gap_potential", "gap", "researchGap"])) || undefined,
      noveltyAngle: cleanField(firstString(item, ["noveltyAngle", "novelty_angle", "freshAngle", "angle"])) || undefined,
      dataSources: toList(firstValue(item, ["dataSources", "data_sources", "sources"])),
      objectives: toList(firstValue(item, ["objectives", "aims"])),
      researchQuestions: toList(firstValue(item, ["researchQuestions", "research_questions", "questions"])),
      method: cleanField(firstString(item, ["method", "methodology", "approach"])) || undefined,
      tips: toList(firstValue(item, ["tips", "guidance", "recommendations"])),
    };
  };

  const baseTopic = (title: string, index: number): RefinedTopic => ({
    id: `topic-${index}`,
    title,
    reason: "This is a focused research direction worth exploring.",
    description: title,
  });

  const topicsFromParsedValue = (value: unknown): RefinedTopic[] => {
    if (typeof value === "string") return parseTopicResult(value);
    if (!value || typeof value !== "object") return [];

    const objectValue = value as Record<string, unknown>;
    const rawTopics = Array.isArray(value)
      ? value
      : firstValue(objectValue, ["topics", "results", "suggestions", "refinedTopics", "refined_topics"]);

    if (!Array.isArray(rawTopics)) return [];

    return dedupeTopics(
      rawTopics
        .map((item, index) => normalizeTopic(item, index))
        .filter((item): item is RefinedTopic => Boolean(item)),
    );
  };

  const parseJsonSafely = (text: string): unknown | null => {
    const attempts = [
      text,
      stripJsonNoise(text),
      stripJsonNoise(text).replace(/,\s*([}\]])/g, "$1"),
    ];

    for (const attempt of attempts) {
      try {
        return JSON.parse(attempt);
      } catch {
        // Keep trying slightly cleaned variants.
      }
    }

    return null;
  };

  const parseLooseTopicObject = (text: string): Record<string, unknown> | null => {
    const title = extractJsonString(text, "title") || extractJsonString(text, "topic");
    if (!title) return null;

    return {
      title,
      field: extractJsonString(text, "field"),
      reason: extractJsonString(text, "reason") || extractJsonString(text, "why"),
      description: extractJsonString(text, "description") || extractJsonString(text, "summary"),
      scope: extractJsonString(text, "scope"),
      gapPotential: extractJsonString(text, "gapPotential") || extractJsonString(text, "gap_potential"),
      noveltyAngle: extractJsonString(text, "noveltyAngle") || extractJsonString(text, "novelty_angle"),
      method: extractJsonString(text, "method") || extractJsonString(text, "methodology"),
      dataSources: extractJsonArray(text, "dataSources") || extractJsonArray(text, "data_sources"),
      objectives: extractJsonArray(text, "objectives"),
      researchQuestions: extractJsonArray(text, "researchQuestions") || extractJsonArray(text, "research_questions"),
      tips: extractJsonArray(text, "tips"),
    };
  };

  const getBalancedBlocks = (text: string): string[] => {
    const cleaned = stripJsonNoise(text);
    const blocks: string[] = [];
    const stack: string[] = [];
    let start = -1;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < cleaned.length; i += 1) {
      const char = cleaned[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === "{" || char === "[") {
        if (stack.length === 0) start = i;
        stack.push(char);
      } else if ((char === "}" && stack.at(-1) === "{") || (char === "]" && stack.at(-1) === "[")) {
        stack.pop();
        if (stack.length === 0 && start >= 0) {
          blocks.push(cleaned.slice(start, i + 1));
          start = -1;
        }
      }
    }

    return blocks.length ? blocks : [cleaned];
  };

  const normalizeAiText = (text: string): string =>
    text
      .replace(/^\uFEFF/, "")
      .replace(/\u2018|\u2019/g, "'")
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2013|\u2014/g, "-")
      .replace(/\u2026/g, "...")
      .replace(/\u00A0/g, " ")
      .trim();

  const stripJsonNoise = (text: string): string =>
    normalizeAiText(text)
      .replace(/```(?:json)?/gi, "")
      .replace(/```/g, "")
      .trim();

  const firstValue = (item: Record<string, unknown>, keys: string[]): unknown => {
    for (const key of keys) {
      if (item[key] !== undefined && item[key] !== null) return item[key];
    }
    return undefined;
  };

  const firstString = (item: Record<string, unknown>, keys: string[]): string => {
    const value = firstValue(item, keys);
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
  };

  const toList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.map((entry) => cleanField(String(entry))).filter(Boolean);
    }

    if (typeof value !== "string") return [];

    return value
      .split(/\r?\n|;/)
      .map((entry) => cleanField(entry.replace(/^[-*\d.)\s]+/, "")))
      .filter(Boolean);
  };

  const cleanField = (value: string): string =>
    value
      .replace(/\\"/g, '"')
      .replace(/\\n/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\*\*/g, "")
      .trim();

  const dedupeTopics = (topics: RefinedTopic[]): RefinedTopic[] => {
    const seen = new Set<string>();

    return topics.filter((topicItem) => {
      const key = topicItem.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const extractLabel = (text: string, label: string): string => {
    const match = text.match(new RegExp(`${label}\\s*:\\s*(.+?)(?=\\s+[A-Z][A-Za-z ]{2,20}\\s*:|$)`, "i"));
    return cleanField(match?.[1] || "");
  };

  const extractJsonString = (text: string, key: string): string => {
    const match = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "i"));
    if (!match?.[1]) return "";

    try {
      return cleanField(JSON.parse(`"${match[1]}"`));
    } catch {
      return cleanField(match[1]);
    }
  };

  const extractJsonArray = (text: string, key: string): string[] => {
    const startMatch = new RegExp(`"${key}"\\s*:\\s*\\[`, "i").exec(text);
    if (!startMatch) return [];

    const start = startMatch.index + startMatch[0].lastIndexOf("[");
    const block = getBalancedBlocks(text.slice(start))[0] || "";
    const matches = [...block.matchAll(/"((?:\\.|[^"\\])*)"/g)];

    return matches
      .map((match) => {
        try {
          return cleanField(JSON.parse(`"${match[1]}"`));
        } catch {
          return cleanField(match[1]);
        }
      })
      .filter(Boolean);
  };

  const formatTopicText = (topicItem: RefinedTopic) => [
    topicItem.title,
    topicItem.field ? `Field: ${topicItem.field}` : "",
    `Reason: ${topicItem.reason}`,
    `Description: ${topicItem.description}`,
    topicItem.scope ? `Scope: ${topicItem.scope}` : "",
    topicItem.gapPotential ? `Gap/underworked potential: ${topicItem.gapPotential}` : "",
    topicItem.noveltyAngle ? `Fresh angle: ${topicItem.noveltyAngle}` : "",
    topicItem.dataSources?.length ? `Possible data sources:\n${topicItem.dataSources.map((item) => `- ${item}`).join("\n")}` : "",
    topicItem.objectives?.length ? `Possible objectives:\n${topicItem.objectives.map((item) => `- ${item}`).join("\n")}` : "",
    topicItem.researchQuestions?.length ? `Possible research questions:\n${topicItem.researchQuestions.map((item) => `- ${item}`).join("\n")}` : "",
    topicItem.method ? `Suggested method: ${topicItem.method}` : "",
    topicItem.tips?.length ? `Research tips:\n${topicItem.tips.map((item) => `- ${item}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");

  const copyTextToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!copied) throw new Error("Clipboard copy failed");
  };

  const handleCopyTopic = async (topicItem: RefinedTopic) => {
    try {
      await copyTextToClipboard(formatTopicText(topicItem));
      setCopiedId(topicItem.id);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error: any) {
      toast({
        title: "Copy failed",
        description: error?.message || "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  };

  const formatTopicsText = (topics: RefinedTopic[]) =>
    topics.map((topicItem, index) => `${index + 1}. ${formatTopicText(topicItem)}`).join("\n" + "-".repeat(50) + "\n\n");

  const handleDownloadAll = (topics: RefinedTopic[], filename: string) => {
    const content = formatTopicsText(topics);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    toast({ title: "Topics downloaded" });
  };

  const TopicCard = ({ topicItem, index }: { topicItem: RefinedTopic; index: number }) => {
    const isExpanded = expandedId === topicItem.id;

    return (
      <Card
        className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md"
        onClick={() => setExpandedId(isExpanded ? null : topicItem.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
              {index + 1}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold leading-snug text-foreground sm:text-base">{topicItem.title}</h4>
                  {topicItem.field && <p className="mt-1 text-xs text-muted-foreground">{topicItem.field}</p>}
                </div>
                <ChevronRight className={`mt-1 h-4 w-4 shrink-0 text-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-sky-50 px-3 py-2.5">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">{topicItem.reason}</p>
              </div>

              {isExpanded && (
                <div className="space-y-3 pt-1" onClick={(event) => event.stopPropagation()}>
                  <DetailSection title="Research Direction">{topicItem.description}</DetailSection>
                  {topicItem.scope && <DetailSection title="Suggested Scope">{topicItem.scope}</DetailSection>}
                  {topicItem.gapPotential && <DetailSection title="Gap Potential">{topicItem.gapPotential}</DetailSection>}
                  {topicItem.noveltyAngle && <DetailSection title="Fresh Angle">{topicItem.noveltyAngle}</DetailSection>}
                  {topicItem.objectives?.length ? <DetailSection title="Possible Objectives"><BulletList items={topicItem.objectives} /></DetailSection> : null}
                  {topicItem.researchQuestions?.length ? <DetailSection title="Research Questions"><BulletList items={topicItem.researchQuestions} /></DetailSection> : null}
                  {topicItem.dataSources?.length ? <DetailSection title="Possible Data Sources"><BulletList items={topicItem.dataSources} /></DetailSection> : null}
                  {topicItem.method && <DetailSection title="Suggested Method">{topicItem.method}</DetailSection>}
                  {topicItem.tips?.length ? <DetailSection title="Tips"><BulletList items={topicItem.tips} /></DetailSection> : null}

                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleCopyTopic(topicItem)} className="h-8 rounded-lg text-xs">
                      {copiedId === topicItem.id ? <Check className="mr-1.5 h-3.5 w-3.5 text-primary" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                      {copiedId === topicItem.id ? "Copied" : "Copy Topic"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const DetailSection = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className="rounded-lg border border-border/70 bg-background p-3">
      <p className="mb-1.5 text-xs font-bold uppercase text-muted-foreground">{title}</p>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );

  const BulletList = ({ items }: { items?: string[] }) => {
    if (!items?.length) return null;

    return (
      <ul className="space-y-1">
        {items.map((item, itemIndex) => (
          <li key={itemIndex} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  const ResultsList = ({
    title,
    topics,
    message,
    filename,
  }: {
    title: string;
    topics: RefinedTopic[];
    message: string;
    filename: string;
  }) => {
    if (message && topics.length === 0) {
      return (
        <Card className="rounded-lg border border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="p-4">
            <p className="font-semibold text-destructive">{message}</p>
          </CardContent>
        </Card>
      );
    }

    if (!topics.length) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-foreground">
            {title}
            <span className="ml-2 text-sm font-normal text-muted-foreground">({topics.length} results)</span>
          </h3>
          <Button variant="outline" size="sm" onClick={() => handleDownloadAll(topics, filename)} className="rounded-lg">
            <Download className="mr-2 h-4 w-4" />Download All
          </Button>
        </div>
        <div className="space-y-3">
          {topics.map((topicItem, index) => (
            <TopicCard key={`${topicItem.id}-${topicItem.title}`} topicItem={topicItem} index={index} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="gradient-hero rounded-2xl p-6 lg:p-8">
          <div className="mb-2 flex items-center gap-3">
            <Lightbulb className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold text-white lg:text-3xl">Research Topic Refiner</h1>
          </div>
          <p className="text-white/80">
            Turn rough ideas into focused, researchable academic topics with scope, objectives, questions, and practical guidance
          </p>
        </div>

        <Tabs defaultValue="refine" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl">
            <TabsTrigger value="refine" className="rounded-lg font-semibold">
              <Target className="mr-2 h-4 w-4" />
              Refine Topic
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="rounded-lg font-semibold">
              <Sparkles className="mr-2 h-4 w-4" />
              Suggestions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="refine" className="mt-5 space-y-5">
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold">Describe Your Research Idea</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="e.g. impact of social media among youth in Osogbo"
                  className="min-h-[120px] resize-none rounded-xl border-2 focus:border-primary"
                />
                <Button
                  className="gradient-hero w-full rounded-xl font-bold text-white sm:w-auto"
                  disabled={!topic.trim() || loading}
                  onClick={() => runTopicRequest("refine")}
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Refining...</>
                  ) : (
                    <><Target className="mr-2 h-4 w-4" />Refine My Topic</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <ResultsList title="Refined Topics" topics={refinedTopics} message={refineMessage} filename="refined-topics.txt" />

            <SavedAIResponses
              toolType="topic_refiner_refine"
              toolLabel="Topic Refiner - Refined Topics"
              currentTitle={topic.trim() ? `Refined topics: ${topic.trim().slice(0, 80)}` : "Refined topics"}
              currentPrompt={topic}
              currentResponse={refinedTopics.length ? formatTopicsText(refinedTopics) : ""}
              currentMetadata={{ source: "dashboard/topic-refiner", mode: "refine", topics: refinedTopics }}
              onRestore={(item) => {
                setTopic(item.prompt || "");
                const savedTopics = Array.isArray(item.metadata?.topics)
                  ? item.metadata.topics
                      .map((entry, index) => normalizeTopic(entry, index))
                      .filter((entry): entry is RefinedTopic => Boolean(entry))
                  : parseTopicResult(item.response);
                setRefinedTopics(savedTopics);
                setRefineMessage("");
              }}
            />

            {!loading && !refinedTopics.length && !refineMessage && (
              <EmptyState
                icon={<Lightbulb className="h-7 w-7 text-amber-500" />}
                title="Enter a topic above to get started"
                description="Your idea will be shaped into focused topics with research direction"
              />
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="mt-5 space-y-5">
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold">Department-Based Topic Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Generate up to {TOPIC_COUNT} Nigeria-focused topics for {researcherDepartment || "your department"}
                </p>
                <Button
                  className="gradient-hero w-full rounded-xl font-bold text-white sm:w-auto"
                  disabled={loadingSuggestions}
                  onClick={() => runTopicRequest("suggestions")}
                >
                  {loadingSuggestions ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" />Generate Suggestions</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <ResultsList title="Suggested Topics" topics={suggestedTopics} message={suggestionMessage} filename="suggested-topics.txt" />

            <SavedAIResponses
              toolType="topic_refiner_suggestions"
              toolLabel="Topic Refiner - Topic Suggestions"
              currentTitle={`Topic suggestions: ${researcherDepartment || "General academic research"}`}
              currentPrompt={researcherDepartment || "General academic research"}
              currentResponse={suggestedTopics.length ? formatTopicsText(suggestedTopics) : ""}
              currentMetadata={{ source: "dashboard/topic-refiner", mode: "suggestions", topics: suggestedTopics }}
              onRestore={(item) => {
                const savedTopics = Array.isArray(item.metadata?.topics)
                  ? item.metadata.topics
                      .map((entry, index) => normalizeTopic(entry, index))
                      .filter((entry): entry is RefinedTopic => Boolean(entry))
                  : parseTopicResult(item.response);
                setSuggestedTopics(savedTopics);
                setSuggestionMessage("");
              }}
            />

            {!loadingSuggestions && !suggestedTopics.length && !suggestionMessage && (
              <EmptyState
                icon={<Sparkles className="h-7 w-7 text-sky-500" />}
                title="No suggestions yet"
                description={`Click above to generate topics for ${researcherDepartment || "your department"} in Nigeria`}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

const EmptyState = ({ icon, title, description }: { icon: ReactNode; title: string; description: string }) => (
  <Card className="rounded-2xl border-0 shadow-sm">
    <CardContent className="py-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50">{icon}</div>
      <p className="font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);
