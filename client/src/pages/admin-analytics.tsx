import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, TrendingUp, Users, Clock, CheckCircle2, XCircle, RotateCcw,
  DollarSign, Percent, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

interface Funnel {
  periodDays: number;
  funnel: {
    signups: number;
    active: number;
    expired: number;
    resumed: number;
    converted: number;
  };
  rates: {
    conversionRate: number;
    resumeRate: number;
    activeRate: number;
  };
  cohort: { day: string; signups: number; converted: number }[];
}

export default function AdminAnalyticsPage() {
  const [, nav] = useLocation();
  const [period, setPeriod] = useState("30");

  const { data: funnel, isLoading } = useQuery<Funnel>({
    queryKey: ["/api/admin/trial-funnel", period],
    queryFn: async () => (await apiRequest("GET", `/api/admin/trial-funnel?days=${period}`)).json(),
    refetchInterval: 60_000,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/stats")).json(),
  });

  const f = funnel?.funnel;
  const r = funnel?.rates;

  // Funnel bars for visualization
  const funnelData = f ? [
    { stage: "Signups", count: f.signups, color: "#1E1650" },
    { stage: "Active Trial", count: f.active, color: "#3D309A" },
    { stage: "Expired", count: f.expired, color: "#E9A820" },
    { stage: "Resumed", count: f.resumed, color: "#F3BC50" },
    { stage: "Converted", count: f.converted, color: "#0D9E98" },
  ] : [];

  const pieData = f ? [
    { name: "Active", value: f.active, color: "#3D309A" },
    { name: "Expired", value: f.expired - f.resumed, color: "#E9A820" },
    { name: "Resumed", value: f.resumed, color: "#F3BC50" },
    { name: "Converted", value: f.converted, color: "#0D9E98" },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav("/admin")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Admin
            </Button>
            <span className="font-bold text-primary">Trial Funnel Analytics</span>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground" data-testid="loading">Loading analytics…</div>
        ) : (
          <>
            {/* Top Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Conversion Rate"
                value={`${r?.conversionRate ?? 0}%`}
                icon={Percent}
                color="#0D9E98"
                tooltip="Signups who picked a plan"
                testId="metric-conversion"
              />
              <MetricCard
                label="Resume Rate"
                value={`${r?.resumeRate ?? 0}%`}
                icon={RotateCcw}
                color="#E9A820"
                tooltip="Expired users who clicked 'Get 3 More Days'"
                testId="metric-resume"
              />
              <MetricCard
                label="Active Rate"
                value={`${r?.activeRate ?? 0}%`}
                icon={Clock}
                color="#3D309A"
                tooltip="Signups still in active trial window"
                testId="metric-active"
              />
              <MetricCard
                label="Revenue MRR"
                value={`$${stats?.totalRevenue != null ? (stats.totalRevenue / 100).toLocaleString() : "0"}`}
                icon={DollarSign}
                color="#1E1650"
                tooltip="Total monthly recurring revenue"
                testId="metric-revenue"
              />
            </div>

            {/* Funnel + Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#1E1650]" />
                    Funnel (last {funnel?.periodDays || 30} days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={funnelData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, border: "1px solid #ccc", borderRadius: 6 }}
                        cursor={{ fill: "#f5f5f5" }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {funnelData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <FunnelSummary f={f} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#1E1650]" />
                    User Status Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          label={(entry: any) => `${entry.name}: ${entry.value}`}
                          labelLine={false}
                          style={{ fontSize: 11 }}
                        >
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No trial data yet</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Cohort Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Cohort</CardTitle>
                <p className="text-xs text-muted-foreground">Signups and conversions per day over the selected period</p>
              </CardHeader>
              <CardContent>
                {funnel?.cohort && funnel.cohort.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={funnel.cohort} margin={{ left: 0, right: 20, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="signups" stroke="#1E1650" strokeWidth={2} dot={{ r: 3 }} name="Signups" />
                      <Line type="monotone" dataKey="converted" stroke="#0D9E98" strokeWidth={2} dot={{ r: 3 }} name="Converted" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground" data-testid="no-cohort">
                    No signups in this period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plan Breakdown */}
            {stats?.planBreakdown && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue by Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(stats.planBreakdown).map(([plan, val]: [string, any]) => {
                      // planBreakdown values can be either a number (count) or an object {count, revenue}
                      const count = typeof val === "number" ? val : (val?.count ?? 0);
                      const revenue = typeof val === "number" ? null : (val?.revenue ?? null);
                      return (
                        <div key={plan} className="p-3 border rounded-lg" data-testid={`plan-${plan}`}>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">{plan}</div>
                          <div className="text-lg font-bold text-[#1E1650] mt-1">{count} {count === 1 ? "user" : "users"}</div>
                          {revenue != null && <div className="text-xs text-[#E9A820] font-semibold">${(revenue / 100).toLocaleString()}/mo</div>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, tooltip, testId }: any) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
        </div>
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{tooltip}</div>
      </CardContent>
    </Card>
  );
}

function FunnelSummary({ f }: { f?: Funnel["funnel"] }) {
  if (!f) return null;
  const stages = [
    { label: "Signups", count: f.signups, prev: null, icon: Users, color: "text-[#1E1650]" },
    { label: "Active", count: f.active, prev: f.signups, icon: Clock, color: "text-[#3D309A]" },
    { label: "Expired", count: f.expired, prev: f.signups, icon: XCircle, color: "text-[#E9A820]" },
    { label: "Resumed", count: f.resumed, prev: f.expired, icon: RotateCcw, color: "text-[#F3BC50]" },
    { label: "Converted", count: f.converted, prev: f.signups, icon: CheckCircle2, color: "text-[#0D9E98]" },
  ];

  return (
    <div className="mt-4 space-y-1.5 border-t pt-3">
      {stages.map((s) => {
        const pct = s.prev && s.prev > 0 ? ((s.count / s.prev) * 100).toFixed(1) : null;
        return (
          <div key={s.label} className="flex items-center justify-between text-xs" data-testid={`funnel-${s.label.toLowerCase()}`}>
            <div className="flex items-center gap-2">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <span className="font-medium">{s.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{s.count}</span>
              {pct && <Badge variant="outline" className="text-[9px] py-0 px-1.5">{pct}%</Badge>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
