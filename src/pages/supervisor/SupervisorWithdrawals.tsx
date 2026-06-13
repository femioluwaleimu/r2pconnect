import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SupervisorLayout from "@/components/layout/SupervisorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowUpRight, Wallet, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatLagos } from "@/lib/dateUtils";

interface Withdrawal {
  id: string;
  amount: number;
  currency: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
  processed_at: string | null;
}

export default function SupervisorWithdrawals() {
  const [balance, setBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", bank_name: "", account_number: "", account_name: "" });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/auth"); return; }
      fetchData(user.id);
    });
  }, [navigate]);

  const fetchData = async (userId: string) => {
    setLoading(true);

    const { data: wallet } = await supabase
      .from("supervisor_wallet")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    setBalance(wallet?.balance || 0);

    const { data } = await supabase
      .from("supervisor_withdrawals")
      .select("*")
      .eq("supervisor_id", userId)
      .order("created_at", { ascending: false });

    setWithdrawals(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0 || amount > balance) {
      toast({ title: "Invalid amount", description: "Enter a valid amount within your balance", variant: "destructive" });
      return;
    }
    if (!form.bank_name || !form.account_number || !form.account_name) {
      toast({ title: "Missing fields", description: "Fill in all bank details", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("supervisor_withdrawals").insert({
      supervisor_id: user.id,
      amount,
      bank_name: form.bank_name,
      account_number: form.account_number,
      account_name: form.account_name,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Deduct from wallet balance
      await supabase
        .from("supervisor_wallet")
        .update({ balance: balance - amount, total_withdrawn: balance })
        .eq("user_id", user.id);

      toast({ title: "Withdrawal request submitted" });
      setDialogOpen(false);
      setForm({ amount: "", bank_name: "", account_number: "", account_name: "" });
      fetchData(user.id);
    }
    setSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-amber-500/10 text-amber-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved": return <Badge className="bg-emerald-500/10 text-emerald-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge className="bg-red-500/10 text-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <SupervisorLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </SupervisorLayout>
    );
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Withdrawals</h1>
            <p className="text-muted-foreground">Request withdrawal of your earnings</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl" disabled={balance <= 0}>
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-center">
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-2xl font-bold text-emerald-600">₦{balance.toLocaleString()}</p>
                </div>
                <div>
                  <Label>Amount (₦)</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="Enter amount" className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label>Bank Name</Label>
                  <Input value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} placeholder="e.g. GTBank" className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input value={form.account_number} onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))} placeholder="0123456789" className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label>Account Name</Label>
                  <Input value={form.account_name} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} placeholder="Account holder name" className="rounded-xl mt-1" />
                </div>
                <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-xl">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {submitting ? "Submitting..." : "Submit Withdrawal"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Balance Card */}
        <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-r from-emerald-500 to-green-600">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 text-white">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-sm">Available Balance</p>
                <p className="text-3xl font-bold">₦{balance.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <ArrowUpRight className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No withdrawal requests yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                    <div>
                      <p className="font-medium text-foreground">₦{w.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {w.bank_name} • {w.account_number} • {formatLagos(w.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(w.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SupervisorLayout>
  );
}
