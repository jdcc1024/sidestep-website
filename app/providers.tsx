"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useMutation, useQuery } from "convex/react";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Syncs the authenticated user into Convex exactly once — on first sign-up.
// getCurrentUser is a cheap read; syncCurrentUser (write) only fires when
// getCurrentUser returns null, meaning the user doesn't exist in the DB yet.
function UserSync() {
  const { isLoaded, isSignedIn } = useAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isLoaded && isSignedIn ? {} : "skip",
  );
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);

  useEffect(() => {
    if (currentUser === null) {
      syncCurrentUser();
    }
  }, [currentUser, syncCurrentUser]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <UserSync />
          {children}
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </ThemeProvider>
  );
}
