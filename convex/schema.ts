import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Categories table
  categories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    isActive: v.boolean(),
  }),

  // Products table
  products: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    categoryId: v.id("categories"),
    images: v.array(v.string()),
    stock: v.number(),
    isActive: v.boolean(),
    sellerId: v.optional(v.id("users")),
    sku: v.string(),
    weight: v.optional(v.number()),
    dimensions: v.optional(v.object({
      length: v.number(),
      width: v.number(),
      height: v.number(),
    })),
  })
    .index("by_category", ["categoryId"])
    .index("by_seller", ["sellerId"])
    .index("by_sku", ["sku"])
    .searchIndex("search_products", {
      searchField: "name",
      filterFields: ["categoryId", "isActive"],
    }),

  // User profiles (extends auth users)
  userProfiles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("customer"), v.literal("seller"), v.literal("manager")),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    isActive: v.boolean(),
    // Seller specific fields
    employeeId: v.optional(v.string()),
    department: v.optional(v.string()),
    hireDate: v.optional(v.number()),
    salary: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_role", ["role"])
    .index("by_employee_id", ["employeeId"]),

  // Addresses
  addresses: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("shipping"), v.literal("billing")),
    firstName: v.string(),
    lastName: v.string(),
    street: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    country: v.string(),
    phone: v.optional(v.string()),
    isDefault: v.boolean(),
  })
    .index("by_user", ["userId"]),

  // Shopping cart
  cart: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    quantity: v.number(),
    addedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_product", ["productId"]),

  // Orders
  orders: defineTable({
    customerId: v.id("users"),
    sellerId: v.optional(v.id("users")),
    orderNumber: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("refunded")
    ),
    subtotal: v.number(),
    tax: v.number(),
    shipping: v.number(),
    total: v.number(),
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
    paymentStatus: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    notes: v.optional(v.string()),
    estimatedDelivery: v.optional(v.number()),
    trackingNumber: v.optional(v.string()),
  })
    .index("by_customer", ["customerId"])
    .index("by_seller", ["sellerId"])
    .index("by_status", ["status"])
    .index("by_order_number", ["orderNumber"]),

  // Order items
  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    quantity: v.number(),
    price: v.number(),
    productName: v.string(),
    productImage: v.optional(v.string()),
  })
    .index("by_order", ["orderId"])
    .index("by_product", ["productId"]),

  // Reviews
  reviews: defineTable({
    productId: v.id("products"),
    customerId: v.id("users"),
    orderId: v.id("orders"),
    rating: v.number(),
    title: v.string(),
    comment: v.string(),
    images: v.optional(v.array(v.string())),
    isVerifiedPurchase: v.boolean(),
    helpfulVotes: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_customer", ["customerId"])
    .index("by_order", ["orderId"]),

  // Wishlist
  wishlist: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    addedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_product", ["productId"]),

  // Work schedules
  workSchedules: defineTable({
    sellerId: v.id("users"),
    date: v.string(), // YYYY-MM-DD format
    shiftType: v.union(v.literal("morning"), v.literal("afternoon"), v.literal("evening"), v.literal("night")),
    startTime: v.string(), // HH:MM format
    endTime: v.string(), // HH:MM format
    status: v.union(v.literal("scheduled"), v.literal("completed"), v.literal("absent"), v.literal("cancelled")),
    assignedBy: v.id("users"), // Manager who assigned the shift
    notes: v.optional(v.string()),
  })
    .index("by_seller", ["sellerId"])
    .index("by_date", ["date"])
    .index("by_assigned_by", ["assignedBy"]),

  // Audit logs
  auditLogs: defineTable({
    userId: v.id("users"),
    action: v.string(),
    resource: v.string(),
    resourceId: v.optional(v.string()),
    details: v.optional(v.object({
      before: v.optional(v.any()),
      after: v.optional(v.any()),
      metadata: v.optional(v.any()),
    })),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_action", ["action"])
    .index("by_resource", ["resource"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("order_update"),
      v.literal("product_update"),
      v.literal("schedule_update"),
      v.literal("system_alert")
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    data: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_read_status", ["isRead"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
