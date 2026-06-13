import InvestorLayout from "@/components/layout/InvestorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, TrendingUp, TrendingDown, DollarSign, Info, PieChart } from "lucide-react";

const portfolioStats = [
  { label: "Total Invested", value: "$0.00", change: "+0%", icon: DollarSign, positive: true },
  { label: "Current Value", value: "$0.00", change: "+0%", icon: Briefcase, positive: true },
  { label: "Total Returns", value: "$0.00", change: "+0%", icon: TrendingUp, positive: true },
  { label: "Active Projects", value: "0", change: "", icon: PieChart, positive: true },
];

export default function InvestorPortfolio() {
  return (
    <InvestorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Portfolio</h1>
          <p className="text-muted-foreground">Track your investments and returns</p>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {portfolioStats.map((stat) => (
            <Card key={stat.label} className="shadow-card rounded-2xl border-border/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                {stat.change && (
                  <div className="flex items-center gap-1 mt-1">
                    {stat.positive ? (
                      <TrendingUp className="w-3 h-3 text-r2p-green" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-destructive" />
                    )}
                    <span className={`text-xs ${stat.positive ? "text-r2p-green" : "text-destructive"}`}>
                      {stat.change}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Portfolio Tips</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Diversify across different research areas</li>
                  <li>• Monitor project milestones and updates</li>
                  <li>• Engage with researchers for deeper insights</li>
                  <li>• Review quarterly performance reports</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Holdings */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle>Investment Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-4">
                <Briefcase className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Investments Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Start building your portfolio by investing in promising research projects.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </InvestorLayout>
  );
}