import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Banknote, TrendingUp, TrendingDown, CreditCard, ArrowUpRight, Plus, MinusCircle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { formatLagos } from "@/lib/dateUtils";
import { formatCompactCurrency, formatCurrencyAmount, toNumber } from "@/lib/numberFormat";
import { toast } from "@/hooks/use-toast";

type FilterMode = "daily" | "weekly" | "monthly" | "custom";
type ViewMode = "revenue" | "expenses" | "both";

interface RevenueRow {
  amount: number;
  created_at: string;
  plan_name: string;
  status: string;
  reference: string;
  tier: string;
}

interface TopupRow {
  amount: number;
  created_at: string;
  credits: number;
  status: string;
}

interface ExpenseRow {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  category: string;
  expense_date: string;
  created_at: string;
}

interface ChartPoint {
  label: string;
  subscriptions: number;
  topups: number;
  expenses: number;
}

const chartConfig: ChartConfig = {
  subscriptions: { label: "Subscriptions", color: "hsl(var(--primary))" },
  topups: { label: "Top-ups", color: "hsl(142 76% 36%)" },
  expenses: { label: "Expenses", color: "hsl(0 84% 60%)" },
};

const EXPENSE_CATEGORIES = ["general", "salaries", "hosting", "marketing", "operations", "legal", "software", "other"];

