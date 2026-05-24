import { currentUser } from "@clerk/nextjs/server";
import { AdminShell } from "@/components/layout/AdminShell";

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
      <div className="flex min-h-screen flex-1 items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl font-semibold text-foreground">
            403 — Access Denied
          </p>
          <p className="mt-2 text-muted-foreground">
            You do not have permission to access this area.
          </p>
        </div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
