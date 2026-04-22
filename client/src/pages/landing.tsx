import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Megaphone, Database, Mail, TrendingUp, Users,
  Check, ArrowRight, Zap, Globe, Clock, BarChart3,
} from "lucide-react";

const BOTS = [
  { icon: Megaphone, name: "Marketing Bot", desc: "Campaigns, content, and audience targeting on autopilot." },
  { icon: Database, name: "Data Bot", desc: "Real-time analytics, reports, and data pipeline automation." },
  { icon: Mail, name: "Email Bot", desc: "Smart email management, drafts, and automated responses." },
  { icon: TrendingUp, name: "Sales Bot", desc: "Lead scoring, outreach, and CRM workflow automation." },
  { icon: Users, name: "HR Bot", desc: "Recruitment, onboarding, and employee support on demand." },
];

const FOUNDERS_EXPIRY = new Date("2026-04-30T23:59:59");
const isFoundersActive = new Date() < FOUNDERS_EXPIRY;

const PRICING_OPTIONS = [
  {
    name: "Per Bot",
    price: isFoundersActive ? "$2" : "$7",
    originalPrice: isFoundersActive ? "$7" : null,
    period: "/bot/mo",
    desc: "Pick exactly the bots you need",
    features: ["Choose any bot", "Pay per bot", "Add/remove anytime", "10+ languages", "Self-service"],
    accent: false,
  },
  {
    name: "Bot + AI Manager",
    price: isFoundersActive ? "$5" : "$15",
    originalPrice: isFoundersActive ? "$15" : null,
    period: "/bot/mo",
    desc: "Bot + your personal AI CEO",
    features: ["Everything in Per Bot", "Virtual AI Manager", "Voice commands (regional)", "Strategy guidance", "Priority support"],
    accent: true,
  },
  {
    name: "All 9 + AI Manager",
    price: isFoundersActive ? "$21" : "$59",
    originalPrice: isFoundersActive ? "$59" : null,
    period: "/mo",
    desc: "Full platform, maximum power",
    features: ["All 9 AI Bots", "Virtual AI Manager", "AI image + video", "Voice in 10+ languages", "Custom workflows", "Dedicated support"],
    accent: false,
  },
];

const TRUST_STATS = [
  { icon: Users, value: "500+", label: "Businesses" },
  { icon: BarChart3, value: "12×", label: "Avg ROI" },
  { icon: Clock, value: "24/7", label: "Operation" },
  { icon: Globe, value: "20+", label: "Languages" },
];

export default function LandingPage() {
  const { user } = useAuth();

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      {/* Nav */}
      <nav className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-bold text-base tracking-tight text-primary">ToolsYourWay</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" data-testid="link-dashboard">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <button
                  onClick={scrollToPricing}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-pricing"
                >
                  Pricing
                </button>
                <Link href="/auth">
                  <Button size="sm" data-testid="link-get-started-nav">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-xs font-medium px-3 py-1">
            <Zap className="h-3 w-3 mr-1" />
            7-Day Free Trial — No Credit Card Required
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight mb-4">
            Your AI Company.{" "}
            <span style={{ color: "#E9A820" }}>Operating Now.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            9 specialized AI bots + Virtual AI Manager. Try everything free for 7 days —
            no card required. Keep what you need, pay only for what you use.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" className="px-8" data-testid="button-hero-dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/auth">
                <Button size="lg" className="px-8" data-testid="button-hero-get-started">
                  Start 7-Day Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
            <Button variant="outline" size="lg" onClick={scrollToPricing} data-testid="button-hero-pricing">
              See Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TRUST_STATS.map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-lg bg-card border border-border/50">
                <stat.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Bots Grid */}
      <section className="py-16 px-4 sm:px-6 bg-card/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">5 AI Bots. One Platform.</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Each bot is purpose-built for a specific domain. Deploy them individually or run all five together.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BOTS.map((bot) => (
              <Card key={bot.name} className="border-border/50 hover:border-primary/20 transition-colors" data-testid={`card-bot-${bot.name.toLowerCase().replace(/\s/g, '-')}`}>
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: "rgba(30,22,80,0.08)" }}
                  >
                    <bot.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground mb-1">{bot.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{bot.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Pay Only for What You Use</h2>
            <p className="text-sm text-muted-foreground">Pick your bots. Add AI Manager. No hidden fees.</p>
            {isFoundersActive && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold" style={{ background: "linear-gradient(135deg, #1E1650, #2D2275)", color: "#E9A820" }}>
                <Zap className="h-4 w-4" />
                FOUNDERS DISCOUNT — 65% OFF (Limited Time)
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {PRICING_OPTIONS.map((plan) => (
              <Card
                key={plan.name}
                className={`relative border ${plan.accent ? "border-primary shadow-lg" : "border-border/50"}`}
                data-testid={`card-plan-${plan.name.toLowerCase()}`}
              >
                {plan.accent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="text-xs" style={{ background: "#E9A820", color: "#fff" }}>
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{plan.desc}</p>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    {plan.originalPrice && (
                      <span className="text-lg text-muted-foreground line-through mr-2">{plan.originalPrice}</span>
                    )}
                    <span className="text-3xl font-bold" style={{ color: isFoundersActive ? "#0D9E98" : undefined }}>{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                    {plan.originalPrice && (
                      <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#FEF3D7", color: "#C98A1A" }}>SAVE 65%</span>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#0D9E98" }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/pricing">
                    <Button
                      className="w-full"
                      variant={plan.accent ? "default" : "outline"}
                      data-testid={`button-plan-${plan.name.toLowerCase()}`}
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary">ToolsYourWay</span>
          </div>
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} ToolsYourWay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
