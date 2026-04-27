import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Bot, Chrome, Mail, Building, Sparkles } from "lucide-react";
import SignupLegalText from "@/components/legal/SignupLegalText";
import LegalFooterLinks from "@/components/legal/LegalFooterLinks";

export default function AuthPage() {
  const { user, isLoading: authLoading, login, register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userType, setUserType] = useState<"business" | "influencer">("business");

  // Check available OAuth providers
  const { data: providers } = useQuery<{ google: boolean; microsoft: boolean }>({
    queryKey: ["/api/auth/providers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/auth/providers");
      return res.json();
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, authLoading, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      toast({ title: "Welcome back!" });
    } catch (err: any) {
      const msg = err.message?.includes(":") ? err.message.split(":").slice(1).join(":").trim() : err.message;
      let errorText = "Login failed";
      try {
        const parsed = JSON.parse(msg);
        errorText = parsed.message || errorText;
      } catch {
        errorText = msg || errorText;
      }
      toast({ title: "Login failed", description: errorText, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(regEmail, regName, regPassword, userType);
      toast({ title: "Account created!" });
      setLocation(`/pricing?type=${userType}`);
      return;
    } catch (err: any) {
      const msg = err.message?.includes(":") ? err.message.split(":").slice(1).join(":").trim() : err.message;
      let errorText = "Registration failed";
      try {
        const parsed = JSON.parse(msg);
        errorText = parsed.message || errorText;
      } catch {
        errorText = msg || errorText;
      }
      toast({ title: "Registration failed", description: errorText, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" data-testid="auth-page">
      {/* LEFT: Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-7 w-7 text-primary" />
              <span className="text-lg font-bold tracking-tight text-primary">ToolsYourWay</span>
            </div>
            <p className="text-sm text-muted-foreground">AI-powered business automation</p>
          </div>

          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Get started</CardTitle>
              <CardDescription>Sign in to your account or create a new one</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login" data-testid="tab-login">Sign in</TabsTrigger>
                  <TabsTrigger value="register" data-testid="tab-register">Sign up</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="text"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        data-testid="input-login-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        data-testid="input-login-password"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting} data-testid="button-login">
                      {submitting ? "Signing in…" : "Sign in"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    {/* User type selector */}
                    <div className="space-y-2" data-testid="reg-user-type">
                      <Label>I am a…</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { type: "business" as const, label: "Business / Startup", icon: Building },
                          { type: "influencer" as const, label: "Influencer / Creator", icon: Sparkles },
                        ].map(({ type, label, icon: Icon }) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setUserType(type)}
                            data-testid={`reg-type-${type}`}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left text-xs transition-all ${
                              userType === type
                                ? "border-primary bg-primary/5 font-semibold"
                                : "border-border/50 hover:border-border text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Name</Label>
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="Your name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                        data-testid="input-register-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="you@example.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                        data-testid="input-register-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="Min. 6 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        minLength={6}
                        data-testid="input-register-password"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting} data-testid="button-register">
                      {submitting ? "Creating account…" : "Create account"}
                    </Button>
                    <SignupLegalText action="creating your account" className="mt-3 text-center" />
                  </form>
                </TabsContent>
              </Tabs>

              {/* Social Login Buttons */}
              {(providers?.google || providers?.microsoft) && (
                <div className="mt-6">
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">or continue with</span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {providers?.google && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => { window.location.href = "/api/auth/google"; }}
                        data-testid="button-google-login"
                      >
                        <Chrome className="mr-2 h-4 w-4" />
                        Continue with Google
                      </Button>
                    )}
                    {providers?.microsoft && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => { window.location.href = "/api/auth/microsoft"; }}
                        data-testid="button-microsoft-login"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Continue with Outlook
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-4 text-center">
                Owner? Use <span className="font-medium">shyam.gor@outlook.com</span>
              </p>
            </CardContent>
          </Card>
          <div className="mt-6 flex justify-center">
            <LegalFooterLinks />
          </div>
        </div>
      </div>

      {/* RIGHT: Brand Panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1E1650 0%, #3D309A 50%, #1E1650 100%)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-10 right-10 w-48 h-48 rounded-full opacity-10" style={{ background: "#E9A820" }} />
        <div className="absolute bottom-20 left-10 w-32 h-32 rounded-full opacity-10" style={{ background: "#0D9E98" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-5" style={{ background: "#E9A820" }} />

        <div className="relative z-10 p-12 max-w-lg text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(233,168,32,0.2)" }}>
              <Bot className="h-7 w-7" style={{ color: "#E9A820" }} />
            </div>
            <span className="text-2xl font-bold tracking-tight">ToolsYourWay</span>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight">
            Your AI Company.{" "}
            <span style={{ color: "#E9A820" }}>Operating Now.</span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-8">
            Deploy 5 specialized AI bots for marketing, data analysis, email, sales, and HR. 
            Automate your operations in minutes, not months.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "AI Bots", value: "5" },
              { label: "Languages", value: "20+" },
              { label: "Uptime", value: "24/7" },
              { label: "Avg ROI", value: "12×" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="text-xl font-bold" style={{ color: "#E9A820" }}>{stat.value}</div>
                <div className="text-xs text-white/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
