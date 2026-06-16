import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { handleEdgeFunctionResponse } from "@/lib/edgeFunctionError";
import { formatCurrencyAmount } from "@/lib/numberFormat";
import { Zap, Loader2, Sparkles } from "lucide-react";

interface TopupPackage {
  id: string;
  name: string;
  credits: number;
  amount_ngn: number;
}

interface CreditTopupDialogProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export default function CreditTopupDialog({ onSuccess, trigger }: CreditTopupDialogProps) {
  const [open, setOpen] = useState(false);
  const [packages, setPackages] = useState<TopupPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) fetchPackages();
  }, [open]);

  // Handle callback from Paystack
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference') || urlParams.get('trxref');
    const topupRef = reference && reference.startsWith('topup_');

    if (topupRef && reference) {
      verifyTopup(reference);
    }
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('credit_topup_packages')
      .select('id, name, credits, amount_ngn')
      .eq('is_active', true)
      .order('sort_order');
    setPackages(data || []);
    setLoading(false);
  };

  const handlePurchase = async (pkg: TopupPackage) => {
    setPurchasing(pkg.id);
    try {
      const { data, error } = await supabase.functions.invoke('paystack', {
        body: {
          action: 'initialize_topup',
          package_id: pkg.id,
          callback_url: window.location.href.split('?')[0],
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
      setPurchasing(null);
    }
  };

  const verifyTopup = async (reference: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('paystack', {
        body: { action: 'verify_topup', reference },
      });

      const [result, errorMsg] = handleEdgeFunctionResponse(data, error);
      if (errorMsg) {
        toast({ title: "Verification Error", description: errorMsg, variant: "destructive" });
        return;
      }

      if (result?.success) {
        toast({ title: "Credits added!", description: `${result.credits} AI credits have been added to your account` });
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Top-up verification error:', error);
    }

    window.history.replaceState({}, document.title, window.location.pathname);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="rounded-xl border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20">
            <Zap className="w-4 h-4 mr-2" />
            Top Up Credits
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Top Up AI Credits
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Purchase additional AI credits while your subscription is active.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No top-up packages available at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {packages.map(pkg => (
              <Card key={pkg.id} className="rounded-xl border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground">{pkg.credits} AI credits</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handlePurchase(pkg)}
                    disabled={purchasing === pkg.id}
                    className="rounded-xl"
                    size="sm"
                  >
                    {purchasing === pkg.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      formatCurrencyAmount(pkg.amount_ngn)
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