export default function AdminRevenue() {
  const [filter, setFilter] = useState<FilterMode>("monthly");
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [payments, setPayments] = useState<RevenueRow[]>([]);
  const [topups, setTopups] = useState<TopupRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Expense form
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expTitle, setExpTitle] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("general");
  const [expDate, setExpDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRevenue();
  }, [filter, customFrom, customTo]);

  const getDateRange = () => {
    const now = new Date();
    switch (filter) {
      case "daily":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "weekly":
        return { from: startOfWeek(subWeeks(now, 4), { weekStartsOn: 1 }), to: endOfDay(now) };
      case "monthly":
        return { from: startOfMonth(subMonths(now, 5)), to: endOfDay(now) };
      case "custom":
        if (customFrom && customTo) {
          return { from: new Date(customFrom), to: endOfDay(new Date(customTo)) };
        }
        return { from: subMonths(now, 1), to: endOfDay(now) };
    }
  };

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange();
      const [payRes, topupRes, expRes] = await Promise.all([
        supabase.from("payment_history").select("amount, created_at, plan_name, status, reference, tier").eq("status", "success").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).order("created_at", { ascending: false }),
        supabase.from("credit_topup_purchases").select("amount, created_at, credits, status").eq("status", "success").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).order("created_at", { ascending: false }),
        supabase.from("admin_expenses").select("id, title, description, amount, category, expense_date, created_at").gte("expense_date", from.toISOString()).lte("expense_date", to.toISOString()).order("expense_date", { ascending: false }),
      ]);

      const pays = ((payRes.data || []) as RevenueRow[]).map((row) => ({ ...row, amount: toNumber(row.amount) }));
      const tops = ((topupRes.data || []) as TopupRow[]).map((row) => ({ ...row, amount: toNumber(row.amount), credits: toNumber(row.credits) }));
      const exps = ((expRes.data || []) as ExpenseRow[]).map((row) => ({ ...row, amount: toNumber(row.amount) }));
      setPayments(pays);
      setTopups(tops);
      setExpenses(exps);
      buildChart(pays, tops, exps, from, to);
    } catch (err) {
      console.error("Revenue fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const buildChart = (pays: RevenueRow[], tops: TopupRow[], exps: ExpenseRow[], from: Date, to: Date) => {
    const points: ChartPoint[] = [];
    if (filter === "daily") {
      const subTotal = pays.reduce((s, p) => s + p.amount, 0);
      const topTotal = tops.reduce((s, t) => s + t.amount, 0);
      const expTotal = exps.reduce((s, e) => s + e.amount, 0);
      points.push({ label: "Today", subscriptions: subTotal, topups: topTotal, expenses: expTotal });
    } else if (filter === "weekly") {
      const weeks = eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 });
      weeks.forEach((wStart) => {
        const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
        const label = format(wStart, "dd MMM");
        const subTotal = pays.filter((p) => { const d = new Date(p.created_at); return d >= wStart && d <= wEnd; }).reduce((s, p) => s + p.amount, 0);
        const topTotal = tops.filter((t) => { const d = new Date(t.created_at); return d >= wStart && d <= wEnd; }).reduce((s, t) => s + t.amount, 0);
        const expTotal = exps.filter((e) => { const d = new Date(e.expense_date); return d >= wStart && d <= wEnd; }).reduce((s, e) => s + e.amount, 0);
        points.push({ label, subscriptions: subTotal, topups: topTotal, expenses: expTotal });
      });
    } else {
      const months = eachMonthOfInterval({ start: from, end: to });
      months.forEach((mStart) => {
        const mEnd = endOfMonth(mStart);
        const label = format(mStart, "MMM yy");
        const subTotal = pays.filter((p) => { const d = new Date(p.created_at); return d >= mStart && d <= mEnd; }).reduce((s, p) => s + p.amount, 0);
        const topTotal = tops.filter((t) => { const d = new Date(t.created_at); return d >= mStart && d <= mEnd; }).reduce((s, t) => s + t.amount, 0);
        const expTotal = exps.filter((e) => { const d = new Date(e.expense_date); return d >= mStart && d <= mEnd; }).reduce((s, e) => s + e.amount, 0);
        points.push({ label, subscriptions: subTotal, topups: topTotal, expenses: expTotal });
      });
    }
    setChartData(points);
  };

  const handleAddExpense = async () => {
    if (!expTitle || !expAmount || parseFloat(expAmount) <= 0) {
      toast({ title: "Error", description: "Please fill in title and a valid amount.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("admin_expenses").insert({
        title: expTitle,
        description: expDesc || null,
        amount: parseFloat(expAmount),
        category: expCategory,
        expense_date: new Date(expDate).toISOString(),
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "Expense added" });
      setExpTitle(""); setExpDesc(""); setExpAmount(""); setExpCategory("general");
      setExpDate(format(new Date(), "yyyy-MM-dd"));
      setExpenseOpen(false);
      fetchRevenue();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalSubscriptionRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const totalTopupRevenue = topups.reduce((s, t) => s + t.amount, 0);
  const totalRevenue = totalSubscriptionRevenue + totalTopupRevenue;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const profitLoss = totalRevenue - totalExpenses;

  const showRevenue = viewMode === "revenue" || viewMode === "both";
  const showExpenses = viewMode === "expenses" || viewMode === "both";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Revenue & Expenses</h1>
            <p className="text-muted-foreground">Track income, expenses, and profit/loss</p>
          </div>
          <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2"><Plus className="w-4 h-4" /> Add Expense</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={expTitle} onChange={(e) => setExpTitle(e.target.value)} placeholder="e.g. Server hosting" className="rounded-xl" /></div>
                <div><Label>Amount (₦)</Label><Input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="0" className="rounded-xl" /></div>
                <div><Label>Category</Label>
                  <Select value={expCategory} onValueChange={setExpCategory}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Date</Label><Input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} className="rounded-xl" /></div>
                <div><Label>Description (optional)</Label><Textarea value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="Notes..." className="rounded-xl" /></div>
                <Button onClick={handleAddExpense} disabled={saving} className="w-full rounded-xl">{saving ? "Saving..." : "Add Expense"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter & View Mode */}
        <div className="flex flex-wrap gap-2 items-end">
          {(["daily", "weekly", "monthly", "custom"] as FilterMode[]).map((mode) => (
            <Button key={mode} variant={filter === mode ? "default" : "outline"} size="sm" className="rounded-xl capitalize" onClick={() => setFilter(mode)}>{mode}</Button>
          ))}
          {filter === "custom" && (
            <div className="flex gap-2 items-center">
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-40 rounded-xl" />
              <span className="text-muted-foreground text-sm">to</span>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-40 rounded-xl" />
            </div>
          )}
          <div className="ml-auto">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-[150px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className={`grid grid-cols-1 gap-4 ${viewMode === "both" ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
          {showRevenue && (
            <>
              <Card className="bg-primary/5 border-none rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-foreground/70">Total Revenue</span>
                    <Banknote className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{loading ? "..." : formatCurrencyAmount(totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{payments.length + topups.length} transactions</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/5 border-none rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-foreground/70">Subscriptions</span>
                    <CreditCard className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{loading ? "..." : formatCurrencyAmount(totalSubscriptionRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{payments.length} payments</p>
                </CardContent>
              </Card>
            </>
          )}
          {showExpenses && (
            <Card className="bg-destructive/5 border-none rounded-2xl">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-foreground/70">Total Expenses</span>
                  <MinusCircle className="w-5 h-5 text-destructive" />
                </div>
                <p className="text-2xl font-bold text-foreground">{loading ? "..." : formatCurrencyAmount(totalExpenses)}</p>
                <p className="text-xs text-muted-foreground">{expenses.length} entries</p>
              </CardContent>
            </Card>
          )}
          {viewMode === "both" && (
            <Card className={`border-none rounded-2xl ${profitLoss >= 0 ? "bg-emerald-500/5" : "bg-destructive/5"}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-foreground/70">{profitLoss >= 0 ? "Profit" : "Loss"}</span>
                  {profitLoss >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
                </div>
                <p className={`text-2xl font-bold ${profitLoss >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {loading ? "..." : `${profitLoss < 0 ? "-" : ""}${formatCurrencyAmount(Math.abs(profitLoss))}`}
                </p>
                <p className="text-xs text-muted-foreground">{profitLoss >= 0 ? "Net profit" : "Net loss"} this period</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chart */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" />Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => formatCompactCurrency(v)} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {showRevenue && <Bar dataKey="subscriptions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} stackId="revenue" />}
                  {showRevenue && <Bar dataKey="topups" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} stackId="revenue" />}
                  {showExpenses && <Bar dataKey="expenses" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />}
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground">{loading ? "Loading..." : "No data for this period"}</div>
            )}
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Type</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Details</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Amount</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...(showRevenue ? payments.map((p) => ({ type: "Subscription" as const, details: `${p.plan_name} (${p.tier})`, amount: p.amount, date: p.created_at, isExpense: false })) : []),
                    ...(showRevenue ? topups.map((t) => ({ type: "Top-up" as const, details: `${t.credits} credits`, amount: t.amount, date: t.created_at, isExpense: false })) : []),
                    ...(showExpenses ? expenses.map((e) => ({ type: "Expense" as const, details: `${e.title} (${e.category})`, amount: e.amount, date: e.expense_date, isExpense: true })) : []),
                  ]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 30)
                    .map((tx, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2.5 px-3">
                          <Badge variant={tx.isExpense ? "destructive" : tx.type === "Subscription" ? "default" : "secondary"} className="rounded-lg text-xs">{tx.type}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-foreground">{tx.details}</td>
                        <td className={`py-2.5 px-3 font-semibold ${tx.isExpense ? "text-destructive" : "text-foreground"}`}>
                          {tx.isExpense ? "-" : ""}{formatCurrencyAmount(tx.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-xs">{formatLagos(tx.date)}</td>
                      </tr>
                    ))}
                  {payments.length === 0 && topups.length === 0 && expenses.length === 0 && !loading && (
                    <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No transactions for this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
