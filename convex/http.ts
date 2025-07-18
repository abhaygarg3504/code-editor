
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { api } from "./_generated/api";
import * as collab from "./collab";  
import { Id } from "./_generated/dataModel";

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

    let evt: any;
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
        await ctx.runMutation(api.users.syncUser, {
          userId: id,
          email,
          name,
        });
      } catch (err) {
        console.error("Error saving user:", err);
        return new Response("Error saving user ", { status: 500 });
      }
    }

    return new Response("Webhook received", { status: 200 });
  }),
});
http.route({
  path: "/collab/createRoom",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { ownerId } = await request.json();
    try {
      const result = await ctx.runMutation(api.collab.createRoom, { ownerId });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      console.error("Error creating room:", err);
      return new Response("Error creating room", { status: 500 });
    }
  }),
});
http.route({
  path: "/collab/joinRoom",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    try {
      const result = await ctx.runMutation(api.collab.joinRoom, body);
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      console.error("Error joining room:", err);
      return new Response("Error joining room", { status: 500 });
    }
  }),
});
http.route({
  path: "/collab/updateCode",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    try {
      const result = await ctx.runMutation(api.collab.updateCode, body);
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      console.error("Error updating code:", err);
      return new Response("Error updating code", { status: 500 });
    }
  }),
});
http.route({
  path: "/collab/getCode",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const sessionIdParam = url.searchParams.get("sessionId");
    if (!sessionIdParam) {
      return new Response("Missing sessionId", { status: 400 });
    }
    // Import Id from convex/values if not already imported
    // import { Id } from "convex/values";
    const sessionId = sessionIdParam as Id<"sessions">;
    try {
      const result = await ctx.runQuery(api.collab.getCode, { sessionId });
      return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      console.error("Error getting code:", err);
      return new Response("Error getting code", { status: 500 });
    }
  }),
});

export default http;
