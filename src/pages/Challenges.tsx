import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InfoCard } from "@/components/ui/info-card";
import { Trophy, Search, DollarSign, Calendar, Lightbulb, ArrowRight } from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";
interface Challenge {
  id: string;
  title: string;
  description: string;
  reward_amount: number | null;
  reward_currency: string | null;
  deadline: string | null;
  is_active: boolean | null;
}
export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    fetchChallenges();
  }, []);
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredChallenges(challenges.filter(c => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)));
    } else {
      setFilteredChallenges(challenges);
    }
  }, [searchQuery, challenges]);
  const fetchChallenges = async () => {
    const {
      data
    } = await supabase.from('challenges').select('*').eq('is_active', true).order('created_at', {
      ascending: false
    });
    if (data) {
      setChallenges(data);
      setFilteredChallenges(data);
    }
    setLoading(false);
  };
  return <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Research Challenges</h1>
          <p className="text-sm text-muted-foreground">Compete in industry challenges and earn rewards</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search challenges..." className="rounded-xl pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>

        {/* Info Card */}
        <InfoCard icon={Lightbulb} title="About Challenges" iconColor="text-amber-500" items={["Industry partners post real-world problems", "Submit your research proposals to compete", "Win cash prizes and recognition", "Build connections with industry leaders"]} />

        {/* Challenges List */}
        {loading ? <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div> : filteredChallenges.length === 0 ? <Card className="shadow-card rounded-2xl border-border/50">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center mb-4">
                  <Trophy className="w-10 h-10 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Active Challenges</h3>
                <p className="text-muted-foreground">Check back soon for new research challenges.</p>
              </div>
            </CardContent>
          </Card> : <div className="grid gap-4">
            {filteredChallenges.map(challenge => {
              const isExpired = challenge.deadline && new Date(challenge.deadline) < new Date();
              
              return (
                <Card key={challenge.id} className="hover:shadow-md transition-shadow rounded-xl">
                  <CardContent className="p-4 md:p-5">
                    <div className="space-y-3">
                      {/* Title */}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-base md:text-lg text-foreground">
                          {challenge.title}
                        </h3>
                        {isExpired ? (
                          <Badge variant="secondary" className="rounded-full flex-shrink-0">Submission Ended</Badge>
                        ) : (
                          <Badge className="bg-stat-green/20 text-stat-green rounded-full flex-shrink-0">Active</Badge>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {challenge.description}
                      </p>

                      {/* Meta & Action */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 font-medium text-primary">
                            <DollarSign className="w-4 h-4" />
                            {challenge.reward_currency === 'NGN' ? '₦' : '$'}{challenge.reward_amount?.toLocaleString()}
                          </span>
                          {challenge.deadline && (
                            <span className={`flex items-center gap-1 ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                              <Calendar className="w-4 h-4" />
                              {isExpired ? 'Ended' : formatLagos(challenge.deadline)}
                            </span>
                          )}
                        </div>
                        <Link to={`/dashboard/challenges/${challenge.id}`}>
                          <Button size="sm" className="rounded-lg w-full sm:w-auto">
                            View Details <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>}
      </div>
    </DashboardLayout>;
}