import { useState, useEffect } from "react";
import IPNLayout from "@/components/layout/IPNLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, ArrowDownToLine, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatLagos } from "@/lib/dateUtils";

export default function IPNRevenue() {
  const [wallet, setWallet] = useState<{ balance: number; total_earned: number; total_withdrawn: number } | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", bank_name: "", account_number: "", account_name: "" });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [walletRes, paymentsRes, payoutsRes] = await Promise.all([
      supabase.from("ipn_wallet").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("ipn_payments").select("*, ipn_opportunities(title)").eq("status", "success").order("created_at", { ascending: false }).limit(20),
      supabase.from("ipn_payout_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setWallet(walletRes.data);
    setPayments(paymentsRes.data || []);
    setPayouts(payoutsRes.data || []);
    setLoading(false);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawForm.amount);
    if (!amount || amount <= 0 || amount > (wallet?.balance || 0)) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (!withdrawForm.bank_name || !withdrawForm.account_number || !withdrawForm.account_name) {
      toast({ title: "Fill all bank details", variant: "destructive" });
      return;
    }
    setWithdrawing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("ipn_payout_requests").insert({
      user_id: user.id, amount, bank_name: withdrawForm.bank_name,
      account_number: withdrawForm.account_number, account_name: withdrawForm.account_name,
    });
    await supabase.from("ipn_wallet").update({
      balance: (wallet?.balance || 0) - amount,
      total_withdrawn: (wallet?.total_withdrawn || 0) + amount,
    }).eq("user_id", user.id);

    toast({ title: "Withdrawal request submitted" });
    setWithdrawOpen(false);
    setWithdrawForm({ amount: "", bank_name: "", account_number: "", account_name: "" });
    setWithdrawing(false);
    fetchData();
  };

  if (loading) return <IPNLayout><div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></IPNLayout>;

  return (
    <IPNLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Revenue & Wallet</h1>
            <p className="text-muted-foreground">Track earnings and manage withdrawals</p>
          </div>
          <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2" disabled={!wallet || wallet.balance <= 0}>
                <ArrowDownToLine className="w-4 h-4" /> Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request Withdrawal</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Available: ₦{(wallet?.balance || 0).toLocaleString()}</p>
                <div className="space-y-2"><Label>Amount (₦)</Label><Input type="number" value={withdrawForm.amount} onChange={(e) => setWithdrawForm(p => ({ ...p, amount: e.target.value }))} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Bank Name</Label><Input value={withdrawForm.bank_name} onChange={(e) => setWithdrawForm(p => ({ ...p, bank_name: e.target.value }))} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Account Number</Label><Input value={withdrawForm.account_number} onChange={(e) => setWithdrawForm(p => ({ ...p, account_number: e.target.value }))} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Account Name</Label><Input value={withdrawForm.account_name} onChange={(e) => setWithdrawForm(p => ({ ...p, account_name: e.target.value }))} className="rounded-xl" /></div>
                <Button onClick={handleWithdraw} disabled={withdrawing} className="w-full rounded-xl">
                  {withdrawing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Available Balance", value: wallet?.balance || 0, color: "from-emerald-500 to-teal-600" },
            { label: "Total Earned", value: wallet?.total_earned || 0, color: "from-blue-500 to-indigo-600" },
            { label: "Total Withdrawn", value: wallet?.total_withdrawn || 0, color: "from-purple-500 to-violet-600" },
          ].map(s => (
            <Card key={s.label} className="shadow-card rounded-2xl">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg mb-3`}>
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-foreground">₦{s.value.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {payouts.length > 0 && (
          <Card className="shadow-card rounded-2xl">
            <CardHeader><CardTitle className="text-lg">Withdrawal History</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payouts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border">
                    <div>
                      <p className="font-medium">₦{p.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{p.bank_name} • {p.account_number}</p>
                      <p className="text-xs text-muted-foreground">{formatLagos(p.created_at)}</p>
                    </div>
                    <Badge variant={p.status === "completed" ? "default" : "secondary"}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </IPNLayout>
  );
}
