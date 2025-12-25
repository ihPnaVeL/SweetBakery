import { mutation } from "./_generated/server";
import { v } from "convex/values";

// This is a one-time setup function to create sample data
export const setupSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    // Create sample categories
    const electronicsId = await ctx.db.insert("categories", {
      name: "Electronics",
      description: "Electronic devices and gadgets",
      image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500",
      isActive: true,
    });

    const clothingId = await ctx.db.insert("categories", {
      name: "Clothing",
      description: "Fashion and apparel",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500",
      isActive: true,
    });

    const homeId = await ctx.db.insert("categories", {
      name: "Home & Garden",
      description: "Home improvement and garden supplies",
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500",
      isActive: true,
    });

    // Create sample products
    await ctx.db.insert("products", {
      name: "Wireless Bluetooth Headphones",
      description: "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
      price: 199.99,
      categoryId: electronicsId,
      images: [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
        "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500"
      ],
      stock: 25,
      isActive: true,
      sku: "WBH-001",
      weight: 0.8,
      dimensions: {
        length: 8.5,
        width: 7.2,
        height: 3.1,
      },
    });

    await ctx.db.insert("products", {
      name: "Smartphone 128GB",
      description: "Latest smartphone with 128GB storage, dual camera, and fast charging.",
      price: 699.99,
      categoryId: electronicsId,
      images: [
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500"
      ],
      stock: 15,
      isActive: true,
      sku: "SP-128-001",
      weight: 0.4,
      dimensions: {
        length: 6.1,
        width: 2.8,
        height: 0.3,
      },
    });

    await ctx.db.insert("products", {
      name: "Cotton T-Shirt",
      description: "Comfortable 100% cotton t-shirt available in multiple colors.",
      price: 24.99,
      categoryId: clothingId,
      images: [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"
      ],
      stock: 50,
      isActive: true,
      sku: "CT-001",
      weight: 0.2,
    });

    await ctx.db.insert("products", {
      name: "Denim Jeans",
      description: "Classic blue denim jeans with comfortable fit.",
      price: 79.99,
      categoryId: clothingId,
      images: [
        "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500"
      ],
      stock: 30,
      isActive: true,
      sku: "DJ-001",
      weight: 0.6,
    });

    await ctx.db.insert("products", {
      name: "Indoor Plant Pot Set",
      description: "Set of 3 ceramic plant pots perfect for indoor gardening.",
      price: 45.99,
      categoryId: homeId,
      images: [
        "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500"
      ],
      stock: 20,
      isActive: true,
      sku: "IPP-SET-001",
      weight: 2.5,
      dimensions: {
        length: 12.0,
        width: 12.0,
        height: 10.0,
      },
    });

    await ctx.db.insert("products", {
      name: "LED Desk Lamp",
      description: "Adjustable LED desk lamp with touch controls and USB charging port.",
      price: 89.99,
      categoryId: homeId,
      images: [
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500"
      ],
      stock: 12,
      isActive: true,
      sku: "LED-LAMP-001",
      weight: 1.2,
      dimensions: {
        length: 18.0,
        width: 8.0,
        height: 22.0,
      },
    });

    return "Sample data created successfully!";
  },
});
