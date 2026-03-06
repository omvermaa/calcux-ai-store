import { streamText, createGateway } from "ai";
import { auth } from "@clerk/nextjs/server";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";

export async function POST(request: Request) {
  const { messages }: { messages: any[] } = await request.json();

  // Get the user's session - userId will be null if not authenticated
  const { userId } = await auth();

  // Create agent with user context (orders tool only available if authenticated)
  const agent = createShoppingAgent({ userId });

  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new Error("Missing AI_GATEWAY_API_KEY environment variable");
  }

  const gateway = createGateway({
    apiKey: process.env.AI_GATEWAY_API_KEY,
  });

  // Convert UI messages to CoreMessages compatible with streamText
  const coreMessages = messages.map((m) => {
    let content = "";
    if (typeof m.content === "string") {
      content = m.content;
    } else if (Array.isArray(m.parts)) {
      // Extract text from parts if content is missing (multimodal/tool messages)
      content = m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n");
    }
    return { role: m.role, content };
  });

  const result = await streamText({
    ...agent,
    model: gateway("gpt-4o"),
    messages: coreMessages,
  });

  return result.toTextStreamResponse();
}
