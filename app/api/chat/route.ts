import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { google } from "@ai-sdk/google"; // 1. Import the Google provider
import { auth } from "@clerk/nextjs/server";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";

export async function POST(request: Request) {
  const { messages }: { messages: any[] } = await request.json();

  const { userId } = await auth();
  const agent = createShoppingAgent({ userId });

  // 2. Check for the Google API key instead
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable");
  }

  const { maxSteps, ...agentConfig } = agent;

  const result = await streamText({
    ...agentConfig,
    // Update to the currently supported model generation
    model: google("gemini-2.5-flash"), 
    messages: await convertToModelMessages(messages), 
    stopWhen: stepCountIs(maxSteps || 5),
  });

  return result.toUIMessageStreamResponse(); 
}