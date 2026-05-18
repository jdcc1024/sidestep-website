import { Webhook } from "svix";
import { headers } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type ClerkUserEvent = {
  type: "user.created" | "user.updated";
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; primary: boolean }>;
    first_name: string | null;
    last_name: string | null;
  };
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let event: ClerkUserEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  if (event.type !== "user.created" && event.type !== "user.updated") {
    return new Response(null, { status: 200 });
  }

  const { id, email_addresses, first_name, last_name } = event.data;
  const primaryEmail =
    email_addresses.find((e) => e.primary)?.email_address ?? "";
  const name =
    [first_name, last_name].filter(Boolean).join(" ").trim() || primaryEmail;

  await convex.mutation(api.users.syncUser, {
    clerkId: id,
    email: primaryEmail,
    name,
  });

  return new Response(null, { status: 200 });
}
