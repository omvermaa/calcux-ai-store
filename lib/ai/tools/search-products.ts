// import { tool } from "ai";
// import { z } from "zod";
// import { sanityFetch } from "@/sanity/lib/live";
// import { AI_SEARCH_PRODUCTS_QUERY } from "@/lib/sanity/queries/products";
// import { formatPrice } from "@/lib/utils";
// import { getStockStatus, getStockMessage } from "@/lib/constants/stock";
// import { MATERIAL_VALUES, COLOR_VALUES } from "@/lib/constants/filters";
// import type { AI_SEARCH_PRODUCTS_QUERYResult } from "@/sanity.types";
// import type { SearchProduct } from "@/lib/ai/types";


// const productSearchSchema = z.object({
//   query: z
//     .string()
//     .optional()
//     .describe(
//       "Search term to find products by name, description, or category (e.g., 'denim jacket', 'cotton t-shirt', 'jeans')"
//     ),
//   category: z
//     .string()
//     .optional()
//     .describe(
//       "Filter by category slug (e.g., 't-shirt', 'jeans', 'jacket', 'activewear')"
//     ),
//   // Removed the empty string from the enum arrays
//   material: z
//     .enum(MATERIAL_VALUES) 
//     .optional()
//     .describe("Filter by material type"),
//   color: z
//     .enum(COLOR_VALUES)
//     .optional()
//     .describe("Filter by color"),
//   minPrice: z
//     .number()
//     .optional()
//     .describe("Minimum price in GBP (e.g., 100)"),
//   maxPrice: z
//     .number()
//     .optional()
//     .describe("Maximum price in GBP (e.g., 500)"),
// });

// export const searchProductsTool = tool({
//   description:
//     "Search for products in the clothing store. Can search by name, description, or category, and filter by material, color, and price range. Returns product details including stock availability.",
//   inputSchema: productSearchSchema,
//   execute: async ({ query, category, material, color, minPrice, maxPrice }) => {
    
//     // Fallback to empty strings or 0 here if undefined
//     const safeQuery = query || "";
//     // Convert to lowercase just in case the AI hallucinates a capital letter (e.g., "Jacket")
//     let safeCategory = (category || "").toLowerCase();
    
//     // Normalize plural to singular to unify search parameters (except for words that are naturally plural)
//     if (safeCategory.endsWith("s") && !["jeans", "pants"].includes(safeCategory)) {
//       safeCategory = safeCategory.slice(0, -1);
//     }
//     const safeMaterial = material || "";
//     const safeColor = color || "";
//     const safeMinPrice = minPrice || 0;
//     const safeMaxPrice = maxPrice || 1000000; // Use a high ceiling instead of 0 to prevent filtering out all products

//     console.log("[SearchProducts] Query received:", {
//       query: safeQuery,
//       category: safeCategory,
//       material: safeMaterial,
//       color: safeColor,
//       minPrice: safeMinPrice,
//       maxPrice: safeMaxPrice,
//     });

//     try {
//       const { data: products } = await sanityFetch({
//         query: AI_SEARCH_PRODUCTS_QUERY,
//         params: {
//           searchQuery: safeQuery,
//           categorySlug: safeCategory,
//           material: safeMaterial,
//           color: safeColor,
//           minPrice: safeMinPrice,
//           maxPrice: safeMaxPrice,
//         },
//       });

//       console.log("[SearchProducts] Products found:", products.length);

//       if (products.length === 0) {
//         return {
//           found: false,
//           message:
//             "No products found matching your criteria. Try different search terms or filters.",
//           products: [],
//           filters: {
//             query: safeQuery,
//             category: safeCategory,
//             material: safeMaterial,
//             color: safeColor,
//             minPrice: safeMinPrice,
//             maxPrice: safeMaxPrice,
//           },
//         };
//       }

