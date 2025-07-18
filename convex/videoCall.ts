import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const startVideoCall = mutation({
  args: {
    sessionId: v.id("sessions"),
    callId: v.string(),
    userId: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if call already exists
    const existingCall = await ctx.db
      .query("videoCalls")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existingCall) {
      // Join existing call
      const updatedParticipants = [...existingCall.participants];
      const existingParticipant = updatedParticipants.find(p => p.userId === args.userId);
      
      if (!existingParticipant) {
        updatedParticipants.push({
          userId: args.userId,
          userName: args.userName,
          isVideoOn: false,
          isAudioOn: false,
          joinedAt: Date.now(),
        });
      }

      await ctx.db.patch(existingCall._id, {
        participants: updatedParticipants,
      });

      return { callId: existingCall.callId, isNew: false };
    }

    // Create new call
    await ctx.db.insert("videoCalls", {
      sessionId: args.sessionId,
      callId: args.callId,
      isActive: true,
      participants: [{
        userId: args.userId,
        userName: args.userName,
        isVideoOn: false,
        isAudioOn: false,
        joinedAt: Date.now(),
      }],
      createdAt: Date.now(),
      createdBy: args.userId,
    });

    return { callId: args.callId, isNew: true };
  },
});

export const updateParticipantMedia = mutation({
  args: {
    sessionId: v.id("sessions"),
    userId: v.string(),
    isVideoOn: v.boolean(),
    isAudioOn: v.boolean(),
  },
  handler: async (ctx, args) => {
    const activeCall = await ctx.db
      .query("videoCalls")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!activeCall) return;

    const updatedParticipants = activeCall.participants.map(p =>
      p.userId === args.userId
        ? { ...p, isVideoOn: args.isVideoOn, isAudioOn: args.isAudioOn }
        : p
    );

    await ctx.db.patch(activeCall._id, {
      participants: updatedParticipants,
    });
  },
});

export const leaveVideoCall = mutation({
  args: {
    sessionId: v.id("sessions"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const activeCall = await ctx.db
      .query("videoCalls")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!activeCall) return;

    const updatedParticipants = activeCall.participants.filter(p => p.userId !== args.userId);

    if (updatedParticipants.length === 0) {
      // End call if no participants left
      await ctx.db.patch(activeCall._id, {
        isActive: false,
      });
    } else {
      await ctx.db.patch(activeCall._id, {
        participants: updatedParticipants,
      });
    }
  },
});

export const getActiveVideoCall = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const activeCall = await ctx.db
      .query("videoCalls")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return activeCall;
  },
});