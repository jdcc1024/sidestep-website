import { Logo } from "./Logo";

export function MarketingFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Logo />
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-6">
          <a
            href="mailto:info@sidestep.design"
            className="hover:text-foreground"
          >
            info@sidestep.design
          </a>
          <p>© {new Date().getFullYear()} Sidestep</p>
        </div>
      </div>
    </footer>
  );
}
