// convex/github.ts
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

export const storeGitHubToken = mutation({
  args: {
    userId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    githubUsername: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already has a token
    const existingToken = await ctx.db
      .query("githubTokens")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    const now = Date.now();

    if (existingToken) {
      // Update existing token
      await ctx.db.patch(existingToken._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        githubUsername: args.githubUsername,
        updatedAt: now,
      });
    } else {
      // Create new token record
      await ctx.db.insert("githubTokens", {
        userId: args.userId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        githubUsername: args.githubUsername,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const getGitHubToken = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const tokenRecord = await ctx.db
      .query("githubTokens")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!tokenRecord) {
      return null;
    }

    return {
      accessToken: tokenRecord.accessToken,
      refreshToken: tokenRecord.refreshToken,
      githubUsername: tokenRecord.githubUsername,
    };
  },
});

// Remove GitHub token (disconnect)
export const removeGitHubToken = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const tokenRecord = await ctx.db
      .query("githubTokens")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (tokenRecord) {
      await ctx.db.delete(tokenRecord._id);
    }
  },
});

export const fetchGitHubRepos: ReturnType<typeof action> = action({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get the token using the query
    const tokenRecord = await ctx.runQuery(api.github.getGitHubToken, { userId: args.userId });

    if (!tokenRecord) {
      throw new Error("GitHub not connected");
    }

    try {
      const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
        headers: {
          Authorization: `Bearer ${tokenRecord.accessToken}`,
          "User-Agent": "CoderCraft-App",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const repos = await response.json();
      return repos.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        updated_at: repo.updated_at,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
      }));
    } catch (error) {
      console.error("Error fetching GitHub repos:", error);
      throw new Error("Failed to fetch repositories");
    }
  },
});

// Helper function to check if a file is likely to be text-based
function isTextFile(filename: string): boolean {
  const textExtensions = [
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
    '.html', '.css', '.scss', '.sass', '.less', '.php', '.rb', '.go', '.rs', 
    '.kt', '.swift', '.cs', '.sh', '.bash', '.zsh', '.fish', '.md', '.txt', 
    '.json', '.xml', '.yaml', '.yml', '.sql', '.r', '.scala', '.clj', '.elm', 
    '.hs', '.ml', '.vim', '.lua', '.pl', '.pm', '.tcl', '.awk', '.sed', '.ini',
    '.cfg', '.conf', '.toml', '.env', '.gitignore', '.dockerignore', '.editorconfig',
    '.eslintrc', '.prettierrc', '.babelrc', '.nvmrc', '.gitattributes', '.htaccess'
  ];
  
  const lowerFilename = filename.toLowerCase();
  return textExtensions.some(ext => lowerFilename.endsWith(ext)) || 
         lowerFilename.includes('readme') || 
         lowerFilename.includes('license') ||
         lowerFilename.includes('changelog') ||
         lowerFilename.includes('dockerfile') ||
         lowerFilename.includes('makefile');
}

