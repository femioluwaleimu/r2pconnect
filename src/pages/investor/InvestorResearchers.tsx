import InvestorLayout from "@/components/layout/InvestorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Filter, Info, GraduationCap, Star } from "lucide-react";

export default function InvestorResearchers() {
  return (
    <InvestorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Discover Researchers</h1>
          <p className="text-muted-foreground">Find talented researchers to fund and collaborate with</p>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, expertise, institution, or research area..." className="rounded-xl pl-9" />
          </div>
          <Button variant="outline" className="rounded-xl">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-cyan-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Evaluating Researchers</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• View publication history and impact metrics</li>
                  <li>• Check institutional affiliations and credentials</li>
                  <li>• Review past project success rates</li>
                  <li>• See collaboration history and peer reviews</li>
                  <li>• Direct message for inquiries</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Researchers */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-foreground">Top Researchers</h3>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center mb-4">
                <Star className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-muted-foreground mb-2">No featured researchers</p>
              <p className="text-sm text-muted-foreground">
                Top-rated researchers will appear here
              </p>
            </div>
          </CardContent>
        </Card>

        {/* All Researchers */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-cyan-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Browse Researchers</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Discover talented researchers across various fields and institutions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </InvestorLayout>
  );
}