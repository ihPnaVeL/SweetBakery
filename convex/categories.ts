import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all active categories
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("asc")
      .collect();
  },
});

// Create category (managers only)
export const createCategory = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
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

    if (!profile || profile.role !== "manager") {
      throw new Error("Access denied");
    }

    const categoryId = await ctx.db.insert("categories", {
      ...args,
      isActive: true,
    });

    // Log audit
    await ctx.db.insert("auditLogs", {
      userId,
      action: "CREATE_CATEGORY",
      resource: "categories",
      resourceId: categoryId,
      details: {
        after: args,
      },
    });

    return categoryId;
  },
});

// Update category (managers only)
export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
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

    if (!profile || profile.role !== "manager") {
      throw new Error("Access denied");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    const { categoryId, ...updateData } = args;
    await ctx.db.patch(categoryId, updateData);

    // Log audit
    await ctx.db.insert("auditLogs", {
      userId,
      action: "UPDATE_CATEGORY",
      resource: "categories",
      resourceId: categoryId,
      details: {
        before: category,
        after: updateData,
      },
    });

    return categoryId;
  },
});