// Browser-compatible base64 decoding function
function safeDecodeBase64(base64Content: string, filename: string): string {
  try {
    // First check if it's a text file
    if (!isTextFile(filename)) {
      throw new Error(`File "${filename}" appears to be binary and cannot be displayed as text`);
    }

    // Remove any whitespace from base64 content
    const cleanBase64 = base64Content.replace(/\s/g, '');
    
    // Check if the base64 content is too large (> 1MB when decoded)
    // Each base64 character represents 6 bits, so 4 chars = 3 bytes
    const estimatedSize = (cleanBase64.length * 3) / 4;
    if (estimatedSize > 1024 * 1024) {
      throw new Error(`File "${filename}" is too large to display (${(estimatedSize / 1024 / 1024).toFixed(2)}MB > 1MB)`);
    }

    // Use atob() for base64 decoding (browser-compatible)
    let binaryString: string;
    try {
      binaryString = atob(cleanBase64);
    } catch (error) {
      throw new Error(`Failed to decode base64 content for file "${filename}"`);
    }

    // Convert binary string to UTF-8 string
    // This is a simplified approach that works for most text files
    let content: string;
    try {
      // Try to decode as UTF-8
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Use TextDecoder for proper UTF-8 decoding
      const decoder = new TextDecoder('utf-8', { fatal: true });
      content = decoder.decode(bytes);
    } catch (error) {
      // If UTF-8 decoding fails, try as latin-1 (fallback)
      try {
        const decoder = new TextDecoder('latin-1');
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        content = decoder.decode(bytes);
      } catch (fallbackError) {
        throw new Error(`File "${filename}" contains invalid text encoding`);
      }
    }

    // Basic check for binary content by looking for null bytes
    if (content.includes('\0')) {
      throw new Error(`File "${filename}" contains binary data and cannot be displayed as text`);
    }

    // Additional check for too many non-printable characters
    const nonPrintableCount = (content.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) || []).length;
    const nonPrintableRatio = nonPrintableCount / content.length;
    if (nonPrintableRatio > 0.1) { // If more than 10% are non-printable
      throw new Error(`File "${filename}" contains too many non-printable characters and might be binary`);
    }

    return content;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to decode file "${filename}" - it might be binary or corrupted`);
  }
}

export const fetchGitHubFile: ReturnType<typeof action> = action({
  args: {
    userId: v.string(),
    repo: v.string(),
    path: v.string(),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tokenRecord = await ctx.runQuery(api.github.getGitHubToken, { userId: args.userId });

    if (!tokenRecord) {
      throw new Error("GitHub not connected");
    }

    try {
      // First, get the default branch if no branch is specified
      let branchToUse = args.branch;
      
      if (!branchToUse) {
        // Get repository info to find the default branch
        const repoResponse = await fetch(`https://api.github.com/repos/${args.repo}`, {
          headers: {
            Authorization: `Bearer ${tokenRecord.accessToken}`,
            "User-Agent": "CoderCraft-App",
          },
        });

        if (repoResponse.ok) {
          const repoData = await repoResponse.json();
          branchToUse = repoData.default_branch || "main";
        } else {
          branchToUse = "main"; // fallback
        }
      }

      // Now fetch the file content
      const url = `https://api.github.com/repos/${args.repo}/contents/${encodeURIComponent(args.path)}?ref=${branchToUse}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenRecord.accessToken}`,
          "User-Agent": "CoderCraft-App",
          "Accept": "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 404) {
          throw new Error(`File not found: ${args.path}`);
        } else if (response.status === 403) {
          throw new Error("GitHub API rate limit exceeded or insufficient permissions");
        } else {
          throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }
      }

      const fileData = await response.json();
      
      if (fileData.type !== "file") {
        throw new Error(`Path "${args.path}" is not a file`);
      }

      if (!fileData.content) {
        throw new Error("File content is empty or unavailable");
      }

      // Extract filename from path
      const filename = args.path.split('/').pop() || args.path;
      
      // Safely decode the base64 content using browser-compatible method
      const content = safeDecodeBase64(fileData.content, filename);
      
      return {
        content,
        sha: fileData.sha,
        size: fileData.size,
        name: fileData.name,
        path: fileData.path,
        download_url: fileData.download_url,
        encoding: fileData.encoding,
      };
    } catch (error) {
      console.error("Error fetching GitHub file:", error);
      // Re-throw with more specific error message
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error("Failed to fetch file from GitHub");
      }
    }
  },
});

