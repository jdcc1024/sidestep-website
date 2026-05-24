import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    value: "minimum",
    question: "What is your minimum order?",
    answer:
      "Our standard minimum is 10 jerseys per design. Smaller runs of 5–10 jerseys are possible but carry a special-order fee.",
  },
  {
    value: "timeline",
    question: "How long does an order take?",
    answer:
      "Most orders take around 4 weeks from confirmed design to delivery. We'll flag a tighter timeline up front if you're working against a tournament or season start.",
  },
  {
    value: "design",
    question: "Do you help with the design?",
    answer:
      "Yes — our team has 20+ years of industry experience and can guide you through the design from a rough idea, mood board, or sketch. You'll see a 3D mock-up before anything goes into production.",
  },
  {
    value: "shipping",
    question: "Where do you ship?",
    answer:
      "We currently serve the Greater Vancouver area. If you're outside that region, get in touch and we'll see what we can do.",
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      className="border-b border-border bg-muted/40 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            FAQ
          </p>
          <h2 className="mt-3 font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Common questions, answered.
          </h2>
        </div>

        <Accordion className="mt-12 rounded-xl border border-border bg-card px-5 shadow-sm">
          {faqs.map((faq) => (
            <AccordionItem key={faq.value} value={faq.value}>
              <AccordionTrigger className="py-4 text-base font-semibold text-foreground">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
