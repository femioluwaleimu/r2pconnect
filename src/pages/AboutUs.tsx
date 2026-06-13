import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Users, Globe, Award, ArrowRight, Lightbulb, Shield, Rocket } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { useSEO } from "@/hooks/useSEO";

export default function AboutUs() {
  useSEO({
    title: "About Us",
    description: "Learn about R2PConnect — an AI-powered platform connecting Nigerian researchers, students, institutions, and industries for collaboration and innovation.",
    url: "/about",
  });
  const team = [
    { name: "Research Leadership", role: "Connecting Academia", icon: Users },
    { name: "Industry Partners", role: "Bridging Innovation", icon: Target },
    { name: "Investment Network", role: "Funding Impact", icon: Globe },
  ];

  const values = [
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "We believe in the power of research to solve real-world problems and drive progress.",
    },
    {
      icon: Shield,
      title: "Integrity",
      description: "We maintain the highest standards of academic and professional integrity in all our operations.",
    },
    {
      icon: Users,
      title: "Collaboration",
      description: "We foster meaningful connections between researchers, institutions, industries, and investors.",
    },
    {
      icon: Rocket,
      title: "Impact",
      description: "We measure our success by the real-world impact of the research we help bring to life.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PublicHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-16 gradient-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            About R2P CONNECT
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Nigeria's leading platform bridging the gap between academic research and real-world application.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Our Mission</h2>
              <p className="text-muted-foreground text-lg mb-6">
                R2P CONNECT (Research to Practice Connect) is an innovative ecosystem built by <strong>Education Television Nigeria (EduTV Nigeria)</strong>. We are dedicated to transforming how research creates value in society by bridging the gap between academic institutions, industry partners, and investors to ensure that groundbreaking research doesn't remain confined to journals but translates into real-world solutions.
              </p>
              <p className="text-muted-foreground text-lg mb-6">
                Founded with the vision of accelerating Nigeria's innovation ecosystem, we provide a comprehensive platform that connects researchers with the resources, partnerships, and funding they need to bring their discoveries to life.
              </p>
              <p className="text-muted-foreground text-lg">
                Our documentary initiatives are powered by <strong>EduTV Nigeria</strong>, bringing research stories to life through compelling visual narratives. EduTV Nigeria specializes in creating educational and research-focused documentaries that showcase the impact of academic research, highlight breakthrough innovations, and connect researchers with broader audiences including industry partners, investors, and the general public.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {team.map((member, index) => (
                <Card key={index} className="border-none shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl gradient-hero mx-auto mb-4 flex items-center justify-center">
                      <member.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-none shadow-lg bg-primary/10">
                <CardContent className="p-6 text-center flex flex-col items-center justify-center">
                  <Award className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-semibold text-foreground">Excellence</h3>
                  <p className="text-sm text-muted-foreground">In Everything</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These core values guide everything we do at R2P CONNECT.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Ready to Join the Research Revolution?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Whether you're a researcher, institution, industry partner, or investor, there's a place for you at R2P CONNECT.
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
