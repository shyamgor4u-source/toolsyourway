import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { TrialBanner, useTrialStatus } from "@/components/trial-banner";
import { CreditsModal } from "@/components/credits-modal";
import { UsageCard } from "@/components/usage-card";
import { useState } from "react";
import {
  Bot, Megaphone, Database, Mail, TrendingUp, Users,
  LogOut, Crown, Calendar, Zap, ArrowUpRight, Shield, LayoutDashboard,
  IndianRupee, Scale, Search, Headphones, Presentation, Monitor,
  Receipt, UserSearch, Target, Gavel, CalendarClock, FileText,
  PieChart, Package, Radio, Megaphone as MegaphoneAd, UserPlus, Lock,
} from "lucide-react";

const BOT_META: Record<string, { icon: typeof Bot; label: string; color: string }> = {
  marketing: { icon: Megaphone, label: "Marketing Bot", color: "#3D309A" },
  data: { icon: Database, label: "Data Bot", color: "#0D9E98" },
  email: { icon: Mail, label: "Email Bot", color: "#C98A1A" },
  sales: { icon: TrendingUp, label: "Sales Bot", color: "#1E1650" },
  hr: { icon: Users, label: "HR Bot", color: "#E9A820" },
  finance: { icon: IndianRupee, label: "Finance Bot", color: "#16803C" },
  legal: { icon: Scale, label: "Legal Bot", color: "#7C3AED" },
  seo: { icon: Search, label: "SEO Bot", color: "#DC6B18" },
  support: { icon: Headphones, label: "Support Bot", color: "#0891B2" },
};

const COMING_SOON_BOTS = [
  { icon: Presentation, label: "PPT & Presentation", dept: "Communications", phase: 1 },
  { icon: Monitor, label: "IT Helpdesk", dept: "IT", phase: 1 },
  { icon: Receipt, label: "Expense Management", dept: "Finance", phase: 2 },
  { icon: UserSearch, label: "Recruitment", dept: "HR", phase: 2 },
  { icon: Target, label: "Lead Generation", dept: "Sales", phase: 2 },
  { icon: CalendarClock, label: "Meeting & Calendar", dept: "Operations", phase: 2 },
  { icon: FileText, label: "Proposal & Quote", dept: "Sales", phase: 2 },
  { icon: PieChart, label: "Financial Reporting", dept: "Finance", phase: 3 },
  { icon: Package, label: "Inventory & Procurement", dept: "Operations", phase: 3 },
  { icon: Radio, label: "PR & Brand", dept: "Marketing", phase: 3 },
  { icon: MegaphoneAd, label: "Ad Campaign", dept: "Marketing", phase: 3 },
  { icon: UserPlus, label: "Onboarding", dept: "HR", phase: 3 },
];

