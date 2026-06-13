import { useFAQ } from "@/hooks/useFAQ";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface MiniFAQBlockProps {
  displayLocation: string;
  title?: string;
  fallbackQuestions?: { question: string; answer: string }[];
}

export default function MiniFAQBlock({ displayLocation, title = "Frequently Asked Questions", fallbackQuestions }: MiniFAQBlockProps) {
  const { data: faqs, isLoading } = useFAQ({ displayLocation });

  const questions = faqs && faqs.length > 0
    ? faqs.slice(0, 6)
    : fallbackQuestions || [];

  if (questions.length === 0 && !isLoading) return null;

  return (
    <section className="py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 shadow-soft">
          <Accordion type="single" collapsible className="w-full">
            {questions.map((faq: any, index: number) => (
              <AccordionItem key={'id' in faq ? faq.id : index} value={`faq-${index}`} className="border-border">
                <AccordionTrigger className="text-left text-foreground hover:no-underline hover:text-primary transition-colors py-4 text-sm font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">
                  <div dangerouslySetInnerHTML={{ __html: faq.answer.replace(/\n/g, '<br/>') }} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
