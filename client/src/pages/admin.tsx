import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Bot, Users, CreditCard, DollarSign, BarChart3,
  LogOut, ExternalLink, Shield,
} from "lucide-react";

interface AdminStats {
  userCount: number;
  totalRevenue: number;
  activeSubscriptions: number;
  planBreakdown: Record<string, number>;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  plan: string | null;
  authProvider: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface Subscription {
  id: number;
  userId: number;
  plan: string;
  status: string;
  paymentGateway: string | null;
  paymentId: string | null;
  amount: number | null;
  startDate: string;
  endDate: string | null;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/stats");
      return res.json();
    },
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return res.json();
    },
  });

  const { data: subscriptions, isLoading: subsLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/admin/subscriptions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/subscriptions");
      return res.json();
    },
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-background" data-testid="admin-page">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-bold text-base tracking-tight text-primary">ToolsYourWay</span>
            <Badge variant="secondary" className="text-[10px] ml-1">
              <Shield className="h-3 w-3 mr-0.5" />
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-admin-logout">
              <LogOut className="h-4 w-4 mr-1" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-foreground" data-testid="text-admin-title">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform overview and user management</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))
          ) : (
            <>
              <Card data-testid="stat-total-users">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(30,22,80,0.08)" }}>
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{stats?.userCount ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Total Users</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="stat-active-subs">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(13,158,152,0.08)" }}>
                      <CreditCard className="h-4 w-4" style={{ color: "#0D9E98" }} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{stats?.activeSubscriptions ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Active Subs</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="stat-mrr">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,138,26,0.08)" }}>
                      <DollarSign className="h-4 w-4" style={{ color: "#C98A1A" }} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {stats ? formatCurrency(stats.totalRevenue) : "$0.00"}
                      </div>
                      <div className="text-xs text-muted-foreground">MRR</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="stat-plan-breakdown">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(61,48,154,0.08)" }}>
                      <BarChart3 className="h-4 w-4" style={{ color: "#3D309A" }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {stats?.planBreakdown
                          ? Object.entries(stats.planBreakdown).map(([plan, count]) => (
                              <span key={plan} className="mr-2">
                                {plan}: {count}
                              </span>
                            ))
                          : "—"
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">Plan Breakdown</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* External Links */}
        <div className="flex gap-3 mb-8">
          <Button variant="outline" size="sm" asChild data-testid="link-razorpay">
            <a href="https://dashboard.razorpay.com" target="_blank" rel="noopener noreferrer">
              Razorpay Dashboard
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild data-testid="link-stripe">
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
              Stripe Dashboard
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>

        {/* Users Table */}
        <Card className="mb-8" data-testid="card-users-table">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {usersLoading ? (
              <div className="p-6">
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u) => (
                      <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                        <TableCell className="font-medium text-sm">{u.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.plan && u.plan !== "none" ? "default" : "secondary"} className="text-xs">
                            {u.plan && u.plan !== "none" ? u.plan : "Free"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={u.role === "admin" ? "default" : "outline"}
                            className="text-xs"
                            style={u.role === "admin" ? { background: "#C98A1A" } : {}}
                          >
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!users || users.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscriptions Table */}
        <Card data-testid="card-subscriptions-table">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {subsLoading ? (
              <div className="p-6">
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Gateway</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Start Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions?.map((sub) => (
                      <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`}>
                        <TableCell className="text-sm">{sub.userId}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="text-xs">{sub.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={sub.status === "active" ? "default" : "secondary"}
                            className="text-xs"
                            style={sub.status === "active" ? { background: "#0D9E98" } : {}}
                          >
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sub.paymentGateway ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {sub.amount ? formatCurrency(sub.amount) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(sub.startDate).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!subscriptions || subscriptions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                          No subscriptions yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
