import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

export const createSnippet = mutation({
    args: {
        title: v.string(),
        language: v.string(),
        code: v.string(),
        isPrivate: v.optional(v.boolean())
    },
    handler: async(ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if(!identity) {
           throw new ConvexError("Not Authenticated")
        }
        
        const user = await ctx.db
        .query("users")
        .withIndex("by_user_id")
        .filter((q) => q.eq(q.field("userId"), identity.subject))
        .first();

        if(!user) throw new ConvexError("User Not Found")
        
        const snippetId = await ctx.db.insert("snippets", {
            userId: identity.subject,
            userName: user.name,
            title: args.title,
            language: args.language,
            code: args.code,
            isPrivate: args.isPrivate ?? false // Default to false (public) if not provided
        });
        
        return snippetId;
    }
})

// Get all snippets with privacy filtering
export const getSnippets = query({
    args: {}, 
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        const snippets = await ctx.db.query("snippets").collect();
        
        // Filter out private snippets that don't belong to the current user
        return snippets.filter(snippet => {
            // If snippet is not private, it's always visible
            if (!snippet.isPrivate) return true;
            
            // If user is not authenticated, private snippets are not visible
            if (!identity) return false;
            
            // Private snippets are only visible to their owner
            return snippet.userId === identity.subject;
        });
    },
});

// Get only public snippets (for discovery/public feed)
export const getPublicSnippets = query({
    args: {},
    handler: async (ctx) => {
        const snippets = await ctx.db.query("snippets").collect();
        return snippets.filter(snippet => !snippet.isPrivate);
    }
});

// Get user's own snippets (both private and public)
export const getMySnippets = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        
        const snippets = await ctx.db
            .query("snippets")
            .withIndex("by_user_id")
            .filter((q) => q.eq(q.field("userId"), identity.subject))
            .collect();
        
        return snippets;
    }
});

// Get user's private snippets only
export const getMyPrivateSnippets = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        
        const snippets = await ctx.db
            .query("snippets")
            .withIndex("by_user_id")
            .filter((q) => q.eq(q.field("userId"), identity.subject))
            .collect();
        
        return snippets.filter(snippet => snippet.isPrivate);
    }
});

// Get user's public snippets only
export const getMyPublicSnippets = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        
        const snippets = await ctx.db
            .query("snippets")
            .withIndex("by_user_id")
            .filter((q) => q.eq(q.field("userId"), identity.subject))
            .collect();
        
        return snippets.filter(snippet => !snippet.isPrivate);
    }
});

// Get snippet by ID with privacy check
export const getSnippetById = query({
    args: { snippetId: v.id("snippets") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const snippet = await ctx.db.get(args.snippetId);
        
        if (!snippet) throw new ConvexError("Snippet not found");
        
        // Check if user has permission to view this snippet
        if (snippet.isPrivate && (!identity || snippet.userId !== identity.subject)) {
            throw new ConvexError("Not authorized to view this snippet");
        }
        
        return snippet;
    },
});

// Toggle snippet privacy (only owner can do this)
export const toggleSnippetPrivacy = mutation({
    args: {
        snippetId: v.id("snippets")
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError("Not Authenticated");
        
        const snippet = await ctx.db.get(args.snippetId);
        if (!snippet) throw new ConvexError("Snippet Not Found");
        
        // Only the owner can toggle privacy
        if (snippet.userId !== identity.subject) {
            throw new ConvexError("Not authorized to modify this snippet");
        }
        
        const newPrivacyState = !snippet.isPrivate;
        
        await ctx.db.patch(args.snippetId, {
            isPrivate: newPrivacyState
        });
        
        return newPrivacyState;
    }
});

// Delete snippet (enhanced with privacy awareness)
export const deleteSnippet = mutation({
    args: {
        snippetId: v.id("snippets")
    },
    handler: async(ctx, args) => {
        const identity = await ctx.auth.getUserIdentity()
        if(!identity) throw new ConvexError("Not Authenticated")
        
        const snippet = await ctx.db.get(args.snippetId)
        if(!snippet) throw new ConvexError("Snippet Not Found")

        // Only the owner can delete their snippet
        if(snippet.userId !== identity.subject) {
            throw new ConvexError("Not authorized to delete this snippet")
        }

        // Delete all related comments
        const comments = await ctx.db
        .query("snippetComments")
        .withIndex("by_snippet_id")
        .filter((q) => q.eq(q.field("snippetId"), args.snippetId))
        .collect();

        for(const comment of comments) {
            await ctx.db.delete(comment._id);
        }

        // Delete all related stars
        const stars = await ctx.db
        .query("stars")
        .withIndex("by_snippet_id")
        .filter((q) => q.eq(q.field("snippetId"), args.snippetId))
        .collect();

        for(const star of stars) {
            await ctx.db.delete(star._id);
        }

        // Delete the snippet itself
        await ctx.db.delete(args.snippetId)
    }
})

