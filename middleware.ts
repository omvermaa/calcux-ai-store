import { clerkMiddleware } from "@clerk/nextjs/server";

// By default, clerkMiddleware() makes all routes public.
// You can protect specific routes inside this function if needed, 
// but for an e-commerce store, this default is usually exactly what you want.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes (like your Razorpay webhooks and AI chat)
    '/(api|trpc)(.*)',
  ],
};