import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import IndustryLayout from "@/components/layout/IndustryLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Receipt, Eye, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { formatLagos } from "@/lib/dateUtils";

interface PaymentRecord {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  plan_name: string;
  tier: string;
  status: string;
  payment_method: string | null;
  coupon_code: string | null;
  discount_amount: number | null;
  created_at: string;
}

export default function IndustryPaymentHistory() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPayments(data as PaymentRecord[]);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  return (
    <IndustryLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Link to="/industry/subscriptions">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment History</h1>
            <p className="text-muted-foreground text-sm">View all your subscription payments</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Receipt className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No payments yet</h3>
              <p className="text-muted-foreground text-sm">Your payment history will appear here after your first subscription.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <Card key={payment.id} className="rounded-xl hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedPayment(payment)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{payment.plan_name} Plan</p>
                      <p className="text-xs text-muted-foreground">
                        {formatLagos(payment.created_at, "datetime")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatAmount(payment.amount, payment.currency)}</p>
                      {payment.coupon_code && (
                        <p className="text-[10px] text-emerald-600">Coupon: {payment.coupon_code}</p>
                      )}
                    </div>
                    <Badge className={`rounded-full text-[10px] ${payment.status === "success" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                      {payment.status}
                    </Badge>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Payment Invoice
              </DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium text-foreground capitalize">{selectedPayment.plan_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tier</span>
                    <Badge variant="outline" className="capitalize">{selectedPayment.tier}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="text-foreground">{formatLagos(selectedPayment.created_at)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="text-foreground font-mono text-xs">{selectedPayment.reference}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={`rounded-full ${selectedPayment.status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
                      {selectedPayment.status}
                    </Badge>
                  </div>
                  {selectedPayment.coupon_code && (
                    <>
                      <div className="border-t pt-3 flex justify-between text-sm">
                        <span className="text-muted-foreground">Coupon Applied</span>
                        <span className="text-emerald-600 font-medium">{selectedPayment.coupon_code}</span>
                      </div>
                      {selectedPayment.discount_amount && selectedPayment.discount_amount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discount</span>
                          <span className="text-emerald-600">-{formatAmount(selectedPayment.discount_amount, selectedPayment.currency)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-semibold text-foreground">Amount Paid</span>
                    <span className="font-bold text-lg text-foreground">{formatAmount(selectedPayment.amount, selectedPayment.currency)}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </IndustryLayout>
  );
}
