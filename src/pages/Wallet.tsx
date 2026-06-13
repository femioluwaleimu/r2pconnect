import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, Info, CreditCard, History, DollarSign } from "lucide-react";

export default function Wallet() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
          <p className="text-muted-foreground">Manage your earnings and withdrawals</p>
        </div>

        {/* Balance Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground border-none shadow-lg rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <WalletIcon className="w-5 h-5" />
                <span className="text-sm font-medium opacity-90">Available Balance</span>
              </div>
              <p className="text-3xl font-bold">$0.00</p>
              <p className="text-sm opacity-80 mt-1">Ready to withdraw</p>
            </CardContent>
          </Card>
          
          <Card className="bg-r2p-green-light border-none shadow-card rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-r2p-green mb-2">
                <ArrowDownRight className="w-5 h-5" />
                <span className="text-sm font-medium">Total Earned</span>
              </div>
              <p className="text-3xl font-bold text-foreground">$0.00</p>
              <p className="text-sm text-muted-foreground mt-1">All time earnings</p>
            </CardContent>
          </Card>
          
          <Card className="bg-r2p-blue-light border-none shadow-card rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-r2p-blue mb-2">
                <ArrowUpRight className="w-5 h-5" />
                <span className="text-sm font-medium">Total Withdrawn</span>
              </div>
              <p className="text-3xl font-bold text-foreground">$0.00</p>
              <p className="text-sm text-muted-foreground mt-1">Successfully withdrawn</p>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">How to Earn</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Earn from paper views and downloads</li>
                  <li>• Win challenge rewards</li>
                  <li>• Get paid for documentary views</li>
                  <li>• Receive tips from your audience</li>
                  <li>• Minimum withdrawal: $10.00</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start rounded-xl" variant="outline">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Withdraw Funds
              </Button>
              <Button className="w-full justify-start rounded-xl" variant="outline">
                <CreditCard className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card className="shadow-card rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <History className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">No transactions yet</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}