"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { Logo } from "./Logo";

const navLinks = [
  { href: "/customize", label: "Customize" },
  { href: "/process", label: "Process" },
  { href: "/pricing", label: "Pricing" },
];

export function MarketingNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="flex items-center gap-1" aria-label="Main">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`hidden rounded-md px-3 py-2 text-sm font-medium transition-colors sm:inline-block ${
                  active
                    ? "bg-teal-50 text-teal-700"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Unauthenticated>
            <Link
              href="/sign-in"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 sm:inline-block"
            >
              Sign in
            </Link>
            <Link
              href="/intake"
              className="ml-1 rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Get a Quote
            </Link>
          </Unauthenticated>
          <Authenticated>
            <Link
              href="/portal"
              aria-current={isActive("/portal") ? "page" : undefined}
              className={`hidden rounded-md px-3 py-2 text-sm font-medium transition-colors sm:inline-block ${
                isActive("/portal")
                  ? "bg-teal-50 text-teal-700"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              Portal
            </Link>
            <div className="ml-1 flex items-center">
              <UserButton />
            </div>
          </Authenticated>
        </nav>
      </div>
    </header>
  );
}
