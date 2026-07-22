import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoCard } from "@/components/ui/info-card";
import { 
  Sparkles, 
  RefreshCw, 
  Eye, 
  ArrowRight,
  BookOpen,
  Loader2,
  FileText,
  Trophy,
  Briefcase,
  Flame,
  Lightbulb
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAICredits } from "@/hooks/useAICredits";
import { formatAmount, formatPercent, toNumber } from "@/lib/numberFormat";

interface ResearchPaper {
  id: string;
  title: string;
  abstract: string | null;
  research_field: string | null;
  research_stage: string | null;
  keywords: string[] | null;
  views_count: number;
  downloads_count: number;
  created_at: string;
  matchScore?: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  reward_amount: number | null;
  reward_currency: string | null;
  deadline: string | null;
}

interface JobPosting {
  id: string;
  title: string;
  description: string;
  job_type: string;
  payment_amount: number | null;
}

export default function PersonalizedFeed() {
  const [user, setUser] = useState<User | null>(null);
  const [recommendations, setRecommendations] = useState<ResearchPaper[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [opportunities, setOpportunities] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const { toast } = useToast();
  const { creditsRemaining } = useAICredits();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchUserInterests(user.id);
        fetchChallenges();
        fetchOpportunities();
      }
    });
  }, []);

  const fetchUserInterests = async (userId: string) => {
    try {
      const { data: userPapers } = await supabase
        .from('research_papers')
        .select('research_field, keywords')
        .eq('author_id', userId);

      const interests: Set<string> = new Set();
      userPapers?.forEach(paper => {
        if (paper.research_field) interests.add(paper.research_field);
        paper.keywords?.forEach((k: string) => interests.add(k));
      });

      const interestArray = Array.from(interests);
      setUserInterests(interestArray);
      generateTrendingTopics(interestArray);
      await fetchRecommendations(interestArray, userId);
    } catch (error) {
      console.error('Error fetching interests:', error);
      await fetchRecommendations([], userId);
    }
  };

  const generateTrendingTopics = (interests: string[]) => {
    const topics = interests.slice(0, 3).map(interest => 
      `Impact of ${interest.toLowerCase()} on modern research`
    );
    setTrendingTopics(topics.length > 0 ? topics : [
      "Emerging trends in academic research",
      "Cross-disciplinary collaboration methods",
      "Impact of AI on research methodologies"
    ]);
  };

  const fetchChallenges = async () => {
    const { data } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .limit(5);
    setChallenges((data || []).map((challenge) => ({
      ...challenge,
      reward_amount: challenge.reward_amount == null ? null : toNumber(challenge.reward_amount),
    })));
  };

  const fetchOpportunities = async () => {
    const { data } = await supabase
      .from('job_postings')
      .select('*')
      .eq('is_active', true)
      .limit(5);
    setOpportunities((data || []).map((job) => ({
      ...job,
      payment_amount: job.payment_amount == null ? null : toNumber(job.payment_amount),
    })));
  };

  const fetchRecommendations = async (interests: string[], userId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('research_papers')
        .select('*')
        .eq('status', 'published')
        .order('views_count', { ascending: false })
        .limit(20);

      if (userId) {
        query = query.neq('author_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let sortedData = data || [];
      if (interests.length > 0) {
        sortedData = sortedData.sort((a, b) => {
          const aScore = calculateRelevanceScore(a, interests);
          const bScore = calculateRelevanceScore(b, interests);
          return bScore - aScore;
        });
      }

      const withScores = sortedData.slice(0, 12).map(paper => ({
        ...paper,
        matchScore: Math.min(99, Math.max(70, calculateRelevanceScore(paper, interests) * 10 + 70))
      }));

      setRecommendations(withScores);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const calculateRelevanceScore = (paper: ResearchPaper, interests: string[]): number => {
    let score = 0;
    interests.forEach(interest => {
      const lowerInterest = interest.toLowerCase();
      if (paper.research_field?.toLowerCase().includes(lowerInterest)) score += 3;
      if (paper.keywords?.some(k => k.toLowerCase().includes(lowerInterest))) score += 2;
      if (paper.title?.toLowerCase().includes(lowerInterest)) score += 1;
      if (paper.abstract?.toLowerCase().includes(lowerInterest)) score += 0.5;
    });
    return score;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRecommendations(userInterests, user?.id);
    setRefreshing(false);
    toast({ title: "Recommendations refreshed" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 p-5 md:p-8">
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-white flex items-center gap-3">
                  <Sparkles className="w-6 h-6 md:w-7 md:h-7" />
                  Your Personalized Feed
                </h1>
                <p className="text-white/80 mt-1 text-sm md:text-base">AI-curated content based on your research papers</p>
              </div>
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-xl bg-white/20 hover:bg-white/30 text-white border-0 self-start sm:self-auto"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Trending in Your Field */}
        <div className="space-y-3">
          <h2 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Trending in Your Field
          </h2>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map((topic, idx) => (
              <Badge 
                key={idx} 
                className="px-3 py-1.5 text-xs md:text-sm rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-300 border-0"
              >
                <Flame className="w-3 h-3 mr-1" />
                {topic}
              </Badge>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <InfoCard
          icon={Lightbulb}
          title="Tips for Better Matches"
          iconColor="text-amber-500"
          items={[
            "Upload research papers with detailed abstracts and keywords",
            "Add industry tags to your research for better matching",
            "Specify your research field for more accurate recommendations",
            "The more papers you upload, the better the AI understands your expertise"
          ]}
        />

        {/* Tabs */}
        <Tabs defaultValue="research" className="space-y-4">
          <TabsList className="bg-muted/50 p-1 rounded-xl w-full sm:w-auto flex">
            <TabsTrigger value="research" className="rounded-lg data-[state=active]:bg-background flex-1 sm:flex-initial text-xs sm:text-sm">
              <FileText className="w-4 h-4 mr-1 sm:mr-2" />
              Research ({recommendations.length})
            </TabsTrigger>
            <TabsTrigger value="challenges" className="rounded-lg data-[state=active]:bg-background flex-1 sm:flex-initial text-xs sm:text-sm">
              <Trophy className="w-4 h-4 mr-1 sm:mr-2" />
              Challenges ({challenges.length})
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="rounded-lg data-[state=active]:bg-background flex-1 sm:flex-initial text-xs sm:text-sm">
              <Briefcase className="w-4 h-4 mr-1 sm:mr-2" />
              Jobs
            </TabsTrigger>
          </TabsList>

          {/* Research Tab */}
          <TabsContent value="research" className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <Card className="rounded-2xl">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No recommendations yet</h3>
                  <p className="text-muted-foreground mb-4">Start supervised research or upload completed work to help us understand your interests</p>
                  <Link to="/dashboard/research/start-student">
                    <Button className="rounded-xl">Start Student Research</Button>
                  </Link>
                  <Link to="/dashboard/research/upload-completed" className="ml-2">
                    <Button variant="outline" className="rounded-xl">Upload Completed Research</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recommendations.map((paper, index) => (
                  <Card key={paper.id} className="rounded-xl border-l-4 border-l-yellow-400 hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-4 md:p-5">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">AI Recommended #{index + 1}</span>
                          <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {formatPercent(paper.matchScore || 95)}% Match
                          </Badge>
                        </div>
                        
                        <h3 className="text-base md:text-lg font-bold text-foreground leading-tight">
                          {paper.title}
                        </h3>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {paper.abstract || "No abstract available"}
                        </p>
                        
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border-l-4 border-l-amber-400">
                          <p className="text-sm">
                            <span className="font-semibold text-amber-700 dark:text-amber-400">Why recommended:</span>{" "}
                            <span className="text-muted-foreground">
                              This study aligns closely with your recent research focus
                              {userInterests.length > 0 && ` in ${userInterests[0]}`}.
                            </span>
                          </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                          <div className="flex flex-wrap gap-2">
                            {paper.research_field && (
                              <Badge variant="outline" className="rounded-full text-xs">
                                {paper.research_field}
                              </Badge>
                            )}
                            {paper.research_stage && (
                              <Badge className="rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                {paper.research_stage}
                              </Badge>
                            )}
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="w-3 h-3" />
                              {paper.views_count}
                            </span>
                          </div>
                          
                          <Link to={`/dashboard/research/${paper.id}`}>
                            <Button size="sm" className="rounded-lg w-full sm:w-auto">
                              View <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-4">
            {challenges.length === 0 ? (
              <Card className="rounded-xl">
                <CardContent className="py-12 text-center">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No active challenges</p>
                </CardContent>
              </Card>
            ) : (
              challenges.map((challenge) => (
                <Card key={challenge.id} className="rounded-xl hover:shadow-lg transition-all">
                  <CardContent className="p-4 md:p-5">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground text-base">
                        {challenge.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {challenge.description}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {challenge.reward_amount && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 self-start">
                            {challenge.reward_currency} {formatAmount(challenge.reward_amount)}
                          </Badge>
                        )}
                        <Link to={`/dashboard/challenges/${challenge.id}`}>
                          <Button size="sm" variant="outline" className="rounded-lg w-full sm:w-auto">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-4">
            {opportunities.length === 0 ? (
              <Card className="rounded-xl">
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No opportunities available</p>
                </CardContent>
              </Card>
            ) : (
              opportunities.map((job) => (
                <Card key={job.id} className="rounded-xl hover:shadow-lg transition-all">
                  <CardContent className="p-4 md:p-5">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground text-base">
                        {job.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <Badge variant="outline">
                          {job.job_type.replace('_', ' ')}
                        </Badge>
                        <Link to="/dashboard/job-board">
                          <Button size="sm" variant="outline" className="rounded-lg w-full sm:w-auto">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
