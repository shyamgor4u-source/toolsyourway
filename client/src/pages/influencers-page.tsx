import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TrialBanner } from "@/components/trial-banner";
import {
  ArrowLeft, FileText, Calculator, Briefcase, Calendar as CalendarIcon,
  Sparkles, Loader2, Plus, ExternalLink, Trash2, DollarSign,
} from "lucide-react";

export default function InfluencersPage() {
  const [, nav] = useLocation();
  const [tab, setTab] = useState("mediaKit");
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav("/dashboard")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <span className="font-bold text-primary">Influencer Suite</span>
          </div>
        </div>
      </header>
      <TrialBanner />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="mediaKit" data-testid="tab-media-kit"><FileText className="w-3.5 h-3.5 mr-1" />Media Kit</TabsTrigger>
            <TabsTrigger value="rate" data-testid="tab-rate"><Calculator className="w-3.5 h-3.5 mr-1" />Rate Card</TabsTrigger>
            <TabsTrigger value="collabs" data-testid="tab-collabs"><Briefcase className="w-3.5 h-3.5 mr-1" />Collabs</TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar"><CalendarIcon className="w-3.5 h-3.5 mr-1" />Calendar</TabsTrigger>
          </TabsList>
          <TabsContent value="mediaKit"><MediaKitTab /></TabsContent>
          <TabsContent value="rate"><RateCardTab /></TabsContent>
          <TabsContent value="collabs"><CollabsTab /></TabsContent>
          <TabsContent value="calendar"><CalendarTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ============================================================
// MEDIA KIT
// ============================================================
function MediaKitTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    creatorName: "", niche: "", bio: "", contactEmail: "",
    ig_followers: "", yt_subs: "", tiktok_followers: "", avg_views: "", engagement_rate: "",
    ig_post: "", ig_story: "", ig_reel: "", yt_dedicated: "", tiktok_video: "",
    pastBrands: "",
  });
  const { data: kits = [] } = useQuery<any[]>({
    queryKey: ["/api/influencers/media-kits"],
    queryFn: async () => (await apiRequest("GET", "/api/influencers/media-kits")).json(),
  });
  const saveMut = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/influencers/media-kit", {
      creatorName: form.creatorName, niche: form.niche, bio: form.bio, contactEmail: form.contactEmail,
      stats: {
        ig_followers: Number(form.ig_followers) || undefined,
        yt_subs: Number(form.yt_subs) || undefined,
        tiktok_followers: Number(form.tiktok_followers) || undefined,
        avg_views: Number(form.avg_views) || undefined,
        engagement_rate: Number(form.engagement_rate) || undefined,
      },
      rateCard: {
        ig_post: Number(form.ig_post) || undefined,
        ig_story: Number(form.ig_story) || undefined,
        ig_reel: Number(form.ig_reel) || undefined,
        yt_dedicated: Number(form.yt_dedicated) || undefined,
        tiktok_video: Number(form.tiktok_video) || undefined,
      },
      pastBrands: form.pastBrands.split(",").map(s => s.trim()).filter(Boolean),
    })).json(),
    onSuccess: () => {
      toast({ title: "Media kit saved", description: "Click 'Open Kit' to view or share." });
      queryClient.invalidateQueries({ queryKey: ["/api/influencers/media-kits"] });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Your Media Kit</CardTitle>
          <p className="text-xs text-muted-foreground">Shareable HTML page brands can view. Update stats anytime.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Creator Name *</Label><Input value={form.creatorName} onChange={e => setForm({ ...form, creatorName: e.target.value })} data-testid="input-creator-name" /></div>
            <div><Label className="text-xs">Niche</Label><Input value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} placeholder="Tech / Fashion / Fitness" /></div>
          </div>
          <div><Label className="text-xs">Bio</Label><Textarea rows={2} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="2-3 sentences about your content" /></div>
          <div><Label className="text-xs">Contact Email</Label><Input value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} type="email" /></div>

          <div className="pt-2 border-t">
            <Label className="text-xs font-semibold">Stats</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              <Input placeholder="IG" value={form.ig_followers} onChange={e => setForm({ ...form, ig_followers: e.target.value })} type="number" data-testid="input-ig-followers" />
              <Input placeholder="YT" value={form.yt_subs} onChange={e => setForm({ ...form, yt_subs: e.target.value })} type="number" />
              <Input placeholder="TikTok" value={form.tiktok_followers} onChange={e => setForm({ ...form, tiktok_followers: e.target.value })} type="number" />
              <Input placeholder="Avg views" value={form.avg_views} onChange={e => setForm({ ...form, avg_views: e.target.value })} type="number" />
              <Input placeholder="ER %" value={form.engagement_rate} onChange={e => setForm({ ...form, engagement_rate: e.target.value })} type="number" step="0.1" />
            </div>
          </div>

          <div className="pt-2 border-t">
            <Label className="text-xs font-semibold">Rate Card (USD)</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              <Input placeholder="IG post" value={form.ig_post} onChange={e => setForm({ ...form, ig_post: e.target.value })} type="number" />
              <Input placeholder="IG story" value={form.ig_story} onChange={e => setForm({ ...form, ig_story: e.target.value })} type="number" />
              <Input placeholder="IG reel" value={form.ig_reel} onChange={e => setForm({ ...form, ig_reel: e.target.value })} type="number" />
              <Input placeholder="YT dedicated" value={form.yt_dedicated} onChange={e => setForm({ ...form, yt_dedicated: e.target.value })} type="number" />
              <Input placeholder="TikTok video" value={form.tiktok_video} onChange={e => setForm({ ...form, tiktok_video: e.target.value })} type="number" />
            </div>
          </div>

          <div><Label className="text-xs">Past Brand Partners (comma separated)</Label><Input value={form.pastBrands} onChange={e => setForm({ ...form, pastBrands: e.target.value })} placeholder="Nike, Apple, Adidas" /></div>

          <Button onClick={() => saveMut.mutate()} disabled={!form.creatorName || saveMut.isPending} className="w-full bg-[#1E1650] hover:bg-[#3D309A]" data-testid="button-save-kit">
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Save Media Kit
          </Button>
        </CardContent>
      </Card>

      {kits.map((k: any) => (
        <Card key={k.id} data-testid={`kit-${k.id}`}>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{k.creatorName}</div>
              <div className="text-xs text-muted-foreground">{k.niche}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.open(`/api/influencers/media-kits/${k.id}/html`, "_blank")} data-testid={`button-open-kit-${k.id}`}>
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Open Kit
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// RATE CARD CALCULATOR
// ============================================================
function RateCardTab() {
  const [form, setForm] = useState({ followerCount: "", engagementRate: "3", niche: "lifestyle", geo: "US" });
  const [result, setResult] = useState<any>(null);
  const calcMut = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/influencers/rate-card", {
      followerCount: Number(form.followerCount), engagementRate: Number(form.engagementRate), niche: form.niche, geo: form.geo,
    })).json(),
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rate Card Calculator</CardTitle>
          <p className="text-xs text-muted-foreground">Industry-standard pricing: follower count, engagement, niche, and geography.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Follower Count *</Label><Input type="number" value={form.followerCount} onChange={e => setForm({ ...form, followerCount: e.target.value })} placeholder="10000" data-testid="input-follower-count" /></div>
            <div><Label className="text-xs">Engagement Rate % (optional)</Label><Input type="number" step="0.1" value={form.engagementRate} onChange={e => setForm({ ...form, engagementRate: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Niche</Label>
              <Select value={form.niche} onValueChange={v => setForm({ ...form, niche: v })}>
                <SelectTrigger data-testid="select-niche"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["tech", "finance", "business", "beauty", "fashion", "fitness", "food", "travel", "lifestyle", "entertainment"].map(n =>
                    <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Region</Label>
              <Select value={form.geo} onValueChange={v => setForm({ ...form, geo: v })}>
                <SelectTrigger data-testid="select-geo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">US</SelectItem>
                  <SelectItem value="UK">UK</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="EU">Europe</SelectItem>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="MENA">MENA</SelectItem>
                  <SelectItem value="SEA">SEA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => calcMut.mutate()} disabled={!form.followerCount || calcMut.isPending} className="w-full bg-[#1E1650] hover:bg-[#3D309A]" data-testid="button-calc">
            {calcMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
            Calculate Rate Card
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base">Your Recommended Rates</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: "ig_post", label: "Instagram Post" },
                { k: "ig_story", label: "Instagram Story" },
                { k: "ig_reel", label: "Instagram Reel" },
                { k: "yt_dedicated", label: "YouTube Dedicated" },
                { k: "yt_integration", label: "YouTube Integration" },
                { k: "tiktok_video", label: "TikTok Video" },
              ].map(r => (
                <div key={r.k} className="p-3 border rounded-lg flex items-center justify-between" data-testid={`rate-${r.k}`}>
                  <span className="text-sm font-medium">{r.label}</span>
                  <span className="font-bold text-[#E9A820]">${Intl.NumberFormat().format(result[r.k])}</span>
                </div>
              ))}
            </div>
            {result.breakdown && (
              <div className="mt-4 text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                <div className="font-semibold mb-1">Breakdown</div>
                Base: ${result.breakdown.basePerPost}/post · Engagement: {result.breakdown.engagementMultiplier}x · Niche: {result.breakdown.nicheMultiplier}x · Geo: {result.breakdown.geoMultiplier}x · Final: {result.breakdown.finalMultiplier}x
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// COLLAB PIPELINE (Kanban)
// ============================================================
const STAGES = [
  { key: "pitched", label: "Pitched", color: "bg-gray-100 text-gray-700" },
  { key: "negotiating", label: "Negotiating", color: "bg-blue-100 text-blue-700" },
  { key: "delivering", label: "Delivering", color: "bg-amber-100 text-amber-700" },
  { key: "completed", label: "Completed", color: "bg-green-100 text-green-700" },
  { key: "paid", label: "Paid", color: "bg-emerald-100 text-emerald-700" },
];

function CollabsTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ brandName: "", contactName: "", contactEmail: "", dealValue: "", currency: "USD", deadline: "", notes: "" });
  const { data: list = [] } = useQuery<any[]>({
    queryKey: ["/api/influencers/collabs"],
    queryFn: async () => (await apiRequest("GET", "/api/influencers/collabs")).json(),
  });
  const addMut = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/influencers/collabs", {
      ...form, dealValue: Number(form.dealValue) * 100 || undefined,
    })).json(),
    onSuccess: () => {
      toast({ title: "Collab added" });
      queryClient.invalidateQueries({ queryKey: ["/api/influencers/collabs"] });
      setForm({ brandName: "", contactName: "", contactEmail: "", dealValue: "", currency: "USD", deadline: "", notes: "" });
    },
  });
  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) => (await apiRequest("PATCH", `/api/influencers/collabs/${id}`, { stage })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/influencers/collabs"] }),
  });
  const delMut = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/influencers/collabs/${id}`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/influencers/collabs"] }),
  });

  const totalPaid = list.filter(c => c.stage === "paid").reduce((s, c) => s + (c.dealValue || 0), 0) / 100;
  const totalPipeline = list.filter(c => c.stage !== "paid").reduce((s, c) => s + (c.dealValue || 0), 0) / 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4 flex items-center justify-between"><span className="text-xs text-muted-foreground">In Pipeline</span><span className="font-bold text-[#1E1650] text-lg">${totalPipeline.toLocaleString()}</span></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between"><span className="text-xs text-muted-foreground">Earned</span><span className="font-bold text-green-700 text-lg">${totalPaid.toLocaleString()}</span></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Add Collab</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Brand name *" value={form.brandName} onChange={e => setForm({ ...form, brandName: e.target.value })} data-testid="input-brand-name" />
            <Input placeholder="Deal value" type="number" value={form.dealValue} onChange={e => setForm({ ...form, dealValue: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Contact name" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
            <Input placeholder="Contact email" type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Deadline (YYYY-MM-DD)" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
            <Input placeholder="Currency" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} />
          </div>
          <Textarea rows={2} placeholder="Notes / deliverables" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <Button onClick={() => addMut.mutate()} disabled={!form.brandName || addMut.isPending} className="w-full bg-[#1E1650] hover:bg-[#3D309A]" data-testid="button-add-collab">
            <Plus className="w-4 h-4 mr-2" />
            Add to Pipeline
          </Button>
        </CardContent>
      </Card>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {STAGES.map(s => (
          <div key={s.key} className="space-y-2" data-testid={`stage-${s.key}`}>
            <div className={`p-2 rounded text-xs font-semibold text-center ${s.color}`}>{s.label} ({list.filter(c => c.stage === s.key).length})</div>
            {list.filter(c => c.stage === s.key).map(c => (
              <Card key={c.id} className="shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="font-semibold text-xs truncate">{c.brandName}</div>
                  {c.dealValue != null && c.dealValue > 0 && <div className="text-sm font-bold text-[#E9A820]">{c.currency} {(c.dealValue / 100).toLocaleString()}</div>}
                  {c.deadline && <div className="text-[10px] text-muted-foreground">Due: {c.deadline}</div>}
                  <div className="flex gap-1 flex-wrap">
                    {STAGES.filter(t => t.key !== c.stage).map(t => (
                      <Button key={t.key} size="sm" variant="outline" className="h-6 text-[9px] px-1.5" onClick={() => updateStage.mutate({ id: c.id, stage: t.key })}>
                        → {t.label}
                      </Button>
                    ))}
                    <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => delMut.mutate(c.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// CONTENT CALENDAR
// ============================================================
function CalendarTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ niche: "", platforms: ["instagram", "tiktok"], days: "30" });
  const { data: list = [] } = useQuery<any[]>({
    queryKey: ["/api/influencers/calendar"],
    queryFn: async () => (await apiRequest("GET", "/api/influencers/calendar")).json(),
  });
  const genMut = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/influencers/calendar/auto-fill", {
      niche: form.niche, platforms: form.platforms, days: Number(form.days),
    })).json(),
    onSuccess: (data) => {
      toast({ title: "Calendar filled", description: `${data.added} content ideas added.` });
      queryClient.invalidateQueries({ queryKey: ["/api/influencers/calendar"] });
    },
  });
  const delMut = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/influencers/calendar/${id}`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/influencers/calendar"] }),
  });

  const togglePlatform = (p: string) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p],
    }));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Content Calendar</CardTitle>
          <p className="text-xs text-muted-foreground">Generate 30-60 content ideas with hooks, captions, and hashtags.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Your niche (e.g. fitness, tech, fashion)" value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} data-testid="input-calendar-niche" />
          <div>
            <Label className="text-xs mb-2 block">Platforms</Label>
            <div className="flex gap-2 flex-wrap">
              {["instagram", "tiktok", "youtube", "twitter"].map(p => (
                <Button key={p} size="sm" variant={form.platforms.includes(p) ? "default" : "outline"} onClick={() => togglePlatform(p)} data-testid={`button-platform-${p}`}>
                  {p}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Days</Label><Input type="number" value={form.days} onChange={e => setForm({ ...form, days: e.target.value })} min="7" max="60" /></div>
          </div>
          <Button onClick={() => genMut.mutate()} disabled={!form.niche || form.platforms.length === 0 || genMut.isPending} className="w-full bg-[#1E1650] hover:bg-[#3D309A]" data-testid="button-generate-calendar">
            {genMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate {form.days}-Day Calendar
          </Button>
        </CardContent>
      </Card>

      {list.length > 0 && (
        <div className="space-y-2">
          {list.map((e: any) => (
            <Card key={e.id} data-testid={`calendar-${e.id}`}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className="text-center flex-shrink-0 min-w-[70px]">
                  <div className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                  <Badge variant="secondary" className="text-[9px] mt-1">{e.platform}</Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{e.topic}</div>
                  {e.hook && <div className="text-xs text-muted-foreground italic">"{e.hook}"</div>}
                  {e.caption && <div className="text-xs mt-1 line-clamp-2">{e.caption}</div>}
                  {e.hashtags && <div className="text-[10px] text-[#1E1650] mt-1 truncate">{e.hashtags}</div>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => delMut.mutate(e.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
