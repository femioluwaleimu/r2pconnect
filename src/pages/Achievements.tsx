import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Trophy, Target, Award, Medal, Zap } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const achievementDefs = [
  { id: 'first_paper', icon: Star, title: "First Paper", description: "Upload your first research paper", total: 1, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  { id: 'challenge_winner', icon: Trophy, title: "Challenge Winner", description: "Win your first challenge", total: 1, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  { id: 'collaborator', icon: Target, title: "Collaborator", description: "Complete 5 collaborations", total: 5, color: "text-primary", bgColor: "bg-primary/10" },
  { id: 'top_researcher', icon: Award, title: "Top Researcher", description: "Reach 1000 paper views", total: 1000, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  { id: 'documentary_creator', icon: Medal, title: "Documentary Creator", description: "Create 3 documentaries", total: 3, color: "text-rose-500", bgColor: "bg-rose-500/10" },
  { id: 'ai_explorer', icon: Zap, title: "AI Explorer", description: "Use AI tools 10 times", total: 10, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
];

export default function Achievements() {
  const [stats, setStats] = useState({ papers: 0, views: 0, aiUsage: 0, submissions: 0 });
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [papersRes, creditsRes, submissionsRes] = await Promise.all([
      supabase.from('research_papers').select('views_count').eq('author_id', user.id),
      supabase.from('ai_credits').select('credits_used').eq('user_id', user.id).maybeSingle(),
      supabase.from('challenge_submissions').select('id').eq('researcher_id', user.id)
    ]);

    const papers = papersRes.data || [];
    const views = papers.reduce((sum, p) => sum + (p.views_count || 0), 0);
    
    setStats({
      papers: papers.length,
      views,
      aiUsage: creditsRes.data?.credits_used || 0,
      submissions: submissionsRes.data?.length || 0
    });
    setLoading(false);
  };

  const getProgress = (id: string) => {
    switch (id) {
      case 'first_paper': return Math.min(stats.papers, 1);
      case 'top_researcher': return Math.min(stats.views, 1000);
      case 'ai_explorer': return Math.min(stats.aiUsage, 10);
      default: return 0;
    }
  };

  const unlockedCount = achievementDefs.filter(a => getProgress(a.id) >= a.total).length;
  const totalPoints = unlockedCount * 100;
  const rank = totalPoints >= 500 ? 'Expert' : totalPoints >= 200 ? 'Advanced' : totalPoints >= 100 ? 'Intermediate' : 'Novice';

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Achievements</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your research milestones and badges</p>
        </div>

        {/* Stats Summary - Mobile Optimized */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="border-none shadow-soft rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{unlockedCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{isMobile ? "Unlocked" : "Achievements Unlocked"}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-soft rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{totalPoints}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{isMobile ? "Points" : "Total Points"}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-soft rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{rank}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{isMobile ? "Rank" : "Current Rank"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Achievement Cards - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {achievementDefs.map((achievement) => {
            const progress = getProgress(achievement.id);
            const isUnlocked = progress >= achievement.total;
            const progressPercent = Math.min((progress / achievement.total) * 100, 100);
            
            return (
              <Card 
                key={achievement.id} 
                className={`shadow-soft rounded-xl sm:rounded-2xl border-border/50 hover:shadow-lg transition-all duration-300 ${isUnlocked ? 'ring-2 ring-primary bg-primary/5' : ''}`}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${achievement.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <achievement.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${achievement.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">{achievement.title}</h3>
                        {isUnlocked && (
                          <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">✓</span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-1">{achievement.description}</p>
                      <div className="w-full bg-muted rounded-full h-1.5 sm:h-2">
                        <div 
                          className={`${isUnlocked ? 'bg-primary' : 'bg-primary/70'} rounded-full h-1.5 sm:h-2 transition-all duration-500`} 
                          style={{ width: `${progressPercent}%` }} 
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{progress}/{achievement.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
