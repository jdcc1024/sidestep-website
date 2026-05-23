import { Button } from "@/components/ui/button";

export default function SmokePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 p-8">
      <section className="flex flex-col items-center gap-4 text-center">
        <p className="text-muted-foreground text-xs uppercase tracking-widest">
          shadcn smoke test
        </p>
        <h1 className="text-5xl">Sidestep typography</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          H1 above is Bebas Neue (display). This body text is Inter. The price
          callout below is Geist Mono.
        </p>
        <p className="font-mono text-3xl font-bold">$15/jersey</p>
      </section>

      <section className="flex flex-col items-center gap-3">
        <p className="text-muted-foreground text-xs uppercase tracking-widest">
          Buttons
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
      </section>
    </main>
  );
}
