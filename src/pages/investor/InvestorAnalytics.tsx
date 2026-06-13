import InvestorLayout from "@/components/layout/InvestorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, DollarSign, PieChart, Info, Target } from "lucide-react";

const analyticsCards = [
  { icon: DollarSign, label: "Total Invested", value: "$0.00", change: "+0%", color: "bg-r2p-green-light", textColor: "text-r2p-green" },
  { icon: TrendingUp, label: "ROI", value: "0%", change: "+0%", color: "bg-r2p-blue-light", textColor: "text-r2p-blue" },
  { icon: Target, label: "Success Rate", value: "0%", change: "+0%", color: "bg-r2p-yellow-light", textColor: "text-r2p-yellow" },
  { icon: PieChart, label: "Diversification", value: "0 sectors", change: "", color: "bg-r2p-purple-light", textColor: "text-r2p-purple" },
];

export default function InvestorAnalytics() {
  return (
    <InvestorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Investment Analytics</h1>
          <p className="text-muted-foreground">Track your investment performance and insights</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {analyticsCards.map((stat) => (
            <Card key={stat.label} className={`${stat.color} border-none shadow-card rounded-2xl`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-foreground/70">{stat.label}</span>
                  <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                {stat.change && (
                  <p className="text-xs text-muted-foreground">{stat.change} from last month</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-violet-50">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Analytics Insights</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Track portfolio performance over time</li>
                  <li>• Analyze sector allocation and diversification</li>
                  <li>• Compare returns across different research areas</li>
                  <li>• Export reports for tax and accounting purposes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Placeholder */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Portfolio Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No data available yet</p>
                <p className="text-sm text-muted-foreground">Make investments to see analytics</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Sector Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <PieChart className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No allocation data</p>
                <p className="text-sm text-muted-foreground">Data will appear as you invest</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </InvestorLayout>
  );
}