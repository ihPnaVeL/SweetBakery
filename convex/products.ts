import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all products with pagination
export const getProducts = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let products;

    if (args.search) {
      products = await ctx.db
        .query("products")
        .withSearchIndex("search_products", (q) =>
          q.search("name", args.search!)
            .eq("isActive", true)
        )
        .take(args.limit || 20);
    } else if (args.categoryId) {
      products = await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
        .filter((q) => q.eq(q.field("isActive"), true))
        .order("desc")
        .take(args.limit || 20);
    } else {
      products = await ctx.db
        .query("products")
        .filter((q) => q.eq(q.field("isActive"), true))
        .order("desc")
        .take(args.limit || 20);
    }

    // Get category info for each product
    const productsWithCategories = await Promise.all(
      products.map(async (product) => {
        const category = await ctx.db.get(product.categoryId);
        return {
          ...product,
          category,
        };
      })
    );

    return productsWithCategories;
  },
});

// Get single product by ID
export const getProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || !product.isActive) {
      return null;
    }

    const category = await ctx.db.get(product.categoryId);
    
    // Get reviews for this product
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    return {
      ...product,
      category,
      reviews,
      averageRating,
      reviewCount: reviews.length,
    };
  },
});

// Create product (sellers and managers)
export const createProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    categoryId: v.id("categories"),
    images: v.array(v.string()),
    stock: v.number(),
    sku: v.string(),
    weight: v.optional(v.number()),
    dimensions: v.optional(v.object({
      length: v.number(),
      width: v.number(),
      height: v.number(),
    })),
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

    if (!profile || (profile.role !== "seller" && profile.role !== "manager")) {
      throw new Error("Access denied");
    }

    // Check if SKU already exists
    const existingProduct = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .first();

    if (existingProduct) {
      throw new Error("SKU already exists");
    }

    const productId = await ctx.db.insert("products", {
      ...args,
      sellerId: profile.role === "seller" ? userId : undefined,
      isActive: true,
    });

    // Log audit
    await ctx.db.insert("auditLogs", {
      userId,
      action: "CREATE_PRODUCT",
      resource: "products",
      resourceId: productId,
      details: {
        after: args,
      },
    });

    return productId;
  },
});

// Update product
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    images: v.optional(v.array(v.string())),
    stock: v.optional(v.number()),
    weight: v.optional(v.number()),
    dimensions: v.optional(v.object({
      length: v.number(),
      width: v.number(),
      height: v.number(),
    })),
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

    if (!profile || (profile.role !== "seller" && profile.role !== "manager")) {
      throw new Error("Access denied");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Sellers can only update their own products
    if (profile.role === "seller" && product.sellerId !== userId) {
      throw new Error("Access denied");
    }

    const { productId, ...updateData } = args;
    await ctx.db.patch(productId, updateData);

    // Log audit
    await ctx.db.insert("auditLogs", {
      userId,
      action: "UPDATE_PRODUCT",
      resource: "products",
      resourceId: productId,
      details: {
        before: product,
        after: updateData,
      },
    });

    return productId;
  },
});

// Delete product (soft delete)
export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile || (profile.role !== "seller" && profile.role !== "manager")) {
      throw new Error("Access denied");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Sellers can only delete their own products
    if (profile.role === "seller" && product.sellerId !== userId) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(args.productId, { isActive: false });

    // Log audit
    await ctx.db.insert("auditLogs", {
      userId,
      action: "DELETE_PRODUCT",
      resource: "products",
      resourceId: args.productId,
      details: {
        before: product,
      },
    });

    return args.productId;
  },
});
