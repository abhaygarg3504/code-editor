// 4. Create payment verification route: app/api/verify-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      userId 
    } = await request.json();

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      // Payment verified successfully
      // Update user's pro status in Convex
      await convex.mutation(api.users.updateUserToPro, {
        userId: userId,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Payment verified successfully' 
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Payment verification failed' },
      { status: 500 }
    );
  }
}