//       // Format the results with stock status for the AI to communicate
//       const formattedProducts: SearchProduct[] = (
//         products as AI_SEARCH_PRODUCTS_QUERYResult
//       ).map((product) => ({
//         id: product._id,
//         name: product.name ?? null,
//         slug: product.slug ?? null,
//         description: product.description ?? null,
//         price: product.price ?? null,
//         priceFormatted: product.price ? formatPrice(product.price) : null,
//         category: product.category?.title ?? null,
//         categorySlug: product.category?.slug ?? null,
//         material: product.material ?? null,
//         color: product.color ?? null,
//         dimensions: product.dimensions ?? null,
//         stockCount: product.stock ?? 0,
//         stockStatus: getStockStatus(product.stock),
//         stockMessage: getStockMessage(product.stock),
//         featured: product.featured ?? false,
//         assemblyRequired: product.assemblyRequired ?? false,
//         imageUrl: product.image?.asset?.url ?? null,
//         productUrl: product.slug ? `/products/${product.slug}` : null,
//       }));

//       return {
//         found: true,
//         message: `Found ${products.length} product${products.length === 1 ? "" : "s"} matching your search.`,
//         totalResults: products.length,
//         products: formattedProducts,
//         filters: {
//           query: safeQuery,
//           category: safeCategory,
//           material: safeMaterial,
//           color: safeColor,
//           minPrice: safeMinPrice,
//           maxPrice: safeMaxPrice,
//         },
//       };
//     } catch (error) {
//       // ... [Keep error handling as is, just update the filters object below] ...
//       return {
//         found: false,
//         message: "An error occurred while searching for products.",
//         products: [],
//         error: error instanceof Error ? error.message : "Unknown error",
//         filters: {
//           query: safeQuery,
//           category: safeCategory,
//           material: safeMaterial,
//           color: safeColor,
//           minPrice: safeMinPrice,
//           maxPrice: safeMaxPrice,
//         },
//       };
//     }
//   },
// });


import { tool } from "ai";
import { z } from "zod";
import { sanityFetch } from "@/sanity/lib/live";
import { AI_SEARCH_PRODUCTS_QUERY } from "@/lib/sanity/queries/products";
import { formatPrice } from "@/lib/utils";
import { getStockStatus, getStockMessage } from "@/lib/constants/stock";
import { MATERIAL_VALUES, COLOR_VALUES } from "@/lib/constants/filters";
import type { AI_SEARCH_PRODUCTS_QUERYResult } from "@/sanity.types";
import type { SearchProduct } from "@/lib/ai/types";

// Auto-correction map for common AI singular mistakes
// Auto-correction map for common AI singular mistakes, synonyms, and typos
const CATEGORY_MAPPING: Record<string, string> = {
  // T-shirts & variations
  "t-shirt": "t-shirt",
  "tshirt": "t-shirt",
  "t-shirts": "t-shirt",
  "tee": "t-shirt",
  "tees": "t-shirt",
  "t shirt": "t-shirt",
  "t shirts": "t-shirt",
  
  // Shirts & blouses
  "shirt": "shirt",
  "shirts": "shirt",
  "blouse": "shirt",
  "button down": "shirt",

  // Pants & bottoms
  "pant": "pants",
  "trouser": "pants",
  "trousers": "pants",
  "bottoms": "pants",
  "chinos": "pants",

  // Jeans
  "jean": "jeans",
  "denims": "jeans",

  // Jackets & Outerwear
  "jacket": "jacket",
  "jackets": "jacket",
  "coat": "jacket",
  "coats": "jacket",
  "outerwear": "jacket",
  "windbreaker": "jacket",

  // Sweaters & Hoodies
  "hoodie": "hoodie",
  "hoodies": "hoodie",
  "sweatshirt": "hoodie",
  "sweater": "sweater",
  "sweaters": "sweater",
  "jumper": "sweater", // Common UK/AUS slang
  "pullover": "sweater",
};
const productSearchSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      "Search term to find products by name, description, or category (e.g., 'denim jacket', 'cotton t-shirt', 'jeans')"
    ),
  category: z
    .string()
    .optional()
    .describe(
      "Filter by category slug (e.g., 't-shirt', 'jeans', 'jacket')"
    ),
  material: z
    .enum(MATERIAL_VALUES)
    .optional()
    .describe("Filter by material type"),
  color: z
    .enum(COLOR_VALUES)
    .optional()
    .describe("Filter by color"),
  minPrice: z
    .number()
    .optional()
    .describe("Minimum price in GBP (e.g., 100)"),
  maxPrice: z
    .number()
    .optional()
    .describe("Maximum price in GBP (e.g., 500)"),
});

