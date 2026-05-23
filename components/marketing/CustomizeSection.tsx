type Option = {
  name: string;
  description: string;
};

type OptionGroup = {
  title: string;
  caption: string;
  options: Option[];
};

const groups: OptionGroup[] = [
  {
    title: "Fabric",
    caption: "Pick the feel that fits your sport.",
    options: [
      {
        name: "Athletic Mesh",
        description:
          "Breathable open weave — light and airy for high-tempo play.",
      },
      {
        name: "Smooth Polyester",
        description:
          "Soft, sleek finish — a refined hand-feel for a sharper look.",
      },
    ],
  },
  {
    title: "Neckline",
    caption: "Set the tone at the collar.",
    options: [
      {
        name: "Crew Neck",
        description: "Classic round collar — clean, traditional, versatile.",
      },
      {
        name: "V Neck",
        description: "Subtle V cut — a modern silhouette that frames the chest.",
      },
    ],
  },
  {
    title: "Sleeve Cut",
    caption: "Choose how the shoulder sits.",
    options: [
      {
        name: "Regular Cut",
        description:
          "Standard set-in sleeve — straightforward and timeless.",
      },
      {
        name: "Raglan (Baseball)",
        description:
          "Diagonal sleeve from collar to underarm — full range of motion.",
      },
    ],
  },
];

export function CustomizeSection() {
  return (
    <section
      id="customize"
      className="border-b border-zinc-200 bg-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Customize
          </p>
          <h2 className="mt-3 font-heading text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Built around what your team wears best.
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            Every jersey is fully sublimated, so the design is in the fabric —
            not printed on top. Mix and match the options below to shape the
            base of your kit.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <article
              key={group.title}
              className="flex flex-col rounded-xl border border-zinc-200 bg-zinc-50/60 p-6"
            >
              <h3 className="text-lg font-semibold text-zinc-900">
                {group.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-500">{group.caption}</p>
              <ul className="mt-5 space-y-4">
                {group.options.map((option) => (
                  <li key={option.name} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-teal-500"
                    />
                    <div>
                      <p className="font-medium text-zinc-900">{option.name}</p>
                      <p className="mt-0.5 text-sm text-zinc-600">
                        {option.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
