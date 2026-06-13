import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import InstitutionLayout from "@/components/layout/InstitutionLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { 
  DollarSign, 
  TrendingUp, 
  Wallet,
  Download,
  Loader2,
  ArrowDownToLine,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Commission {
  id: string;
  researcher_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  researcher_name?: string;
}

interface InstitutionData {
  id: string;
  total_commission: number;
  available_balance: number;
}

export default function InstitutionCommissions() {
  const [user, setUser] = useState<User | null>(null);
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bank_name: '',
    account_number: '',
    account_name: ''
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchData(user.id);
    });
  }, [navigate]);

  const fetchData = async (userId: string) => {
    setLoading(true);
    
    // Get institution
    const { data: inst } = await supabase
      .from('institutions')
      .select('id, total_commission, available_balance')
      .eq('admin_user_id', userId)
      .maybeSingle();

    if (!inst) {
      setLoading(false);
      return;
    }

    setInstitution(inst);

    // Get commissions with researcher names
    const { data: commissionsData } = await supabase
      .from('institution_commissions')
      .select('*')
      .eq('institution_id', inst.id)
      .order('created_at', { ascending: false });

    if (commissionsData) {
      // Fetch researcher names
      const researcherIds = [...new Set(commissionsData.map(c => c.researcher_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', researcherIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      setCommissions(commissionsData.map(c => ({
        ...c,
        researcher_name: profileMap.get(c.researcher_id) || 'Unknown Researcher'
      })));
    }

    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!institution || !user) return;
    
    const amount = parseFloat(withdrawForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (amount > (institution.available_balance || 0)) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    if (!withdrawForm.bank_name || !withdrawForm.account_number || !withdrawForm.account_name) {
      toast({ title: "Please fill in all bank details", variant: "destructive" });
      return;
    }

    setWithdrawLoading(true);

    const { error } = await supabase
      .from('institution_withdrawals')
      .insert({
        institution_id: institution.id,
        amount,
        currency: 'NGN',
        bank_name: withdrawForm.bank_name,
        account_number: withdrawForm.account_number,
        account_name: withdrawForm.account_name,
        status: 'pending'
      });

    if (error) {
      toast({ title: "Error submitting withdrawal", description: error.message, variant: "destructive" });
      setWithdrawLoading(false);
      return;
    }

    // Deduct from available balance
    await supabase
      .from('institutions')
      .update({
        available_balance: (institution.available_balance || 0) - amount
      })
      .eq('id', institution.id);

    toast({ title: "Withdrawal request submitted", description: "Your withdrawal is being processed" });
    setDialogOpen(false);
    setWithdrawForm({ amount: '', bank_name: '', account_number: '', account_name: '' });
    fetchData(user.id);
    setWithdrawLoading(false);
  };

  const formatAmount = (amount: number) => {
    return formatCurrency(amount, 'NGN');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'credited':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  if (loading) {
    return (
      <InstitutionLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </InstitutionLayout>
    );
  }

  return (
    <InstitutionLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commission Earnings</h1>
          <p className="text-muted-foreground">Track earnings from researcher subscriptions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="gradient-card text-primary-foreground rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Earned</p>
                  <p className="text-3xl font-bold mt-1">{formatAmount(institution?.total_commission || 0)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-primary-foreground rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Available Balance</p>
                  <p className="text-3xl font-bold mt-1">{formatAmount(institution?.available_balance || 0)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-primary-foreground rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Commission Rate</p>
                  <p className="text-3xl font-bold mt-1">10%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Withdraw Button */}
        <div className="flex gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl" disabled={(institution?.available_balance || 0) <= 0}>
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                Withdraw Funds
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-xl">
              <DialogHeader>
                <DialogTitle>Withdraw Funds</DialogTitle>
              <DialogDescription>
                  Available balance: {formatAmount(institution?.available_balance || 0)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="amount">Amount (NGN)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                    className="rounded-lg mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    placeholder="e.g. First Bank"
                    value={withdrawForm.bank_name}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_name: e.target.value })}
                    className="rounded-lg mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="account_number">Account Number</Label>
                  <Input
                    id="account_number"
                    placeholder="e.g. 0123456789"
                    value={withdrawForm.account_number}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, account_number: e.target.value })}
                    className="rounded-lg mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="account_name">Account Name</Label>
                  <Input
                    id="account_name"
                    placeholder="e.g. John Doe"
                    value={withdrawForm.account_name}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, account_name: e.target.value })}
                    className="rounded-lg mt-1"
                  />
                </div>
                <Button 
                  className="w-full rounded-xl" 
                  onClick={handleWithdraw}
                  disabled={withdrawLoading}
                >
                  {withdrawLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Submit Withdrawal Request'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="rounded-xl" onClick={() => navigate('/institution/withdrawals')}>
            <Download className="w-4 h-4 mr-2" />
            View Withdrawals
          </Button>
        </div>

        {/* Commissions Table */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Commission History</CardTitle>
            <CardDescription>10% commission from each researcher subscription</CardDescription>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No commissions yet</p>
                <p className="text-sm text-muted-foreground">Commissions will appear when your researchers subscribe to premium plans</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Researcher</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-medium">{commission.researcher_name}</TableCell>
                      <TableCell>{formatAmount(commission.amount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(commission.status)}
                          <span className="capitalize">{commission.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(commission.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </InstitutionLayout>
  );
}