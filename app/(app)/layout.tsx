import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/app/Header";
import { SanityLive } from "@/sanity/lib/live";
import { CartStoreProvider } from "@/lib/store/cart-store-provider";
import { ChatStoreProvider } from "@/lib/store/chat-store-provider";
import { CartSheet } from "@/components/app/CartSheet";
import { ChatSheet } from "@/components/app/ChatSheet";
import { AppShell } from "@/components/app/AppShell";
import React from "react";


function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <CartStoreProvider>
        <ChatStoreProvider>
          <AppShell>
          <Header />
          <main suppressHydrationWarning>{children}</main>
          <CartSheet />
          <ChatSheet />
          <Toaster position="bottom-center" />
          <SanityLive />
          </AppShell>
        </ChatStoreProvider>
      </CartStoreProvider>
    </ClerkProvider>
  );
}

export default Layout;
