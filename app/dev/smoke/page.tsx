import { Button } from "@/components/ui/button";

export default function SmokePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">shadcn smoke test</h1>
      <p className="text-muted-foreground text-sm">
        If this Button renders with shadcn styling, the install is healthy.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button>Default</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>
    </main>
  );
}
