// Mission detail page — shows the plan + every draft post in the mission with
// approve / reject / regenerate controls. Approved posts are picked up by the
// existing publish worker on schedule.

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Mail, PauseCircle, PlayCircle, Sparkles, Calendar, ImageIcon, Target, AlertCircle, LinkIcon, PlugZap,
} from "lucide-react";

interface Post {
  id: number;
  content: string;
  imageUrl: string | null;
  pillar: string | null;
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  platform: string;
  lastError?: string | null;
  publishAttempts?: number | null;
  destinationPlatform?: string | null;
}

interface Readiness {
  platform: string;
  platformLabel: string;
  connected: boolean;
  canPublish: boolean;
  code: "ready" | "not_connected" | "no_destination";
  reason: string | null;
  availableDestinationCount: number;
  destinationNames: string[];
}

interface Mission {
  id: number;
  name: string;
  goal: string;
  platform: string;
  targetValue: number | null;
  postsPerWeek: number;
  durationDays: number;
  status: string;
  pillars: string | null;
  voice: string | null;
  audience: string | null;
  reviewEmail: string | null;
  reviewChannel: string;
}

export default function MissionDetailPage() {
  const [, params] = useRoute<{ id: string }>("/missions/:id");
  const [, nav] = useLocation();
  const { toast } = useToast();
  const id = Number(params?.id);

  const detail = useQuery<{ mission: Mission; posts: Post[]; readiness?: Readiness }>({
    queryKey: [`/api/missions/${id}`],
    queryFn: async () => (await apiRequest("GET", `/api/missions/${id}`)).json(),
    enabled: !!id,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [`/api/missions/${id}`] });

  const generateBatch = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/missions/${id}/generate-batch`, { count: 7 })).json(),
    onSuccess: (data) => {
      const emailLine = data.email?.sent
        ? "Review email sent — check inbox AND spam folder."
        : data.email?.reason
          ? `Email not sent: ${data.email.reason}`
          : "";
      toast({
        title: `${data.posts?.length || 0} new drafts ready`,
        description: emailLine,
        duration: 8000,
      });
      invalidate();
    },
    onError: (e: any) => toast({ title: "Generate failed", description: e.message, variant: "destructive" }),
  });

  // Surface the backend guardrail (409 not_connected / no_destination) as an
  // actionable toast instead of a generic failure.
  const onApproveError = (e: any) => {
    // apiRequest throws `${status}: ${rawJsonBody}` — pull out the clean message.
    const raw = String(e?.message || "");
    let msg = raw;
    const jsonStart = raw.indexOf("{");
    if (jsonStart >= 0) {
      try { msg = JSON.parse(raw.slice(jsonStart))?.message || raw; } catch { /* keep raw */ }
    }
    toast({
      title: `Connect ${platformName} to approve`,
      description: `${msg} Connect ${platformName} and choose a profile/page in the Marketing Bot, then approve.`,
      variant: "destructive",
      duration: 9000,
    });
  };
  const approve = useMutation({
    mutationFn: async (postId: number) => (await apiRequest("POST", `/api/missions/${id}/posts/${postId}/approve`)).json(),
    onSuccess: () => { toast({ title: "Approved & scheduled" }); invalidate(); },
    onError: onApproveError,
  });
  const reject = useMutation({
    mutationFn: async (postId: number) => (await apiRequest("POST", `/api/missions/${id}/posts/${postId}/reject`)).json(),
    onSuccess: () => { toast({ title: "Rejected" }); invalidate(); },
  });
  const approveAll = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/missions/${id}/approve-all`)).json(),
    onSuccess: (data) => { toast({ title: `Approved ${data?.approved ?? "all"} drafts` }); invalidate(); },
    onError: onApproveError,
  });
  const sendReview = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/missions/${id}/send-review`)).json(),
    onSuccess: (data) =>
      toast({
        title: data.sent ? `Review email sent (${data.count || 0} drafts)` : "Email not sent",
        description: data.sent
          ? "Check inbox AND spam folder. Mark as 'Not spam' so future emails land in inbox."
          : data.reason || "Try again in a moment.",
        variant: data.sent ? "default" : "destructive",
        duration: 8000,
      }),
  });
  const setStatus = useMutation({
    mutationFn: async (status: string) => (await apiRequest("POST", `/api/missions/${id}/status`, { status })).json(),
    onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: ["/api/missions"] }); },
  });

  if (detail.isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!detail.data) {
    return <div className="text-center py-20 text-muted-foreground">Mission not found.</div>;
  }
  const { mission, posts, readiness } = detail.data;
  const canApprove = readiness?.canPublish ?? true;
  const platformName = readiness?.platformLabel || "LinkedIn";
  const pillars: string[] = (() => { try { return JSON.parse(mission.pillars || "[]"); } catch { return []; } })();
  const drafts = posts.filter((p) => p.status === "draft");
  const approved = posts.filter((p) => ["approved", "publishing"].includes(p.status));
  const published = posts.filter((p) => p.status === "published");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => nav("/missions")} data-testid="button-back-missions">
              <ArrowLeft className="w-4 h-4 mr-1" /> Missions
            </Button>
            <span className="text-base font-semibold truncate">{mission.name}</span>
            <Badge variant={mission.status === "active" ? "default" : "secondary"} className="text-[10px]">{mission.status}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {mission.status === "active" ? (
              <Button variant="outline" size="sm" onClick={() => setStatus.mutate("paused")}>
                <PauseCircle className="w-4 h-4 mr-1" /> Pause
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setStatus.mutate("active")}>
                <PlayCircle className="w-4 h-4 mr-1" /> Resume
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Publish-readiness guardrail: LinkedIn (or mission platform) not connected
            or no destination selected. Approved posts can never publish until this
            is fixed, so we warn prominently and gate the Approve actions. */}
        {readiness && !canApprove && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3.5 flex items-start gap-3" data-testid="banner-linkedin-guardrail">
            <PlugZap className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-red-900">
              <strong className="block mb-0.5">
                {readiness.code === "not_connected"
                  ? `${platformName} is not connected for this mission.`
                  : `No ${platformName} profile or page is selected.`}
              </strong>
              <span className="text-red-800/90">
                Connect {platformName} and choose a profile/page before approving these posts — otherwise
                approved posts stay queued and never publish.
              </span>
            </div>
            <Button
              size="sm"
              className="bg-[#1E1650] hover:bg-[#1E1650]/90 text-white flex-shrink-0"
              onClick={() => nav("/bot/marketing")}
              data-testid="button-connect-linkedin"
            >
              <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Connect {platformName}
            </Button>
          </div>
        )}
        {readiness && canApprove && readiness.destinationNames.length > 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 flex items-center gap-2.5 text-xs text-emerald-900" data-testid="banner-linkedin-ready">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              {platformName} connected — approved posts publish to{" "}
              <strong>{readiness.destinationNames.join(", ")}</strong>.
            </span>
          </div>
        )}

        {/* Spam-folder reminder banner */}
        {mission.reviewChannel === "email" && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <strong>First-time emails often land in Spam.</strong> Search your inbox for {"\""}
              <span className="font-mono">hello@toolsyourway.com</span>{"\""} — if you find it in Spam/Junk,
              mark it as <strong>“Not spam”</strong> and add the sender to your contacts so future Nexus
              drafts land in your inbox. You can always review &amp; approve every post here in-app.
            </div>
          </div>
        )}

        {/* Mission overview */}
        <Card>
          <CardContent className="py-5 px-5 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-muted-foreground mb-1">Goal</div>
              <div className="font-medium">{mission.goal}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Target</div>
              <div className="font-medium flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> {mission.targetValue?.toLocaleString() || "—"} {mission.targetValue ? "followers" : ""}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Cadence</div>
              <div className="font-medium">{mission.postsPerWeek} posts/week · {mission.durationDays} days</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Review channel</div>
              <div className="font-medium flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {mission.reviewEmail || "in-app"}</div>
            </div>
            {pillars.length > 0 && (
              <div className="md:col-span-4">
                <div className="text-muted-foreground mb-1.5">Content pillars</div>
                <div className="flex flex-wrap gap-1.5">
                  {pillars.map((p) => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="py-4 text-center">
            <div className="text-2xl font-semibold">{drafts.length}</div>
            <div className="text-[11px] text-muted-foreground">Awaiting review</div>
          </CardContent></Card>
          <Card><CardContent className="py-4 text-center">
            <div className="text-2xl font-semibold text-emerald-600">{approved.length}</div>
            <div className="text-[11px] text-muted-foreground">Approved · scheduled</div>
          </CardContent></Card>
          <Card><CardContent className="py-4 text-center">
            <div className="text-2xl font-semibold text-blue-600">{published.length}</div>
            <div className="text-[11px] text-muted-foreground">Published</div>
          </CardContent></Card>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => generateBatch.mutate()} disabled={generateBatch.isPending} data-testid="button-generate-batch">
            {generateBatch.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Drafting…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-1" /> Generate next 7 posts</>
            )}
          </Button>
          {drafts.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => approveAll.mutate()}
                disabled={!canApprove || approveAll.isPending}
                title={canApprove ? undefined : `Connect ${platformName} before approving`}
                data-testid="button-approve-all"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Approve all {drafts.length}
              </Button>
              <Button size="sm" variant="outline" onClick={() => sendReview.mutate()}>
                <Mail className="w-4 h-4 mr-1" /> Email me drafts
              </Button>
            </>
          )}
        </div>

        {/* Posts grid */}
        <div className="space-y-3">
          {posts.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
              No posts yet. Click "Generate next 7 posts" to start.
            </CardContent></Card>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} canApprove={canApprove} platformName={platformName} onConnect={() => nav("/bot/marketing")} onApprove={() => approve.mutate(p.id)} onReject={() => reject.mutate(p.id)} />)
          )}
        </div>
      </main>
    </div>
  );
}

function PostCard({ post, canApprove, platformName, onApprove, onReject, onConnect }: {
  post: Post;
  canApprove: boolean;
  platformName: string;
  onApprove: () => void;
  onReject: () => void;
  onConnect: () => void;
}) {
  const isDraft = post.status === "draft";
  const isFailed = post.status === "failed" || post.status === "partial_failed";
  const statusColor =
    post.status === "draft" ? "bg-amber-100 text-amber-800"
      : post.status === "approved" || post.status === "publishing" ? "bg-emerald-100 text-emerald-800"
      : post.status === "published" ? "bg-blue-100 text-blue-800"
      : post.status === "cancelled" ? "bg-gray-100 text-gray-700"
      : "bg-red-100 text-red-800";

  // Make worker errors actionable — a missing/expired LinkedIn connection is the
  // most common cause of a queued post that never publishes.
  const err = post.lastError || "";
  const looksLikeConnection = /not connected|no longer connected|token|reconnect|no destinations/i.test(err);

  return (
    <Card id={`post-${post.id}`} data-testid={`card-post-${post.id}`}>
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-4">
          {post.imageUrl ? (
            <img src={post.imageUrl} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0 border border-border/40" />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {post.pillar && <Badge variant="outline" className="text-[10px]">{post.pillar}</Badge>}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor}`}>{post.status}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {post.scheduledFor ? new Date(post.scheduledFor).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "TBD"}
              </span>
            </div>
            <p className="text-xs whitespace-pre-wrap leading-relaxed text-foreground line-clamp-6">{post.content}</p>

            {/* Surface worker/publish errors (e.g. linkedin_not_connected, expired
                token, missing destination) with an actionable fix. */}
            {isFailed && err && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800" data-testid={`post-error-${post.id}`}>
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {post.status === "partial_failed" ? "Published to some destinations, failed on others" : "This post failed to publish"}
                </div>
                <div className="mt-1 text-red-700/90">{err}</div>
                {looksLikeConnection && (
                  <button
                    className="mt-1.5 inline-flex items-center gap-1 font-medium text-[#1E1650] underline underline-offset-2"
                    onClick={onConnect}
                    data-testid={`button-fix-connection-${post.id}`}
                  >
                    <LinkIcon className="w-3 h-3" /> Reconnect {platformName} in Marketing Bot
                  </button>
                )}
              </div>
            )}

            {isDraft && (
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  variant="default"
                  onClick={canApprove ? onApprove : onConnect}
                  title={canApprove ? undefined : `Connect ${platformName} before approving`}
                  data-testid={`button-approve-${post.id}`}
                >
                  {canApprove ? (
                    <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve & schedule</>
                  ) : (
                    <><LinkIcon className="w-3.5 h-3.5 mr-1" /> Connect {platformName} to approve</>
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={onReject} data-testid={`button-reject-${post.id}`}>
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
