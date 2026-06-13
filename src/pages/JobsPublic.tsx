import { useState, useEffect } from "react";
import MiniFAQBlock from "@/components/faq/MiniFAQBlock";

import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Search,
  Building2,
  GraduationCap,
  ArrowRight,
  Users } from
"lucide-react";

interface JobPosting {
  id: string;
  title: string;
  description: string;
  job_type: string;
  company_name?: string | null;
  company_location?: string | null;
  company_logo_url?: string | null;
  payment_amount: number | null;
  payment_currency: string | null;
  duration: string | null;
  deadline: string | null;
  slots_available: number | null;
  slots_filled: number | null;
  department: string | null;
  required_level: string[] | null;
  industry_id: string;
  created_at: string;
  source?: "direct" | "ipn";
  is_paid?: boolean;
  application_fee_ngn?: number;
  work_mode?: string | null;
}

interface Profile {
  full_name: string;
  company_address: string | null;
  avatar_url: string | null;
}

const jobTypeLabels: Record<string, string> = {
  part_time: "Part-time",
  siwes: "SIWES",
  industrial_training: "Industrial Training",
  internship: "Internship"
};

const jobTypeColors: Record<string, string> = {
  part_time: "bg-blue-500 text-white border-blue-500",
  siwes: "bg-green-500 text-white border-green-500",
  industrial_training: "bg-purple-500 text-white border-purple-500",
  internship: "bg-amber-500 text-white border-amber-500"
};

