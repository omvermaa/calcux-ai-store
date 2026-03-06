import { headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { client, writeClient } from "@/sanity/lib/client";

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-razorpay-signature header" },
      { status: 400 }
    );
  }

  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not defined");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.error("Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);

  // Handle payment.captured event
  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const razorpayOrderId = payment.order_id;

    console.log(`Processing payment for Order ID: ${razorpayOrderId}`);

    try {
      // Find the pending order in Sanity by Razorpay Order ID
      const order = await client.fetch(
        `*[_type == "order" && razorpayOrderId == $orderId][0]`,
        { orderId: razorpayOrderId }
      );

      if (!order) {
        console.error("Order not found in Sanity:", razorpayOrderId);
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      if (order.status === "paid") {
        console.log("Order already marked as paid");
        return NextResponse.json({ received: true });
      }

      // Create a transaction to update order status and decrement stock
      const tx = writeClient.transaction();

      // 1. Update order status
      tx.patch(order._id, (p) =>
        p.set({
          status: "paid",
        })
      );

      // 2. Decrement stock for each item
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (item.product?._ref && item.quantity) {
            tx.patch(item.product._ref, (p) => p.dec({ stock: item.quantity }));
          }
        });
      }

      await tx.commit();
      console.log(`Order ${order._id} updated to paid and stock adjusted`);
    } catch (error) {
      console.error("Error updating order:", error);
      return NextResponse.json(
        { error: "Error updating order" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
