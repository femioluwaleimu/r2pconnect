import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, Building2, DollarSign, Trophy, FileText, Lightbulb, CheckCircle2, BookOpen, Video, Play, Briefcase, HelpCircle } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { useSEO } from "@/hooks/useSEO";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Research",
    description: "Get AI assistance for research summaries, gap detection, and industrial applications.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: Users,
    title: "Industry Collaboration",
    description: "Connect researchers with industries seeking innovative solutions.",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    icon: Trophy,
    title: "Challenge Board",
    description: "Industries post challenges, researchers provide solutions and earn rewards.",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: Briefcase,
    title: "Student Job Opportunities",
    description: "Find internships, SIWES placements, and part-time roles from top companies.",
    gradient: "from-emerald-500 to-green-600",
  },
  {
    icon: Play,
    title: "EduTV Documentaries",
    description: "Showcase your research impact through professional video documentaries.",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    icon: DollarSign,
    title: "Research Funding",
    description: "Access funding opportunities from investors and industries.",
    gradient: "from-yellow-500 to-amber-600",
  },
];

const steps = [
  {
    step: "01",
    title: "Upload Research",
    description: "Researchers upload their papers with AI-powered summarization and keyword extraction.",
    icon: FileText,
  },
  {
    step: "02",
    title: "Institutional Review",
    description: "Your institution reviews and approves research for publication.",
    icon: Building2,
  },
  {
    step: "03",
    title: "Industry Discovery",
    description: "Industries browse approved research and find innovative solutions.",
    icon: Lightbulb,
  },
  {
    step: "04",
    title: "Create Impact",
    description: "Collaborate, commercialize, and transform research into real-world impact.",
    icon: Trophy,
  },
];

const stats = [
  { value: "500+", label: "Research Papers" },
  { value: "120+", label: "Institutions" },
  { value: "80+", label: "Industry Partners" },
  { value: "₦50M+", label: "Funding Raised" },
];

const benefits = [
  "AI-powered research summarization",
  "Direct industry connections",
  "Student job opportunities",
  "Professional documentaries",
];

export default function Landing() {
  useSEO({
    title: "R2PConnect | AI-Powered Research & Industry Collaboration Platform",
    description: "Connect students, researchers, institutions, and industries through AI supervision, research reviews, internships, SIWES, funding, and innovation commercialization.",
    url: "/",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PublicHeader />

      {/* Hero Section */}
      <section className="gradient-hero py-20 lg:py-28 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/90 text-sm font-medium">Bridging Academia & Industry in Nigeria</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in leading-tight" style={{ animationDelay: "0.1s" }}>
              Turn Research Into
              <span className="block bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Real-World Impact</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 animate-fade-in leading-relaxed" style={{ animationDelay: "0.2s" }}>
              Connect Nigerian researchers with industries, start new research, AI & Human supervision, secure funding, and showcase your innovations through AI-powered collaboration.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-xl px-8 font-semibold shadow-lg shadow-black/10 group">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Quick Access Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8 animate-fade-in" style={{ animationDelay: "0.35s" }}>
              <Link to="/research">
                <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 rounded-xl px-6 font-semibold">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Browse Research
                </Button>
              </Link>
              <Link to="/jobs">
                <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 rounded-xl px-6 font-semibold">
                  <Briefcase className="w-5 h-5 mr-2" />
                  Jobs Opportunities
                </Button>
              </Link>
              <Link to="/documentaries">
                <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 rounded-xl px-6 font-semibold">
                  <Video className="w-5 h-5 mr-2" />
                  Watch Documentaries
                </Button>
              </Link>
              <Link to="/faq">
                <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 rounded-xl px-6 font-semibold">
                  <HelpCircle className="w-5 h-5 mr-2" />
                  FAQ
                </Button>
              </Link>
            </div>

            {/* Quick benefits */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-12 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-white/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-3xl md:text-4xl font-bold text-gradient mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              R2P CONNECT provides all the tools researchers, industries, and investors need to transform academic research into commercial success.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-card rounded-2xl p-6 border border-border shadow-soft card-hover animate-fade-in group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From research upload to industry impact in four simple steps.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((item, index) => (
              <div 
                key={index}
                className="relative animate-fade-in"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="bg-card rounded-2xl p-6 border border-border h-full shadow-soft hover:shadow-card transition-shadow">
                  <span className="text-5xl font-bold text-primary/10">{item.step}</span>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mt-4 mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-5 h-5 text-primary/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-hero relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Research?
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10">
            Join hundreds of researchers, institutions, and industries already creating impact on R2P CONNECT.
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-xl px-8 font-semibold shadow-lg shadow-black/10 group">
              Start Your Journey
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      <PublicFooter variant="full" />
    </div>
  );
}
