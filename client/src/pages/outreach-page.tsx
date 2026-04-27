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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TrialBanner } from "@/components/trial-banner";
import { LinkedInTestPost } from "@/components/linkedin-test-post";
import {
  Linkedin, Instagram, Youtube, Twitter, Mail,
  Upload, Search, Sparkles, Send, Users, Plus, Trash2, ArrowLeft,
  Check, Loader2, ExternalLink, Bot,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
interface Prospect {
  id: number;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  location?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  instagramHandle?: string;
  profilePictureUrl?: string;
  bio?: string;
  followerCount?: number;
}

interface Campaign {
  id: number;
  name: string;
  platform: string;
  goal?: string;
  tone?: string;
  status: string;
  messageTemplate?: string;
  prospectIds: string;
  sentCount: number;
  createdAt: string;
}

interface Message {
  id: number;
  prospectId: number;
  platform: string;
  draftMessage?: string;
  finalMessage?: string;
  status: string;
  sentAt?: string;
}

// ============================================================
// PLATFORM META
// ============================================================
const PLATFORMS = [
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#0A66C2", audience: "Founders, B2B" },
  { key: "twitter", label: "X / Twitter", icon: Twitter, color: "#000000", audience: "Founders, Tech" },
  { key: "instagram", label: "Instagram", icon: Instagram, color: "#E4405F", audience: "Influencers, D2C" },
  { key: "tiktok", label: "TikTok", icon: Bot, color: "#FE2C55", audience: "Creators, Gen Z" },
  { key: "youtube", label: "YouTube", icon: Youtube, color: "#FF0000", audience: "Creators, Brands" },
  { key: "email", label: "Email", icon: Mail, color: "#1E1650", audience: "Universal" },
];

// ============================================================
// MAIN PAGE
// ============================================================
export default function OutreachPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("prospects");
  const [selectedProspects, setSelectedProspects] = useState<Set<number>>(new Set());
  const [apolloOpen, setApolloOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);

  const { data: prospects = [] } = useQuery<Prospect[]>({
    queryKey: ["/api/outreach/prospects"],
    queryFn: async () => (await apiRequest("GET", "/api/outreach/prospects")).json(),
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/outreach/campaigns"],
    queryFn: async () => (await apiRequest("GET", "/api/outreach/campaigns")).json(),
  });

  const { data: connections = [] } = useQuery<any[]>({
    queryKey: ["/api/social/connections"],
    queryFn: async () => (await apiRequest("GET", "/api/social/connections")).json(),
  });

  return (
    <div className="min-h-screen bg-background" data-testid="outreach-page">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <span className="font-bold text-primary">Outreach Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[11px]">{prospects.length} prospects</Badge>
            <Badge variant="secondary" className="text-[11px]">{campaigns.length} campaigns</Badge>
          </div>
        </div>
      </header>

      <TrialBanner />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Connected Accounts strip */}
        <ConnectedAccountsStrip connections={connections} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prospects" data-testid="tab-prospects">Prospects ({prospects.length})</TabsTrigger>
            <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns ({campaigns.length})</TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="prospects" className="space-y-4">
            <Card>
              <CardHeader className="pb-3 flex-row justify-between items-start space-y-0">
                <div>
                  <CardTitle className="text-base">Your Prospect List</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Build your outreach list from Apollo.io search, CSV upload, or add manually.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)} data-testid="button-upload-csv">
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Upload CSV
                  </Button>
                  <Button size="sm" onClick={() => setApolloOpen(true)} className="bg-[#1E1650] hover:bg-[#3D309A]" data-testid="button-apollo-search">
                    <Search className="w-3.5 h-3.5 mr-1" />
                    Search Apollo.io
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {prospects.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <div className="text-sm font-medium mb-1">No prospects yet</div>
                    <div className="text-xs">Search Apollo.io, upload a CSV, or add manually.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b">
                      <span>{selectedProspects.size} of {prospects.length} selected</span>
                      {selectedProspects.size > 0 && (
                        <Button size="sm" onClick={() => setNewCampaignOpen(true)} data-testid="button-create-campaign-from-selected">
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                          Create Campaign ({selectedProspects.size})
                        </Button>
                      )}
                    </div>
                    {prospects.map((p) => (
                      <ProspectRow
                        key={p.id}
                        prospect={p}
                        selected={selectedProspects.has(p.id)}
                        onToggle={() => {
                          setSelectedProspects((prev) => {
                            const next = new Set(prev);
                            if (next.has(p.id)) next.delete(p.id);
                            else next.add(p.id);
                            return next;
                          });
                        }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            {campaigns.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Send className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <div className="text-sm font-medium mb-1">No campaigns yet</div>
                  <div className="text-xs">Select prospects on the Prospects tab to create one.</div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {campaigns.map((c) => (
                  <CampaignRow key={c.id} campaign={c} onClick={() => setViewCampaign(c)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates">
            <TemplatesGrid onPick={(tpl) => {
              // Open new campaign with template pre-filled
              setNewCampaignOpen(true);
            }} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs */}
      <ApolloSearchDialog open={apolloOpen} onClose={() => setApolloOpen(false)} />
      <CsvUploadDialog open={csvOpen} onClose={() => setCsvOpen(false)} />
      <NewCampaignDialog
        open={newCampaignOpen}
        onClose={() => setNewCampaignOpen(false)}
        prospectIds={Array.from(selectedProspects)}
        onCreated={() => { setSelectedProspects(new Set()); setActiveTab("campaigns"); }}
      />
      {viewCampaign && <CampaignDetailDialog campaign={viewCampaign} onClose={() => setViewCampaign(null)} />}
    </div>
  );
}

// ============================================================
// CONNECTED ACCOUNTS STRIP
// ============================================================
function ConnectedAccountsStrip({ connections }: { connections: any[] }) {
  const [linkedinTestOpen, setLinkedinTestOpen] = useState(false);
  const linkedinConn = connections.find((c: any) => c.platform === "linkedin" && c.status === "connected" && c.accessToken);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Your connected accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PLATFORMS.map((p) => {
            const conn = connections.find((c: any) => c.platform === p.key);
            const Icon = p.icon;
            const isConnected = !!conn;
            const canPost = p.key === "linkedin" && isConnected && !!conn?.accessToken;
            return (
              <div
                key={p.key}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border min-w-[180px] ${
                  isConnected ? "border-green-200 bg-green-50/40" : "border-border/60 bg-muted/30"
                }`}
                data-testid={`strip-${p.key}`}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 relative" style={{ background: `${p.color}15` }}>
                  {conn?.profilePictureUrl ? (
                    <img src={conn.profilePictureUrl} alt={conn.displayName || p.label} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${p.label}&background=1E1650&color=fff&size=64`; }} />
                  ) : (
                    <Icon className="w-4 h-4" style={{ color: p.color }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{p.label}</div>
                  {isConnected ? (
                    <div className="text-[10px] text-green-700 truncate">{conn.displayName || conn.accountName || "Connected"}</div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground">Not connected</div>
                  )}
                </div>
                {canPost && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-[#0A66C2] hover:bg-[#0A66C2]/10"
                    onClick={() => setLinkedinTestOpen(true)}
                    data-testid="button-test-linkedin-post"
                  >
                    Post
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <div className="text-[11px] text-muted-foreground mt-2">
          Connect accounts from any Bot → Actions tab. Outreach uses your authenticated session — rate-limited to stay compliant with each platform's ToS.
        </div>
      </CardContent>

      {linkedinConn && (
        <LinkedInTestPost
          open={linkedinTestOpen}
          onClose={() => setLinkedinTestOpen(false)}
          connection={linkedinConn}
        />
      )}
    </Card>
  );
}

// ============================================================
// PROSPECT ROW
// ============================================================
function ProspectRow({ prospect, selected, onToggle }: { prospect: Prospect; selected: boolean; onToggle: () => void }) {
  const initials = (prospect.name || "??").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const fallbackPic = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=1E1650&color=fff&size=80&bold=true`;
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
        selected ? "border-[#1E1650] bg-[#1E1650]/5" : "border-border hover:border-primary/40"
      }`}
      onClick={onToggle}
      data-testid={`prospect-row-${prospect.id}`}
    >
      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${selected ? "bg-[#1E1650] text-white" : "border border-border"}`}>
        {selected && <Check className="w-3 h-3" />}
      </div>
      <img
        src={prospect.profilePictureUrl || fallbackPic}
        alt={prospect.name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).src = fallbackPic; }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{prospect.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {prospect.title} {prospect.company && `· ${prospect.company}`}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {prospect.linkedinUrl && (
          <a href={prospect.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[#0A66C2] hover:opacity-70" onClick={(e) => e.stopPropagation()}>
            <Linkedin className="w-4 h-4" />
          </a>
        )}
        {prospect.twitterHandle && (
          <a href={`https://twitter.com/${prospect.twitterHandle}`} target="_blank" rel="noopener noreferrer" className="text-foreground hover:opacity-70" onClick={(e) => e.stopPropagation()}>
            <Twitter className="w-4 h-4" />
          </a>
        )}
        {prospect.email && <Mail className="w-4 h-4 text-muted-foreground" />}
      </div>
    </div>
  );
}

// ============================================================
// CAMPAIGN ROW
// ============================================================
function CampaignRow({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const platform = PLATFORMS.find(p => p.key === campaign.platform);
  const Icon = platform?.icon || Send;
  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    ready: "bg-blue-100 text-blue-700",
    running: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    paused: "bg-red-100 text-red-700",
  };
  return (
    <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={onClick} data-testid={`campaign-row-${campaign.id}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${platform?.color || "#1E1650"}15` }}>
          <Icon className="w-5 h-5" style={{ color: platform?.color || "#1E1650" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{campaign.name}</div>
          <div className="text-xs text-muted-foreground">
            {platform?.label || campaign.platform} · {campaign.sentCount} sent
          </div>
        </div>
        <Badge className={`text-[10px] ${statusColors[campaign.status] || "bg-gray-100"}`}>
          {campaign.status}
        </Badge>
      </CardContent>
    </Card>
  );
}

// ============================================================
// APOLLO SEARCH DIALOG
// ============================================================
function ApolloSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [jobTitles, setJobTitles] = useState("");
  const [locations, setLocations] = useState("");
  const [keywords, setKeywords] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isDemo, setIsDemo] = useState(false);

  const searchMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/outreach/apollo-search", {
        jobTitles: jobTitles.split(",").map(s => s.trim()).filter(Boolean),
        locations: locations.split(",").map(s => s.trim()).filter(Boolean),
        keywords,
        limit: 25,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data.prospects || []);
      setIsDemo(!!data.demo);
      if (data.demo) toast({ title: "Demo mode", description: data.message });
    },
    onError: (e: any) => toast({ title: "Search failed", description: e.message, variant: "destructive" }),
  });

  const importMut = useMutation({
    mutationFn: async () => {
      const picked = results.filter((_, i) => selected.has(i));
      const res = await apiRequest("POST", "/api/outreach/prospects", {
        prospects: picked.map(p => ({ ...p, source: "apollo" })),
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Imported", description: `${data.added} prospects added.` });
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/prospects"] });
      setResults([]); setSelected(new Set()); onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="dialog-apollo">
        <DialogHeader>
          <DialogTitle>Search Apollo.io</DialogTitle>
          <DialogDescription>Find prospects from Apollo's 275M+ contact database. 100% ToS-compliant.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Job Titles (comma separated)</Label>
              <Input placeholder="CEO, Founder, CTO" value={jobTitles} onChange={e => setJobTitles(e.target.value)} data-testid="input-titles" />
            </div>
            <div>
              <Label className="text-xs">Locations</Label>
              <Input placeholder="Bangalore, Mumbai, Dubai" value={locations} onChange={e => setLocations(e.target.value)} data-testid="input-locations" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Keywords</Label>
            <Input placeholder="SaaS, B2B, fintech" value={keywords} onChange={e => setKeywords(e.target.value)} data-testid="input-keywords" />
          </div>
          <Button onClick={() => searchMut.mutate()} disabled={searchMut.isPending} className="w-full bg-[#1E1650] hover:bg-[#3D309A]" data-testid="button-search-apollo">
            {searchMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
            Search
          </Button>
          {isDemo && (
            <div className="text-xs p-2 bg-amber-50 border border-amber-200 rounded text-amber-800">
              Add <code className="font-mono">APOLLO_API_KEY</code> to .env for real results.
            </div>
          )}
        </div>
        {results.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-1 mt-4 border-t pt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">{results.length} results · {selected.size} selected</span>
              <Button size="sm" disabled={selected.size === 0 || importMut.isPending} onClick={() => importMut.mutate()} data-testid="button-import-selected">
                {importMut.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                Import {selected.size}
              </Button>
            </div>
            {results.map((p, i) => {
              const isPicked = selected.has(i);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-2 rounded border cursor-pointer ${isPicked ? "border-[#1E1650] bg-[#1E1650]/5" : "border-border hover:border-primary/40"}`}
                  onClick={() => {
                    setSelected(s => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
                  }}
                  data-testid={`apollo-result-${i}`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center ${isPicked ? "bg-[#1E1650] text-white" : "border border-border"}`}>
                    {isPicked && <Check className="w-3 h-3" />}
                  </div>
                  <img src={p.profilePictureUrl} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.title} · {p.company}</div>
                  </div>
                  {p.linkedinUrl && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// CSV UPLOAD
// ============================================================
function CsvUploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [csv, setCsv] = useState("");

  const uploadMut = useMutation({
    mutationFn: async () => {
      // Expect CSV: name,email,company,title,linkedin_url
      const lines = csv.trim().split("\n").filter(Boolean);
      const [header, ...rows] = lines;
      const headers = header.split(",").map(s => s.trim().toLowerCase().replace(/[^a-z_]/g, ""));
      const keyMap: Record<string, string> = {
        name: "name", email: "email", company: "company", title: "title",
        linkedin: "linkedinUrl", linkedin_url: "linkedinUrl",
        twitter: "twitterHandle", instagram: "instagramHandle",
      };
      const prospects = rows.map((row) => {
        const cells = row.split(",").map(s => s.trim());
        const obj: any = { source: "csv" };
        headers.forEach((h, i) => { if (keyMap[h]) obj[keyMap[h]] = cells[i]; });
        return obj;
      }).filter((p: any) => p.name || p.email);
      const res = await apiRequest("POST", "/api/outreach/prospects", { prospects });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Imported", description: `${data.added} prospects added from CSV.` });
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/prospects"] });
      setCsv(""); onClose();
    },
    onError: (e: any) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg" data-testid="dialog-csv">
        <DialogHeader>
          <DialogTitle>Upload Prospects CSV</DialogTitle>
          <DialogDescription>
            Paste CSV with headers: <code className="text-xs">name, email, company, title, linkedin_url</code>
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="name,email,company,title,linkedin_url&#10;Priya Sharma,priya@nimbus.ai,Nimbus AI,Founder,https://linkedin.com/in/priyasharma"
          value={csv}
          onChange={e => setCsv(e.target.value)}
          rows={10}
          className="font-mono text-xs"
          data-testid="textarea-csv"
        />
        <Button onClick={() => uploadMut.mutate()} disabled={!csv || uploadMut.isPending} data-testid="button-upload">
          {uploadMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
          Import Prospects
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// NEW CAMPAIGN
// ============================================================
function NewCampaignDialog({ open, onClose, prospectIds, onCreated }: { open: boolean; onClose: () => void; prospectIds: number[]; onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [goal, setGoal] = useState("intro");
  const [tone, setTone] = useState("professional");
  const [template, setTemplate] = useState("Hi {{name}}, I noticed your work at {{company}} and wanted to reach out...");

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/outreach/campaigns", {
        name, platform, goal, tone, messageTemplate: template, prospectIds,
      });
      return res.json();
    },
    onSuccess: async (campaign) => {
      toast({ title: "Campaign created", description: "Generating personalized drafts..." });
      await apiRequest("POST", `/api/outreach/campaigns/${campaign.id}/draft-all`);
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/campaigns"] });
      toast({ title: "Drafts ready", description: `${prospectIds.length} personalized messages drafted.` });
      onCreated(); onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg" data-testid="dialog-new-campaign">
        <DialogHeader>
          <DialogTitle>New Campaign ({prospectIds.length} prospects)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Campaign Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Q2 Founder Outreach" data-testid="input-campaign-name" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger data-testid="select-platform"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Goal</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger data-testid="select-goal"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="intro">Introduction</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="sponsorship">Sponsorship</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger data-testid="select-tone"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual & friendly</SelectItem>
                <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Message Template (AI will personalize)</Label>
            <Textarea
              value={template} onChange={e => setTemplate(e.target.value)} rows={4}
              placeholder="Use {{name}}, {{company}}, {{title}} as placeholders"
              data-testid="textarea-template"
            />
          </div>
          <Button onClick={() => createMut.mutate()} disabled={!name || createMut.isPending} className="w-full bg-[#1E1650] hover:bg-[#3D309A]" data-testid="button-create-and-draft">
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Create & Draft {prospectIds.length} Messages
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// CAMPAIGN DETAIL (drafts review + send)
// ============================================================
function CampaignDetailDialog({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { toast } = useToast();
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/outreach/campaigns", campaign.id, "messages"],
    queryFn: async () => (await apiRequest("GET", `/api/outreach/campaigns/${campaign.id}/messages`)).json(),
  });
  const { data: prospects = [] } = useQuery<Prospect[]>({
    queryKey: ["/api/outreach/prospects"],
    queryFn: async () => (await apiRequest("GET", "/api/outreach/prospects")).json(),
  });
  const sendMut = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/outreach/campaigns/${campaign.id}/send`)).json(),
    onSuccess: (data) => {
      toast({ title: "Send batch complete", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/campaigns", campaign.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/campaigns"] });
    },
    onError: (e: any) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  const prospectMap = Object.fromEntries(prospects.map(p => [p.id, p]));
  const drafts = messages.filter(m => m.status === "draft" || m.status === "approved");
  const sent = messages.filter(m => m.status === "sent");

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="dialog-campaign-detail">
        <DialogHeader>
          <DialogTitle>{campaign.name}</DialogTitle>
          <DialogDescription>
            {campaign.platform} · {drafts.length} drafts · {sent.length} sent
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2">
          {messages.map((m) => {
            const p = prospectMap[m.prospectId];
            return (
              <Card key={m.id} className={m.status === "sent" ? "opacity-60" : ""} data-testid={`message-${m.id}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {p?.profilePictureUrl && <img src={p.profilePictureUrl} alt={p.name} className="w-6 h-6 rounded-full" />}
                    <span className="text-xs font-semibold">{p?.name}</span>
                    <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                  </div>
                  <Textarea
                    defaultValue={m.finalMessage || m.draftMessage || ""}
                    rows={4}
                    className="text-xs"
                    disabled={m.status === "sent"}
                    onBlur={(e) => {
                      if (e.target.value !== (m.finalMessage || m.draftMessage)) {
                        apiRequest("PATCH", `/api/outreach/messages/${m.id}`, { finalMessage: e.target.value });
                      }
                    }}
                    data-testid={`textarea-message-${m.id}`}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="border-t pt-3 flex gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            className="flex-1 bg-[#1E1650] hover:bg-[#3D309A]"
            disabled={drafts.length === 0 || sendMut.isPending}
            onClick={() => sendMut.mutate()}
            data-testid="button-send-batch"
          >
            {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send {drafts.length} Messages (rate-limited)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// TEMPLATES
// ============================================================
const OUTREACH_TEMPLATES = [
  { audience: "Founder", key: "vc-intro", title: "VC Introduction", platform: "linkedin", tone: "professional",
    body: "Hi {{name}}, I saw your recent investments in {{focus}} and wanted to introduce myself. I'm building {{my_product}} — would love to share a short 2-min overview and hear your POV." },
  { audience: "Founder", key: "customer-discovery", title: "Customer Discovery", platform: "linkedin", tone: "casual",
    body: "Hi {{name}}, I'm researching how {{title}}s at {{company}}-sized companies handle X. Would you have 15 min for a call? No pitch — just learning." },
  { audience: "Founder", key: "partnership", title: "Partnership Inquiry", platform: "email", tone: "professional",
    body: "Hi {{name}}, your work on {{topic}} caught my attention. I run {{my_product}} and I see a clean integration opportunity. Open to a quick chat?" },
  { audience: "Founder", key: "hiring", title: "Hiring Cold Outreach", platform: "linkedin", tone: "casual",
    body: "Hi {{name}}, your profile stood out — we're hiring a {{role}} at {{my_company}} and I'd love to tell you more. Interested?" },
  { audience: "Influencer", key: "brand-pitch", title: "Brand Collab Pitch", platform: "email", tone: "enthusiastic",
    body: "Hi {{name}}, I'm a {{niche}} creator with {{follower_count}}+ followers. Loved your recent campaign and would love to collaborate on a sponsored piece." },
  { audience: "Influencer", key: "rate-card-reply", title: "Rate Card Reply", platform: "email", tone: "professional",
    body: "Hi {{name}}, thanks for the inquiry. Attaching my current rate card — happy to customize for your campaign timeline." },
  { audience: "Influencer", key: "podcast-request", title: "Podcast / Feature Request", platform: "instagram", tone: "casual",
    body: "Hey {{name}}, I host a podcast about {{topic}}. Would love to have you on — we typically get X views per episode." },
  { audience: "Influencer", key: "cross-promo", title: "Cross-Promo Swap", platform: "instagram", tone: "casual",
    body: "Hi {{name}}, our audiences overlap nicely. Want to do a story swap or live together this month?" },
];

function TemplatesGrid({ onPick }: { onPick: (tpl: any) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {OUTREACH_TEMPLATES.map((t) => (
        <Card key={t.key} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => onPick(t)} data-testid={`template-${t.key}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-[10px]">{t.audience}</Badge>
              <Badge variant="secondary" className="text-[10px]">{t.platform}</Badge>
            </div>
            <div className="font-semibold text-sm mb-1">{t.title}</div>
            <div className="text-xs text-muted-foreground line-clamp-2">{t.body}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
