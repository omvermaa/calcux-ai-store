import { redirect } from "next/navigation";
import { SuccessClient } from "./SuccessClient";
import { getCheckoutSession } from "@/lib/actions/checkout";

export const metadata = {
  title: "Order Confirmed | Calcux",
  description: "Your order has been placed successfully",
};

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const orderId = params.orderId;

  if (!orderId) {
    redirect("/");
  }

  const result = await getCheckoutSession(orderId);

  if (!result.success || !result.session) {
    redirect("/");
  }

  return <SuccessClient session={result.session} />;
}