// Star/unstar snippet (with privacy check)
export const starSnippet = mutation({
    args: {
      snippetId: v.id("snippets"),
    },
    handler: async (ctx, args) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new ConvexError("Not authenticated");
      
      const snippet = await ctx.db.get(args.snippetId);
      if (!snippet) throw new ConvexError("Snippet not found");
      
      // Check if user can star this snippet (can't star private snippets of others)
      if (snippet.isPrivate && snippet.userId !== identity.subject) {
        throw new ConvexError("Cannot star private snippets");
      }
  
      const existing = await ctx.db
        .query("stars")
        .withIndex("by_user_id_and_snippet_id")
        .filter(
          (q) =>
            q.eq(q.field("userId"), identity.subject) && 
            q.eq(q.field("snippetId"), args.snippetId)
        )
        .first();
  
      if (existing) {
        await ctx.db.delete(existing._id);
        return false; // Unstarred
      } else {
        await ctx.db.insert("stars", {
          userId: identity.subject,
          snippetId: args.snippetId,
        });
        return true; // Starred
      }
    },
});

// Check if snippet is starred by current user
export const isSnippetStarred = query({
    args: {
        snippetId: v.id("snippets")
    },
    handler: async(ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if(!identity) return false;

        const star = await ctx.db
        .query("stars")
        .withIndex("by_user_id_and_snippet_id")
        .filter((q) => 
            q.eq(q.field("userId"), identity.subject) && 
            q.eq(q.field("snippetId"), args.snippetId)
        ).first()

        return !!star;
    }
});

// Get snippet star count
export const getSnippetStars = query({
    args: {
        snippetId: v.id("snippets")
    }, 
    handler: async(ctx, args) => {
        const stars = await ctx.db
        .query("stars")
        .withIndex("by_snippet_id")
        .filter((q) => q.eq(q.field("snippetId"), args.snippetId))
        .collect();
        
        return stars.length;
    }
})

// Get starred snippets for current user
export const getStarredSnippets = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const stars = await ctx.db
      .query("stars")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const snippets = await Promise.all(
      stars.map((star) =>
        ctx.db.get(star.snippetId as Id<"snippets">)
      )
    );

    // Filter out null snippets and private snippets the user doesn't own
    return snippets.filter((snippet): snippet is NonNullable<typeof snippet> => {
      if (!snippet) return false;
      
      // If snippet is private, only show if user owns it
      if (snippet.isPrivate && snippet.userId !== identity.subject) {
        return false;
      }
      
      return true;
    });
  },
});

// Add comment to snippet (with privacy check)
export const addComment = mutation({
  args: {
    snippetId: v.id("snippets"),
    content: v.string(),
  }, 
  handler: async(ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if(!identity) throw new ConvexError("Not Authenticated")

    const snippet = await ctx.db.get(args.snippetId);
    if (!snippet) throw new ConvexError("Snippet not found");
    
    // Check if user can comment on this snippet
    if (snippet.isPrivate && snippet.userId !== identity.subject) {
      throw new ConvexError("Cannot comment on private snippets");
    }

    const user = await ctx.db
    .query("users")
    .withIndex("by_user_id")
    .filter((q) => q.eq(q.field("userId"), identity.subject))
    .first()
    
    if(!user) throw new ConvexError("User Not Found")
    
    return await ctx.db.insert("snippetComments", {
      snippetId: args.snippetId,
      userId: identity.subject,
      userName: user.name,
      content: args.content
    });
  }
})

// Delete comment
export const deleteComment = mutation({
  args: { commentId: v.id("snippetComments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new ConvexError("Comment not found");

    // Check if the user is the comment author
    if (comment.userId !== identity.subject) {
      throw new ConvexError("Not authorized to delete this comment");
    }

    await ctx.db.delete(args.commentId);
  },
});

// Get comments for a snippet
export const getComments = query({
  args: { snippetId: v.id("snippets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const snippet = await ctx.db.get(args.snippetId);
    
    if (!snippet) throw new ConvexError("Snippet not found");
    
    // Check if user can view comments (same privacy rules as viewing snippet)
    if (snippet.isPrivate && (!identity || snippet.userId !== identity.subject)) {
      throw new ConvexError("Not authorized to view comments");
    }

    const comments = await ctx.db
      .query("snippetComments")
      .withIndex("by_snippet_id", (q) =>
        q.eq("snippetId", args.snippetId)
      )
      .order("desc")
      .collect();

    return comments;
  },
});
