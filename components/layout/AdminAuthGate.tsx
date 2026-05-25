"use client";

import { Authenticated, AuthLoading } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton";

// Convex's recommended pattern for gating authenticated queries — see
// https://docs.convex.dev/auth/clerk. The server layout already verifies
// Clerk admin status; this gate covers the brief window after that check
// while ConvexProviderWithClerk fetches the JWT and hands it to Convex.
// Without it, admin pages race the token fetch and throw "Not authenticated."
export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthLoading>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-3 h-10 w-72" />
          <Skeleton className="mt-8 h-64 w-full" />
        </div>
      </AuthLoading>
      <Authenticated>{children}</Authenticated>
    </>
  );
}
