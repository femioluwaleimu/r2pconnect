import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import InstitutionLayout from "@/components/layout/InstitutionLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle, Clock, XCircle, Wallet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatLagos } from "@/lib/dateUtils";

interface Withdrawal {
  id: string;
  amount: number;
  currency: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  processed_at: string | null;
  created_at: string;
}

export default function InstitutionWithdrawals() {
  const [user, setUser] = useState<User | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchWithdrawals(user.id);
    });
  }, [navigate]);

  const fetchWithdrawals = async (userId: string) => {
    setLoading(true);
    
    // Get institution
    const { data: inst } = await supabase
      .from('institutions')
      .select('id')
      .eq('admin_user_id', userId)
      .maybeSingle();

    if (!inst) {
      setLoading(false);
      return;
    }

    // Get withdrawals
    const { data } = await supabase
      .from('institution_withdrawals')
      .select('*')
      .eq('institution_id', inst.id)
      .order('created_at', { ascending: false });

    if (data) {
      setWithdrawals(data);
      
      const total = data.reduce((sum, w) => sum + (w.amount || 0), 0);
      const pending = data.filter(w => w.status === 'pending').reduce((sum, w) => sum + (w.amount || 0), 0);
      const completed = data.filter(w => w.status === 'completed').reduce((sum, w) => sum + (w.amount || 0), 0);
      
      setStats({ total, pending, completed });
    }

    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/institution/commissions')} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Withdrawal History</h1>
            <p className="text-muted-foreground">Track all your withdrawal requests</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-slate-600 to-slate-700 text-primary-foreground rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Withdrawn</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.total)}</p>
                </div>
                <Wallet className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-primary-foreground rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Pending</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.pending)}</p>
                </div>
                <Clock className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-teal-500 text-primary-foreground rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Completed</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.completed)}</p>
                </div>
                <CheckCircle className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawals Table */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>All Withdrawals</CardTitle>
            <CardDescription>Complete history of withdrawal requests</CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No withdrawals yet</p>
                <p className="text-sm text-muted-foreground">Your withdrawal requests will appear here</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-semibold">{formatCurrency(withdrawal.amount)}</TableCell>
                      <TableCell>{withdrawal.bank_name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.account_name}</p>
                          <p className="text-sm text-muted-foreground">{withdrawal.account_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell>{formatLagos(withdrawal.created_at)}</TableCell>
                      <TableCell>
                        {withdrawal.processed_at 
                          ? formatLagos(withdrawal.processed_at)
                          : '-'
                        }
                      </TableCell>
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