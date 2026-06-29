// Growth Missions index page.
// Shows all of the user's Nexus-orchestrated campaigns with quick stats and a
// "Start a Mission" form. Clicking a row opens the detail page.

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Plus, Target, Sparkles, Mail, Calendar, ChevronRight } from "lucide-react";

interface Mission {
  id: number;
  name: string;
  goal: string;
  platform: string;
  targetMetric: string | null;
  targetValue: number | null;
  postsPerWeek: number;
  durationDays: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  reviewChannel: string;
  reviewEmail: string | null;
}

export default function MissionsPage() {
  const [, nav] = useLocation();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [goal, setGoal] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [durationDays, setDurationDays] = useState(60);

  const missions = useQuery<Mission[]>({
    queryKey: ["/api/missions"],
    queryFn: async () => (await apiRequest("GET", "/api/missions")).json(),
  });

  const createMission = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/missions", {
        goal, platform, postsPerWeek, durationDays,
      });
      return res.json();
    },
    onSuccess: (data) => {
      const emailLine = data.email?.sent
        ? "Review email sent — check your inbox AND spam folder (mark as 'Not spam' so future drafts land in inbox)."
        : data.email?.reason
          ? `Review email not sent: ${data.email.reason}`
          : "Drafts are ready in-app.";
      toast({
        title: `Mission launched — ${data.posts?.length || 0} drafts ready`,
        description: emailLine,
        duration: 9000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/missions"] });
      if (data.mission?.id) nav(`/missions/${data.mission.id}`);
    },
    onError: (err: any) => {
      toast({ title: "Mission failed", description: err.message || "Could not create mission", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav("/dashboard")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2 ml-2">
              <Target className="w-5 h-5 text-primary" />
              <h1 className="text-base font-semibold">Growth Missions</h1>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowForm((v) => !v)} data-testid="button-new-mission">
            <Plus className="w-4 h-4 mr-1" /> New Mission
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-amber-50/30 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold mb-1">Nexus runs the campaign end-to-end</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tell Nexus your goal. It reads your connected social profile, builds a plan, drafts every post (copy + AI image),
                emails you the batch for review, and only publishes what you approve — on the schedule you set.
              </p>
            </div>
          </div>
        </div>

        {showForm && (
          <Card data-testid="card-new-mission">
            <CardHeader>
              <CardTitle className="text-base">Start a Growth Mission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="goal" className="text-xs">Goal (one sentence)</Label>
                <Textarea
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Grow my LinkedIn from current to 50,000 followers in 60 days. I'm a TA leader building a recruitment platform."
                  className="mt-1 text-sm min-h-[80px]"
                  data-testid="input-goal"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="platform" className="text-xs">Platform</Label>
                  <select
                    id="platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full mt-1 text-sm border rounded-md px-2 py-2 bg-background"
                    data-testid="select-platform"
                  >
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitter">X / Twitter</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="cadence" className="text-xs">Posts / week</Label>
                  <Input
                    id="cadence"
                    type="number"
                    min={1} max={7}
                    value={postsPerWeek}
                    onChange={(e) => setPostsPerWeek(Number(e.target.value))}
                    className="mt-1 text-sm"
                    data-testid="input-cadence"
                  />
                </div>
                <div>
                  <Label htmlFor="duration" className="text-xs">Duration (days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={7} max={180}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="mt-1 text-sm"
                    data-testid="input-duration"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={() => createMission.mutate()}
                  disabled={!goal.trim() || createMission.isPending}
                  data-testid="button-launch-mission"
                >
                  {createMission.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Nexus is planning…</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-1" /> Launch Mission</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {missions.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (missions.data || []).length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Target className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">No missions yet</p>
              <p className="text-xs text-muted-foreground mb-4">Tell Nexus a goal and watch it ship.</p>
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> Start your first Mission
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(missions.data || []).map((m) => (
              <Link key={m.id} href={`/missions/${m.id}`}>
                <Card className="hover:border-primary/40 transition cursor-pointer" data-testid={`card-mission-${m.id}`}>
                  <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold truncate">{m.name}</span>
                        <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-[10px]">{m.status}</Badge>
                        <Badge variant="outline" className="text-[10px] uppercase">{m.platform}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{m.goal}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        {m.targetValue && <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {m.targetValue.toLocaleString()}</span>}
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {m.postsPerWeek}/wk · {m.durationDays}d</span>
                        {m.reviewChannel === "email" && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email review</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
