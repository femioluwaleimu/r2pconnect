import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, XCircle, Building2, GraduationCap, Wallet, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatLagos } from "@/lib/dateUtils";

interface StudentWithdrawal {
  id: string;
  student_id: string;
  amount: number;
  currency: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  student_name?: string;
  student_email?: string;
}

interface InstitutionWithdrawal {
  id: string;
  institution_id: string;
  amount: number;
  currency: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  institution_name?: string;
}

export default function AdminWithdrawals() {
  const [studentWithdrawals, setStudentWithdrawals] = useState<StudentWithdrawal[]>([]);
  const [institutionWithdrawals, setInstitutionWithdrawals] = useState<InstitutionWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<StudentWithdrawal | InstitutionWithdrawal | null>(null);
  const [withdrawalType, setWithdrawalType] = useState<'student' | 'institution'>('student');
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({
    pendingStudentCount: 0,
    pendingInstitutionCount: 0,
    pendingStudentAmount: 0,
    pendingInstitutionAmount: 0
  });

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      // Fetch student withdrawals
      const { data: studentData, error: studentError } = await supabase
        .from('student_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (studentError) throw studentError;

      // Enrich with student names
      const enrichedStudentData = await Promise.all(
        (studentData || []).map(async (withdrawal) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', withdrawal.student_id)
            .single();
          
          return {
            ...withdrawal,
            student_name: profile?.full_name || 'Unknown',
            student_email: profile?.email || ''
          };
        })
      );

      setStudentWithdrawals(enrichedStudentData);

      // Fetch institution withdrawals
      const { data: institutionData, error: institutionError } = await supabase
        .from('institution_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (institutionError) throw institutionError;

      // Enrich with institution names
      const enrichedInstitutionData = await Promise.all(
        (institutionData || []).map(async (withdrawal) => {
          const { data: institution } = await supabase
            .from('institutions')
            .select('name')
            .eq('id', withdrawal.institution_id)
            .single();
          
          return {
            ...withdrawal,
            institution_name: institution?.name || 'Unknown'
          };
        })
      );

      setInstitutionWithdrawals(enrichedInstitutionData);

      // Calculate stats
      const pendingStudents = enrichedStudentData.filter(w => w.status === 'pending');
      const pendingInstitutions = enrichedInstitutionData.filter(w => w.status === 'pending');

      setStats({
        pendingStudentCount: pendingStudents.length,
        pendingInstitutionCount: pendingInstitutions.length,
        pendingStudentAmount: pendingStudents.reduce((sum, w) => sum + w.amount, 0),
        pendingInstitutionAmount: pendingInstitutions.reduce((sum, w) => sum + w.amount, 0)
      });

    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal) return;
    
    setProcessing(true);
    try {
      const table = withdrawalType === 'student' ? 'student_withdrawals' : 'institution_withdrawals';
      
      const { error } = await supabase
        .from(table)
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', selectedWithdrawal.id);

      if (error) throw error;

      toast.success('Withdrawal approved successfully');
      setDialogAction(null);
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast.error('Failed to approve withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal) return;
    
    setProcessing(true);
    try {
      const table = withdrawalType === 'student' ? 'student_withdrawals' : 'institution_withdrawals';
      
      const { error } = await supabase
        .from(table)
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString()
        })
        .eq('id', selectedWithdrawal.id);

      if (error) throw error;

      // Refund the amount back to wallet
      if (withdrawalType === 'student') {
        const withdrawal = selectedWithdrawal as StudentWithdrawal;
        const { data: wallet } = await supabase
          .from('student_wallet')
          .select('balance, total_withdrawn')
          .eq('user_id', withdrawal.student_id)
          .single();

        if (wallet) {
          await supabase
            .from('student_wallet')
            .update({
              balance: (wallet.balance || 0) + withdrawal.amount,
              total_withdrawn: Math.max(0, (wallet.total_withdrawn || 0) - withdrawal.amount)
            })
            .eq('user_id', withdrawal.student_id);
        }
      } else {
        const withdrawal = selectedWithdrawal as InstitutionWithdrawal;
        const { data: institution } = await supabase
          .from('institutions')
          .select('available_balance')
          .eq('id', withdrawal.institution_id)
          .single();

        if (institution) {
          await supabase
            .from('institutions')
            .update({
              available_balance: (institution.available_balance || 0) + withdrawal.amount
            })
            .eq('id', withdrawal.institution_id);
        }
      }

      toast.success('Withdrawal rejected and amount refunded');
      setDialogAction(null);
      setSelectedWithdrawal(null);
      setRejectionReason('');
      fetchWithdrawals();
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast.error('Failed to reject withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Withdrawal Management</h1>
        <p className="text-muted-foreground">Process pending student and institution withdrawals</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Student</p>
                <p className="text-2xl font-bold text-foreground">{stats.pendingStudentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Student Amount</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.pendingStudentAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Building2 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Institution</p>
                <p className="text-2xl font-bold text-foreground">{stats.pendingInstitutionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Wallet className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Institution Amount</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.pendingInstitutionAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawals Tabs */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">All Withdrawals</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="students" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="students" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Students ({studentWithdrawals.length})
              </TabsTrigger>
              <TabsTrigger value="institutions" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Institutions ({institutionWithdrawals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="mt-4">
              {studentWithdrawals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No student withdrawals found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Bank Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentWithdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{withdrawal.student_name}</p>
                              <p className="text-sm text-muted-foreground">{withdrawal.student_email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {formatCurrency(withdrawal.amount, withdrawal.currency || 'NGN')}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="text-foreground">{withdrawal.bank_name}</p>
                              <p className="text-muted-foreground">{withdrawal.account_number}</p>
                              <p className="text-muted-foreground">{withdrawal.account_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatLagos(withdrawal.created_at)}
                          </TableCell>
                          <TableCell>
                            {withdrawal.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-500 hover:text-green-600"
                                  onClick={() => {
                                    setSelectedWithdrawal(withdrawal);
                                    setWithdrawalType('student');
                                    setDialogAction('approve');
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-500 hover:text-red-600"
                                  onClick={() => {
                                    setSelectedWithdrawal(withdrawal);
                                    setWithdrawalType('student');
                                    setDialogAction('reject');
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="institutions" className="mt-4">
              {institutionWithdrawals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No institution withdrawals found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Institution</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Bank Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {institutionWithdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell className="font-medium text-foreground">
                            {withdrawal.institution_name}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {formatCurrency(withdrawal.amount, withdrawal.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="text-foreground">{withdrawal.bank_name}</p>
                              <p className="text-muted-foreground">{withdrawal.account_number}</p>
                              <p className="text-muted-foreground">{withdrawal.account_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatLagos(withdrawal.created_at)}
                          </TableCell>
                          <TableCell>
                            {withdrawal.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-500 hover:text-green-600"
                                  onClick={() => {
                                    setSelectedWithdrawal(withdrawal);
                                    setWithdrawalType('institution');
                                    setDialogAction('approve');
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-500 hover:text-red-600"
                                  onClick={() => {
                                    setSelectedWithdrawal(withdrawal);
                                    setWithdrawalType('institution');
                                    setDialogAction('reject');
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={dialogAction === 'approve'} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this withdrawal of{' '}
              <span className="font-semibold text-foreground">
                {selectedWithdrawal && formatCurrency(selectedWithdrawal.amount)}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing} className="bg-green-600 hover:bg-green-700">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={dialogAction === 'reject'} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              This will reject the withdrawal and refund the amount back to the user's wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleReject} disabled={processing} variant="destructive">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Reject & Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