export const searchProductsTool = tool({
  description:
    "Search for products in the clothing store. Can search by name, description, or category, and filter by material, color, and price range. Returns product details including stock availability.",
  inputSchema: productSearchSchema,
  execute: async ({ query, category, material, color, minPrice, maxPrice }) => {
    
    // 1. Normalize Category (auto-correct "t-shirt" to "t-shirts")
    const rawCategory = category?.toLowerCase().trim() || "";
    const safeCategory = rawCategory ? (CATEGORY_MAPPING[rawCategory] || rawCategory) : null;

    // 2. Sanitize AI Defaults (Strip out 0 and 1,000,000)
    const safeQuery = query || "";
    const safeMaterial = material || null;
    const safeColor = color || null;
    const safeMinPrice = minPrice && minPrice > 0 ? minPrice : 0;
    const safeMaxPrice = maxPrice && maxPrice > 0 ? maxPrice : 1000000; // Use a high ceiling instead of 0 to prevent filtering out all products

    console.log("[SearchProducts] Uniform Query Sent to DB:", {
      query: safeQuery,
      category: safeCategory,
      material: safeMaterial,
      color: safeColor,
      minPrice: safeMinPrice,
      maxPrice: safeMaxPrice,
    });

    try {
      const { data: products } = await sanityFetch({
        query: AI_SEARCH_PRODUCTS_QUERY,
        params: {
          searchQuery: safeQuery,
          categorySlug: safeCategory,
          material: safeMaterial,
          color: safeColor,
          minPrice: safeMinPrice,
          maxPrice: safeMaxPrice,
        },
      });

      console.log("[SearchProducts] Products found:", products.length);

      if (products.length === 0) {
        return {
          found: false,
          message:
            "No products found matching your criteria. Try different search terms or filters.",
          products: [],
          filters: {
            query: safeQuery,
            category: safeCategory || "",
            material: safeMaterial || "",
            color: safeColor || "",
            minPrice: safeMinPrice,
            maxPrice: safeMaxPrice,
          },
        };
      }

      // Format the results with stock status for the AI to communicate
      const formattedProducts: SearchProduct[] = (
        products as AI_SEARCH_PRODUCTS_QUERYResult
      ).map((product) => ({
        id: product._id,
        name: product.name ?? null,
        slug: product.slug ?? null,
        description: product.description ?? null,
        price: product.price ?? null,
        priceFormatted: product.price ? formatPrice(product.price) : null,
        category: product.category?.title ?? null,
        categorySlug: product.category?.slug ?? null,
        material: product.material ?? null,
        color: product.color ?? null,
        dimensions: product.dimensions ?? null,
        stockCount: product.stock ?? 0,
        stockStatus: getStockStatus(product.stock),
        stockMessage: getStockMessage(product.stock),
        featured: product.featured ?? false,
        assemblyRequired: product.assemblyRequired ?? false,
        imageUrl: product.image?.asset?.url ?? null,
        productUrl: product.slug ? `/products/${product.slug}` : null,
      }));

      return {
        found: true,
        message: `Found ${products.length} product${products.length === 1 ? "" : "s"} matching your search.`,
        totalResults: products.length,
        products: formattedProducts,
        filters: {
          query: safeQuery,
          category: safeCategory || "",
          material: safeMaterial || "",
          color: safeColor || "",
          minPrice: safeMinPrice,
          maxPrice: safeMaxPrice,
        },
      };
    } catch (error) {
      console.error("[SearchProducts] Error:", error);
      return {
        found: false,
        message: "An error occurred while searching for products.",
        products: [],
        error: error instanceof Error ? error.message : "Unknown error",
        filters: {
          query: safeQuery,
          category: safeCategory || "", // Pass the safe category back so UI handles it gracefully
          material: safeMaterial || "",
          color: safeColor || "",
          minPrice: safeMinPrice,
          maxPrice: safeMaxPrice,
        },
      };
    }
  },
});