interface DashboardData {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    plan: string | null;
    createdAt: string;
  };
  subscription: {
    id: number;
    plan: string;
    status: string;
    paymentGateway: string | null;
    amount: number | null;
    startDate: string;
  } | null;
  bots: Array<{
    id: number;
    userId: number;
    botType: string;
    status: string;
    config: string | null;
    lastRunAt: string | null;
    metrics: string | null;
  }>;
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/user/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/dashboard");
      return res.json();
    },
  });

  const toggleBot = useMutation({
    mutationFn: async (botType: string) => {
      await apiRequest("POST", `/api/user/bots/${botType}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/dashboard"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to toggle bot", description: err.message, variant: "destructive" });
    },
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const activeBots = dashboard?.bots.filter((b) => b.status === "active").length ?? 0;
  const planName = dashboard?.user.plan && dashboard.user.plan !== "none"
    ? dashboard.user.plan.charAt(0).toUpperCase() + dashboard.user.plan.slice(1)
    : null;
  const memberSince = dashboard?.user.createdAt
    ? new Date(dashboard.user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "—";

  // All 5 bot types — show even if user doesn't have bots yet
  const allBotTypes = ["marketing", "data", "email", "sales", "hr", "finance", "legal", "seo", "support"];

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-page">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 no-underline" onClick={(e) => { e.preventDefault(); setLocation("/"); }}>
              <Bot className="h-6 w-6 text-primary" />
              <span className="font-bold text-base tracking-tight text-primary">ToolsYourWay</span>
            </Link>
            {user?.role === "admin" && (
              <div className="flex items-center bg-muted rounded-full p-0.5 ml-2" data-testid="view-switcher">
                <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-primary text-primary-foreground">
                  <LayoutDashboard className="h-3 w-3" />
                  Dashboard
                </span>
                <button
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setLocation("/admin")}
                  data-testid="switch-to-admin"
                >
                  <Shield className="h-3 w-3" />
                  Admin
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-1" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Trial Banner — shows countdown or expired state */}
      <TrialBanner />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="grid sm:grid-cols-3 gap-4">
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-xl font-bold text-foreground" data-testid="text-welcome">
                  Welcome back, {dashboard?.user.name || user?.name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your AI bots and subscription
                </p>
              </div>
              {planName && (
                <Badge className="self-start sm:self-auto text-xs px-3 py-1" data-testid="badge-plan">
                  <Crown className="h-3 w-3 mr-1" />
                  {planName} Plan
                </Badge>
              )}
            </div>

            {/* Plan Status */}
            {!planName ? (
              <Card className="mb-6 border-dashed border-2 border-primary/20 bg-primary/5" data-testid="card-no-plan">
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">No active plan</h3>
                    <p className="text-xs text-muted-foreground">Upgrade to start using AI bots and automate your operations.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" });
                      setLocation("/");
                      setTimeout(() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }), 200);
                    }}
                    data-testid="button-upgrade"
                  >
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    Upgrade Plan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-6" data-testid="card-plan-status">
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(30,22,80,0.08)" }}
                    >
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">{planName} Plan</h3>
                      <p className="text-xs text-muted-foreground">
                        {dashboard?.subscription
                          ? `Active since ${new Date(dashboard.subscription.startDate).toLocaleDateString()}`
                          : "Active"
                        }
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs" style={{ color: "#0D9E98", borderColor: "#0D9E98" }}>
                    Active
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Usage & Plan Caps */}
            <div className="mb-6">
              <UsageCard />
            </div>

            {/* Outreach Hub CTA */}
            <Link href="/outreach">
              <Card className="mb-6 cursor-pointer hover:shadow-md transition-shadow border-[#E9A820]/40 bg-gradient-to-r from-[#1E1650] to-[#3D309A] text-white" data-testid="card-outreach-cta">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-base">Outreach Hub</div>
                    <div className="text-xs opacity-90">
                      Find prospects (Apollo.io · 275M contacts) → AI drafts personalized messages → send via your connected LinkedIn, X, Instagram, or email. 100% ToS-compliant.
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5" />
                </CardContent>
              </Card>
            </Link>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <Card data-testid="stat-bots-active">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{activeBots}</div>
                  <div className="text-xs text-muted-foreground">Bots Active</div>
                </CardContent>
              </Card>
              <Card data-testid="stat-plan-type">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{planName || "Free"}</div>
                  <div className="text-xs text-muted-foreground">Plan Type</div>
                </CardContent>
              </Card>
              <Card data-testid="stat-member-since">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{memberSince}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Member Since
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bot Status Grid */}
            <div className="mb-8">
              <h2 className="text-base font-semibold text-foreground mb-4">AI Bots</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allBotTypes.map((botType) => {
                  const meta = BOT_META[botType];
                  const Icon = meta.icon;
                  const botData = dashboard?.bots.find((b) => b.botType === botType);
                  const isActive = botData?.status === "active";
                  const canToggle = !!botData;

                  return (
                    <Card
                      key={botType}
                      className="border-border/50 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
                      data-testid={`card-bot-${botType}`}
                      onClick={() => setLocation(`/bot/${botType}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center"
                              style={{ background: `${meta.color}15` }}
                            >
                              <Icon className="h-4.5 w-4.5" style={{ color: meta.color }} />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm text-foreground">{meta.label}</h3>
                              <Badge
                                variant={isActive ? "default" : "secondary"}
                                className="text-[10px] px-1.5 py-0 mt-1"
                                data-testid={`badge-status-${botType}`}
                              >
                                {isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          <Switch
                            checked={isActive}
                            onCheckedChange={(e) => {
                              e.stopPropagation?.();
                              canToggle && toggleBot.mutate(botType);
                            }}
                            disabled={!canToggle || toggleBot.isPending}
                            data-testid={`switch-bot-${botType}`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          />
                        </div>
                        {botData?.lastRunAt && (
                          <p className="text-[10px] text-muted-foreground">
                            Last run: {new Date(botData.lastRunAt).toLocaleString()}
                          </p>
                        )}
                        <p className="text-[10px] text-primary/60 mt-2">Click to configure →</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Coming Soon Bots */}
            <div className="mt-8" data-testid="coming-soon-section">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-bold text-base text-foreground">Coming Soon</h2>
                <Badge variant="outline" className="text-[10px]">13 more bots</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {COMING_SOON_BOTS.map((bot) => {
                  const Icon = bot.icon;
                  return (
                    <div
                      key={bot.label}
                      className="relative border border-dashed border-border/60 rounded-xl p-4 opacity-60 hover:opacity-80 transition-opacity"
                      data-testid={`card-coming-${bot.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <div className="absolute top-2 right-2">
                        <Lock className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                        style={{ background: "rgba(30,22,80,0.05)" }}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium text-xs text-foreground mb-0.5">{bot.label}</h3>
                      <p className="text-[10px] text-muted-foreground">{bot.dept}</p>
                      <Badge variant="outline" className="text-[8px] mt-2 px-1.5 py-0">
                        Phase {bot.phase}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upgrade CTA */}
            {!planName && (
              <Card
                className="border-primary/20"
                style={{ background: "linear-gradient(135deg, rgba(30,22,80,0.04) 0%, rgba(233,168,32,0.04) 100%)" }}
                data-testid="card-upgrade-cta"
              >
                <CardContent className="p-6 text-center">
                  <h3 className="font-bold text-base text-foreground mb-2">Ready to automate?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose a plan and start deploying AI bots in minutes.
                  </p>
                  <Button
                    onClick={() => setLocation("/")}
                    data-testid="button-view-plans"
                  >
                    View Plans
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
