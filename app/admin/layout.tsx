import { currentUser } from "@clerk/nextjs/server";

// Reads privateMetadata.isAdmin server-side — this value is never sent to the client.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const isAdmin = user?.privateMetadata?.isAdmin === true;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-zinc-900">
            403 — Access Denied
          </p>
          <p className="mt-2 text-zinc-600">
            You do not have permission to access this area.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
