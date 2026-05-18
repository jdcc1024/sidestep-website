import { currentUser } from "@clerk/nextjs/server";

export default async function AdminPage() {
  const user = await currentUser();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Admin</h1>
      <p className="mt-2 text-zinc-600">
        Welcome, {user?.firstName}. Admin dashboard coming in 2-11.
      </p>
    </div>
  );
}
