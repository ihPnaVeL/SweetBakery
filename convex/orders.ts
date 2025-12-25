import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Generate order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp.slice(-6)}${random}`;
}

// Create order from cart
export const createOrder = mutation({
  args: {
    shippingAddress: v.object({
      firstName: v.string(),
      lastName: v.string(),
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.string(),
      phone: v.optional(v.string()),
    }),
    paymentMethod: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get cart items
    const cartItems = await ctx.db
      .query("cart")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // Calculate totals and validate stock
    let subtotal = 0;
    const orderItems = [];

    for (const cartItem of cartItems) {
      const product = await ctx.db.get(cartItem.productId);
      if (!product || !product.isActive) {
        throw new Error(`Product ${cartItem.productId} not found`);
      }

      if (cartItem.quantity > product.stock) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const itemTotal = product.price * cartItem.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        price: product.price,
        productName: product.name,
        productImage: product.images[0] || undefined,
      });
    }

    const tax = subtotal * 0.1; // 10% tax
    const shipping = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const total = subtotal + tax + shipping;

    // Create order
    const orderId = await ctx.db.insert("orders", {
      customerId: userId,
      orderNumber: generateOrderNumber(),
      status: "pending",
      subtotal,
      tax,
      shipping,
      total,
      shippingAddress: args.shippingAddress,
      paymentMethod: args.paymentMethod,
      paymentStatus: "pending",
      notes: args.notes,
    });

    // Create order items
    for (const item of orderItems) {
      await ctx.db.insert("orderItems", {
        orderId,
        ...item,
      });

      // Update product stock
      const product = await ctx.db.get(item.productId);
      if (product) {
        await ctx.db.patch(item.productId, {
          stock: product.stock - item.quantity,
        });
      }
    }

    // Clear cart
    for (const cartItem of cartItems) {
      await ctx.db.delete(cartItem._id);
    }

    // Log audit
    await ctx.db.insert("auditLogs", {
      userId,
      action: "CREATE_ORDER",
      resource: "orders",
      resourceId: orderId,
      details: {
        after: { orderId, total, itemCount: orderItems.length },
      },
    });

    return orderId;
  },
});

// Get user's orders
export const getUserOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", userId))
      .order("desc")
      .collect();

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();
        return {
          ...order,
          items,
        };
      })
    );

    return ordersWithItems;
  },
});

// Get single order
export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Check access permissions
    const canAccess = 
      order.customerId === userId || // Customer can see their own orders
      (profile?.role === "seller" && order.sellerId === userId) || // Seller can see assigned orders
      profile?.role === "manager"; // Manager can see all orders

    if (!canAccess) {
      throw new Error("Access denied");
    }

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    return {
      ...order,
      items,
    };
  },
});

// Update order status (sellers and managers)
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("refunded")
    ),
    trackingNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
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

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Sellers can only update orders assigned to them
    if (profile.role === "seller" && order.sellerId !== userId) {
      throw new Error("Access denied");
    }

    const updateData: any = {
      status: args.status,
    };

    if (args.trackingNumber) {
      updateData.trackingNumber = args.trackingNumber;
    }

    if (args.notes) {
      updateData.notes = args.notes;
    }

    // Assign seller if not already assigned and status is confirmed
    if (!order.sellerId && args.status === "confirmed" && profile.role === "seller") {
      updateData.sellerId = userId;
    }

    await ctx.db.patch(args.orderId, updateData);

    // Log audit
    await ctx.db.insert("auditLogs", {
      userId,
      action: "UPDATE_ORDER_STATUS",
      resource: "orders",
      resourceId: args.orderId,
      details: {
        before: { status: order.status },
        after: { status: args.status },
      },
    });

    return args.orderId;
  },
});

// Get all orders (for sellers and managers)
export const getAllOrders = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("refunded")
    )),
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

    let orders;

    if (args.status) {
      orders = await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      orders = await ctx.db.query("orders").order("desc").collect();
    }

    // Sellers only see their assigned orders or unassigned orders
    if (profile.role === "seller") {
      orders = orders.filter(order => 
        order.sellerId === userId || 
        (!order.sellerId && order.status === "pending")
      );
    }

    // Get order items and customer info
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .collect();

        const customer = await ctx.db.get(order.customerId);
        const customerProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", order.customerId))
          .first();

        return {
          ...order,
          items,
          customer: {
            ...customer,
            profile: customerProfile,
          },
        };
      })
    );

    return ordersWithDetails;
  },
});
