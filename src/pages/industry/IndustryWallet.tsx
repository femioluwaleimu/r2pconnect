import { useState, useEffect } from "react";
import IndustryLayout from "@/components/layout/IndustryLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleEdgeFunctionResponse } from "@/lib/edgeFunctionError";
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, CreditCard, TrendingUp } from "lucide-react";
import { formatLagos } from "@/lib/dateUtils";

interface WalletData {
  id: string;
  balance: number;
  total_funded: number;
  total_spent: number;
  currency: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
}

export default function IndustryWallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [funding, setFunding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  const fetchWallet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { data, error } = await supabase
        .from('industry_wallet')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Create wallet if doesn't exist
        const { data: newWallet } = await supabase
          .from('industry_wallet')
          .insert({ user_id: user.id })
          .select()
          .single();
        data = newWallet;
      }

      setWallet(data);
    } catch (error: any) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    setTransactions(data || []);
  };

  const handleFundWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundAmount || !wallet) return;

    const amount = parseFloat(fundAmount);
    if (amount < 1000) {
      toast({ title: "Error", description: "Minimum amount is ₦1,000", variant: "destructive" });
      return;
    }

    setFunding(true);
    try {
      // Initialize Paystack wallet payment
      const { data, error } = await supabase.functions.invoke('paystack', {
        body: {
          action: 'initialize_wallet',
          amount: amount,
          callback_url: window.location.href,
        },
      });

      const [result, errorMsg] = handleEdgeFunctionResponse(data, error);
      if (errorMsg) throw new Error(errorMsg);
      
      if (result?.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (error: any) {
      toast({ title: "Payment Error", description: error.message, variant: "destructive" });
    } finally {
      setFunding(false);
    }
  };

  // Handle Paystack callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    const trxref = urlParams.get('trxref');

    if (reference || trxref) {
      verifyPayment(reference || trxref);
    }
  }, []);

  const verifyPayment = async (reference: string | null) => {
    if (!reference) return;

    try {
      const { data, error } = await supabase.functions.invoke('paystack', {
        body: {
          action: 'verify_wallet',
          reference,
        },
      });

      const [result, errorMsg] = handleEdgeFunctionResponse(data, error);
      if (errorMsg) {
        toast({ title: "Verification Error", description: errorMsg, variant: "destructive" });
        return;
      }

      if (result?.success || result?.status === 'success') {
        toast({ title: "Wallet funded successfully!", description: `₦${result.amount?.toLocaleString() || ''} added to your wallet` });
        fetchWallet();
        fetchTransactions();
        setFundDialogOpen(false);
        setFundAmount('');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
    }

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  return (
    <IndustryLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
            <p className="text-muted-foreground">Manage your funds for hiring students</p>
          </div>
          <Dialog open={fundDialogOpen} onOpenChange={setFundDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gradient-hero">
                <Plus className="w-4 h-4 mr-2" />
                Fund Wallet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Fund Your Wallet</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFundWallet} className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (₦)</Label>
                  <Input
                    type="number"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1000"
                    required
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">Minimum: ₦1,000</p>
                </div>
                <Button type="submit" disabled={funding} className="w-full rounded-xl gradient-hero">
                  {funding ? 'Processing...' : 'Proceed to Payment'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Balance Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Available Balance</p>
                  <p className="text-3xl font-bold mt-1">₦{wallet?.balance?.toLocaleString() || '0'}</p>
                </div>
                <Wallet className="w-12 h-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Funded</p>
                  <p className="text-3xl font-bold mt-1">₦{wallet?.total_funded?.toLocaleString() || '0'}</p>
                </div>
                <TrendingUp className="w-12 h-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Spent</p>
                  <p className="text-3xl font-bold mt-1">₦{wallet?.total_spent?.toLocaleString() || '0'}</p>
                </div>
                <CreditCard className="w-12 h-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm">Fund your wallet to start paying students</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {tx.amount > 0 ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{tx.transaction_type.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">{tx.description || 'Transaction'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatLagos(tx.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </IndustryLayout>
  );
}