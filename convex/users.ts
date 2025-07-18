import { mutation, query } from "./_generated/server";
import { v } from "convex/values"; 

export const syncUser = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .first();

    if (!existingUser) {
      await ctx.db.insert("users", {
        userId: args.userId,
        email: args.email,
        name: args.name,
        isPro: false,
      });
    }
    
    // Return the user data after sync
    return existingUser || {
      userId: args.userId,
      email: args.email,
      name: args.name,
      isPro: false,
    };
  },
});

export const getUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      console.log("getUser: No userId provided");
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    console.log(`getUser: Found user for ${args.userId}:`, user);
    
    return user || null;
  },
});

export const updateUserToPro = mutation({
  args: {
    userId: v.string(),
    razorpayPaymentId: v.string(),
    razorpayOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      isPro: true,
      proSince: Date.now(),
      lemonSqueezyCustomerId: args.razorpayPaymentId, 
      lemonSqueezyOrderId: args.razorpayOrderId, 
    });

    return { success: true };
  },
});
