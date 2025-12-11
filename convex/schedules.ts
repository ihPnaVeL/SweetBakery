import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get work schedules for a seller
export const getSellerSchedules = query({
  args: {
    sellerId: v.optional(v.id("users")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
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

    // Determine which seller's schedule to get
    let targetSellerId = args.sellerId;
    
    if (profile.role === "seller") {
      // Sellers can only see their own schedule
      targetSellerId = userId;
    } else if (profile.role === "manager") {
      // Managers can see any seller's schedule
      if (!targetSellerId) {
        throw new Error("Seller ID required for managers");
      }
    } else {
      throw new Error("Access denied");
    }

    let query = ctx.db
      .query("workSchedules")
      .withIndex("by_seller", (q) => q.eq("sellerId", targetSellerId));

    const schedules = await query.collect();

    // Filter by date range if provided
    let filteredSchedules = schedules;
    if (args.startDate || args.endDate) {
      filteredSchedules = schedules.filter(schedule => {
        if (args.startDate && schedule.date < args.startDate) return false;
        if (args.endDate && schedule.date > args.endDate) return false;
        return true;
      });
    }

    // Get assigner info for each schedule
    const schedulesWithAssigners = await Promise.all(
      filteredSchedules.map(async (schedule) => {
        const assigner = await ctx.db.get(schedule.assignedBy);
        const assignerProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", schedule.assignedBy))
          .first();

        return {
          ...schedule,
          assigner: {
            ...assigner,
            profile: assignerProfile,
          },
        };
      })
    );

    return schedulesWithAssigners;
  },
});

// Create work schedule (managers only)
export const createSchedule = mutation({
  args: {
    sellerId: v.id("users"),
    date: v.string(),
    shiftType: v.union(v.literal("morning"), v.literal("afternoon"), v.literal("evening"), v.literal("night")),
    startTime: v.string(),
    endTime: v.string(),
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

    if (!profile || profile.role !== "manager") {
      throw new Error("Access denied");
    }

    // Verify the seller exists and is active
    const sellerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.sellerId))
      .first();

    if (!sellerProfile || sellerProfile.role !== "seller" || !sellerProfile.isActive) {
      throw new Error("Seller not found or inactive");
    }

    // Check for existing schedule on the same date
    const existingSchedule = await ctx.db
      .query("workSchedules")
      .withIndex("by_seller", (q) => q.eq("sellerId", args.sellerId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .first();

    if (existingSchedule) {
      throw new Error("Schedule already exists for this date");
    }

    const scheduleId = await ctx.db.insert("workSchedules", {
      sellerId: args.sellerId,
      date: args.date,
      shiftType: args.shiftType,
      startTime: args.startTime,
      endTime: args.endTime,
      status: "scheduled",
      assignedBy: userId,
      notes: args.notes,
    });

    // Log audit
    await ctx.db.insert("auditLogs", {
      userId,
      action: "CREATE_SCHEDULE",
      resource: "workSchedules",
      resourceId: scheduleId,
      details: {
        after: args,
      },
    });

    return scheduleId;
  },
});

// Update schedule status
export const updateScheduleStatus = mutation({
  args: {
    scheduleId: v.id("workSchedules"),
    status: v.union(v.literal("scheduled"), v.literal("completed"), v.literal("absent"), v.literal("cancelled")),
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

    if (!profile) {
      throw new Error("Profile not found");
    }

    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule) {
      throw new Error("Schedule not found");
    }

    // Check permissions
    const canUpdate = 
      profile.role === "manager" || // Managers can update any schedule
      (profile.role === "seller" && schedule.sellerId === userId); // Sellers can update their own

    if (!canUpdate) {
      throw new Error("Access denied");
    }

    const updateData: any = {
      status: args.status,
    };

    if (args.notes) {
      updateData.notes = args.notes;
    }

    await ctx.db.patch(args.scheduleId, updateData);

    // Log audit
    await ctx.db.insert("auditLogs", {
      userId,
      action: "UPDATE_SCHEDULE_STATUS",
      resource: "workSchedules",
      resourceId: args.scheduleId,
      details: {
        before: { status: schedule.status },
        after: { status: args.status },
      },
    });

    return args.scheduleId;
  },
});

// Get all schedules (managers only)
export const getAllSchedules = query({
  args: {
    date: v.optional(v.string()),
    shiftType: v.optional(v.union(v.literal("morning"), v.literal("afternoon"), v.literal("evening"), v.literal("night"))),
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

    let schedules = await ctx.db.query("workSchedules").collect();

    // Filter by date if provided
    if (args.date) {
      schedules = schedules.filter(schedule => schedule.date === args.date);
    }

    // Filter by shift type if provided
    if (args.shiftType) {
      schedules = schedules.filter(schedule => schedule.shiftType === args.shiftType);
    }

    // Get seller and assigner info for each schedule
    const schedulesWithDetails = await Promise.all(
      schedules.map(async (schedule) => {
        const seller = await ctx.db.get(schedule.sellerId);
        const sellerProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", schedule.sellerId))
          .first();

        const assigner = await ctx.db.get(schedule.assignedBy);
        const assignerProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", schedule.assignedBy))
          .first();

        return {
          ...schedule,
          seller: {
            ...seller,
            profile: sellerProfile,
          },
          assigner: {
            ...assigner,
            profile: assignerProfile,
          },
        };
      })
    );

    return schedulesWithDetails;
  },
});
