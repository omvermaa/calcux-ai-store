"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartItems } from "@/lib/store/cart-store-provider";
import { createCheckoutSession } from "@/lib/actions/checkout";

interface CheckoutButtonProps {
  disabled?: boolean;
}

export function CheckoutButton({ disabled }: CheckoutButtonProps) {
  const router = useRouter();
  const items = useCartItems();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handleCheckout = () => {
    setError(null);

    startTransition(async () => {
      const result = await createCheckoutSession(items);

      if (result.success && result.orderId) {
        const res = await loadRazorpay();

        if (!res) {
          setError("Razorpay SDK failed to load");
          toast.error("Error", { description: "Razorpay SDK failed to load" });
          return;
        }

        const options = {
          key: result.keyId,
          amount: result.amount,
          currency: result.currency,
          name: "Calcux",
          description: "Complete your purchase",
          order_id: result.orderId,
          handler: function (response: any) {
            toast.success("Payment Successful");
            router.push(`/checkout/success?orderId=${result.orderId}`);
          },
          theme: {
            color: "#f59e0b",
          },
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();
      } else {
        setError(result.error ?? "Checkout failed");
        toast.error("Checkout Error", {
          description: result.error ?? "Something went wrong",
        });
      }
    });
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleCheckout}
        disabled={disabled || isPending || items.length === 0}
        size="lg"
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            Pay with Razorpay
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
