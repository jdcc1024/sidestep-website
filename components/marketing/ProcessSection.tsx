const steps = [
  {
    number: "01",
    title: "Design Template",
    description:
      "Drop your colors, logos, and ideas onto our jersey design template. Need a hand? Our design team can build it with you.",
  },
  {
    number: "02",
    title: "3D Mock-up",
    description:
      "We turn your design into a 3D mock-up so you can see exactly how it'll look on the jersey before anything gets stitched.",
  },
  {
    number: "03",
    title: "Production",
    description:
      "Once you're happy with the mock-up, production starts. Most orders arrive in around 4 weeks.",
  },
];

export function ProcessSection() {
  return (
    <section
      id="process"
      className="border-b border-zinc-200 bg-zinc-50 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Process
          </p>
          <h2 className="mt-3 font-heading text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            From design to delivery in three steps.
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            We keep the loop tight: you describe what you want, we visualize it,
            and the kit lands in your hands.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, idx) => (
            <li
              key={step.number}
              className="relative flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 font-mono text-sm font-bold text-white"
                >
                  {step.number}
                </span>
                <h3 className="text-lg font-semibold text-zinc-900">
                  {step.title}
                </h3>
              </div>
              <p className="mt-4 text-zinc-600">{step.description}</p>
              {idx < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute right-4 top-1/2 hidden h-px w-8 -translate-y-1/2 bg-zinc-300 md:block lg:w-12"
                  style={{ right: "-1.75rem" }}
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
