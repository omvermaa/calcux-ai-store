import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { google } from "@ai-sdk/google"; 
import { auth } from "@clerk/nextjs/server";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";

export async function POST(request: Request) {
  const { messages }: { messages: any[] } = await request.json();

  // Get the user's session - userId will be null if not authenticated
  const { userId } = await auth();

  // Create agent with user context (orders tool only available if authenticated)
  const agent = createShoppingAgent({ userId });

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  // Extract maxSteps so it doesn't get spread into streamText and cause an error
  const { maxSteps, ...agentConfig } = agent;

  const result = await streamText({
    ...agentConfig,
    model: google("gemini-2.5-flash"), 
    messages: await convertToModelMessages(messages), 
    // In AI SDK v6, maxSteps is replaced by stopWhen: stepCountIs()
    stopWhen: stepCountIs(maxSteps || 5),
  });

  // Use toUIMessageStreamResponse() to properly stream tools/data in v6 beta
  return result.toUIMessageStreamResponse(); 
}