"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "./Logo";

const navLinks = [
  { href: "/#customize", label: "Customize" },
  { href: "/#process", label: "Process" },
  { href: "/#pricing", label: "Pricing" },
];

export function MarketingNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const portalActive = isActive("/portal");

  const desktopSectionLinks = navLinks.map((link) => (
    <Link
      key={link.href}
      href={link.href}
      className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
    >
      {link.label}
    </Link>
  ));

  const mobileSectionLinks = navLinks.map((link) => (
    <Link
      key={link.href}
      href={link.href}
      onClick={() => setMobileOpen(false)}
      className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
    >
      {link.label}
    </Link>
  ));

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav
          className="hidden items-center gap-1 sm:flex"
          aria-label="Main"
        >
          {desktopSectionLinks}
          <Unauthenticated>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/sign-in">Sign in</Link>}
            />
            <Button
              size="sm"
              className="ml-1 bg-teal-600 text-white hover:bg-teal-700"
              render={<Link href="/intake">Get a Quote</Link>}
            />
          </Unauthenticated>
          <Authenticated>
            <Link
              href="/portal"
              aria-current={portalActive ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                portalActive
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
          <ThemeToggle />
        </nav>

        <div className="flex items-center gap-1 sm:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <MenuIcon />
                </Button>
              }
            />
            <SheetContent
              side="right"
              className="flex w-72 flex-col gap-0 bg-white p-0 text-zinc-900"
            >
              <SheetHeader className="px-4 py-4">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <Separator />
              <nav
                className="flex flex-1 flex-col gap-1 overflow-y-auto p-4"
                aria-label="Main"
              >
                {mobileSectionLinks}
                <Unauthenticated>
                  <Separator className="my-2" />
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/intake"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
                  >
                    Get a Quote
                  </Link>
                </Unauthenticated>
                <Authenticated>
                  <Separator className="my-2" />
                  <Link
                    href="/portal"
                    onClick={() => setMobileOpen(false)}
                    aria-current={portalActive ? "page" : undefined}
                    className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      portalActive
                        ? "bg-teal-50 text-teal-700"
                        : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    Portal
                  </Link>
                </Authenticated>
              </nav>
              <Separator />
              <div className="flex items-center justify-between gap-3 p-4">
                <Authenticated>
                  <div className="flex items-center gap-3">
                    <UserButton />
                    <span className="text-sm text-zinc-600">Account</span>
                  </div>
                </Authenticated>
                <Unauthenticated>
                  <span className="text-sm text-zinc-600">Theme</span>
                </Unauthenticated>
                <ThemeToggle />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
