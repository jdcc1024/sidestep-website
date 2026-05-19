const faqs = [
  {
    question: "What is your minimum order?",
    answer:
      "Our standard minimum is 10 jerseys per design. Smaller runs of 5–10 jerseys are possible but carry a special-order fee.",
  },
  {
    question: "How long does an order take?",
    answer:
      "Most orders take around 4 weeks from confirmed design to delivery. We'll flag a tighter timeline up front if you're working against a tournament or season start.",
  },
  {
    question: "Do you help with the design?",
    answer:
      "Yes — our team has 20+ years of industry experience and can guide you through the design from a rough idea, mood board, or sketch. You'll see a 3D mock-up before anything goes into production.",
  },
  {
    question: "Where do you ship?",
    answer:
      "We currently serve the Greater Vancouver area. If you're outside that region, get in touch and we'll see what we can do.",
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      className="border-b border-zinc-200 bg-zinc-50 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Common questions, answered.
          </h2>
        </div>

        <dl className="mt-12 space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl border border-zinc-200 bg-white open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-zinc-900 [&::-webkit-details-marker]:hidden">
                <dt className="m-0">{faq.question}</dt>
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <dd className="px-5 pb-5 text-zinc-600">{faq.answer}</dd>
            </details>
          ))}
        </dl>
      </div>
    </section>
  );
}
