import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyAmount, toNumber } from "@/lib/numberFormat";

interface TopupPackage {
  id: string;
  name: string;
  credits: number;
  amount_ngn: number;
  is_active: boolean;
  sort_order: number;
}

export default function CreditTopupPackages() {
  const [packages, setPackages] = useState<TopupPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TopupPackage | null>(null);
  const [form, setForm] = useState({ name: '', credits: 10, amount_ngn: 500, sort_order: 0, is_active: true });
  const { toast } = useToast();

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('credit_topup_packages')
      .select('*')
      .order('sort_order');
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setPackages((data || []).map((pkg) => ({
      ...pkg,
      amount_ngn: toNumber(pkg.amount_ngn),
    })));
    setLoading(false);
  };

  const handleEdit = (pkg: TopupPackage) => {
    setEditing(pkg);
    setForm({ name: pkg.name, credits: pkg.credits, amount_ngn: pkg.amount_ngn, sort_order: pkg.sort_order, is_active: pkg.is_active });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditing(null);
    setForm({ name: '', credits: 10, amount_ngn: 500, sort_order: 0, is_active: true });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || form.credits < 1 || form.amount_ngn < 0) {
      toast({ title: "Validation Error", description: "Name and credits are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    let error;
    if (editing) {
      ({ error } = await supabase.from('credit_topup_packages').update(form).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('credit_topup_packages').insert(form));
    }
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: editing ? "Package updated" : "Package created" });
      setDialogOpen(false);
      fetchPackages();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this top-up package?')) return;
    const { error } = await supabase.from('credit_topup_packages').delete().eq('id', id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); fetchPackages(); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Credit Top-Up Packages</h3>
          <p className="text-sm text-muted-foreground">Users can buy these when they run out of AI credits</p>
        </div>
        <Button onClick={handleCreate} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          Add Package
        </Button>
      </div>

      <Card className="rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Package</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Price (₦)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No top-up packages yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : packages.map(pkg => (
              <TableRow key={pkg.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-foreground">{pkg.name}</span>
                  </div>
                </TableCell>
                <TableCell>{pkg.credits} credits</TableCell>
                <TableCell>{formatCurrencyAmount(pkg.amount_ngn)}</TableCell>
                <TableCell>
                  <Badge variant={pkg.is_active ? "default" : "secondary"}>
                    {pkg.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(pkg)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Package' : 'Create Package'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Package Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., 10 Credits" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Credits</Label>
                <Input type="number" value={form.credits} onChange={e => setForm({ ...form, credits: parseInt(e.target.value) || 0 })} min="1" />
              </div>
              <div className="space-y-2">
                <Label>Price (₦ NGN)</Label>
                <Input type="number" step="1" value={form.amount_ngn} onChange={e => setForm({ ...form, amount_ngn: parseFloat(e.target.value) || 0 })} min="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.is_active} onCheckedChange={checked => setForm({ ...form, is_active: checked })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
