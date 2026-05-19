import { UserButton } from "@clerk/nextjs";
import { SidebarShell, type SidebarLink } from "./SidebarShell";

const portalLinks: SidebarLink[] = [
  { href: "/portal", label: "My Orders", exact: true },
  { href: "/portal/designs", label: "My Designs" },
  { href: "/portal/runs", label: "Jersey Runs" },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarShell
      label="Portal"
      links={portalLinks}
      footerSlot={
        <div className="flex items-center gap-3">
          <UserButton />
          <span className="text-sm text-zinc-600">Account</span>
        </div>
      }
    >
      {children}
    </SidebarShell>
  );
}
