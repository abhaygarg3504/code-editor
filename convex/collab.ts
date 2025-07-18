// convex/collab.ts
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createRoom = mutation({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    // Create a new session
    const sessionId = await ctx.db.insert("sessions", {
      ownerId: args.ownerId,
      collaboratorIds: [args.ownerId],
      createdAt: Date.now(),
      isActive: true,
    });

    // Create initial empty code for the session
    await ctx.db.insert("sessionCodes", {
      sessionRef: sessionId,
      code: "",
      updatedAt: Date.now(),
    });

    return { sessionId };
  },
});

export const joinRoom = mutation({
  args: { 
    sessionId: v.id("sessions"), 
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    // Find the session
    const session = await ctx.db.get(args.sessionId);
    
    if (!session) {
      throw new Error("Session not found");
    }

    // If session is inactive, reactivate it if the user is the owner or was a previous collaborator
    if (!session.isActive) {
      // Check if user was previously part of this session or is the owner
      const wasPreviousCollaborator = session.collaboratorIds.includes(args.userId) || session.ownerId === args.userId;
      
      if (wasPreviousCollaborator) {
        // Reactivate the session
        await ctx.db.patch(args.sessionId, {
          isActive: true,
        });
      } else {
        throw new Error("Session is not active and you don't have permission to reactivate it");
      }
    }

    // Get the updated session after potential reactivation
    const updatedSession = await ctx.db.get(args.sessionId);
    if (!updatedSession) {
      throw new Error("Session not found after update");
    }

    // Check if room is full (max 10 users for better collaboration)
    if (updatedSession.collaboratorIds.length >= 10) {
      throw new Error("Room is full (maximum 10 collaborators)");
    }

    // Check if user is already in the room
    if (!updatedSession.collaboratorIds.includes(args.userId)) {
      // Add user to collaborators
      await ctx.db.patch(args.sessionId, {
        collaboratorIds: [...updatedSession.collaboratorIds, args.userId],
      });
    }

    return { success: true };
  },
});


export const updateCode = mutation({
  args: { 
    sessionId: v.id("sessions"), 
    code: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the session
    const session = await ctx.db.get(args.sessionId);
    
    if (!session) {
      throw new Error("Session not found");
    }

    if (!session.isActive) {
      throw new Error("Session is not active");
    }

    // Check if user is part of the session
    if (args.userId && !session.collaboratorIds.includes(args.userId)) {
      throw new Error("User not authorized to update this session");
    }

    // Find existing code record
    const existingCode = await ctx.db
      .query("sessionCodes")
      .withIndex("by_sessionRef", (q) => q.eq("sessionRef", args.sessionId))
      .unique();

    if (existingCode) {
      // Update existing code
      await ctx.db.patch(existingCode._id, {
        code: args.code,
        updatedAt: Date.now(),
      });
    } else {
      // Create new code record
      await ctx.db.insert("sessionCodes", {
        sessionRef: args.sessionId,
        code: args.code,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});


export const executeCode = action({
  args: {
    sessionId: v.id("sessions"),
    language: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Use function reference for runQuery/runMutation
    const session = await ctx.runQuery(api.collab.getSession, { sessionId: args.sessionId });

    if (!session) {
      throw new Error("Session not found");
    }

    if (!session.isActive) {
      throw new Error("Session is not active");
    }

    // Check if user is part of the session
    if (!session.collaboratorIds.includes(args.userId)) {
      throw new Error("User not authorized to execute code for this session");
    }

    // Get the current code using ctx.runQuery
    const sessionCode = await ctx.runQuery(api.collab.getCode, { sessionId: args.sessionId });

    if (!sessionCode || !sessionCode.trim()) {
      throw new Error("No code to execute");
    }

    // Language runtime configurations
    const LANGUAGE_RUNTIMES: Record<string, { language: string; version: string }> = {
      javascript: { language: "javascript", version: "18.15.0" },
      python: { language: "python", version: "3.10.0" },
      java: { language: "java", version: "15.0.2" },
      cpp: { language: "cpp", version: "10.2.0" },
      c: { language: "c", version: "10.2.0" },
      csharp: { language: "csharp", version: "6.12.0" },
      php: { language: "php", version: "8.2.3" },
      typescript: { language: "typescript", version: "5.0.3" },
      go: { language: "go", version: "1.16.2" },
      rust: { language: "rust", version: "1.68.2" },
      ruby: { language: "ruby", version: "3.0.1" },
      swift: { language: "swift", version: "5.3.3" },
      kotlin: { language: "kotlin", version: "1.8.20" },
      scala: { language: "scala", version: "3.2.2" },
      r: { language: "r", version: "4.1.1" },
      perl: { language: "perl", version: "5.36.0" },
      lua: { language: "lua", version: "5.4.4" },
      bash: { language: "bash", version: "5.2.0" },
      powershell: { language: "powershell", version: "7.1.4" },
    };

    const runtime = LANGUAGE_RUNTIMES[args.language];
    if (!runtime) {
      // For unsupported languages like React/JSX, return special preview output
      if (args.language === "react" || args.language === "jsx") {
        await ctx.runMutation(api.collab.storeExecutionResult, {
          sessionRef: args.sessionId,
          output: "__REACT_PREVIEW__",
          error: undefined,
          executedBy: args.userId,
          executedAt: Date.now(),
        });
        return { success: true };
      }

      throw new Error(`Language "${args.language}" is not supported for execution`);
    }

    try {
      // Execute code using Piston API (now allowed in actions)
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: runtime.language,
          version: runtime.version,
          files: [{ content: sessionCode }],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      let output = "";
      let error: string | null = null;

      // Handle API errors
      if (data.message) {
        error = data.message;
      }
      // Handle compile error
      else if (data.compile && data.compile.code !== 0) {
        error = data.compile.stderr || data.compile.output || "Compilation failed";
      }
      // Handle runtime error
      else if (data.run && data.run.code !== 0) {
        error = data.run.stderr || data.run.output || "Runtime error occurred";
      }
      // Success case
      else {
        output = data.run?.output || "";
      }

      // Store the execution result using ctx.runMutation
      await ctx.runMutation(api.collab.storeExecutionResult, {
        sessionRef: args.sessionId,
        output: output.trim(),
        error: error ?? undefined,
        executedBy: args.userId,
        executedAt: Date.now(),
      });

      return { success: true };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong while executing code.";

      // Store the error using ctx.runMutation
      await ctx.runMutation(api.collab.storeExecutionResult, {
        sessionRef: args.sessionId,
        output: "",
        error: errorMessage,
        executedBy: args.userId,
        executedAt: Date.now(),
      });

      return { success: true }; // Don't throw, just store the error
    }
  },
});
export const getCode = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const sessionCode = await ctx.db
      .query("sessionCodes")
      .withIndex("by_sessionRef", (q) => q.eq("sessionRef", args.sessionId))
      .unique();
    
    return sessionCode?.code || "";
  },
});
// NEW: Helper mutation to store execution results
export const storeExecutionResult = mutation({
  args: {
    sessionRef: v.id("sessions"),
    output: v.string(),
    error: v.optional(v.string()),
    executedBy: v.string(),
    executedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("sessionOutputs", {
      sessionRef: args.sessionRef,
      output: args.output,
      error: args.error,
      executedBy: args.executedBy,
      executedAt: args.executedAt,
    });
    return { success: true };
  },
});

export const getLatestOutput = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    // Get the most recent execution result
    const latestOutput = await ctx.db
      .query("sessionOutputs")
      .withIndex("by_sessionRef", (q) => q.eq("sessionRef", args.sessionId))
      .order("desc")
      .first();

    return latestOutput || null;
  },
});

