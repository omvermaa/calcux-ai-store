"use server";

import Razorpay from "razorpay";
import { client, writeClient } from "@/sanity/lib/client";

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

/**
 * Gets or creates a Razorpay customer by email
 * Also syncs the customer to Sanity database
 */
export async function getOrCreateRazorpayCustomer(
  email: string,
  name: string,
  clerkUserId: string
): Promise<{ razorpayCustomerId: string; sanityCustomerId: string }> {
  // First, check if customer already exists in Sanity
  const existingCustomer = await client.fetch(
    `*[_type == "customer" && email == $email][0]`,
    { email }
  );

  if (existingCustomer?.razorpayCustomerId) {
    // Customer exists, return existing IDs
    return {
      razorpayCustomerId: existingCustomer.razorpayCustomerId,
      sanityCustomerId: existingCustomer._id,
    };
  }

  // Create new Razorpay customer
  const newRazorpayCustomer = await razorpay.customers.create({
    email,
    name,
    notes: {
      clerkUserId,
    },
  });
  const razorpayCustomerId = newRazorpayCustomer.id;

  // Create or update customer in Sanity
  if (existingCustomer) {
    // Update existing Sanity customer with Razorpay ID
    await writeClient
      .patch(existingCustomer._id)
      .set({ razorpayCustomerId, clerkUserId, name })
      .commit();
    return {
      razorpayCustomerId,
      sanityCustomerId: existingCustomer._id,
    };
  }

  // Create new customer in Sanity
  const newSanityCustomer = await writeClient.create({
    _type: "customer",
    email,
    name,
    clerkUserId,
    razorpayCustomerId,
    createdAt: new Date().toISOString(),
  });

  return {
    razorpayCustomerId,
    sanityCustomerId: newSanityCustomer._id,
  };
}
