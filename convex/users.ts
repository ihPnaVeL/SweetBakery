import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create user profile after registration
export const createProfile = mutation({
  args: {
    role: v.union(v.literal("customer"), v.literal("seller"), v.literal("manager")),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    employeeId: v.optional(v.string()),
    department: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      throw new Error("Profile already exists");
    }

    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      role: args.role,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      employeeId: args.employeeId,
      department: args.department,
      isActive: true,
      hireDate: args.role !== "customer" ? Date.now() : undefined,
    });

    return profileId;
  },
});

// Get current user profile
export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return profile;
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      ...args,
    });

    return profile._id;
  },
});

// Get users by role (for managers)
export const getUsersByRole = query({
  args: {
    role: v.union(v.literal("customer"), v.literal("seller"), v.literal("manager")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const currentProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!currentProfile || currentProfile.role !== "manager") {
      throw new Error("Access denied");
    }

    const profiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();

    // Get user details for each profile
    const usersWithProfiles = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          ...profile,
          user,
        };
      })
    );

    return usersWithProfiles;
  },
});
