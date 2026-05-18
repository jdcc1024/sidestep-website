"use client";

import { Authenticated, AuthLoading } from "convex/react"

import { SignInButton, SignOutButton, UserButton } from "@clerk/nextjs";
import { Unauthenticated } from "convex/react";

export default function UserProfileSection() {
  return (
    <>
      <Unauthenticated>
        <SignInButton />
      </Unauthenticated>
      <Authenticated>
        <div className="flex flex-col items-center">
        <UserButton />
        <div className="flex flex-col bg-blue-900 px-2 rounded-lg">
            <SignOutButton />   
        </div>
        </div>
      </Authenticated>
      <AuthLoading>
        <p>User Profile Loading...</p>
      </AuthLoading>
    </>
  );
}