export const saveToGitHub: ReturnType<typeof action> = action({
  args: {
    userId: v.string(),
    repo: v.string(),
    path: v.string(),
    content: v.string(),
    message: v.string(),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tokenRecord = await ctx.runQuery(api.github.getGitHubToken, { userId: args.userId });

    if (!tokenRecord) {
      throw new Error("GitHub not connected");
    }

    try {
      // Get the default branch if not specified
      let branchToUse = args.branch;
      
      if (!branchToUse) {
        const repoResponse = await fetch(`https://api.github.com/repos/${args.repo}`, {
          headers: {
            Authorization: `Bearer ${tokenRecord.accessToken}`,
            "User-Agent": "CoderCraft-App",
          },
        });

        if (repoResponse.ok) {
          const repoData = await repoResponse.json();
          branchToUse = repoData.default_branch || "main";
        } else {
          branchToUse = "main";
        }
      }
      
      // First, try to get the existing file to get its SHA
      let existingFileSha = null;
      try {
        const existingFileResponse = await fetch(
          `https://api.github.com/repos/${args.repo}/contents/${encodeURIComponent(args.path)}?ref=${branchToUse}`,
          {
            headers: {
              Authorization: `Bearer ${tokenRecord.accessToken}`,
              "User-Agent": "CoderCraft-App",
            },
          }
        );

        if (existingFileResponse.ok) {
          const existingFile = await existingFileResponse.json();
          existingFileSha = existingFile.sha;
        }
      } catch (error) {
        // File doesn't exist, which is fine for new files
      }

      // Browser-compatible base64 encoding
      let base64Content: string;
      try {
        // Use btoa() for base64 encoding (browser-compatible)
        base64Content = btoa(unescape(encodeURIComponent(args.content)));
      } catch (error) {
        throw new Error("Failed to encode file content");
      }

      // Create or update the file
      const requestBody = {
        message: args.message,
        content: base64Content,
        branch: branchToUse,
        ...(existingFileSha && { sha: existingFileSha }),
      };

      const response = await fetch(
        `https://api.github.com/repos/${args.repo}/contents/${encodeURIComponent(args.path)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${tokenRecord.accessToken}`,
            "User-Agent": "CoderCraft-App",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API error: ${errorData.message || response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        sha: result.content.sha,
        url: result.content.html_url,
        commit: result.commit,
      };
    } catch (error) {
      console.error("Error saving to GitHub:", error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error("Failed to save file to GitHub");
      }
    }
  },
});

export const fetchRepoContents: ReturnType<typeof action> = action({
  args: {
    userId: v.string(),
    repo: v.string(),
    path: v.optional(v.string()),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tokenRecord = await ctx.runQuery(api.github.getGitHubToken, { userId: args.userId });

    if (!tokenRecord) {
      throw new Error("GitHub not connected");
    }

    try {
      const branch = args.branch || "main";
      const path = args.path || "";
      const url = `https://api.github.com/repos/${args.repo}/contents/${path}?ref=${branch}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenRecord.accessToken}`,
          "User-Agent": "CoderCraft-App",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const contents = await response.json();
      
      // Filter and format the contents
      const filteredContents = contents.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type, // 'file' or 'dir'
        size: item.size,
        sha: item.sha,
        download_url: item.download_url,
        isTextFile: item.type === 'file' ? isTextFile(item.name) : false,
      }));

      // Sort: directories first, then files, both alphabetically
      return filteredContents.sort((a: any, b: any) => {
        if (a.type !== b.type) {
          return a.type === 'dir' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error("Error fetching repo contents:", error);
      throw new Error("Failed to fetch repository contents");
    }
  },
});

// Check GitHub connection status
export const checkGitHubConnection = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const tokenRecord = await ctx.db
      .query("githubTokens")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!tokenRecord) {
      return { connected: false };
    }

    // Return connection status immediately
    return { 
      connected: true, 
      username: tokenRecord.githubUsername,
      lastUpdated: tokenRecord.updatedAt
    };
  },
});

// Add a separate mutation for validating token if needed
export const validateGitHubToken = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const tokenRecord = await ctx.db
      .query("githubTokens")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!tokenRecord) {
      return { valid: false };
    }

    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenRecord.accessToken}`,
          "User-Agent": "CoderCraft-App",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Update username if it changed
        if (userData.login !== tokenRecord.githubUsername) {
          await ctx.db.patch(tokenRecord._id, {
            githubUsername: userData.login,
            updatedAt: Date.now(),
          });
        }
        
        return { 
          valid: true, 
          username: userData.login 
        };
      } else {
        // Token is invalid, remove it
        await ctx.db.delete(tokenRecord._id);
        return { valid: false };
      }
    } catch (error) {
      console.error("Error validating GitHub token:", error);
      return { valid: false };
    }
  },
});