import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Zap, Crown, Loader2, Check } from "lucide-react";

export interface CreditPack {
  credits: number;
  amount: number; // cents
  label: string;
}

interface CreditsModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function CreditsModal({ open, onClose, title, description }: CreditsModalProps) {
  const { toast } = useToast();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const { data: packs } = useQuery<Record<string, CreditPack>>({
    queryKey: ["/api/payments/credit-packs"],
    queryFn: async () => (await apiRequest("GET", "/api/payments/credit-packs")).json(),
    enabled: open,
  });

  const stripeMutation = useMutation({
    mutationFn: async (pack: string) => {
      const res = await apiRequest("POST", "/api/payments/credits/stripe", { pack });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (e: any) => {
      toast({ title: "Payment failed", description: e.message || "Please try again", variant: "destructive" });
      setLoadingPack(null);
    },
  });

  const razorpayMutation = useMutation({
    mutationFn: async (pack: string) => {
      const res = await apiRequest("POST", "/api/payments/credits/razorpay", { pack });
      const order = await res.json();
      return { order, pack };
    },
    onSuccess: ({ order, pack }) => {
      // Guard: never open Checkout without a publishable key. Passing
      // key:undefined makes Razorpay request checkout-static-next/build/undefined.
      if (!order?.keyId || !order?.orderId) {
        toast({
          title: "Razorpay not configured",
          description: "Indian payments are temporarily unavailable. Use Stripe, or contact support.",
          variant: "destructive",
        });
        setLoadingPack(null);
        return;
      }
      const openCheckout = () => {
        // @ts-ignore
        if (typeof window.Razorpay !== "function") {
          toast({
            title: "Checkout script not loaded",
            description: "Refresh the page and try again.",
            variant: "destructive",
          });
          setLoadingPack(null);
          return;
        }
        // @ts-ignore
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: "INR",
          name: "ToolsYourWay",
          description: `${packs?.[pack]?.credits} PAYG credits`,
          order_id: order.orderId,
          handler: async (resp: any) => {
            try {
              await apiRequest("POST", "/api/payments/credits/razorpay/verify", { ...resp, pack });
              toast({ title: "Credits added", description: `${packs?.[pack]?.credits} credits added to your account` });
              queryClient.invalidateQueries({ queryKey: ["/api/user/trial-status"] });
              onClose();
            } catch (e: any) {
              toast({ title: "Verification failed", description: e.message, variant: "destructive" });
            }
          },
          modal: { ondismiss: () => setLoadingPack(null) },
          theme: { color: "#1E1650" },
        });
        rzp.open();
      };
      // The checkout script is already loaded from client/index.html.
      // Open immediately if available, otherwise inject it on demand.
      // @ts-ignore
      if (typeof window.Razorpay === "function") {
        openCheckout();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = openCheckout;
      script.onerror = () => {
        toast({ title: "Could not load Razorpay", description: "Check your network and try again.", variant: "destructive" });
        setLoadingPack(null);
      };
      document.body.appendChild(script);
    },
    onError: (e: any) => {
      toast({ title: "Payment failed", description: e.message || "Please try again", variant: "destructive" });
      setLoadingPack(null);
    },
  });

  const handleBuy = (packKey: string, gateway: "stripe" | "razorpay") => {
    setLoadingPack(`${packKey}-${gateway}`);
    if (gateway === "stripe") stripeMutation.mutate(packKey);
    else razorpayMutation.mutate(packKey);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl" data-testid="modal-credits">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1E1650]">
            <Zap className="w-5 h-5 text-[#E9A820]" />
            {title || "Buy PAYG Credits"}
          </DialogTitle>
          <DialogDescription>
            {description || "Top up credits to use beyond your monthly plan caps. 1 credit = 1 image. 2 credits = 1 video."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-3 gap-4 py-4">
          {packs &&
            Object.entries(packs).map(([key, p]) => {
              const isBest = key === "medium";
              return (
                <Card
                  key={key}
                  className={`p-4 relative ${isBest ? "border-[#E9A820] border-2" : "border-gray-200"}`}
                  data-testid={`card-credit-pack-${key}`}
                >
                  {isBest && (
                    <span className="absolute -top-2 right-4 bg-[#E9A820] text-white text-xs px-2 py-0.5 rounded font-semibold">
                      BEST VALUE
                    </span>
                  )}
                  <div className="text-2xl font-bold text-[#1E1650]">{p.credits}</div>
                  <div className="text-xs text-muted-foreground mb-2">credits</div>
                  <div className="text-lg font-semibold mb-3">${(p.amount / 100).toFixed(0)}</div>
                  <ul className="text-xs text-gray-600 space-y-1 mb-4 min-h-[60px]">
                    <li className="flex gap-1">
                      <Check className="w-3 h-3 text-green-600 mt-0.5" /> {Math.floor(p.credits / 2)} AI videos
                    </li>
                    <li className="flex gap-1">
                      <Check className="w-3 h-3 text-green-600 mt-0.5" /> {p.credits} AI images
                    </li>
                    <li className="flex gap-1">
                      <Check className="w-3 h-3 text-green-600 mt-0.5" /> Never expires
                    </li>
                  </ul>
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      className="w-full bg-[#1E1650] hover:bg-[#3D309A] text-white"
                      disabled={loadingPack !== null}
                      onClick={() => handleBuy(key, "stripe")}
                      data-testid={`button-buy-${key}-stripe`}
                    >
                      {loadingPack === `${key}-stripe` ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Pay with Card"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-[#1E1650] text-[#1E1650]"
                      disabled={loadingPack !== null}
                      onClick={() => handleBuy(key, "razorpay")}
                      data-testid={`button-buy-${key}-razorpay`}
                    >
                      {loadingPack === `${key}-razorpay` ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Pay with UPI / Razorpay"
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
        </div>

        <div className="bg-[#1E1650]/5 rounded-lg p-3 text-sm text-center">
          <Crown className="w-4 h-4 inline-block mr-1 text-[#E9A820]" />
          <span className="text-gray-700">
            Heavy user? A monthly plan gives you unlimited usage at a lower effective price.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
