import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    userId: v.string(), // clerkId
    email: v.string(),
    name: v.string(),
    isPro: v.boolean(),
    proSince: v.optional(v.number()),
    lemonSqueezyCustomerId: v.optional(v.string()),
    lemonSqueezyOrderId: v.optional(v.string()),
  }).index("by_user_id", ["userId"]),
 
  codeExecutions: defineTable({
    userId: v.string(),
    language: v.string(),
    code: v.string(),
    output: v.optional(v.union(v.string(), v.null())),
    error: v.optional(v.union(v.string(), v.null())),
  }).index("by_user_id", ["userId"]),
 
  snippets: defineTable({
    userId: v.string(),
    title: v.string(),
    language: v.string(),
    code: v.string(),
    userName: v.string(), // store user'v name for easy access
    isPrivate: v.optional(v.boolean()), // Changed from v.boolean() to v.optional(v.boolean())
  }).index("by_user_id", ["userId"]),

  snippetComments: defineTable({
    snippetId: v.id("snippets"),
    userId: v.string(),
    userName: v.string(),
    content: v.string(), // This will store HTML content
  }).index("by_snippet_id", ["snippetId"]),

  stars: defineTable({
    userId: v.string(),
    snippetId: v.id("snippets"),
  })
    .index("by_user_id", ["userId"])
    .index("by_snippet_id", ["snippetId"])
    .index("by_user_id_and_snippet_id", ["userId", "snippetId"]),

    sessions: defineTable({
    ownerId: v.string(),
    collaboratorIds: v.array(v.string()),
    createdAt: v.number(),
    isActive: v.boolean(),
    typingUserId: v.optional(v.string()),
  }),
  
  sessionCodes: defineTable({
    sessionRef: v.id("sessions"),
    code: v.string(),
    updatedAt: v.number(),
  }).index("by_sessionRef", ["sessionRef"]),
  
  // Optional: For tracking real-time execution results
  sessionOutputs: defineTable({
    sessionRef: v.id("sessions"),
    output: v.string(),
    error: v.optional(v.string()),
    executedBy: v.string(),
    executedAt: v.number(),
  }).index("by_sessionRef", ["sessionRef"]),

 videoCalls: defineTable({
    sessionId: v.id("sessions"),
    callId: v.string(),
    isActive: v.boolean(),
    participants: v.array(v.object({
      userId: v.string(),
      userName: v.string(),
      isVideoOn: v.boolean(),
      isAudioOn: v.boolean(),
      joinedAt: v.number(),
    })),
    createdAt: v.number(),
    createdBy: v.string(),
  }).index("by_session_id", ["sessionId"]),

  githubTokens: defineTable({
    userId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    githubUsername: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]),

});