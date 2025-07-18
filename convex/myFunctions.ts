
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Missing CLERK_WEBHOOK_SECRET");
    }

    const svix_id = request.headers.get("svix-id");
    const svix_signature = request.headers.get("svix-signature");
    const svix_timestamp = request.headers.get("svix-timestamp");

    if (!svix_id || !svix_signature || !svix_timestamp) {
      return new Response("Missing Svix headers", { status: 400 });
    }

    const payload = await request.text();

    const headers = {
      "svix-id": svix_id,
      "svix-signature": svix_signature,
      "svix-timestamp": svix_timestamp,
    };

    const wh = new Webhook(webhookSecret);

    let evt: any; // 👈 Cast to any or define a proper type if needed
    try {
      evt = wh.verify(payload, headers);
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    const eventType = evt.type;

    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name } = evt.data;

      const email =
        Array.isArray(email_addresses) && email_addresses.length > 0
          ? email_addresses[0].email_address
          : null;

      if (!email) {
        return new Response("Missing email address", { status: 400 });
      }

      const name = `${first_name || ""} ${last_name || ""}`.trim();

      try {
        await ctx.runMutation( api.users.syncUser , {
          userId: id,
          email,
          name,
        });
      } catch (err) {
        console.error("Error saving user:", err);
        return new Response("Error saving user", { status: 500 });
      }
    }

    return new Response("Webhook received", { status: 200 });
  }),
});

export default http;