export default function JobsPublic() {
  useSEO({
    title: "Student Jobs & Internships",
    description: "Find internships, SIWES placements, and part-time jobs on R2PConnect. Connect with top companies hiring Nigerian students and researchers.",
    url: "/jobs"
  });
  const [jobs, setJobs] = useState<(JobPosting & {profile?: Profile;})[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);

    // Fetch direct industry jobs
    const { data: jobsData } = await supabase
      .from('job_postings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Fetch IPN opportunities
    const { data: ipnData } = await supabase
      .from('ipn_opportunities')
      .select('*, ipn_companies(name, location, state, logo_url)')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    // Fetch profiles for direct jobs
    const directJobs = await Promise.all(
      (jobsData || []).map(async (job) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, company_address, avatar_url')
          .eq('user_id', job.industry_id)
          .single();
        return {
          ...job,
          profile: profileData || undefined,
          source: "direct" as const,
          is_paid: (job as any).is_paid || false,
          application_fee_ngn: (job as any).application_fee_ngn || 0,
        };
      })
    );

    // Map IPN opportunities to the same shape
    const ipnJobs: (JobPosting & { profile?: Profile })[] = (ipnData || []).map((opp: any) => ({
      id: `ipn_${opp.id}`,
      title: opp.title,
      description: opp.description,
      job_type: opp.job_type,
      company_name: opp.ipn_companies?.name || null,
      company_location: opp.location || opp.ipn_companies?.location || null,
      company_logo_url: opp.ipn_companies?.logo_url || null,
      payment_amount: null,
      payment_currency: null,
      duration: opp.duration,
      deadline: opp.deadline,
      slots_available: opp.slots_available,
      slots_filled: opp.slots_filled || 0,
      department: null,
      required_level: null,
      industry_id: opp.ipn_user_id,
      created_at: opp.created_at,
      source: "ipn" as const,
      is_paid: opp.is_paid,
      application_fee_ngn: opp.application_fee_ngn,
      work_mode: opp.work_mode || null,
    }));

    setJobs([...directJobs, ...ipnJobs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setLoading(false);
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = jobTypeFilter === "all" || job.job_type === jobTypeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      
      {/* Hero Section */}
      <section className="gradient-hero py-20">
        <div className="max-w-6xl mx-auto px-4 text-center text-primary-foreground">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Briefcase className="w-4 h-4 text-white" />
            <span className="text-white/90 text-sm font-medium">Student Opportunities</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Find Your Next Opportunity
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            Discover internships, SIWES placements, and part-time roles from top companies looking for talented students.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search jobs by title, company, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 rounded-xl bg-white border-none shadow-lg text-foreground placeholder:text-black" />
              
            </div>
            <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
              <SelectTrigger className="w-48 h-14 rounded-xl bg-white border-none shadow-lg">
                <SelectValue placeholder="Job Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="part_time">Part-time</SelectItem>
                <SelectItem value="siwes">SIWES</SelectItem>
                <SelectItem value="industrial_training">Industrial Training</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-gradient">{jobs.length}+</p>
              <p className="text-sm text-muted-foreground">Active Jobs</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gradient">{new Set(jobs.map((j) => j.industry_id)).size}+</p>
              <p className="text-sm text-muted-foreground">Companies</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gradient">{jobs.reduce((acc, j) => acc + (j.slots_available || 0), 0)}+</p>
              <p className="text-sm text-muted-foreground">Open Positions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Jobs Listing */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'} Available
            </h2>
          </div>

          {loading ?
          <div className="grid md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) =>
            <Skeleton key={i} className="h-64 rounded-2xl" />
            )}
            </div> :
          filteredJobs.length === 0 ?
          <Card className="p-12 text-center rounded-2xl border-none shadow-soft">
              <Briefcase className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Jobs Found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your search or filter criteria.</p>
              <Button onClick={() => {setSearchQuery("");setJobTypeFilter("all");}} variant="outline" className="rounded-xl">
                Clear Filters
              </Button>
            </Card> :

          <div className="grid md:grid-cols-2 gap-6">
              {filteredJobs.map((job) =>
            <Card key={job.id} className="rounded-2xl border-none shadow-tick hover:shadow-xl transition-all duration-300 group overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      {(() => {
                        const logoUrl = job.company_logo_url || job.profile?.avatar_url;
                        return logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={job.company_name || job.profile?.full_name || 'Company'}
                            className="w-12 h-12 rounded-xl object-cover border border-border flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-6 h-6 text-muted-foreground" />
                          </div>
                        );
                      })()}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <Badge className={`rounded-full ${jobTypeColors[job.job_type] || 'bg-muted'}`}>
                            {jobTypeLabels[job.job_type] || job.job_type}
                          </Badge>
                          {job.source === "ipn" && (
                            <Badge variant={job.is_paid ? "destructive" : "secondary"} className="rounded-full text-xs">
                              {job.is_paid ? `₦${(job.application_fee_ngn || 0).toLocaleString()} Fee` : "Free"}
                            </Badge>
                          )}
                          {job.source === "direct" && job.is_paid && (
                            <Badge variant="destructive" className="rounded-full text-xs">
                              ₦{(job.application_fee_ngn || 0).toLocaleString()} Fee
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
                          {job.title}
                        </CardTitle>
          <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="w-4 h-4" />
            <span className="text-sm font-medium">{job.company_name || job.profile?.full_name || 'Company'}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm line-clamp-2">{job.description}</p>
                    
                    <div className="flex flex-wrap gap-3 text-sm">
                      {job.payment_amount &&
                  <div className="flex items-center gap-1 text-green-600">
                          <DollarSign className="w-4 h-4" />
                          <span>{job.payment_currency || '₦'}{job.payment_amount.toLocaleString()}</span>
                        </div>
                  }
                      {job.duration &&
                  <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{job.duration}</span>
                        </div>
                  }
                      {(job.company_location || job.profile?.company_address) &&
                  <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate max-w-32">{job.company_location || job.profile?.company_address}</span>
                        </div>
                  }
                      {job.work_mode &&
                  <div className="flex items-center gap-1 text-muted-foreground">
                          <Briefcase className="w-4 h-4" />
                          <span>{job.work_mode}</span>
                        </div>
                  }
                    </div>

                    {job.required_level && job.required_level.length > 0 &&
                <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {job.required_level.slice(0, 3).map((level, idx) =>
                    <Badge key={idx} variant="outline" className="text-xs rounded-full">
                              {level}
                            </Badge>
                    )}
                          {job.required_level.length > 3 &&
                    <Badge variant="outline" className="text-xs rounded-full">
                              +{job.required_level.length - 3}
                            </Badge>
                    }
                        </div>
                      </div>
                }

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Users className="w-4 h-4" />
                        <span>{(job.slots_available || 0) - (job.slots_filled || 0)} slots left</span>
                      </div>
                      <Link to={`/jobs/${job.id}`}>
                        <Button className="rounded-xl group-hover:gradient-hero group-hover:text-white transition-all">
                          View Details
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
            )}
            </div>
          }
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 gradient-hero">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Your Career Journey?</h2>
          <p className="text-white/80 mb-8">
            Create an account to apply for jobs, track applications, and get personalized recommendations.
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-xl px-8 font-semibold">
              Sign Up Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <MiniFAQBlock
        displayLocation="jobs"
        title="Jobs & SIWES FAQ"
        fallbackQuestions={[
        { question: "How do companies post internships?", answer: "Companies register as Industry partners on R2PConnect, then create job postings specifying the role type (SIWES, internship, part-time), requirements, duration, and payment. Postings are visible to all students." },
        { question: "Are placements verified?", answer: "Yes. All industry partners are verified during registration. Placements are tracked through the platform, and students can report any issues to the admin team." },
        { question: "Can students apply directly?", answer: "Yes. Students can browse available opportunities and apply directly through the platform with a cover letter. Applications are reviewed by the posting company." }]
        } />
      

      <PublicFooter />
    </div>);

}