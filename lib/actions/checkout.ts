"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import Razorpay from "razorpay";
import { client, writeClient } from "@/sanity/lib/client";
import { PRODUCTS_BY_IDS_QUERY } from "@/lib/sanity/queries/products";

// Initialize Razorpay
const keyId = process.env.KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

if (!keyId) {
  throw new Error("RAZORPAY_KEY_ID is not defined");
}
if (!keySecret) {
  throw new Error("RAZORPAY_KEY_SECRET is not defined");
}

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

// Types
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CheckoutResult {
  success: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  error?: string;
}

/**
 * Creates a Razorpay Order from cart items
 * Validates stock and prices against Sanity before creating order
 */
export async function createCheckoutSession(
  items: CartItem[]
): Promise<CheckoutResult> {
  try {
    // 1. Verify user is authenticated
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return { success: false, error: "Please sign in to checkout" };
    }

    // 2. Validate cart is not empty
    if (!items || items.length === 0) {
      return { success: false, error: "Your cart is empty" };
    }

    // 3. Fetch current product data from Sanity to validate prices/stock
    const productIds = items.map((item) => item.productId);
    const products = await client.fetch(PRODUCTS_BY_IDS_QUERY, {
      ids: productIds,
    });

    // 4. Validate each item
    const validationErrors: string[] = [];
    const validatedItems: {
      product: (typeof products)[number];
      quantity: number;
    }[] = [];

    for (const item of items) {
      const product = products.find(
        (p: { _id: string }) => p._id === item.productId
      );

      if (!product) {
        validationErrors.push(`Product "${item.name}" is no longer available`);
        continue;
      }

      if ((product.stock ?? 0) === 0) {
        validationErrors.push(`"${product.name}" is out of stock`);
        continue;
      }

      if (item.quantity > (product.stock ?? 0)) {
        validationErrors.push(
          `Only ${product.stock} of "${product.name}" available`
        );
        continue;
      }

      validatedItems.push({ product, quantity: item.quantity });
    }

    if (validationErrors.length > 0) {
      return { success: false, error: validationErrors.join(". ") };
    }

    // 5. Calculate total amount
    const totalAmount = validatedItems.reduce((acc, { product, quantity }) => {
      return acc + (product.price ?? 0) * quantity;
    }, 0);

    // Razorpay expects amount in subunits (paise for INR)
    const amount = Math.round(totalAmount * 100);

    // 6. Create Razorpay Order
    const options = {
      amount: amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        clerkUserId: userId,
        userEmail: user.emailAddresses[0]?.emailAddress ?? "",
      },
    };

    const order = await razorpay.orders.create(options);

    // 7. Create Pending Order in Sanity
    // We create the order now so we can store the line items, which Razorpay doesn't hold.
    const orderItems = validatedItems.map(({ product, quantity }, index) => ({
      _key: `item-${index}`,
      product: {
        _type: "reference",
        _ref: product._id,
      },
      quantity,
      priceAtPurchase: product.price,
    }));

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    await writeClient.create({
      _type: "order",
      orderNumber,
      clerkUserId: userId,
      email: user.emailAddresses[0]?.emailAddress ?? "",
      items: orderItems,
      total: totalAmount,
      status: "pending",
      razorpayOrderId: order.id, // Storing Razorpay Order ID here for lookup
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      keyId: keyId,
    };
  } catch (error) {
    console.error("Checkout error:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

/**
 * Retrieves a Razorpay order by ID (for success page)
 */
export async function getCheckoutSession(orderId: string) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Fetch order from Sanity using the Razorpay Order ID
    const order = await client.fetch(
      `*[_type == "order" && razorpayOrderId == $orderId][0]{
        razorpayOrderId,
        email,
        total,
        status,
        clerkUserId,
        "items": items[]{
          "name": product->name,
          quantity,
          "amount": priceAtPurchase * 100
        }
      }`,
      { orderId }
    );

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Verify the order belongs to this user
    if (order.clerkUserId !== userId) {
      return { success: false, error: "Order not found" };
    }

    return {
      success: true,
      session: {
        id: order.razorpayOrderId,
        customerEmail: order.email,
        amountTotal: order.total * 100,
        paymentStatus: order.status === "paid" ? "paid" : "unpaid",
        currency: "INR",
        lineItems: order.items || [],
      },
    };
  } catch (error) {
    console.error("Get session error:", error);
    return { success: false, error: "Could not retrieve order details" };
  }
}
