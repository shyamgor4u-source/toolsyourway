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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { TrialBanner } from "@/components/trial-banner";
import {
  ArrowLeft, Presentation, Users, Rocket, Target, ExternalLink,
  Loader2, Plus, Sparkles, Trash2, Download, Copy, Check,
} from "lucide-react";

export default function FoundersPage() {
  const [, nav] = useLocation();
  const [tab, setTab] = useState("deck");
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav("/dashboard")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <span className="font-bold text-primary">Founder Suite</span>
          </div>
        </div>
      </header>
      <TrialBanner />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="deck" data-testid="tab-deck"><Presentation className="w-3.5 h-3.5 mr-1" />Pitch Deck</TabsTrigger>
            <TabsTrigger value="investors" data-testid="tab-investors"><Users className="w-3.5 h-3.5 mr-1" />Investors</TabsTrigger>
            <TabsTrigger value="launch" data-testid="tab-launch"><Rocket className="w-3.5 h-3.5 mr-1" />Launch Kit</TabsTrigger>
            <TabsTrigger value="competitors" data-testid="tab-competitors"><Target className="w-3.5 h-3.5 mr-1" />Competitors</TabsTrigger>
          </TabsList>
          <TabsContent value="deck"><PitchDeckTab /></TabsContent>
          <TabsContent value="investors"><InvestorsTab /></TabsContent>
          <TabsContent value="launch"><LaunchKitTab /></TabsContent>
          <TabsContent value="competitors"><CompetitorsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ============================================================
// PITCH DECK TAB
// ============================================================
function PitchDeckTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    companyName: "", oneLiner: "", problem: "", solution: "",
    market: "", businessModel: "", traction: "", team: "", ask: "",
  });
  const { data: decks = [] } = useQuery<any[]>({
    queryKey: ["/api/founders/pitch-decks"],
    queryFn: async () => (await apiRequest("GET", "/api/founders/pitch-decks")).json(),
  });
  const genMut = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/founders/pitch-deck", form)).json(),
    onSuccess: () => {
      toast({ title: "Pitch deck generated", description: "10 slides ready. Click 'Open Deck' to view." });
      queryClient.invalidateQueries({ queryKey: ["/api/founders/pitch-decks"] });
      setForm({ companyName: "", oneLiner: "", problem: "", solution: "", market: "", businessModel: "", traction: "", team: "", ask: "" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate a 10-Slide Pitch Deck</CardTitle>
          <p className="text-xs text-muted-foreground">Sequoia-style structure. AI fills content based on your inputs.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Company Name *</Label><Input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} data-testid="input-company" /></div>
            <div><Label className="text-xs">One-Liner *</Label><Input value={form.oneLiner} onChange={e => setForm({ ...form, oneLiner: e.target.value })} placeholder="We help X do Y by doing Z" data-testid="input-oneliner" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Problem</Label><Textarea rows={2} value={form.problem} onChange={e => setForm({ ...form, problem: e.target.value })} data-testid="input-problem" /></div>
            <div><Label className="text-xs">Solution</Label><Textarea rows={2} value={form.solution} onChange={e => setForm({ ...form, solution: e.target.value })} data-testid="input-solution" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Market</Label><Input value={form.market} onChange={e => setForm({ ...form, market: e.target.value })} placeholder="$50B TAM" /></div>
            <div><Label className="text-xs">Business Model</Label><Input value={form.businessModel} onChange={e => setForm({ ...form, businessModel: e.target.value })} placeholder="SaaS $49/mo" /></div>
            <div><Label className="text-xs">Traction</Label><Input value={form.traction} onChange={e => setForm({ ...form, traction: e.target.value })} placeholder="100 customers" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Team</Label><Input value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} placeholder="2 ex-Google founders" /></div>
            <div><Label className="text-xs">The Ask</Label><Input value={form.ask} onChange={e => setForm({ ...form, ask: e.target.value })} placeholder="$2M seed" /></div>
          </div>
          <Button onClick={() => genMut.mutate()} disabled={!form.companyName || !form.oneLiner || genMut.isPending} className="w-full bg-[#1E1650] hover:bg-[#3D309A]" data-testid="button-generate-deck">
            {genMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate 10-Slide Deck
          </Button>
        </CardContent>
      </Card>

      {decks.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Your Decks</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {decks.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`deck-${d.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{d.companyName}</div>
                  <div className="text-xs text-muted-foreground truncate">{d.oneLiner}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => window.open(`/api/founders/pitch-decks/${d.id}/html`, "_blank")} data-testid={`button-open-deck-${d.id}`}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Open Deck
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// INVESTORS TAB
// ============================================================
function InvestorsTab() {
  const [region, setRegion] = useState<string>("india");
  const { data: dir } = useQuery<any>({
    queryKey: ["/api/founders/vc-directory"],
    queryFn: async () => (await apiRequest("GET", "/api/founders/vc-directory")).json(),
  });
  const regions = [
    { key: "india", label: "India" },
    { key: "mena", label: "MENA" },
    { key: "sea", label: "SEA" },
    { key: "us", label: "US / Global" },
    { key: "global_angels", label: "Angels" },
  ];
  const currentList = dir?.[region] || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investor Directory</CardTitle>
          <p className="text-xs text-muted-foreground">Curated VCs by region. Click any to visit. Add to your Outreach Hub prospects for AI-drafted pitches.</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 flex-wrap">
            {regions.map(r => (
              <Button key={r.key} size="sm" variant={region === r.key ? "default" : "outline"} onClick={() => setRegion(r.key)} data-testid={`button-region-${r.key}`}>
                {r.label}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            {currentList.map((v: any, i: number) => (
              <div key={i} className="p-3 border rounded-lg hover:border-primary/40 transition-colors" data-testid={`vc-${i}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-semibold text-sm">{v.name}</div>
                  <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-[#1E1650] hover:text-[#E9A820] text-xs inline-flex items-center gap-1" data-testid={`link-vc-${i}`}>
                    <ExternalLink className="w-3 h-3" />
                    Visit
                  </a>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{v.focus}</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{v.stage}</Badge>
                  <Badge variant="outline" className="text-[10px]">{v.checks}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// LAUNCH KIT TAB
// ============================================================
function LaunchKitTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ productName: "", description: "", tagline: "", url: "" });
  const [copied, setCopied] = useState<string | null>(null);
  const { data: kits = [] } = useQuery<any[]>({
    queryKey: ["/api/founders/launch-kits"],
    queryFn: async () => (await apiRequest("GET", "/api/founders/launch-kits")).json(),
  });
  const genMut = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/founders/launch-kit", form)).json(),
    onSuccess: () => {
      toast({ title: "Launch kit ready", description: "Product Hunt, HN, Twitter thread, LinkedIn, email — all drafted." });
      queryClient.invalidateQueries({ queryKey: ["/api/founders/launch-kits"] });
      setForm({ productName: "", description: "", tagline: "", url: "" });
    },
  });

  const copy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Launch Day Kit</CardTitle>
          <p className="text-xs text-muted-foreground">Everything you need for Product Hunt, HN Show HN, Twitter thread, LinkedIn post, and email blast.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Product Name *</Label><Input value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} data-testid="input-product-name" /></div>
            <div><Label className="text-xs">Tagline</Label><Input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="60-char tagline" /></div>
          </div>
          <div><Label className="text-xs">Description *</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What it does, who it's for, why it's different" data-testid="input-description" /></div>
          <div><Label className="text-xs">URL</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://yourproduct.com" /></div>
          <Button onClick={() => genMut.mutate()} disabled={!form.productName || !form.description || genMut.isPending} className="w-full bg-[#1E1650] hover:bg-[#3D309A]" data-testid="button-generate-launch">
            {genMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
            Generate Launch Kit
          </Button>
        </CardContent>
      </Card>

      {kits.map((k: any) => (
        <Card key={k.id} data-testid={`launch-kit-${k.id}`}>
          <CardHeader><CardTitle className="text-sm">{k.productName}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <LaunchKitItem label="Product Hunt — Tagline" text={k.phPost?.tagline || ""} copied={copied} onCopy={copy} />
            <LaunchKitItem label="Product Hunt — Description" text={k.phPost?.description || ""} copied={copied} onCopy={copy} />
            <LaunchKitItem label="Product Hunt — First Comment" text={k.phPost?.firstComment || ""} copied={copied} onCopy={copy} />
            <LaunchKitItem label="HN Show HN — Title" text={k.hnPost?.title || ""} copied={copied} onCopy={copy} />
            <LaunchKitItem label="HN Show HN — Body" text={k.hnPost?.body || ""} copied={copied} onCopy={copy} />
            <LaunchKitItem label="Twitter Thread" text={(k.twitterThread || []).map((t: string, i: number) => `${i + 1}/ ${t}`).join("\n\n")} copied={copied} onCopy={copy} />
            <LaunchKitItem label="LinkedIn Post" text={k.linkedinPost} copied={copied} onCopy={copy} />
            <LaunchKitItem label="Email Blast" text={k.emailBlast} copied={copied} onCopy={copy} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LaunchKitItem({ label, text, copied, onCopy }: { label: string; text: string; copied: string | null; onCopy: (l: string, t: string) => void }) {
  if (!text) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs font-semibold">{label}</Label>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onCopy(label, text)} data-testid={`copy-${label}`}>
          {copied === label ? <Check className="w-3 h-3 mr-1 text-green-600" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied === label ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="bg-muted/50 p-3 rounded text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">{text}</div>
    </div>
  );
}

// ============================================================
// COMPETITORS TAB
// ============================================================
function CompetitorsTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", website: "" });
  const { data: list = [] } = useQuery<any[]>({
    queryKey: ["/api/founders/competitors"],
    queryFn: async () => (await apiRequest("GET", "/api/founders/competitors")).json(),
  });
  const addMut = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/founders/competitors", form)).json(),
    onSuccess: () => {
      toast({ title: "Competitor added", description: "AI-analyzed strengths, weaknesses, and pricing." });
      queryClient.invalidateQueries({ queryKey: ["/api/founders/competitors"] });
      setForm({ name: "", website: "" });
    },
  });
  const delMut = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/founders/competitors/${id}`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/founders/competitors"] }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Competitor Tracker</CardTitle>
          <p className="text-xs text-muted-foreground">Add up to 5. AI analyzes strengths, weaknesses, and pricing.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="Competitor name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="input-comp-name" />
            <Input placeholder="https://competitor.com" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} className="col-span-2" data-testid="input-comp-website" />
          </div>
          <Button onClick={() => addMut.mutate()} disabled={!form.name || list.length >= 5 || addMut.isPending} className="w-full bg-[#1E1650] hover:bg-[#3D309A]" data-testid="button-add-competitor">
            {addMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {list.length >= 5 ? "Max 5 competitors" : "Add + Analyze"}
          </Button>
        </CardContent>
      </Card>

      {list.map((c: any) => (
        <Card key={c.id} data-testid={`competitor-${c.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              {c.logoUrl && <img src={c.logoUrl} alt={c.name} className="w-10 h-10 rounded" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{c.name}</span>
                  {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1E1650] hover:text-[#E9A820] inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" />Visit</a>}
                </div>
                <div className="text-xs text-muted-foreground">{c.description}</div>
                {c.pricing && <Badge variant="secondary" className="mt-1 text-[10px]">{c.pricing}</Badge>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => delMut.mutate(c.id)} data-testid={`delete-competitor-${c.id}`}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-green-700 mb-1">Strengths</div>
                <ul className="text-xs space-y-1">{(c.strengths || []).map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-red-700 mb-1">Weaknesses</div>
                <ul className="text-xs space-y-1">{(c.weaknesses || []).map((w: string, i: number) => <li key={i}>• {w}</li>)}</ul>
              </div>
            </div>
            {c.recentNews && <div className="mt-3 text-xs bg-amber-50 border border-amber-200 p-2 rounded">Recent: {c.recentNews}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