export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    
    if (!session) {
      return null;
    }

    return session;
  },
});

export const updateTyping = mutation({
  args: {
    sessionId: v.id("sessions"),
    userId: v.string(),
    isTyping: v.boolean(),
  },
  handler: async (ctx, { sessionId, userId, isTyping }) => {
    await ctx.db.patch(sessionId, {
      // set typingUserId to the user who is typing, or clear it
      typingUserId: isTyping ? userId : undefined,
    });
    return { success: true };
  },
});

// 2. Include typingUserId in getActiveSession’s return:
export const getActiveSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || !session.isActive) return null;
    const sessionCode = await ctx.db
      .query("sessionCodes")
      .withIndex("by_sessionRef", (q) => q.eq("sessionRef", sessionId))
      .unique();
    return {
      ...session,
      currentCode: sessionCode?.code || "",
      typingUserId: session.typingUserId || null,
    };
  },
});


export const leaveRoom = mutation({
  args: { 
    sessionId: v.id("sessions"), 
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    
    if (!session) {
      throw new Error("Session not found");
    }

    // Remove user from collaborators
    const updatedCollaborators = session.collaboratorIds.filter(id => id !== args.userId);
    
    // Clear typing indicator if this user was typing
    const updateData: any = {
      collaboratorIds: updatedCollaborators,
    };
    
    if (session.typingUserId === args.userId) {
      updateData.typingUserId = undefined;
    }
    
    if (updatedCollaborators.length === 0) {
      // If no one left, deactivate the session
      updateData.isActive = false;
    }
    
    await ctx.db.patch(args.sessionId, updateData);

    return { success: true };
  },
});

export const deactivateSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      isActive: false,
    });
    return { success: true };
  },
});

// Clean up old inactive sessions (can be run periodically)
export const cleanupOldSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    const oldSessions = await ctx.db
      .query("sessions")
      .filter((q) => 
        q.and(
          q.eq(q.field("isActive"), false),
          q.lt(q.field("createdAt"), cutoffTime)
        )
      )
      .collect();

    // Delete old sessions and their associated code
    for (const session of oldSessions) {
      // Delete session codes first
      const sessionCodes = await ctx.db
        .query("sessionCodes")
        .withIndex("by_sessionRef", (q) => q.eq("sessionRef", session._id))
        .collect();
      
      for (const code of sessionCodes) {
        await ctx.db.delete(code._id);
      }
      
      // Delete the session
      await ctx.db.delete(session._id);
    }

    return { cleaned: oldSessions.length };
  },
});

export const getUsersByIds = query({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, { userIds }) => {
    // Build an `or` of eq(userId, …) for each ID in the array
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.or(
          ...userIds.map((id) => q.eq(q.field("userId"), id))
        )
      )
      .collect();

    return users.map((u) => ({ id: u.userId, name: u.name }));
  },
});
