import InvestorLayout from "@/components/layout/InvestorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Briefcase, TrendingUp, Users, DollarSign, Plus, Info, ArrowRight, PieChart } from "lucide-react";

const statsCards = [
  { icon: Briefcase, label: "Portfolio Value", value: "$0.00", color: "bg-r2p-green-light", textColor: "text-r2p-green" },
  { icon: TrendingUp, label: "Active Investments", value: "0", color: "bg-r2p-blue-light", textColor: "text-r2p-blue" },
  { icon: Users, label: "Funded Researchers", value: "0", color: "bg-r2p-yellow-light", textColor: "text-r2p-yellow" },
  { icon: DollarSign, label: "Returns", value: "$0.00", color: "bg-r2p-purple-light", textColor: "text-r2p-purple" },
];

export default function InvestorDashboard() {
  return (
    <InvestorLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="gradient-hero rounded-2xl p-6 text-primary-foreground">
          <h1 className="text-2xl font-bold mb-2">Welcome to Investor Portal 👋</h1>
          <p className="text-primary-foreground/80 mb-4">
            Discover and fund groundbreaking research projects with real-world impact.
          </p>
          <Link to="/investor/opportunities">
            <Button className="bg-background text-primary hover:bg-background/90 rounded-xl">
              <TrendingUp className="w-4 h-4 mr-2" />
              Browse Opportunities
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat) => (
            <Card key={stat.label} className={`${stat.color} border-none shadow-card rounded-2xl`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-foreground/70">{stat.label}</span>
                  <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Investment Guidelines</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Browse verified research projects seeking funding</li>
                  <li>• Review researcher profiles and track records</li>
                  <li>• Fund projects with flexible investment amounts</li>
                  <li>• Track project progress and milestones</li>
                  <li>• Receive returns based on project success</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/investor/opportunities" className="block">
                <Button variant="outline" className="w-full justify-between rounded-xl hover:bg-accent/50">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Browse Opportunities
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/investor/portfolio" className="block">
                <Button variant="outline" className="w-full justify-between rounded-xl hover:bg-accent/50">
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    View Portfolio
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/investor/researchers" className="block">
                <Button variant="outline" className="w-full justify-between rounded-xl hover:bg-accent/50">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Discover Researchers
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Briefcase className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2">No recent activity</p>
                <p className="text-sm text-muted-foreground">
                  Start investing to see your activity here
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </InvestorLayout>
  );
}