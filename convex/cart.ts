import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get user's cart
export const getCart = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const cartItems = await ctx.db
      .query("cart")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get product details for each cart item
    const cartWithProducts = await Promise.all(
      cartItems.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product,
        };
      })
    );

    return cartWithProducts.filter(item => item.product && item.product.isActive);
  },
});

// Add item to cart
export const addToCart = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const product = await ctx.db.get(args.productId);
    if (!product || !product.isActive) {
      throw new Error("Product not found");
    }

    if (args.quantity > product.stock) {
      throw new Error("Insufficient stock");
    }

    // Check if item already exists in cart
    const existingItem = await ctx.db
      .query("cart")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (existingItem) {
      const newQuantity = existingItem.quantity + args.quantity;
      if (newQuantity > product.stock) {
        throw new Error("Insufficient stock");
      }
      await ctx.db.patch(existingItem._id, { quantity: newQuantity });
      return existingItem._id;
    } else {
      return await ctx.db.insert("cart", {
        userId,
        productId: args.productId,
        quantity: args.quantity,
        addedAt: Date.now(),
      });
    }
  },
});

// Update cart item quantity
export const updateCartItem = mutation({
  args: {
    cartItemId: v.id("cart"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const cartItem = await ctx.db.get(args.cartItemId);
    if (!cartItem || cartItem.userId !== userId) {
      throw new Error("Cart item not found");
    }

    const product = await ctx.db.get(cartItem.productId);
    if (!product || !product.isActive) {
      throw new Error("Product not found");
    }

    if (args.quantity > product.stock) {
      throw new Error("Insufficient stock");
    }

    if (args.quantity <= 0) {
      await ctx.db.delete(args.cartItemId);
      return null;
    }

    await ctx.db.patch(args.cartItemId, { quantity: args.quantity });
    return args.cartItemId;
  },
});

// Remove item from cart
export const removeFromCart = mutation({
  args: { cartItemId: v.id("cart") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const cartItem = await ctx.db.get(args.cartItemId);
    if (!cartItem || cartItem.userId !== userId) {
      throw new Error("Cart item not found");
    }

    await ctx.db.delete(args.cartItemId);
    return args.cartItemId;
  },
});

// Clear cart
export const clearCart = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const cartItems = await ctx.db
      .query("cart")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    await Promise.all(
      cartItems.map(item => ctx.db.delete(item._id))
    );

    return true;
  },
});
