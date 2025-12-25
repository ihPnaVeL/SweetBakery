import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get reviews for a product
export const getProductReviews = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .collect();

    // Get customer info for each review
    const reviewsWithCustomers = await Promise.all(
      reviews.map(async (review) => {
        const customer = await ctx.db.get(review.customerId);
        const customerProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", review.customerId))
          .first();

        return {
          ...review,
          customer: {
            ...customer,
            profile: customerProfile,
          },
        };
      })
    );

    return reviewsWithCustomers;
  },
});

// Create review (customers only, must have purchased the product)
export const createReview = mutation({
  args: {
    productId: v.id("products"),
    orderId: v.id("orders"),
    rating: v.number(),
    title: v.string(),
    comment: v.string(),
    images: v.optional(v.array(v.string())),
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

    if (!profile || profile.role !== "customer") {
      throw new Error("Only customers can write reviews");
    }

    // Verify the order belongs to the user and contains the product
    const order = await ctx.db.get(args.orderId);
    if (!order || order.customerId !== userId) {
      throw new Error("Order not found");
    }

    const orderItem = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (!orderItem) {
      throw new Error("Product not found in order");
    }

    // Check if review already exists
    const existingReview = await ctx.db
      .query("reviews")
      .withIndex("by_customer", (q) => q.eq("customerId", userId))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (existingReview) {
      throw new Error("Review already exists for this product");
    }

    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const reviewId = await ctx.db.insert("reviews", {
      productId: args.productId,
      customerId: userId,
      orderId: args.orderId,
      rating: args.rating,
      title: args.title,
      comment: args.comment,
      images: args.images || [],
      isVerifiedPurchase: true,
      helpfulVotes: 0,
    });

    return reviewId;
  },
});

// Update review
export const updateReview = mutation({
  args: {
    reviewId: v.id("reviews"),
    rating: v.optional(v.number()),
    title: v.optional(v.string()),
    comment: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review || review.customerId !== userId) {
      throw new Error("Review not found");
    }

    const { reviewId, ...updateData } = args;
    
    // Validate rating if provided
    if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    await ctx.db.patch(reviewId, updateData);
    return reviewId;
  },
});

// Delete review
export const deleteReview = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review || review.customerId !== userId) {
      throw new Error("Review not found");
    }

    await ctx.db.delete(args.reviewId);
    return args.reviewId;
  },
});
