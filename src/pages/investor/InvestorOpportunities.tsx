import InvestorLayout from "@/components/layout/InvestorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, Search, Filter, Info, Rocket, Sparkles } from "lucide-react";

export default function InvestorOpportunities() {
  return (
    <InvestorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funding Opportunities</h1>
          <p className="text-muted-foreground">Discover research projects seeking investment</p>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by research area, institution, or funding goal..." className="rounded-xl pl-9" />
          </div>
          <Button variant="outline" className="rounded-xl">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Investment Criteria</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• All projects are vetted by our research committee</li>
                  <li>• Review funding goals, timelines, and milestones</li>
                  <li>• Check researcher credentials and past performance</li>
                  <li>• Investments are protected with milestone-based releases</li>
                  <li>• Direct communication with research teams</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Featured Opportunities */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Featured Opportunities</h3>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
              <p className="text-muted-foreground mb-2">No opportunities available</p>
              <p className="text-sm text-muted-foreground">
                New funding opportunities will appear here
              </p>
            </div>
          </CardContent>
        </Card>

        {/* All Opportunities */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-4">
                <TrendingUp className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Browse All Opportunities</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Research projects seeking funding will be listed here. Check back soon for new opportunities.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </InvestorLayout>
  );
}