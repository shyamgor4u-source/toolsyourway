import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  Zap,
  CreditCard,
  Smartphone,
  ArrowLeft,
  Building,
  Sparkles,
  Megaphone,
  Database,
  Mail,
  TrendingUp,
  Users,
  IndianRupee,
  Scale,
  Search,
  Headphones,
  Crown,
} from "lucide-react";

// Founders discount expires April 30, 2026
const FOUNDERS_EXPIRY = new Date("2026-04-30T23:59:59");
const isFoundersActive = new Date() < FOUNDERS_EXPIRY;
const DISCOUNT = 0.35; // 65% off = pay 35%

const BOT_PRICE = 7;
const AI_MANAGER_PRICE = 8;

type BotKey =
  | "marketing"
  | "data"
  | "email"
  | "sales"
  | "hr"
  | "finance"
  | "legal"
  | "seo"
  | "support";

interface BotConfig {
  key: BotKey;
  name: string;
  icon: React.ElementType;
  desc: string;
}

const BOTS: BotConfig[] = [
  { key: "marketing", name: "Marketing & Social", icon: Megaphone, desc: "Content creation, social posting, AI visuals" },
  { key: "data", name: "Excel & Data", icon: Database, desc: "Reports, dashboards, KPI tracking" },
  { key: "email", name: "Email Automation", icon: Mail, desc: "Campaigns, follow-ups, cold outreach" },
  { key: "sales", name: "Sales Funnel", icon: TrendingUp, desc: "Lead scoring, proposals, CRM automation" },
  { key: "hr", name: "HR & People", icon: Users, desc: "Hiring, screening, interviews, onboarding" },
  { key: "finance", name: "Finance & Billing", icon: IndianRupee, desc: "Invoicing, GST, payments, expense tracking" },
  { key: "legal", name: "Legal", icon: Scale, desc: "Contracts, NDAs, compliance checks" },
  { key: "seo", name: "SEO & Content", icon: Search, desc: "Keywords, rank tracking, content optimization" },
  { key: "support", name: "Customer Support", icon: Headphones, desc: "Tickets, auto-replies, FAQ management" },
];

const BUSINESS_DEFAULTS: BotKey[] = ["sales", "email", "finance", "hr", "data"];
const INFLUENCER_DEFAULTS: BotKey[] = ["marketing", "seo", "support", "email"];

