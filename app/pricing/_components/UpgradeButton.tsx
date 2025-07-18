import { useRazorpay } from "@/src/hooks/useRazorPay";
import { Zap } from "lucide-react";

export default function UpgradeButton() {
  const { initiatePayment } = useRazorpay();

  const handleUpgrade = () => {
    initiatePayment(39); // $39 as per your pricing
  };

  return (
    <button
      onClick={handleUpgrade}
      className="inline-flex items-center justify-center gap-2 px-8 py-4 text-white 
        bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg 
        hover:from-blue-600 hover:to-blue-700 transition-all"
    >
      <Zap className="w-5 h-5" />
      Upgrade to Pro
    </button>
  );
}