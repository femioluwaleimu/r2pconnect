import { useState, useEffect } from "react";
import IndustryLayout from "@/components/layout/IndustryLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, CheckCircle, Clock, Calendar, Wallet, ListTodo, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatLagos } from "@/lib/dateUtils";

interface HiredStudent {
  id: string;
  student_id: string;
  job_id: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  total_payment: number;
  job_postings: {
    title: string;
    payment_amount: number | null;
    payment_currency: string;
  };
  profiles?: {
    full_name: string;
    email: string;
    is_verified: boolean;
    avatar_url: string | null;
  };
  institution?: {
    name: string;
    logo_url: string | null;
  } | null;
}

interface Task {
  id: string;
  hired_student_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  completed_at: string | null;
}

export default function IndustryHiredStudents() {
  const [hiredStudents, setHiredStudents] = useState<HiredStudent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<HiredStudent | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', due_date: '' });
  const [payAmount, setPayAmount] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchHiredStudents();
  }, []);

  const fetchHiredStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('hired_students')
        .select(`
          *,
          job_postings(title, payment_amount, payment_currency)
        `)
        .eq('industry_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles with institution
      const studentIds = [...new Set((data || []).map(h => h.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, is_verified, avatar_url, institution_id')
        .in('user_id', studentIds);

      // Fetch institution details
      const institutionIds = [...new Set((profiles || []).filter(p => p.institution_id).map(p => p.institution_id as string))];
      const { data: institutions } = institutionIds.length > 0 
        ? await supabase.from('institutions').select('id, name, logo_url').in('id', institutionIds)
        : { data: [] };

      const institutionMap = new Map((institutions || []).map(i => [i.id, i]));
      const profileMap = new Map((profiles || []).map(p => [p.user_id, { ...p, institution: p.institution_id ? institutionMap.get(p.institution_id) : null }]));
      
      const enriched = (data || []).map(h => {
        const profile = profileMap.get(h.student_id);
        return {
          ...h,
          profiles: profile ? { full_name: profile.full_name, email: profile.email, is_verified: profile.is_verified, avatar_url: profile.avatar_url } : undefined,
          institution: profile?.institution || null
        };
      });

      setHiredStudents(enriched);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (hiredStudentId: string) => {
    const { data } = await supabase
      .from('student_tasks')
      .select('*')
      .eq('hired_student_id', hiredStudentId)
      .order('created_at', { ascending: false });
    setTasks(data || []);
  };

  const handleSelectStudent = (student: HiredStudent) => {
    setSelectedStudent(student);
    fetchTasks(student.id);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const { error } = await supabase
        .from('student_tasks')
        .insert({
          hired_student_id: selectedStudent.id,
          title: taskForm.title,
          description: taskForm.description || null,
          due_date: taskForm.due_date || null,
        });

      if (error) throw error;
      toast({ title: "Task assigned" });
      setTaskDialogOpen(false);
      setTaskForm({ title: '', description: '', due_date: '' });
      fetchTasks(selectedStudent.id);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('student_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
      toast({ title: "Task updated" });
      if (selectedStudent) fetchTasks(selectedStudent.id);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handlePayStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !payAmount) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const amount = parseFloat(payAmount);

      // Check wallet balance
      const { data: wallet } = await supabase
        .from('industry_wallet')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.balance < amount) {
        toast({ title: "Insufficient balance", description: "Please fund your wallet first", variant: "destructive" });
        return;
      }

      // Deduct from industry wallet
      await supabase
        .from('industry_wallet')
        .update({ 
          balance: wallet.balance - amount,
          total_spent: (wallet as any).total_spent + amount
        })
        .eq('user_id', user.id);

      // Add to student wallet
      const { data: studentWallet } = await supabase
        .from('student_wallet')
        .select('*')
        .eq('user_id', selectedStudent.student_id)
        .single();

      if (studentWallet) {
        await supabase
          .from('student_wallet')
          .update({ 
            balance: studentWallet.balance + amount,
            total_earned: studentWallet.total_earned + amount
          })
          .eq('user_id', selectedStudent.student_id);
      } else {
        await supabase
          .from('student_wallet')
          .insert({
            user_id: selectedStudent.student_id,
            balance: amount,
            total_earned: amount
          });
      }

      // Record transactions
      await supabase.from('wallet_transactions').insert([
        {
          user_id: user.id,
          transaction_type: 'payment',
          amount: -amount,
          description: `Payment to ${selectedStudent.profiles?.full_name}`,
        },
        {
          user_id: selectedStudent.student_id,
          transaction_type: 'payment',
          amount: amount,
          description: `Payment from employer`,
        }
      ]);

      // Update hired student total payment
      await supabase
        .from('hired_students')
        .update({ total_payment: selectedStudent.total_payment + amount })
        .eq('id', selectedStudent.id);

      toast({ title: "Payment sent successfully" });
      setPayDialogOpen(false);
      setPayAmount('');
      fetchHiredStudents();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700">Completed</Badge>;
      case 'terminated':
        return <Badge className="bg-red-100 text-red-700">Terminated</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <IndustryLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hired Students</h1>
          <p className="text-muted-foreground">Manage your hired students and assign tasks</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{hiredStudents.filter(h => h.status === 'active').length}</p>
                  <p className="text-sm opacity-80">Active Hires</p>
                </div>
                <Users className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{hiredStudents.filter(h => h.status === 'completed').length}</p>
                  <p className="text-sm opacity-80">Completed</p>
                </div>
                <CheckCircle className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">₦{hiredStudents.reduce((a, h) => a + h.total_payment, 0).toLocaleString()}</p>
                  <p className="text-sm opacity-80">Total Paid</p>
                </div>
                <Wallet className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Student List */}
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardHeader>
              <CardTitle>Hired Students</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : hiredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hired students yet
                </div>
              ) : (
                hiredStudents.map(student => (
                  <div
                    key={student.id}
                    onClick={() => handleSelectStudent(student)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedStudent?.id === student.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 border-2 border-primary/20">
                          <AvatarImage src={student.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                            {student.profiles?.full_name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{student.profiles?.full_name || 'Unknown Student'}</span>
                            {student.profiles?.is_verified && <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{student.job_postings?.title}</p>
                          {student.institution && (
                            <p className="text-xs text-primary/70 truncate flex items-center gap-1 mt-0.5">
                              {student.institution.logo_url && (
                                <img src={student.institution.logo_url} alt="" className="w-3 h-3 rounded-sm object-cover" />
                              )}
                              {student.institution.name}
                            </p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(student.status)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Tasks Panel */}
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {selectedStudent ? `Tasks for ${selectedStudent.profiles?.full_name}` : 'Select a Student'}
              </CardTitle>
              {selectedStudent && (
                <div className="flex gap-2">
                  <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl">
                        <Wallet className="w-4 h-4 mr-2" />
                        Pay
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Pay Student</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handlePayStudent} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Amount (₦)</Label>
                          <Input
                            type="number"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            placeholder="Enter amount"
                            required
                            className="rounded-xl"
                          />
                        </div>
                        <Button type="submit" className="w-full rounded-xl gradient-hero">
                          Send Payment
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="rounded-xl gradient-hero">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign New Task</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddTask} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Task Title</Label>
                          <Input
                            value={taskForm.title}
                            onChange={(e) => setTaskForm(p => ({ ...p, title: e.target.value }))}
                            required
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={taskForm.description}
                            onChange={(e) => setTaskForm(p => ({ ...p, description: e.target.value }))}
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Due Date</Label>
                          <Input
                            type="date"
                            value={taskForm.due_date}
                            onChange={(e) => setTaskForm(p => ({ ...p, due_date: e.target.value }))}
                            className="rounded-xl"
                          />
                        </div>
                        <Button type="submit" className="w-full rounded-xl gradient-hero">
                          Assign Task
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!selectedStudent ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ListTodo className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a student to view and manage tasks</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ListTodo className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks assigned yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div key={task.id} className="p-4 rounded-xl border border-border bg-background/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          )}
                          {task.due_date && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                              <Calendar className="w-3 h-3" />
                              Due: {formatLagos(task.due_date)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {task.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleTaskStatusChange(task.id, 'in_progress')} className="rounded-xl">
                                Start
                              </Button>
                            </>
                          )}
                          {task.status === 'in_progress' && (
                            <Button size="sm" onClick={() => handleTaskStatusChange(task.id, 'completed')} className="rounded-xl bg-green-600 hover:bg-green-700">
                              Complete
                            </Button>
                          )}
                          {task.status === 'completed' && (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Done
                            </Badge>
                          )}
                          {task.status === 'pending' && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          {task.status === 'in_progress' && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              In Progress
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </IndustryLayout>
  );
}