export default function PricingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [userType, setUserType] = useState<"business" | "influencer">("business");
  const [selectedBots, setSelectedBots] = useState<Set<BotKey>>(new Set(BUSINESS_DEFAULTS));
  const [hasAiManager, setHasAiManager] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleTypeChange = (type: "business" | "influencer") => {
    setUserType(type);
    if (type === "business") {
      setSelectedBots(new Set(BUSINESS_DEFAULTS));
    } else {
      setSelectedBots(new Set(INFLUENCER_DEFAULTS));
    }
  };

  const toggleBot = (key: BotKey) => {
    setSelectedBots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedBots(new Set(BOTS.map((b) => b.key)));
  };

  const selectAllWithManager = () => {
    setSelectedBots(new Set(BOTS.map((b) => b.key)));
    setHasAiManager(true);
  };

  const botCount = selectedBots.size;
  const basePrice = botCount * BOT_PRICE + (hasAiManager ? AI_MANAGER_PRICE : 0);
  const discountedPrice = isFoundersActive ? Math.ceil(basePrice * DISCOUNT) : basePrice;

  const buildPayload = () => ({
    selectedBots: Array.from(selectedBots),
    hasAiManager: hasAiManager ? 1 : 0,
    userType,
  });

  // Stripe mutation
  const stripeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments/stripe/checkout", {
        plan: "custom",
        ...buildPayload(),
      });
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err: Error) => {
      toast({ title: "Payment error", description: err.message || "Failed to initiate Stripe checkout", variant: "destructive" });
      setLoadingPlan(null);
    },
  });

  // Razorpay mutation
  const razorpayMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments/razorpay/order", {
        plan: "custom",
        amount: discountedPrice,
        ...buildPayload(),
      });
      return res.json();
    },
    onSuccess: (data: { orderId: string; amount: number; currency: string; key: string }) => {
      if (!user) return;
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "ToolsYourWay",
        description: `Custom AI Team — ${botCount} bots${hasAiManager ? " + AI Manager" : ""}`,
        order_id: data.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await apiRequest("POST", "/api/payments/razorpay/verify", {
              ...response,
              plan: "custom",
              ...buildPayload(),
            });
            toast({ title: "Payment successful!", description: "Your AI team is now active." });
            setLocation("/dashboard?payment=success");
          } catch (err: any) {
            toast({ title: "Verification failed", description: err.message || "Contact support.", variant: "destructive" });
          }
        },
        prefill: { email: user?.email, name: user?.name },
        theme: { color: "#1E1650" },
        modal: { ondismiss: () => setLoadingPlan(null) },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    },
    onError: (err: Error) => {
      toast({ title: "Payment error", description: err.message || "Failed to initiate Razorpay", variant: "destructive" });
      setLoadingPlan(null);
    },
  });

  const handleStripe = () => {
    if (!user) { setLocation("/auth"); return; }
    if (botCount === 0) { toast({ title: "Select at least one bot", variant: "destructive" }); return; }
    setLoadingPlan("stripe");
    stripeMutation.mutate();
  };

  const handleRazorpay = () => {
    if (!user) { setLocation("/auth"); return; }
    if (botCount === 0) { toast({ title: "Select at least one bot", variant: "destructive" }); return; }
    setLoadingPlan("razorpay");
    razorpayMutation.mutate();
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 pb-48">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="pricing-title">
            Build Your AI Team
          </h1>
          <p className="text-muted-foreground text-sm mb-5">
            Pick the bots you need. Pay only for what you use.
          </p>
          {isFoundersActive && (
            <div
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #1E1650, #2D2275)", color: "#E9A820" }}
              data-testid="founders-banner"
            >
              <Zap className="h-4 w-4" />
              FOUNDERS DISCOUNT — 65% OFF
              <span className="font-normal opacity-80 text-xs ml-1">(Expires April 30, 2026)</span>
            </div>
          )}
        </div>

        {/* Step 1 — Choose type */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Step 1 — Choose your type
          </p>
          <div className="grid sm:grid-cols-2 gap-3" data-testid="user-type-selector">
            {[
              {
                type: "business" as const,
                label: "I'm a Business / Startup",
                icon: Building,
                desc: "Automate sales, finance, HR, and operations",
              },
              {
                type: "influencer" as const,
                label: "I'm an Influencer / Creator",
                icon: Sparkles,
                desc: "Automate content, marketing, SEO, and engagement",
              },
            ].map(({ type, label, icon: Icon, desc }) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                data-testid={`type-card-${type}`}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  userType === type
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/50 hover:border-border"
                }`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: userType === type ? "rgba(30,22,80,0.12)" : "rgba(0,0,0,0.04)",
                  }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: userType === type ? "#1E1650" : undefined }}
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                </div>
                {userType === type && (
                  <div
                    className="ml-auto w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "#1E1650" }}
                  >
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — Pick bots */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Step 2 — Pick your bots
            <span className="ml-2 text-foreground normal-case font-normal">${BOT_PRICE}/mo each</span>
          </p>
          <div className="grid sm:grid-cols-3 gap-3" data-testid="bot-grid">
            {BOTS.map(({ key, name, icon: Icon, desc }) => {
              const selected = selectedBots.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleBot(key)}
                  data-testid={`bot-card-${key}`}
                  className={`relative flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/40 hover:border-border bg-card"
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`absolute top-3 right-3 w-4.5 h-4.5 rounded flex items-center justify-center border transition-colors ${
                      selected
                        ? "border-primary bg-primary"
                        : "border-border/60 bg-background"
                    }`}
                    style={{ width: 18, height: 18 }}
                  >
                    {selected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: selected ? "rgba(30,22,80,0.1)" : "rgba(0,0,0,0.04)" }}
                  >
                    <Icon className="h-4 w-4" style={{ color: selected ? "#1E1650" : undefined }} />
                  </div>
                  <div className="pr-5">
                    <div className="text-xs font-semibold text-foreground leading-tight">{name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</div>
                    <div className="text-[11px] font-bold mt-1" style={{ color: "#0D9E98" }}>${BOT_PRICE}/mo</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3 — AI Manager */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Step 3 — Optional add-on
          </p>
          <div
            data-testid="ai-manager-card"
            className="flex items-center gap-4 p-4 rounded-xl border-2 transition-all"
            style={{
              borderColor: hasAiManager ? "#E9A820" : "rgba(233,168,32,0.4)",
              background: hasAiManager ? "rgba(233,168,32,0.06)" : undefined,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(233,168,32,0.15)" }}
            >
              <Crown className="h-5 w-5" style={{ color: "#E9A820" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground flex items-center gap-2">
                Add Virtual AI Manager — Your AI CEO
                <Badge
                  className="text-[10px] font-bold px-2 py-0.5"
                  style={{ background: "#FEF3D7", color: "#C98A1A", border: "none" }}
                >
                  POPULAR
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                +${AI_MANAGER_PRICE}/mo — Get personalized guidance, strategy, and voice commands
              </div>
            </div>
            <Switch
              checked={hasAiManager}
              onCheckedChange={setHasAiManager}
              data-testid="ai-manager-toggle"
            />
          </div>
        </div>

        {/* Bundle deals */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Bundle deals
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={selectAll}
              data-testid="bundle-all-bots"
              className="flex items-center justify-between p-4 rounded-xl border-2 border-border/50 hover:border-primary/50 bg-card text-left transition-all"
            >
              <div>
                <div className="text-sm font-semibold text-foreground">All 9 Bots</div>
                <div className="text-xs text-muted-foreground">One-click select all bots</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold" style={{ color: "#0D9E98" }}>$49/mo</div>
                <div className="text-[11px] text-muted-foreground line-through">$63/mo</div>
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#FEF3D7", color: "#C98A1A" }}>
                  save $14
                </div>
              </div>
            </button>
            <button
              onClick={selectAllWithManager}
              data-testid="bundle-all-plus-manager"
              className="flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all"
              style={{ borderColor: "rgba(233,168,32,0.5)", background: "rgba(233,168,32,0.03)" }}
            >
              <div>
                <div className="text-sm font-semibold text-foreground">All 9 + AI Manager</div>
                <div className="text-xs text-muted-foreground">Full AI company bundle</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold" style={{ color: "#E9A820" }}>$59/mo</div>
                <div className="text-[11px] text-muted-foreground line-through">$71/mo</div>
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#FEF3D7", color: "#C98A1A" }}>
                  save $20
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky bottom summary bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md"
        data-testid="price-summary-bar"
        style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.08)" }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          {/* Summary line */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-sm">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{botCount} bot{botCount !== 1 ? "s" : ""}</span>
              {" "}× ${BOT_PRICE} = <span className="font-semibold text-foreground">${botCount * BOT_PRICE}</span>
            </span>
            {hasAiManager && (
              <span className="text-muted-foreground">
                + AI Manager: <span className="font-semibold text-foreground">+${AI_MANAGER_PRICE}</span>
              </span>
            )}
            <span className="ml-auto flex items-center gap-2">
              {isFoundersActive && (
                <span className="text-base text-muted-foreground line-through">${basePrice}/mo</span>
              )}
              <span className="text-xl font-bold" style={{ color: "#0D9E98" }}>
                ${isFoundersActive ? discountedPrice : basePrice}/mo
              </span>
              {isFoundersActive && (
                <Badge
                  className="text-[10px] font-bold"
                  style={{ background: "#FEF3D7", color: "#C98A1A", border: "none" }}
                >
                  65% OFF
                </Badge>
              )}
            </span>
          </div>

          {/* Payment buttons */}
          <div className="grid sm:grid-cols-2 gap-2">
            <Button
              onClick={handleStripe}
              disabled={loadingPlan !== null || botCount === 0}
              className="gap-2 h-10"
              data-testid="button-pay-stripe"
            >
              <CreditCard className="h-4 w-4" />
              {loadingPlan === "stripe" ? "Redirecting…" : "Pay with Card (Stripe)"}
            </Button>
            <Button
              variant="outline"
              onClick={handleRazorpay}
              disabled={loadingPlan !== null || botCount === 0}
              className="gap-2 h-10"
              data-testid="button-pay-razorpay"
              style={{ borderColor: "#2D6BE4", color: "#2D6BE4" }}
            >
              <Smartphone className="h-4 w-4" />
              {loadingPlan === "razorpay" ? "Opening…" : "Pay with UPI (Razorpay)"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
