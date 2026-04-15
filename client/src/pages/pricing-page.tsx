import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  Zap,
  Check,
  CreditCard,
  Smartphone,
  ArrowLeft,
  Star,
} from "lucide-react";

// Founders discount expires April 30, 2026
const FOUNDERS_EXPIRY = new Date("2026-04-30T23:59:59");
const isFoundersActive = new Date() < FOUNDERS_EXPIRY;

type Plan = "ultra" | "pro" | "premium";

interface PlanConfig {
  name: string;
  id: Plan;
  usdPrice: string;
  usdOriginal: string;
  inrPrice: string;
  inrOriginal: string;
  desc: string;
  features: string[];
  accent: boolean;
}

const PLANS: PlanConfig[] = [
  {
    name: "Ultra",
    id: "ultra",
    usdPrice: "$17",
    usdOriginal: "$49",
    inrPrice: "₹1,411",
    inrOriginal: "₹4,067",
    desc: "For startups getting started",
    features: [
      "5 AI Bots",
      "AI Manager chat",
      "AI image generation",
      "Email support",
      "10+ languages",
    ],
    accent: false,
  },
  {
    name: "Pro",
    id: "pro",
    usdPrice: "$35",
    usdOriginal: "$99",
    inrPrice: "₹2,905",
    inrOriginal: "₹8,217",
    desc: "For growing teams & influencers",
    features: [
      "7 AI Bots",
      "AI Manager + scheduling",
      "AI image + video",
      "Priority support",
      "CRM integrations",
      "10+ languages",
    ],
    accent: true,
  },
  {
    name: "Premium",
    id: "premium",
    usdPrice: "$70",
    usdOriginal: "$199",
    inrPrice: "₹5,810",
    inrOriginal: "₹16,517",
    desc: "For ambitious brands & operators",
    features: [
      "All 9 AI Bots",
      "AI Manager + custom workflows",
      "AI image + video generation",
      "Dedicated support",
      "Full analytics",
      "Invoice & billing",
      "Legal doc generation",
    ],
    accent: false,
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Stripe checkout mutation
  const stripeMutation = useMutation({
    mutationFn: async (plan: Plan) => {
      const res = await apiRequest("POST", "/api/payments/stripe/checkout", { plan });
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Payment error",
        description: err.message || "Failed to initiate Stripe checkout",
        variant: "destructive",
      });
      setLoadingPlan(null);
    },
  });

  // Razorpay order mutation
  const razorpayMutation = useMutation({
    mutationFn: async (plan: Plan) => {
      const res = await apiRequest("POST", "/api/payments/razorpay/order", { plan });
      return res.json();
    },
    onSuccess: (
      data: { orderId: string; amount: number; currency: string; key: string },
      plan: Plan
    ) => {
      if (!user) return;

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "ToolsYourWay",
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - Monthly`,
        order_id: data.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await apiRequest("POST", "/api/payments/razorpay/verify", {
              ...response,
              plan,
            });
            toast({
              title: "Payment successful!",
              description: "Your subscription is now active.",
            });
            setLocation("/dashboard?payment=success");
          } catch (err: any) {
            toast({
              title: "Verification failed",
              description: err.message || "Could not verify payment. Contact support.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          email: user.email,
          name: user.name,
        },
        theme: { color: "#1E1650" },
        modal: {
          ondismiss: () => {
            setLoadingPlan(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    },
    onError: (err: Error) => {
      toast({
        title: "Payment error",
        description: err.message || "Failed to initiate Razorpay checkout",
        variant: "destructive",
      });
      setLoadingPlan(null);
    },
  });

  const handleStripe = (plan: Plan) => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    setLoadingPlan(`stripe-${plan}`);
    stripeMutation.mutate(plan);
  };

  const handleRazorpay = (plan: Plan) => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    setLoadingPlan(`razorpay-${plan}`);
    razorpayMutation.mutate(plan);
  };

  return (
    <div className="min-h-screen bg-background" data-testid="pricing-page">
      {/* Nav */}
      <nav className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <Bot className="h-6 w-6 text-primary" />
              <span className="font-bold text-base tracking-tight text-primary">ToolsYourWay</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" data-testid="link-dashboard">Go to Dashboard</Button>
              </Link>
            ) : (
              <Link href="/auth">
                <Button size="sm" data-testid="link-sign-in">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="pricing-title">
            Simple, Transparent Pricing
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            No hidden fees. Cancel anytime. Pay with card or UPI.
          </p>

          {/* Founders discount banner */}
          {isFoundersActive && (
            <div
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold mb-2"
              style={{ background: "linear-gradient(135deg, #1E1650, #2D2275)", color: "#E9A820" }}
              data-testid="founders-banner"
            >
              <Zap className="h-4 w-4" />
              FOUNDERS DISCOUNT — 65% OFF ALL PLANS
              <span className="font-normal opacity-80 text-xs ml-1">(Expires April 30, 2026)</span>
            </div>
          )}
        </div>

        {/* Plan Cards */}
        <div className="grid sm:grid-cols-3 gap-5 mb-12">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative border ${
                plan.accent ? "border-primary shadow-lg" : "border-border/50"
              }`}
              data-testid={`card-plan-${plan.id}`}
            >
              {plan.accent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge
                    className="text-xs gap-1"
                    style={{ background: "#E9A820", color: "#fff" }}
                  >
                    <Star className="h-3 w-3" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{plan.desc}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Pricing */}
                <div>
                  <div className="flex items-baseline gap-1 mb-0.5">
                    {isFoundersActive && (
                      <span className="text-base text-muted-foreground line-through">
                        {plan.usdOriginal}
                      </span>
                    )}
                    <span
                      className="text-3xl font-bold"
                      style={{ color: isFoundersActive ? "#0D9E98" : undefined }}
                    >
                      {isFoundersActive ? plan.usdPrice : plan.usdOriginal}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                    {isFoundersActive && (
                      <span
                        className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#FEF3D7", color: "#C98A1A" }}
                      >
                        SAVE 65%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    or{" "}
                    <span className="font-medium">
                      {isFoundersActive ? plan.inrPrice : plan.inrOriginal}
                    </span>{" "}
                    INR via UPI
                    {isFoundersActive && (
                      <span className="line-through ml-1 opacity-60">{plan.inrOriginal}</span>
                    )}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#0D9E98" }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Payment Buttons */}
                <div className="space-y-2 pt-1">
                  {/* Stripe — international card */}
                  <Button
                    className="w-full gap-2"
                    variant={plan.accent ? "default" : "outline"}
                    onClick={() => handleStripe(plan.id)}
                    disabled={loadingPlan !== null}
                    data-testid={`button-stripe-${plan.id}`}
                  >
                    <CreditCard className="h-4 w-4" />
                    {loadingPlan === `stripe-${plan.id}`
                      ? "Redirecting..."
                      : "Pay with Card (Stripe)"}
                  </Button>

                  {/* Razorpay — UPI / India */}
                  <Button
                    className="w-full gap-2"
                    variant="outline"
                    onClick={() => handleRazorpay(plan.id)}
                    disabled={loadingPlan !== null}
                    data-testid={`button-razorpay-${plan.id}`}
                    style={{ borderColor: "#2D6BE4", color: "#2D6BE4" }}
                  >
                    <Smartphone className="h-4 w-4" />
                    {loadingPlan === `razorpay-${plan.id}`
                      ? "Opening..."
                      : "Pay with UPI/Cards (Razorpay)"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust footer */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>Payments are secured by Stripe and Razorpay. Your card/bank data never touches our servers.</p>
          <p>Need help? Email us at <span className="text-foreground font-medium">support@toolsyourway.com</span></p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/60 py-6 px-4 sm:px-6 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary">ToolsYourWay</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ToolsYourWay. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
