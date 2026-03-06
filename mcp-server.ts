import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { client } from "./sanity/lib/client";

const server = new Server(
  {
    name: "calcux-ai-store",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_products",
        description: "Search for products in the store",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_order",
        description: "Get order details by ID or Order Number",
        inputSchema: {
          type: "object",
          properties: {
            orderId: { type: "string", description: "Order ID or Order Number" },
          },
          required: ["orderId"],
        },
      },
      {
        name: "get_inventory",
        description: "Get current inventory status",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Limit number of items" },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "search_products": {
      const query = String(request.params.arguments?.query || "");
      const products = await client.fetch(
        `*[_type == "product" && (name match $query + "*" || description match $query + "*")] | order(name asc) [0...10] {
          _id, name, price, stock, description, "slug": slug.current
        }`,
        { query } as any
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(products, null, 2),
          },
        ],
      };
    }
    case "get_order": {
      const orderId = String(request.params.arguments?.orderId);
      const order = await client.fetch(
        `*[_type == "order" && (orderNumber == $orderId || _id == $orderId || razorpayOrderId == $orderId)][0]{
          _id, orderNumber, status, total, email, razorpayOrderId, items[]{product->{name}, quantity, priceAtPurchase}
        }`,
        { orderId } as any
      );
      
      if (!order) {
        return {
          content: [{ type: "text", text: "Order not found" }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(order, null, 2),
          },
        ],
      };
    }
    case "get_inventory": {
      const limit = Number(request.params.arguments?.limit) || 20;
      const products = await client.fetch(
        `*[_type == "product"] | order(stock asc) [0...$limit] {
          _id, name, stock
        }`,
        { limit } as any
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(products, null, 2),
          },
        ],
      };
    }
    default:
      throw new Error("Unknown tool");
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);