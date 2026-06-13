import { useState } from "react";
import { useFAQ } from "@/hooks/useFAQ";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpCircle, Search } from "lucide-react";

interface FAQHelpModalProps {
  category: string;
  buttonLabel?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
}

export default function FAQHelpModal({ category, buttonLabel = "Need Help?", buttonVariant = "outline" }: FAQHelpModalProps) {
  const { data: faqs, isLoading } = useFAQ({ category });
  const [search, setSearch] = useState("");

  const filtered = (faqs || []).filter(
    (f) =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} className="rounded-xl gap-2">
          <HelpCircle className="w-4 h-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            {buttonLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No matching questions found.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {filtered.map((faq, index) => (
              <AccordionItem key={faq.id} value={`faq-${index}`}>
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: faq.answer.replace(/\n/g, '<br/>') }} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </DialogContent>
    </Dialog>
  );
}
