import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ResearchFilters {
  yearFrom: string;
  yearTo: string;
  field: string;
  level: string;
  stage: string;
  sdg: string;
  hasFile: boolean;
  hasAISummary: boolean;
  fundingNeeded: boolean;
  freeOnly: boolean;
}

export const emptyFilters: ResearchFilters = {
  yearFrom: "",
  yearTo: "",
  field: "all",
  level: "all",
  stage: "all",
  sdg: "all",
  hasFile: false,
  hasAISummary: false,
  fundingNeeded: false,
  freeOnly: false,
};

interface Props {
  filters: ResearchFilters;
  onChange: (f: ResearchFilters) => void;
  fields: string[];
  activeCount: number;
}

const LEVELS = ["Undergraduate Poly", "Undergraduate Uni", "MSc", "PhD"];
const STAGES = ["Proposal", "Ongoing", "Completed"];
const SDGS = [
  "No Poverty","Zero Hunger","Good Health","Quality Education","Gender Equality",
  "Clean Water","Affordable Energy","Decent Work","Industry & Innovation",
  "Reduced Inequalities","Sustainable Cities","Responsible Consumption",
  "Climate Action","Life Below Water","Life on Land","Peace & Justice","Partnerships",
];

function FilterBody({ filters, onChange, fields }: Omit<Props, "activeCount">) {
  const set = <K extends keyof ResearchFilters>(k: K, v: ResearchFilters[K]) =>
    onChange({ ...filters, [k]: v });

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Year</Label>
        <div className="flex gap-2 mt-2">
          <Input type="number" placeholder="From" value={filters.yearFrom} onChange={(e) => set("yearFrom", e.target.value)} />
          <Input type="number" placeholder="To" value={filters.yearTo} onChange={(e) => set("yearTo", e.target.value)} />
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Research Field</Label>
        <Select value={filters.field} onValueChange={(v) => set("field", v)}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All fields</SelectItem>
            {fields.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Academic Level</Label>
        <Select value={filters.level} onValueChange={(v) => set("level", v)}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Research Stage</Label>
        <Select value={filters.stage} onValueChange={(v) => set("stage", v)}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SDG Category</Label>
        <Select value={filters.sdg} onValueChange={(v) => set("sdg", v)}>
          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All SDGs</SelectItem>
            {SDGS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 pt-2 border-t">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={filters.hasFile} onCheckedChange={(v) => set("hasFile", !!v)} />
          Has downloadable file
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={filters.hasAISummary} onCheckedChange={(v) => set("hasAISummary", !!v)} />
          Has AI summary
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={filters.fundingNeeded} onCheckedChange={(v) => set("fundingNeeded", !!v)} />
          Funding needed
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={filters.freeOnly} onCheckedChange={(v) => set("freeOnly", !!v)} />
          Open access / free
        </label>
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={() => onChange(emptyFilters)}>
        <X className="w-4 h-4" />
        Clear all
      </Button>
    </div>
  );
}

export default function ResearchFiltersPanel(props: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 flex-shrink-0">
        <div className="sticky top-24 bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </h3>
          <FilterBody {...props} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="lg:hidden gap-2 relative">
            <SlidersHorizontal className="w-4 h-4" /> Filters
            {props.activeCount > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-[10px]">{props.activeCount}</Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4 pb-8">
            <FilterBody {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
