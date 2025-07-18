import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const useRazorpay = () => {
  const { user } = useUser();
  const router = useRouter();

  const initiatePayment = async (amount: number) => {
    if (!user) {
      toast.error('Please login to continue');
      return;
    }

    try {
      // Create order
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, currency: 'INR' }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const { orderId } = await response.json();

      // Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount * 100, // Amount in paise
        currency: 'INR',
        name: 'CodeCraft Pro',
        description: 'Lifetime Pro Access',
        order_id: orderId,
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.id,
              }),
            });

            const result = await verifyResponse.json();

            if (result.success) {
              toast.success('Payment successful! Welcome to Pro!');
              // Refresh the page to update user status
              router.refresh();
              window.location.reload();
            } else {
              toast.error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: user.fullName || '',
          email: user.emailAddresses[0]?.emailAddress || '',
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error('Failed to initiate payment');
    }
  };

  return { initiatePayment };
};
