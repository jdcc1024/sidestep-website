import { UserButton } from "@clerk/nextjs";
import { SidebarShell, type SidebarLink } from "./SidebarShell";

const adminLinks: SidebarLink[] = [
  { href: "/admin", label: "All Orders", exact: true },
  { href: "/admin/designs", label: "All Designs" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/leads", label: "Leads" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarShell
      label="Admin"
      links={adminLinks}
      brandBadge={
        <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
          Admin
        </span>
      }
      footerSlot={
        <div className="flex items-center gap-3">
          <UserButton />
          <span className="text-sm text-zinc-600">Admin account</span>
        </div>
      }
    >
      {children}
    </SidebarShell>
  );
}
