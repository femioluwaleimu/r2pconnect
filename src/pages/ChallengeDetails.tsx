import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Trophy, 
  Calendar, 
  DollarSign,
  Clock,
  Send,
  CheckCircle,
  Building2,
  MapPin
} from "lucide-react";
import { formatAmount, toNumber } from "@/lib/numberFormat";

interface Challenge {
  id: string;
  title: string;
  description: string;
  reward_amount: number | null;
  reward_currency: string | null;
  deadline: string | null;
  is_active: boolean | null;
  created_at: string;
  industry_id: string;
}

interface IndustryProfile {
  full_name: string;
  avatar_url: string | null;
  company_address: string | null;
}

interface Submission {
  id: string;
  status: string;
  created_at: string;
}

export default function ChallengeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [industryProfile, setIndustryProfile] = useState<IndustryProfile | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proposal, setProposal] = useState("");

  useEffect(() => {
    if (id) {
      fetchChallenge();
    }
  }, [id]);

  const fetchChallenge = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      console.error('Error fetching challenge:', error);
      navigate('/dashboard/challenges');
      return;
    }

    setChallenge({
      ...data,
      reward_amount: data.reward_amount == null ? null : toNumber(data.reward_amount),
    });

    // Fetch industry profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, company_address')
      .eq('user_id', data.industry_id)
      .maybeSingle();

    if (profile) {
      setIndustryProfile(profile);
    }

    // Check if user has already submitted
    if (user) {
      const { data: existingSubmission } = await supabase
        .from('challenge_submissions')
        .select('id, status, created_at')
        .eq('challenge_id', id)
        .eq('researcher_id', user.id)
        .maybeSingle();

      if (existingSubmission) {
        setSubmission(existingSubmission);
      }
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!proposal.trim()) {
      toast({ title: "Error", description: "Please enter your proposal", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "Please sign in to submit", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from('challenge_submissions')
      .insert({
        challenge_id: id,
        researcher_id: user.id,
        proposal: proposal.trim()
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Your proposal has been submitted!" });
      setSubmission(data);
      setProposal("");
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!challenge) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Challenge not found</p>
          <Link to="/dashboard/challenges">
            <Button variant="outline" className="mt-4">Back to Challenges</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isExpired = challenge.deadline && new Date(challenge.deadline) < new Date();
  const daysLeft = challenge.deadline 
    ? Math.ceil((new Date(challenge.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="w-fit rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{challenge.title}</h1>
              {isExpired ? (
                <Badge variant="destructive" className="rounded-full">Submission Ended</Badge>
              ) : challenge.is_active ? (
                <Badge className="bg-stat-green/20 text-stat-green rounded-full">Active</Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full">Closed</Badge>
              )}
            </div>
            
            {/* Company Info */}
            {industryProfile && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={industryProfile.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{industryProfile.full_name?.charAt(0) || 'C'}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">{industryProfile.full_name}</span>
                </div>
                {industryProfile.company_address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{industryProfile.company_address}</span>
                  </div>
                )}
              </div>
            )}
            
            <p className="text-sm text-muted-foreground mt-1">
              Posted on {new Date(challenge.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-3 md:p-4 rounded-xl bg-stat-yellow/10">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-warning" />
              <div>
                <p className="text-lg md:text-2xl font-bold text-foreground">
                  {challenge.reward_currency === 'NGN' ? '₦' : '$'}
                  {formatAmount(challenge.reward_amount)}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">Reward</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 md:p-4 rounded-xl bg-stat-blue/10">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-lg md:text-2xl font-bold text-foreground">
                  {challenge.deadline ? new Date(challenge.deadline).toLocaleDateString() : 'N/A'}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">Deadline</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 md:p-4 rounded-xl bg-stat-green/10">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-secondary" />
              <div>
                <p className={`text-lg md:text-2xl font-bold ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
                  {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days` : 'Ended') : 'Open'}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {isExpired ? 'Submission Ended' : 'Time Left'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            {/* Description */}
            <Card className="rounded-2xl shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Trophy className="w-5 h-5 text-warning" />
                  Challenge Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap">
                  {challenge.description}
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            {/* Submission Card */}
            <Card className="rounded-2xl shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base md:text-lg">Your Submission</CardTitle>
              </CardHeader>
              <CardContent>
                {submission ? (
                  <div className="text-center py-4">
                    <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-stat-green mx-auto mb-3" />
                    <p className="font-medium text-foreground">Proposal Submitted</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Status: <span className="capitalize">{submission.status}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted on {new Date(submission.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ) : challenge.is_active && !isExpired ? (
                  <div className="space-y-4">
                    <Textarea
                      value={proposal}
                      onChange={(e) => setProposal(e.target.value)}
                      placeholder="Describe your research proposal for this challenge..."
                      className="min-h-[120px] md:min-h-[150px] rounded-xl text-sm"
                    />
                    <Button 
                      className="w-full rounded-xl" 
                      onClick={handleSubmit}
                      disabled={submitting || !proposal.trim()}
                    >
                      {submitting ? 'Submitting...' : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Proposal
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground font-medium text-destructive">
                      {isExpired ? 'Submission Ended' : 'This challenge is no longer accepting submissions'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
