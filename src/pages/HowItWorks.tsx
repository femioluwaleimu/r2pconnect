import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Upload,
  Search,
  Users,
  TrendingUp,
  FileText,
  Lightbulb,
  Building2,
  Briefcase,
  Wallet,
  CheckCircle2,
  Zap,
  Target,
  GraduationCap,
  UserCheck,
  MessageSquare,
  Send,
  ClipboardCheck,
  Award,
  BookOpen,
  Handshake,
  Eye,
  BadgeCheck,
} from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { useSEO } from "@/hooks/useSEO";

export default function HowItWorks() {
  useSEO({
    title: "How It Works",
    description: "Learn how R2PConnect works — from uploading research to connecting with industries, getting AI supervision, and securing funding or internships.",
    url: "/how-it-works",
  });
  const researchSteps = [
    {
      number: "01",
      icon: FileText,
      title: "Create Your Profile",
      description:
        "Sign up and create your profile as a researcher, institution, industry partner, or investor. Each role unlocks unique features tailored to your needs.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      number: "02",
      icon: Upload,
      title: "Upload & Share Research",
      description:
        "Researchers upload their papers, get peer reviews, and publish their work. Our AI tools help refine topics and identify research gaps.",
      color: "from-purple-500 to-pink-500",
    },
    {
      number: "03",
      icon: Search,
      title: "Discover Opportunities",
      description:
        "Browse research papers, find collaborators, or post industry challenges. Our matching algorithms connect the right people with the right projects.",
      color: "from-orange-500 to-red-500",
    },
    {
      number: "04",
      icon: TrendingUp,
      title: "Collaborate & Grow",
      description:
        "Connect with partners, receive funding, and track your impact. Earn credits and achievements as you contribute to the ecosystem.",
      color: "from-green-500 to-emerald-500",
    },
  ];

  const studentJobSteps = [
    {
      number: "01",
      icon: GraduationCap,
      title: "Complete Your Student Profile",
      description:
        "Add your skills, academic level, department, and preferred job types. Upload your CV to stand out to employers.",
      color: "from-violet-500 to-purple-500",
    },
    {
      number: "02",
      icon: Search,
      title: "Browse Job Opportunities",
      description:
        "Explore SIWES placements, internships, and IT positions posted by verified companies. Use AI-powered search to find the best matches.",
      color: "from-cyan-500 to-blue-500",
    },
    {
      number: "03",
      icon: Send,
      title: "Apply with One Click",
      description:
        "Submit applications with your cover letter and CV. Track your application status in real-time from your dashboard.",
      color: "from-amber-500 to-orange-500",
    },
    {
      number: "04",
      icon: Handshake,
      title: "Get Hired & Earn",
      description:
        "Upon approval, start working with the company. Complete tasks, receive payments, and build your professional experience.",
      color: "from-emerald-500 to-green-500",
    },
  ];

  const supervisorSteps = [
    {
      number: "01",
      icon: BookOpen,
      title: "Start Your Research",
      description:
        "Select your assigned supervisor from your institution. Submit your research title, abstract, and initial draft for review.",
      color: "from-rose-500 to-pink-500",
    },
    {
      number: "02",
      icon: Eye,
      title: "Supervisor Review",
      description:
        "Your supervisor reviews your work, provides feedback, and can upload annotated documents. AI tools help detect plagiarism and content issues.",
      color: "from-indigo-500 to-violet-500",
    },
    {
      number: "03",
      icon: MessageSquare,
      title: "Collaborate in Real-Time",
      description:
        "Communicate directly with your supervisor through the messaging system. Share files, get guidance, and refine your research together.",
      color: "from-teal-500 to-cyan-500",
    },
    {
      number: "04",
      icon: BadgeCheck,
      title: "Get Approved & Publish",
      description:
        "Once approved by your supervisor and institutional reviewer, your research becomes visible to industry partners and investors.",
      color: "from-lime-500 to-green-500",
    },
  ];

  const userTypes = [
    {
      icon: GraduationCap,
      title: "Students",
      features: [
        "Submit research under supervisor guidance",
        "Browse and apply for jobs, internships & SIWES",
        "AI-powered job matching based on skills",
        "Track applications and earnings in wallet",
        "Get verified by your institution",
      ],
    },
    {
      icon: UserCheck,
      title: "Supervisors",
      features: [
        "Review and approve student research",
        "Upload annotated feedback documents",
        "Real-time messaging with students",
        "Track research progress and versions",
        "AI-assisted integrity checking",
      ],
    },
    {
      icon: Building2,
      title: "Institutions",
      features: [
        "Manage affiliated researchers & supervisors",
        "Oversee paper review processes",
        "Verify students for job opportunities",
        "Set plagiarism & AI content thresholds",
        "Earn commissions on researcher success",
      ],
    },
    {
      icon: Briefcase,
      title: "Industry Partners",
      features: [
        "Post jobs, internships & SIWES positions",
        "Discover researchers via AI matching",
        "Review and hire student applicants",
        "Post research challenges with rewards",
        "Connect with institutional talent",
      ],
    },
    {
      icon: Wallet,
      title: "Investors",
      features: [
        "Discover high-potential research",
        "Build investment portfolios",
        "Track research commercialization",
        "Connect with researchers directly",
        "Access market opportunity analysis",
      ],
    },
  ];

  const features = [
    {
      icon: Lightbulb,
      title: "AI Research Assistant",
      description: "Get intelligent suggestions for topic refinement, gap detection, and research direction.",
    },
    {
      icon: Zap,
      title: "Smart Job Matching",
      description: "Our AI connects students with the perfect job opportunities based on their skills and preferences.",
    },
    {
      icon: Target,
      title: "Industry Challenges",
      description: "Companies post real-world problems with rewards, researchers submit innovative solutions.",
    },
    {
      icon: ClipboardCheck,
      title: "Supervisor Oversight",
      description: "Structured workflow ensuring quality research with institutional approval.",
    },
    {
      icon: Award,
      title: "Student Verification",
      description: "Verified students get priority for job opportunities and earn trust from employers.",
    },
    {
      icon: CheckCircle2,
      title: "Peer Review System",
      description: "Rigorous review process ensures quality research with constructive feedback.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-16 gradient-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">How R2P CONNECT Works</h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            From student research to industry employment—discover how we bridge academia and the professional world.
          </p>
        </div>
      </section>

      {/* Student Job Opportunities Section */}
      <section className="py-20 bg-gradient-to-b from-violet-50/50 to-background dark:from-violet-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium mb-4">
              <Briefcase className="w-4 h-4" />
              For Students
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Find Your Next Opportunity
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Browse SIWES placements, internships, and IT positions from verified companies. 
              Our AI helps match you with the perfect role.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {studentJobSteps.map((step, index) => (
              <div key={index} className="relative group">
                <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 h-full bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}
                    >
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-5xl font-bold text-muted-foreground/10 absolute top-4 right-4">
                      {step.number}
                    </span>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
                {index < studentJobSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supervisor-Student Research Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-sm font-medium mb-4">
              <BookOpen className="w-4 h-4" />
              Student Research
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Research with Supervisor Support
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Students submit research under institutional supervision. Get feedback, iterate, 
              and publish quality work with proper academic oversight.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {supervisorSteps.map((step, index) => (
              <div key={index} className="relative group">
                <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 h-full bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}
                    >
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-5xl font-bold text-muted-foreground/10 absolute top-4 right-4">
                      {step.number}
                    </span>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
                {index < supervisorSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Research Ecosystem Section */}
      <section className="py-20 bg-gradient-to-b from-blue-50/50 to-background dark:from-blue-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
              <Users className="w-4 h-4" />
              Research Ecosystem
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Your Journey on R2P CONNECT
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              From signing up to making an impact—here's how you can get started with research collaboration.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {researchSteps.map((step, index) => (
              <div key={index} className="relative group">
                <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 h-full bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}
                    >
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-5xl font-bold text-muted-foreground/10 absolute top-4 right-4">
                      {step.number}
                    </span>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
                {index < researchSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Built for Everyone in the Research Ecosystem
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Whether you're a student, supervisor, institution, industry partner, or investor—we have you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userTypes.map((type, index) => (
              <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <type.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground mb-3">{type.title}</h3>
                      <ul className="space-y-2">
                        {type.features.map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Powerful Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Tools and capabilities designed to accelerate research impact and career growth.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto text-lg">
            Join thousands of students, researchers, and industry partners already using R2P CONNECT 
            to bridge the gap between education, research, and practice.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?mode=signup">
              <Button size="lg" variant="secondary" className="gap-2 text-base">
                Create Free Account <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/jobs">
              <Button size="lg" variant="outline" className="gap-2 border-white/30 text-black hover:bg-white/10 text-base">
                <Briefcase className="w-5 h-5" /> Browse Jobs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
