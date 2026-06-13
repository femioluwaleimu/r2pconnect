import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Wallet, ArrowDownRight, ArrowUpRight, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { formatLagos } from "@/lib/dateUtils";

interface StudentWalletData {
  id: string;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  currency: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  currency: string;
  status: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  created_at: string;
  processed_at: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
  status: string;
}

export default function StudentWallet() {
  const [wallet, setWallet] = useState<StudentWalletData | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_name: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const { toast } = useToast();
  const { formatCurrency, currency } = useCurrency();

  const MIN_WITHDRAWAL = 1000;

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch or create wallet
      let { data: walletData, error: walletError } = await supabase
        .from('student_wallet')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // Create wallet if not exists
        const { data: newWallet, error: createError } = await supabase
          .from('student_wallet')
          .insert({ user_id: user.id })
          .select()
          .single();
        if (createError) throw createError;
        walletData = newWallet;
      } else if (walletError) {
        throw walletError;
      }

      setWallet(walletData);

      // Fetch withdrawals
      const { data: withdrawalData } = await supabase
        .from('student_withdrawals')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      setWithdrawals(withdrawalData || []);

      // Fetch transactions - get all for pagination
      const { data: transactionData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setTransactions(transactionData || []);

    } catch (error: any) {
      toast({ title: "Error fetching wallet", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawForm.amount);
    if (!amount || amount < MIN_WITHDRAWAL) {
      toast({ title: "Invalid amount", description: `Minimum withdrawal is ${formatCurrency(MIN_WITHDRAWAL, 'NGN')}`, variant: "destructive" });
      return;
    }
    if (!wallet || amount > (wallet.balance || 0)) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    if (!withdrawForm.bank_name || !withdrawForm.account_number || !withdrawForm.account_name) {
      toast({ title: "Please fill all bank details", variant: "destructive" });
      return;
    }

    setWithdrawing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create withdrawal request
      const { error: withdrawError } = await supabase
        .from('student_withdrawals')
        .insert({
          student_id: user.id,
          amount,
          currency: 'NGN',
          bank_name: withdrawForm.bank_name,
          account_number: withdrawForm.account_number,
          account_name: withdrawForm.account_name,
        });
      if (withdrawError) throw withdrawError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('student_wallet')
        .update({
          balance: (wallet.balance || 0) - amount,
          total_withdrawn: (wallet.total_withdrawn || 0) + amount,
        })
        .eq('user_id', user.id);
      if (walletError) throw walletError;

      // Create transaction record
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          amount,
          transaction_type: 'withdrawal',
          description: `Withdrawal to ${withdrawForm.bank_name}`,
          status: 'pending',
        });

      toast({ title: "Withdrawal request submitted" });
      setWithdrawDialogOpen(false);
      setWithdrawForm({ amount: '', bank_name: '', account_number: '', account_name: '' });
      fetchWalletData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
          <p className="text-muted-foreground">Manage your earnings and withdrawals</p>
        </div>

        {/* Wallet Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm opacity-80">Available Balance</p>
                  <p className="text-3xl font-bold">{formatCurrency(wallet?.balance || 0, 'NGN')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm opacity-80">Total Earned</p>
                  <p className="text-3xl font-bold">{formatCurrency(wallet?.total_earned || 0, 'NGN')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm opacity-80">Total Withdrawn</p>
                  <p className="text-3xl font-bold">{formatCurrency(wallet?.total_withdrawn || 0, 'NGN')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Withdraw Button */}
        <div className="flex justify-end">
          <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gradient-hero" disabled={(wallet?.balance || 0) < MIN_WITHDRAWAL}>
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Withdraw Funds
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Withdraw Funds</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-600">Minimum withdrawal is {formatCurrency(MIN_WITHDRAWAL, 'NGN')}. Available balance: {formatCurrency(wallet?.balance || 0, 'NGN')}</p>
                </div>

                <div className="space-y-2">
                  <Label>Amount ({currency})</Label>
                  <Input
                    type="number"
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="Enter amount"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={withdrawForm.bank_name}
                    onChange={(e) => setWithdrawForm(p => ({ ...p, bank_name: e.target.value }))}
                    placeholder="e.g. First Bank"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={withdrawForm.account_number}
                    onChange={(e) => setWithdrawForm(p => ({ ...p, account_number: e.target.value }))}
                    placeholder="10-digit account number"
                    maxLength={10}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    value={withdrawForm.account_name}
                    onChange={(e) => setWithdrawForm(p => ({ ...p, account_name: e.target.value }))}
                    placeholder="Account holder name"
                    className="rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)} className="rounded-xl">Cancel</Button>
                  <Button onClick={handleWithdraw} disabled={withdrawing} className="rounded-xl gradient-hero">
                    {withdrawing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Withdrawal
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Recent Transactions */}
        <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your payment and withdrawal history</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions yet</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tx.transaction_type === 'payment' ? (
                              <ArrowDownRight className="w-4 h-4 text-green-500" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-blue-500" />
                            )}
                            <span className="capitalize">{tx.transaction_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{tx.description || '-'}</TableCell>
                        <TableCell className={tx.transaction_type === 'payment' ? 'text-green-600' : 'text-blue-600'}>
                          {tx.transaction_type === 'payment' ? '+' : '-'}{formatCurrency(tx.amount, 'NGN')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatLagos(tx.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {transactions.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, transactions.length)} of {transactions.length}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded-xl"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(transactions.length / ITEMS_PER_PAGE), p + 1))}
                        disabled={currentPage >= Math.ceil(transactions.length / ITEMS_PER_PAGE)}
                        className="rounded-xl"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No withdrawals yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{formatCurrency(w.amount, 'NGN')}</TableCell>
                      <TableCell>{w.bank_name}</TableCell>
                      <TableCell>{w.account_number}</TableCell>
                      <TableCell>
                        <Badge variant={w.status === 'completed' ? 'default' : w.status === 'pending' ? 'secondary' : 'destructive'}>
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatLagos(w.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
