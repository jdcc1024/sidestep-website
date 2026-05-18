import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export default async function PortalPage() {
  const user = await currentUser();
  const cookieStore = await cookies();
  const inviteToken = cookieStore.get("sidestep_invite_token")?.value;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Portal</h1>
      <p className="mt-2 text-zinc-600">
        Welcome, {user?.firstName}. Portal dashboard coming in 2-04.
      </p>
      {inviteToken && (
        <p className="mt-4 rounded bg-blue-50 px-4 py-2 text-sm text-blue-700">
          Intake token detected — order form will be pre-filled from your intake
          submission.
        </p>
      )}
    </div>
  );
}
