import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TrialBanner, useTrialStatus, useResumeTrial } from "@/components/trial-banner";
import { CreditsModal } from "@/components/credits-modal";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Bot, Megaphone, Database, Mail, TrendingUp, Users,
  ArrowLeft, Settings, Activity, BarChart3, Clock, CheckCircle2,
  AlertCircle, Globe, Calendar, Zap, Play, Pause,
  IndianRupee, Scale, Search, Headphones, Plus, Trash2, Loader2,
  ImageIcon, Film, Sparkles, Mic, Download, Radio, Lock, Crown, RotateCcw,
} from "lucide-react";
import { Link as WLink } from "wouter";

// Preview-mode overlay — shown at top of bot pages when trial has ended and no credits
function PreviewModeOverlay() {
  const { data: trial } = useTrialStatus();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const resumeMut = useResumeTrial();
  if (!trial) return null;
  if (trial.status !== "expired" || trial.paygCredits > 0) return null;
  return (
    <>
      <div className="bg-gradient-to-br from-[#1E1650] to-[#3D309A] text-white rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-start gap-4" data-testid="overlay-preview-mode">
        <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold mb-1">Preview Mode — trial ended</div>
          <p className="text-sm opacity-90 mb-3">
            You can still see your past work. {trial.canResumeTrial ? "Get 3 more days free, upgrade, or buy credits." : "Upgrade to a plan or buy PAYG credits to continue creating."}
          </p>
          <div className="flex flex-wrap gap-2">
            {trial.canResumeTrial && (
              <Button
                size="sm"
                className="bg-white/15 hover:bg-white/25 text-white border border-white/30"
                onClick={() => resumeMut.mutate()}
                disabled={resumeMut.isPending}
                data-testid="button-overlay-resume"
              >
                {resumeMut.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                )}
                Get 3 More Days Free
              </Button>
            )}
            <WLink href="/pricing">
              <Button size="sm" className="bg-[#E9A820] hover:bg-[#C98A1A] text-[#1E1650] font-semibold" data-testid="button-overlay-upgrade">
                <Crown className="w-3.5 h-3.5 mr-1" />
                Upgrade Plan
              </Button>
            </WLink>
            <Button size="sm" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10" onClick={() => setCreditsOpen(true)} data-testid="button-overlay-credits">
              <Zap className="w-3.5 h-3.5 mr-1" />
              Buy Credits
            </Button>
          </div>
        </div>
      </div>
      <CreditsModal open={creditsOpen} onClose={() => setCreditsOpen(false)} />
    </>
  );
}

const BOT_META: Record<string, {
  icon: typeof Bot;
  label: string;
  color: string;
  description: string;
  capabilities: string[];
  channels: string[];
}> = {
  marketing: {
    icon: Megaphone,
    label: "Marketing & Social Bot",
    color: "#3D309A",
    description: "Creates, schedules, and publishes content across social platforms. Tracks performance and adapts automatically.",
    capabilities: ["Auto-post content", "Schedule posts", "Track engagement", "Generate AI visuals", "A/B test captions"],
    channels: ["Instagram", "LinkedIn", "X / Twitter", "Facebook"],
  },
  data: {
    icon: Database,
    label: "Excel & Data Bot",
    color: "#0D9E98",
    description: "Automates reports, dashboards, and data pipelines. Works with Google Sheets, Excel, Notion, and databases.",
    capabilities: ["Weekly reports", "Live dashboards", "Data cleanup", "KPI tracking", "Auto-sync"],
    channels: ["Google Sheets", "Excel", "Notion", "Airtable"],
  },
  email: {
    icon: Mail,
    label: "Email Automation Bot",
    color: "#C98A1A",
    description: "Runs drip campaigns, follow-up sequences, and cold outreach. Connects to Gmail, Outlook, and ESPs.",
    capabilities: ["Drip campaigns", "Auto follow-ups", "A/B testing", "Open/click tracking", "Personalization"],
    channels: ["Gmail", "Outlook", "Mailchimp", "SendGrid"],
  },
  sales: {
    icon: TrendingUp,
    label: "Sales Funnel Bot",
    color: "#1E1650",
    description: "Qualifies leads, sends proposals, follows up on WhatsApp, and books calls — all on autopilot.",
    capabilities: ["Lead scoring", "WhatsApp follow-ups", "CRM auto-update", "Proposal generation", "Call booking"],
    channels: ["WhatsApp", "HubSpot", "Zoho CRM", "Calendly"],
  },
  hr: {
    icon: Users,
    label: "HR & People Bot",
    color: "#E9A820",
    description: "Posts jobs, screens CVs, schedules interviews, and sends offer letters — fully autonomous.",
    capabilities: ["Job posting", "Resume screening", "Interview scheduling", "Offer letters", "Onboarding docs"],
    channels: ["Naukri", "LinkedIn Jobs", "Indeed", "Google Calendar"],
  },
  finance: {
    icon: IndianRupee,
    label: "Finance & Billing Bot",
    color: "#16803C",
    description: "Generates invoices, tracks payments, manages expenses, calculates GST/tax, and forecasts revenue — all automated.",
    capabilities: ["Auto invoicing", "Payment tracking", "Expense reports", "GST calculation", "Revenue forecast", "Recurring billing"],
    channels: ["Razorpay", "Stripe", "Tally", "Google Sheets", "Zoho Books"],
  },
  legal: {
    icon: Scale,
    label: "Legal Bot",
    color: "#7C3AED",
    description: "Drafts contracts, generates NDAs, checks compliance, and manages terms & conditions for your business.",
    capabilities: ["Contract drafting", "NDA generation", "Compliance checks", "T&C management", "Legal review", "Document signing"],
    channels: ["Google Docs", "DocuSign", "Notion", "Google Drive"],
  },
  seo: {
    icon: Search,
    label: "SEO Bot",
    color: "#DC6B18",
    description: "Researches keywords, optimizes on-page content, tracks rankings, and monitors backlinks to grow organic traffic.",
    capabilities: ["Keyword research", "On-page optimization", "Rank tracking", "Backlink monitoring", "Content suggestions", "Competitor analysis"],
    channels: ["Google Search Console", "Ahrefs", "WordPress", "Google Analytics"],
  },
  support: {
    icon: Headphones,
    label: "Customer Support Bot",
    color: "#0891B2",
    description: "Routes tickets, sends auto-replies, answers FAQs, handles escalations, and keeps customer satisfaction high 24/7.",
    capabilities: ["Ticket routing", "Auto-replies", "FAQ answers", "Escalation handling", "Satisfaction tracking", "Multi-language support"],
    channels: ["WhatsApp", "Freshdesk", "Zendesk", "Intercom", "Email"],
  },
};

// Demo activity logs per bot type
const DEMO_ACTIVITIES: Record<string, Array<{ action: string; status: "success" | "pending" | "info"; time: string }>> = {
  marketing: [
    { action: "Published Instagram carousel — '5 AI Automation Tips'", status: "success", time: "2 hours ago" },
    { action: "Scheduled LinkedIn post for tomorrow 9:00 AM", status: "pending", time: "3 hours ago" },
    { action: "Generated 3 AI visuals for this week's campaign", status: "success", time: "5 hours ago" },
    { action: "Engagement report: +18% reach vs last week", status: "info", time: "Yesterday" },
    { action: "Published X/Twitter thread — 'Future of AI in Business'", status: "success", time: "Yesterday" },
    { action: "A/B test result: Variant B won (+12% clicks)", status: "info", time: "2 days ago" },
  ],
  data: [
    { action: "Weekly sales report generated and shared", status: "success", time: "Today, 9:00 AM" },
    { action: "Synced 1,240 rows from Google Sheets", status: "success", time: "Today, 8:30 AM" },
    { action: "KPI dashboard updated — revenue +8% MoM", status: "info", time: "Yesterday" },
    { action: "Cleaned 45 duplicate entries from Contacts sheet", status: "success", time: "Yesterday" },
    { action: "Scheduled monthly report for April 30", status: "pending", time: "2 days ago" },
  ],
  email: [
    { action: "Sent 120 follow-up emails — Sequence 'Onboarding'", status: "success", time: "Today" },
    { action: "Open rate: 38.2% (above 35% target)", status: "info", time: "Today" },
    { action: "3 bounced emails auto-removed from list", status: "success", time: "Yesterday" },
    { action: "A/B test: Subject line B won (+8% opens)", status: "info", time: "Yesterday" },
    { action: "New drip sequence 'Re-engagement' started — 450 contacts", status: "success", time: "2 days ago" },
    { action: "Sent 85 cold outreach emails — Batch #14", status: "success", time: "3 days ago" },
  ],
  sales: [
    { action: "Qualified 8 new leads from website form", status: "success", time: "Today" },
    { action: "Sent 3 proposals via WhatsApp", status: "success", time: "Today" },
    { action: "Updated HubSpot: 12 deals moved to 'Negotiation'", status: "success", time: "Yesterday" },
    { action: "Booked 2 demo calls for this week", status: "pending", time: "Yesterday" },
    { action: "Lead score recalculated for 150 contacts", status: "info", time: "2 days ago" },
  ],
  hr: [
    { action: "Posted 'Full-Stack Developer' on Naukri + LinkedIn", status: "success", time: "Today" },
    { action: "Screened 14 applicants — 5 shortlisted", status: "success", time: "Today" },
    { action: "Scheduled 3 interviews for this week", status: "pending", time: "Yesterday" },
    { action: "Sent offer letter to Rahul K. — Senior Designer", status: "success", time: "2 days ago" },
    { action: "Generated onboarding docs for 2 new hires", status: "success", time: "3 days ago" },
  ],
  finance: [
    { action: "Generated 12 invoices for March billing cycle", status: "success", time: "Today" },
    { action: "Payment received: ₹45,000 from Acme Corp (Razorpay)", status: "success", time: "Today" },
    { action: "GST return data prepared for Q4 FY2025-26", status: "success", time: "Yesterday" },
    { action: "Expense report: ₹1.2L total spend this month", status: "info", time: "Yesterday" },
    { action: "3 overdue invoices flagged — auto-reminder sent", status: "pending", time: "2 days ago" },
    { action: "Revenue forecast updated: ₹8.5L projected for April", status: "info", time: "3 days ago" },
  ],
  legal: [
    { action: "Generated NDA for partnership with TechVentures Ltd", status: "success", time: "Today" },
    { action: "Contract draft: 'Service Agreement — Client #47'", status: "success", time: "Today" },
    { action: "Compliance check passed — GDPR data handling policy", status: "success", time: "Yesterday" },
    { action: "Updated Terms & Conditions — v2.3 published", status: "success", time: "Yesterday" },
    { action: "Pending review: Vendor agreement with CloudHost India", status: "pending", time: "2 days ago" },
    { action: "Privacy policy updated for Indian IT Act compliance", status: "info", time: "3 days ago" },
  ],
  seo: [
    { action: "Keyword research: 45 new opportunities found for 'AI automation'", status: "success", time: "Today" },
    { action: "On-page optimization: 8 blog posts updated with meta tags", status: "success", time: "Today" },
    { action: "Rank tracker: 'toolsyourway.com' moved to page 1 for 3 keywords", status: "info", time: "Yesterday" },
    { action: "Backlink alert: 2 new high-authority backlinks detected", status: "success", time: "Yesterday" },
    { action: "Content suggestion: 'Top 10 AI Tools for Indian Startups' — high volume", status: "pending", time: "2 days ago" },
    { action: "Competitor analysis: 5 competitor blog gaps identified", status: "info", time: "3 days ago" },
  ],
  support: [
    { action: "Resolved 23 support tickets automatically via FAQ matching", status: "success", time: "Today" },
    { action: "Escalated 2 tickets to human agent (billing disputes)", status: "pending", time: "Today" },
    { action: "Auto-replied to 45 WhatsApp messages in Hindi & English", status: "success", time: "Today" },
    { action: "Customer satisfaction score: 4.7/5 this week", status: "info", time: "Yesterday" },
    { action: "Updated FAQ knowledge base — 8 new answers added", status: "success", time: "Yesterday" },
    { action: "Average response time: 12 seconds (target: 30s)", status: "info", time: "2 days ago" },
  ],
};

interface BotData {
  id: number;
  userId: number;
  botType: string;
  status: string;
  config: string | null;
  lastRunAt: string | null;
  metrics: string | null;
}

interface DashboardData {
  user: any;
  subscription: any;
  bots: BotData[];
}

const SOCIAL_PLATFORMS = [
  { key: "linkedin", name: "LinkedIn", icon: "💼", bg: "#0A66C215" },
  { key: "instagram", name: "Instagram", icon: "📷", bg: "#E1306C15" },
  { key: "facebook", name: "Facebook", icon: "👍", bg: "#1877F215" },
  { key: "youtube", name: "YouTube", icon: "▶️", bg: "#FF000015" },
  { key: "twitter", name: "X / Twitter", icon: "𝕏", bg: "#14171A15" },
  { key: "tiktok", name: "TikTok", icon: "🎵", bg: "#00000015" },
];

const LANGUAGES = [
  "English", "Hindi", "Gujarati", "Tamil", "Telugu", "Bengali",
  "Marathi", "Kannada", "Malayalam", "Punjabi", "Arabic", "Chinese",
];

export default function BotDetailPage() {
  const params = useParams<{ botType: string }>();
  const botType = params.botType || "marketing";
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const meta = BOT_META[botType];

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/user/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/dashboard");
      return res.json();
    },
  });

  const toggleBot = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/user/bots/${botType}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/dashboard"] });
      toast({ title: "Bot status updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to toggle bot", description: err.message, variant: "destructive" });
    },
  });

  if (!meta) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-bold mb-2">Bot not found</h1>
          <Button variant="outline" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const Icon = meta.icon;
  const botData = dashboard?.bots.find((b) => b.botType === botType);
  const isActive = botData?.status === "active";
  const activities = DEMO_ACTIVITIES[botType] || [];

  // Demo metrics
  const metrics = {
    tasksCompleted: isActive ? Math.floor(Math.random() * 50 + 80) : 0,
    successRate: isActive ? (95 + Math.random() * 4.5).toFixed(1) : "0.0",
    avgResponseTime: isActive ? `${(0.5 + Math.random() * 2).toFixed(1)}s` : "—",
    uptime: isActive ? "99.9%" : "—",
  };

  // ── Marketing Bot State ──────────────────────────────────────────────────
  const [mktTopic, setMktTopic] = useState("");
  const [mktPlatform, setMktPlatform] = useState("LinkedIn");
  const [mktTone, setMktTone] = useState("Professional");
  const [mktGenerated, setMktGenerated] = useState<string | null>(null);

  const generatePost = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bots/marketing/generate", { topic: mktTopic, platform: mktPlatform, tone: mktTone });
      return res.json();
    },
    onSuccess: (data: any) => {
      setMktGenerated(data.content ?? data.post ?? JSON.stringify(data));
      toast({ title: "Post generated!", description: "Review and schedule below." });
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const schedulePost = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/bots/marketing/schedule", {
        content: mktGenerated,
        platform: mktPlatform,
        scheduledFor: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots/marketing/posts"] });
      toast({ title: "Post scheduled!", description: "Your post has been queued." });
      setMktGenerated(null);
      setMktTopic("");
    },
    onError: (err: any) => {
      toast({ title: "Schedule failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: scheduledPosts } = useQuery<any[]>({
    queryKey: ["/api/bots/marketing/posts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/bots/marketing/posts");
      return res.json();
    },
    enabled: botType === "marketing",
  });

  // Image & Video generation state
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgStyle, setImgStyle] = useState("photorealistic");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imgDemo, setImgDemo] = useState(false);
  const [vidPrompt, setVidPrompt] = useState("");
  const [vidStyle, setVidStyle] = useState("cinematic");
  const [videoFrames, setVideoFrames] = useState<string[]>([]);

  // Real video generation state
  const [vidModel, setVidModel] = useState<"minimax" | "kling">("minimax");
  const [vidGenerating, setVidGenerating] = useState(false);
  const [vidPredictionId, setVidPredictionId] = useState<string | null>(null);
  const [vidResult, setVidResult] = useState<string | null>(null);
  const [vidDemoMsg, setVidDemoMsg] = useState<string | null>(null);
  const [vidError, setVidError] = useState<string | null>(null);

  // TTS state
  const [ttsText, setTtsText] = useState("");
  const [ttsAudio, setTtsAudio] = useState<string | null>(null);
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [ttsDemoMsg, setTtsDemoMsg] = useState<string | null>(null);

  const genImage = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/media/generate-image", { prompt: imgPrompt, style: imgStyle });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedImage(data.imageUrl);
      setImgDemo(!!data.demo);
      queryClient.invalidateQueries({ queryKey: ["/api/media/gallery"] });
      toast({ title: data.demo ? "Demo preview generated" : "Image generated" });
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const genVideo = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/media/generate-video", { prompt: vidPrompt, style: vidStyle });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.frames) setVideoFrames(data.frames);
      queryClient.invalidateQueries({ queryKey: ["/api/media/gallery"] });
      toast({ title: data.demo ? "Demo mode — add OPENAI_API_KEY" : "Storyboard generated" });
    },
    onError: (err: any) => {
      toast({ title: "Video generation failed", description: err.message, variant: "destructive" });
    },
  });

  // Real video generation: start prediction then poll
  const handleGenerateVideoReal = async () => {
    if (!vidPrompt.trim()) return;
    setVidGenerating(true);
    setVidResult(null);
    setVidDemoMsg(null);
    setVidError(null);
    setVidPredictionId(null);
    try {
      const res = await apiRequest("POST", "/api/media/generate-video-real", {
        prompt: vidPrompt,
        model: vidModel,
        style: vidStyle,
      });
      const data = await res.json();
      if (data.demo) {
        setVidDemoMsg(data.message);
        setVidGenerating(false);
        return;
      }
      if (!data.predictionId) {
        setVidError(data.message || "Failed to start video generation");
        setVidGenerating(false);
        return;
      }
      setVidPredictionId(data.predictionId);
      // Poll for result every 5 seconds
      const intervalId = setInterval(async () => {
        try {
          const pollRes = await apiRequest("GET", `/api/media/video-status/${data.predictionId}`);
          const pollData = await pollRes.json();
          if (pollData.status === "succeeded" && pollData.videoUrl) {
            clearInterval(intervalId);
            setVidResult(pollData.videoUrl);
            setVidGenerating(false);
            setVidPredictionId(null);
            queryClient.invalidateQueries({ queryKey: ["/api/media/gallery"] });
            toast({ title: "Video ready!", description: "Your video has been generated." });
          } else if (pollData.status === "failed" || pollData.status === "canceled") {
            clearInterval(intervalId);
            setVidError(pollData.error || "Video generation failed");
            setVidGenerating(false);
            setVidPredictionId(null);
          }
        } catch (pollErr: any) {
          clearInterval(intervalId);
          setVidError(pollErr.message || "Polling failed");
          setVidGenerating(false);
          setVidPredictionId(null);
        }
      }, 5000);
    } catch (err: any) {
      setVidError(err.message || "Video generation failed");
      setVidGenerating(false);
    }
  };

  // Text-to-speech handler
  const handleGenerateTts = async () => {
    if (!ttsText.trim()) return;
    setTtsGenerating(true);
    setTtsAudio(null);
    setTtsDemoMsg(null);
    try {
      const res = await apiRequest("POST", "/api/media/text-to-speech", { text: ttsText });
      const data = await res.json();
      if (data.demo) {
        setTtsDemoMsg(data.message);
      } else if (data.audioUrl) {
        setTtsAudio(data.audioUrl);
        toast({ title: "Voiceover ready!", description: "Your audio has been generated." });
      }
    } catch (err: any) {
      toast({ title: "TTS failed", description: err.message, variant: "destructive" });
    } finally {
      setTtsGenerating(false);
    }
  };

  const { data: mediaGallery } = useQuery<any[]>({
    queryKey: ["/api/media/gallery"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/media/gallery");
      return res.json();
    },
    enabled: botType === "marketing",
  });

  // Social connections (Marketing Bot)
  const { data: socialConns } = useQuery<any[]>({
    queryKey: ["/api/social/connections"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/social/connections");
      return res.json();
    },
    enabled: botType === "marketing",
  });

  const [pagePickerOpen, setPagePickerOpen] = useState(false);
  const [pagePickerPlatform, setPagePickerPlatform] = useState("");
  const [pagePickerPages, setPagePickerPages] = useState<Array<{id: string; name: string; type: string}>>([]);

  // Popup connect flow
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [connectPopupOpen, setConnectPopupOpen] = useState(false);
  const [connectStep, setConnectStep] = useState<"confirm" | "loading" | "pages" | "done">("confirm");

  const startConnect = (platform: string) => {
    setConnectingPlatform(platform);
    setConnectStep("confirm");
    setConnectPopupOpen(true);
  };

  const confirmConnect = () => {
    if (!connectingPlatform) return;
    setConnectStep("loading");
    connectSocial.mutate(connectingPlatform);
  };

  const connectSocial = useMutation({
    mutationFn: async (platform: string) => {
      const res = await apiRequest("POST", "/api/social/connect", { platform });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.redirect) {
        // Real OAuth — open in popup window
        const popup = window.open(data.redirect, "socialAuth", "width=600,height=700,left=200,top=100");
        const timer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(timer);
            queryClient.invalidateQueries({ queryKey: ["/api/social/connections"] });
            setConnectPopupOpen(false);
          }
        }, 500);
      } else if (data.needsPageSelection && data.pages) {
        setPagePickerPlatform(data.connection?.platform || "");
        setPagePickerPages(data.pages);
        setConnectStep("pages");
        queryClient.invalidateQueries({ queryKey: ["/api/social/connections"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/social/connections"] });
        setConnectStep("done");
        setTimeout(() => setConnectPopupOpen(false), 1500);
        toast({ title: `${data.connection?.platform} connected`, description: data.message });
      }
    },
    onError: (err: any) => {
      setConnectPopupOpen(false);
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
    },
  });

  const selectPage = useMutation({
    mutationFn: async ({ platform, pageId, pageName, accountType }: { platform: string; pageId: string; pageName: string; accountType: string }) => {
      const res = await apiRequest("POST", "/api/social/select-page", { platform, pageId, pageName, accountType });
      return res.json();
    },
    onSuccess: (data) => {
      setPagePickerOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/social/connections"] });
      toast({ title: `Posting to: ${data.pageName}` });
    },
  });

  const disconnectSocial = useMutation({
    mutationFn: async (platform: string) => {
      await apiRequest("POST", "/api/social/disconnect", { platform });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/connections"] });
      toast({ title: "Disconnected" });
    },
  });

  // ── Email Bot State ───────────────────────────────────────────────────────
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [campaignRecipients, setCampaignRecipients] = useState("");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignBody, setCampaignBody] = useState("");

  const sendEmail = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/bots/email/send", { to: emailTo, subject: emailSubject, body: emailBody });
    },
    onSuccess: () => {
      toast({ title: "Email sent!", description: `Sent to ${emailTo}` });
      setEmailTo(""); setEmailSubject(""); setEmailBody("");
    },
    onError: (err: any) => {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    },
  });

  const sendCampaign = useMutation({
    mutationFn: async () => {
      const recipients = campaignRecipients.split("\n").map((e) => e.trim()).filter(Boolean);
      await apiRequest("POST", "/api/bots/email/campaign", { recipients, subject: campaignSubject, body: campaignBody });
    },
    onSuccess: () => {
      toast({ title: "Campaign sent!", description: "Your campaign is on its way." });
      setCampaignRecipients(""); setCampaignSubject(""); setCampaignBody("");
    },
    onError: (err: any) => {
      toast({ title: "Campaign failed", description: err.message, variant: "destructive" });
    },
  });

  // ── Finance Bot State ─────────────────────────────────────────────────────
  interface LineItem { description: string; quantity: number; rate: number; }
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: 1, rate: 0 }]);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null);

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  const addLineItem = () => setLineItems((prev) => [...prev, { description: "", quantity: 1, rate: 0 }]);
  const removeLineItem = (idx: number) => setLineItems((prev) => prev.filter((_, i) => i !== idx));
  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) =>
    setLineItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const generateInvoice = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bots/finance/invoice", {
        clientName, clientEmail, lineItems, notes: invoiceNotes,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setInvoiceHtml(data.html ?? data.invoice ?? JSON.stringify(data));
      queryClient.invalidateQueries({ queryKey: ["/api/bots/finance/invoices"] });
      toast({ title: "Invoice generated!", description: "Preview below." });
    },
    onError: (err: any) => {
      toast({ title: "Invoice failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: invoiceHistory } = useQuery<any[]>({
    queryKey: ["/api/bots/finance/invoices"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/bots/finance/invoices");
      return res.json();
    },
    enabled: botType === "finance",
  });

  const ACTION_BOT_TYPES = ["marketing", "email", "finance"];
  const hasActionsTab = ACTION_BOT_TYPES.includes(botType);

  return (
    <div className="min-h-screen bg-background" data-testid={`bot-detail-${botType}`}>
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${meta.color}15` }}>
                <Icon className="h-4 w-4" style={{ color: meta.color }} />
              </div>
              <span className="font-semibold text-sm">{meta.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={isActive ? "default" : "secondary"}
              className="text-xs"
              style={isActive ? { background: "#0D9E98" } : {}}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
            <Switch
              checked={isActive}
              onCheckedChange={() => botData && toggleBot.mutate()}
              disabled={!botData || toggleBot.isPending}
              data-testid="switch-bot-status"
            />
          </div>
        </div>
      </header>

      <TrialBanner />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <PreviewModeOverlay />
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : (
          <>
            {/* Bot Overview */}
            <Card className="mb-6" data-testid="card-bot-overview">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}12` }}>
                    <Icon className="h-6 w-6" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-lg font-bold text-foreground mb-1">{meta.label}</h1>
                    <p className="text-sm text-muted-foreground mb-3">{meta.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {meta.capabilities.map((cap) => (
                        <Badge key={cap} variant="outline" className="text-[10px] font-normal">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {!isActive && (
                    <Button size="sm" onClick={() => botData && toggleBot.mutate()} data-testid="button-activate">
                      <Play className="h-3.5 w-3.5 mr-1" /> Activate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue={hasActionsTab ? "actions" : "activity"} className="space-y-4">
              <TabsList className={`grid w-full ${hasActionsTab ? "grid-cols-4" : "grid-cols-3"} max-w-md`}>
                {hasActionsTab && (
                  <TabsTrigger value="actions" data-testid="tab-actions">
                    <Zap className="h-3.5 w-3.5 mr-1" /> Actions
                  </TabsTrigger>
                )}
                <TabsTrigger value="activity" data-testid="tab-activity">
                  <Activity className="h-3.5 w-3.5 mr-1" /> Activity
                </TabsTrigger>
                <TabsTrigger value="settings" data-testid="tab-settings">
                  <Settings className="h-3.5 w-3.5 mr-1" /> Settings
                </TabsTrigger>
                <TabsTrigger value="metrics" data-testid="tab-metrics">
                  <BarChart3 className="h-3.5 w-3.5 mr-1" /> Metrics
                </TabsTrigger>
              </TabsList>

              {/* ========== ACTIONS TAB ========== */}
              {hasActionsTab && (
                <TabsContent value="actions">
                  {/* ─── Marketing Bot ─── */}
                  {botType === "marketing" && (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Megaphone className="h-4 w-4" /> Create Post
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="mkt-topic" className="text-xs">Topic / Idea</Label>
                            <Textarea
                              id="mkt-topic"
                              placeholder="What should we post about?"
                              value={mktTopic}
                              onChange={(e) => setMktTopic(e.target.value)}
                              rows={3}
                              data-testid="textarea-mkt-topic"
                            />
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs">Platform</Label>
                              <Select value={mktPlatform} onValueChange={setMktPlatform}>
                                <SelectTrigger data-testid="select-mkt-platform">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                                  <SelectItem value="X/Twitter">X/Twitter</SelectItem>
                                  <SelectItem value="Instagram">Instagram</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Tone</Label>
                              <Select value={mktTone} onValueChange={setMktTone}>
                                <SelectTrigger data-testid="select-mkt-tone">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Professional">Professional</SelectItem>
                                  <SelectItem value="Casual">Casual</SelectItem>
                                  <SelectItem value="Bold">Bold</SelectItem>
                                  <SelectItem value="Inspirational">Inspirational</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button
                            onClick={() => generatePost.mutate()}
                            disabled={!mktTopic.trim() || generatePost.isPending}
                            data-testid="button-generate-post"
                          >
                            {generatePost.isPending ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
                            ) : (
                              <><Zap className="h-4 w-4 mr-2" /> Generate Post with AI</>
                            )}
                          </Button>

                          {mktGenerated && (
                            <Card className="border-2" style={{ borderColor: `${meta.color}40` }}>
                              <CardContent className="p-4 space-y-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
                                <p className="text-sm text-foreground whitespace-pre-wrap">{mktGenerated}</p>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="text-xs">{mktPlatform}</Badge>
                                  <Badge variant="outline" className="text-xs">{mktTone}</Badge>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => schedulePost.mutate()}
                                  disabled={schedulePost.isPending}
                                  data-testid="button-schedule-post"
                                >
                                  {schedulePost.isPending ? (
                                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Scheduling…</>
                                  ) : (
                                    <><Calendar className="h-3.5 w-3.5 mr-1.5" /> Schedule Post</>
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          )}
                        </CardContent>
                      </Card>

                      {/* AI Creative Studio — Image & Video */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" /> AI Creative Studio
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            {/* Image Generation */}
                            <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
                              <h4 className="text-sm font-semibold flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5" /> Generate Image</h4>
                              <Input
                                placeholder="Describe the image you want..."
                                value={imgPrompt}
                                onChange={(e) => setImgPrompt(e.target.value)}
                                data-testid="input-image-prompt"
                              />
                              <Select value={imgStyle} onValueChange={setImgStyle}>
                                <SelectTrigger data-testid="select-image-style"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="photorealistic">Photorealistic</SelectItem>
                                  <SelectItem value="illustration">Illustration</SelectItem>
                                  <SelectItem value="3d-render">3D Render</SelectItem>
                                  <SelectItem value="flat-design">Flat Design</SelectItem>
                                  <SelectItem value="watercolor">Watercolor</SelectItem>
                                  <SelectItem value="minimalist">Minimalist</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                className="w-full" size="sm"
                                onClick={() => genImage.mutate()}
                                disabled={!imgPrompt.trim() || genImage.isPending}
                                data-testid="button-generate-image"
                              >
                                {genImage.isPending ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="h-3.5 w-3.5 mr-2" /> Generate Image</>}
                              </Button>
                              {generatedImage && (
                                <div className="mt-2 rounded-lg overflow-hidden border border-border">
                                  <img src={generatedImage} alt="Generated" className="w-full h-auto" />
                                  {imgDemo && <p className="text-[10px] text-muted-foreground p-2 bg-muted">Demo preview — add OPENAI_API_KEY for real generation</p>}
                                </div>
                              )}
                            </div>

                            {/* Real Video Generation */}
                            <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold flex items-center gap-2"><Film className="h-3.5 w-3.5" /> Generate Video</h4>
                                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">2 videos/month included</span>
                              </div>

                              {/* Model selector */}
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  data-testid="radio-model-minimax"
                                  onClick={() => setVidModel("minimax")}
                                  className={`relative text-left p-2.5 rounded-md border text-xs transition-colors ${
                                    vidModel === "minimax"
                                      ? "border-primary bg-primary/5"
                                      : "border-border bg-background hover:bg-muted/50"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <Radio className="h-3 w-3" />
                                    <span className="font-semibold">MiniMax Hailuo</span>
                                    <Badge className="text-[9px] px-1 py-0 h-3.5 ml-auto" variant="secondary">Recommended</Badge>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">Fast ~60s · Great for social</p>
                                </button>
                                <button
                                  type="button"
                                  data-testid="radio-model-kling"
                                  onClick={() => setVidModel("kling")}
                                  className={`text-left p-2.5 rounded-md border text-xs transition-colors ${
                                    vidModel === "kling"
                                      ? "border-primary bg-primary/5"
                                      : "border-border bg-background hover:bg-muted/50"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <Radio className="h-3 w-3" />
                                    <span className="font-semibold">Kling Pro</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">Slower ~5min · Talking heads</p>
                                </button>
                              </div>

                              <Textarea
                                placeholder="Describe your video concept..."
                                value={vidPrompt}
                                onChange={(e) => setVidPrompt(e.target.value)}
                                data-testid="input-video-prompt"
                                className="resize-none text-sm"
                                rows={2}
                              />

                              <Select value={vidStyle} onValueChange={setVidStyle}>
                                <SelectTrigger data-testid="select-video-style"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cinematic">Cinematic</SelectItem>
                                  <SelectItem value="social">Social Media</SelectItem>
                                  <SelectItem value="corporate">Corporate</SelectItem>
                                  <SelectItem value="energetic">Energetic</SelectItem>
                                </SelectContent>
                              </Select>

                              <Button
                                className="w-full" size="sm"
                                onClick={handleGenerateVideoReal}
                                disabled={!vidPrompt.trim() || vidGenerating}
                                data-testid="button-generate-video"
                              >
                                {vidGenerating
                                  ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Generating… 1–5 min</>
                                  : <><Film className="h-3.5 w-3.5 mr-2" /> Generate Video</>}
                              </Button>

                              {vidGenerating && (
                                <p className="text-xs text-muted-foreground text-center animate-pulse">
                                  Generating… this may take 1–5 minutes
                                </p>
                              )}

                              {vidDemoMsg && (
                                <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2.5">
                                  <p className="text-xs text-amber-700 dark:text-amber-300">{vidDemoMsg}</p>
                                </div>
                              )}

                              {vidError && (
                                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5">
                                  <p className="text-xs text-destructive">{vidError}</p>
                                </div>
                              )}

                              {vidResult && (
                                <div className="mt-2 rounded-lg overflow-hidden border border-border">
                                  <video
                                    src={vidResult}
                                    controls
                                    className="w-full h-auto"
                                    data-testid="video-result"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Media Gallery */}
                          {mediaGallery && mediaGallery.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-semibold mb-2">Recent Creations</h4>
                              <div className="grid grid-cols-4 gap-2">
                                {mediaGallery.slice(0, 8).map((m: any) => (
                                  <div key={m.id} className="rounded-md overflow-hidden border border-border aspect-square">
                                    {m.type === "image" ? (
                                      <img src={m.url} alt={m.prompt} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground"><Film className="h-4 w-4" /></div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* AI Voiceover / Text-to-Speech */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Mic className="h-4 w-4" /> AI Voiceover
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Textarea
                            placeholder="Type or paste the text for your voiceover..."
                            value={ttsText}
                            onChange={(e) => setTtsText(e.target.value)}
                            rows={4}
                            className="resize-none text-sm"
                            data-testid="input-tts-text"
                          />
                          <p className="text-xs text-muted-foreground">Supports English and 10+ languages</p>
                          <Button
                            className="w-full"
                            size="sm"
                            onClick={handleGenerateTts}
                            disabled={!ttsText.trim() || ttsGenerating}
                            data-testid="button-generate-voiceover"
                          >
                            {ttsGenerating
                              ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Generating voiceover…</>
                              : <><Mic className="h-3.5 w-3.5 mr-2" /> Generate Voiceover</>}
                          </Button>

                          {ttsDemoMsg && (
                            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2.5">
                              <p className="text-xs text-amber-700 dark:text-amber-300">{ttsDemoMsg}</p>
                            </div>
                          )}

                          {ttsAudio && (
                            <div className="space-y-2">
                              <audio
                                src={ttsAudio}
                                controls
                                className="w-full"
                                data-testid="audio-result"
                              />
                              <a
                                href={ttsAudio}
                                download="voiceover.mp3"
                                data-testid="button-download-audio"
                              >
                                <Button variant="outline" size="sm" className="w-full">
                                  <Download className="h-3.5 w-3.5 mr-2" /> Download Audio
                                </Button>
                              </a>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Scheduled Posts */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Scheduled Posts
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          {!scheduledPosts || scheduledPosts.length === 0 ? (
                            <div className="p-6 text-center">
                              <p className="text-sm text-muted-foreground">No scheduled posts yet. Generate and schedule your first post above.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-border">
                              {scheduledPosts.map((post: any, i: number) => (
                                <div key={post.id ?? i} className="flex items-start gap-3 px-5 py-3.5">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground truncate">{post.content?.slice(0, 80)}{(post.content?.length ?? 0) > 80 ? "…" : ""}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{post.scheduledFor ? new Date(post.scheduledFor).toLocaleString() : ""}</p>
                                  </div>
                                  <div className="flex gap-1.5 flex-shrink-0">
                                    {post.platform && <Badge variant="outline" className="text-[10px]">{post.platform}</Badge>}
                                    {post.status && <Badge className="text-[10px]" style={{ background: post.status === "published" ? "#0D9E98" : post.status === "scheduled" ? "#C98A1A" : undefined }}>{post.status}</Badge>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* ─── Email Bot ─── */}
                  {botType === "email" && (
                    <div className="space-y-4">
                      {/* Send Single Email */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Mail className="h-4 w-4" /> Send Email
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="email-to" className="text-xs">To</Label>
                            <Input
                              id="email-to"
                              type="email"
                              placeholder="recipient@example.com"
                              value={emailTo}
                              onChange={(e) => setEmailTo(e.target.value)}
                              data-testid="input-email-to"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email-subject" className="text-xs">Subject</Label>
                            <Input
                              id="email-subject"
                              placeholder="Email subject"
                              value={emailSubject}
                              onChange={(e) => setEmailSubject(e.target.value)}
                              data-testid="input-email-subject"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email-body" className="text-xs">Body</Label>
                            <Textarea
                              id="email-body"
                              placeholder="Email body (HTML or plain text)"
                              value={emailBody}
                              onChange={(e) => setEmailBody(e.target.value)}
                              rows={5}
                              data-testid="textarea-email-body"
                            />
                          </div>
                          <Button
                            onClick={() => sendEmail.mutate()}
                            disabled={!emailTo.trim() || !emailSubject.trim() || sendEmail.isPending}
                            data-testid="button-send-email"
                          >
                            {sendEmail.isPending ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
                            ) : (
                              <><Mail className="h-4 w-4 mr-2" /> Send Email</>
                            )}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Send Campaign */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Zap className="h-4 w-4" /> Send Campaign
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="campaign-recipients" className="text-xs">Recipients (one email per line)</Label>
                            <Textarea
                              id="campaign-recipients"
                              placeholder={"alice@example.com\nbob@example.com"}
                              value={campaignRecipients}
                              onChange={(e) => setCampaignRecipients(e.target.value)}
                              rows={4}
                              data-testid="textarea-campaign-recipients"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="campaign-subject" className="text-xs">Subject</Label>
                            <Input
                              id="campaign-subject"
                              placeholder="Campaign subject"
                              value={campaignSubject}
                              onChange={(e) => setCampaignSubject(e.target.value)}
                              data-testid="input-campaign-subject"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="campaign-body" className="text-xs">Body</Label>
                            <Textarea
                              id="campaign-body"
                              placeholder="Campaign body"
                              value={campaignBody}
                              onChange={(e) => setCampaignBody(e.target.value)}
                              rows={5}
                              data-testid="textarea-campaign-body"
                            />
                          </div>
                          <Button
                            onClick={() => sendCampaign.mutate()}
                            disabled={!campaignRecipients.trim() || !campaignSubject.trim() || sendCampaign.isPending}
                            data-testid="button-send-campaign"
                          >
                            {sendCampaign.isPending ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending Campaign…</>
                            ) : (
                              <><Zap className="h-4 w-4 mr-2" /> Send Campaign</>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* ─── Finance Bot ─── */}
                  {botType === "finance" && (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <IndianRupee className="h-4 w-4" /> Create Invoice
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="client-name" className="text-xs">Client Name</Label>
                              <Input
                                id="client-name"
                                placeholder="Acme Corp"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                data-testid="input-client-name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="client-email" className="text-xs">Client Email</Label>
                              <Input
                                id="client-email"
                                type="email"
                                placeholder="billing@acme.com"
                                value={clientEmail}
                                onChange={(e) => setClientEmail(e.target.value)}
                                data-testid="input-client-email"
                              />
                            </div>
                          </div>

                          {/* Line Items */}
                          <div className="space-y-2">
                            <Label className="text-xs">Line Items</Label>
                            <div className="space-y-2">
                              {lineItems.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-center">
                                  <Input
                                    placeholder="Description"
                                    value={item.description}
                                    onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                                    data-testid={`input-line-desc-${idx}`}
                                  />
                                  <Input
                                    type="number"
                                    min={1}
                                    placeholder="Qty"
                                    value={item.quantity}
                                    onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                                    data-testid={`input-line-qty-${idx}`}
                                  />
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="Rate"
                                    value={item.rate}
                                    onChange={(e) => updateLineItem(idx, "rate", parseFloat(e.target.value) || 0)}
                                    data-testid={`input-line-rate-${idx}`}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeLineItem(idx)}
                                    disabled={lineItems.length === 1}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    data-testid={`button-remove-line-${idx}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <Button variant="outline" size="sm" onClick={addLineItem} data-testid="button-add-line">
                              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Item
                            </Button>
                          </div>

                          {/* Totals */}
                          <Card className="bg-muted/40">
                            <CardContent className="p-4 space-y-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">GST @ 18%</span>
                                <span>₹{gst.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm font-bold border-t border-border pt-1.5 mt-1.5">
                                <span>Total</span>
                                <span>₹{total.toFixed(2)}</span>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Notes */}
                          <div className="space-y-2">
                            <Label htmlFor="invoice-notes" className="text-xs">Notes (optional)</Label>
                            <Textarea
                              id="invoice-notes"
                              placeholder="Payment terms, bank details, etc."
                              value={invoiceNotes}
                              onChange={(e) => setInvoiceNotes(e.target.value)}
                              rows={2}
                              data-testid="textarea-invoice-notes"
                            />
                          </div>

                          <Button
                            onClick={() => generateInvoice.mutate()}
                            disabled={!clientName.trim() || generateInvoice.isPending}
                            data-testid="button-generate-invoice"
                          >
                            {generateInvoice.isPending ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
                            ) : (
                              <><IndianRupee className="h-4 w-4 mr-2" /> Generate Invoice</>
                            )}
                          </Button>

                          {/* Invoice Preview */}
                          {invoiceHtml && (
                            <Card className="border-2" style={{ borderColor: "#16803C40" }}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Invoice Preview</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div
                                  className="text-sm"
                                  dangerouslySetInnerHTML={{ __html: invoiceHtml }}
                                />
                              </CardContent>
                            </Card>
                          )}
                        </CardContent>
                      </Card>

                      {/* Invoice History */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-4 w-4" /> Invoice History
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          {!invoiceHistory || invoiceHistory.length === 0 ? (
                            <div className="p-6 text-center">
                              <p className="text-sm text-muted-foreground">No invoices yet. Generate your first invoice above.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-border">
                              {invoiceHistory.map((inv: any, i: number) => (
                                <div key={inv.id ?? i} className="flex items-center gap-3 px-5 py-3.5">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">{inv.clientName ?? inv.client_name ?? "Client"}</p>
                                    <p className="text-xs text-muted-foreground">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : ""}</p>
                                  </div>
                                  <div className="flex gap-2 items-center flex-shrink-0">
                                    {inv.total != null && <span className="text-sm font-semibold">₹{Number(inv.total).toFixed(2)}</span>}
                                    {inv.status && (
                                      <Badge className="text-[10px]" style={{ background: inv.status === "paid" ? "#16803C" : inv.status === "overdue" ? "#DC2626" : undefined }}>
                                        {inv.status}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
              )}

              {/* ========== ACTIVITY TAB ========== */}
              <TabsContent value="activity">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!isActive ? (
                      <div className="p-8 text-center">
                        <Pause className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Bot is inactive. Activate it to see activity.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {activities.map((act, i) => (
                          <div key={i} className="flex items-start gap-3 px-5 py-3.5" data-testid={`activity-row-${i}`}>
                            <div className="mt-0.5 flex-shrink-0">
                              {act.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              {act.status === "pending" && <Clock className="h-4 w-4 text-amber-500" />}
                              {act.status === "info" && <AlertCircle className="h-4 w-4 text-blue-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">{act.action}</p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{act.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ========== SETTINGS TAB ========== */}
              <TabsContent value="settings">
                <div className="space-y-4">
                  {/* Social Integrations — Marketing Bot gets real connect/disconnect */}
                  {botType === "marketing" ? (
                    <Card data-testid="card-social-integrations">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Globe className="h-4 w-4" /> Social Media Integrations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground mb-4">Connect your social accounts so the Marketing Bot can publish content directly to your profiles.</p>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {SOCIAL_PLATFORMS.map((sp) => {
                            const conn = socialConns?.find((c: any) => c.platform === sp.key && c.status === "connected");
                            return (
                              <div key={sp.key} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                                conn ? "border-green-200 bg-green-50/50" : "border-border bg-muted/20 hover:border-primary/30"
                              }`} data-testid={`social-${sp.key}`}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: sp.bg }}>
                                  <span className="text-lg">{sp.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-foreground">{sp.name}</div>
                                  {conn ? (
                                    <div className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                      {conn.pageName ? `${conn.pageName}` : conn.accountName || "Connected"}
                                      {conn.accountType === "page" && <span className="text-[8px] text-muted-foreground ml-1">(Page)</span>}
                                      {conn.accountType === "profile" && <span className="text-[8px] text-muted-foreground ml-1">(Profile)</span>}
                                      {conn.accountType === "pending" && <span className="text-[8px] text-amber-600 ml-1">— Select page ↓</span>}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-muted-foreground">Not connected</div>
                                  )}
                                </div>
                                {conn ? (
                                  <div className="flex flex-col gap-1 items-end">
                                    {conn.accountType === "pending" && conn.pages && (
                                      <Button variant="outline" size="sm" className="text-[10px] h-6"
                                        onClick={() => {
                                          setPagePickerPlatform(sp.key);
                                          try { setPagePickerPages(typeof conn.pages === "string" ? JSON.parse(conn.pages) : conn.pages); } catch { setPagePickerPages([]); }
                                          setPagePickerOpen(true);
                                        }}
                                        data-testid={`select-page-${sp.key}`}
                                      >Select Page</Button>
                                    )}
                                    <Button variant="ghost" size="sm" className="text-[10px] h-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => disconnectSocial.mutate(sp.key)}
                                      disabled={disconnectSocial.isPending}
                                      data-testid={`disconnect-${sp.key}`}
                                    >Disconnect</Button>
                                  </div>
                                ) : (
                                  <Button variant="outline" size="sm" className="text-xs h-7"
                                    onClick={() => startConnect(sp.key)}
                                    disabled={connectSocial.isPending}
                                    data-testid={`connect-${sp.key}`}
                                  >{sp.icon} Connect</Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                          <p className="text-[10px] text-muted-foreground">Once connected, the Marketing Bot can auto-publish posts to your accounts. For LinkedIn and Facebook, you can choose to post to a Company/Business Page or your personal profile.</p>
                        </div>

                        {/* Connect Popup */}
                        {connectPopupOpen && connectingPlatform && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConnectPopupOpen(false)}>
                            <div className="bg-background border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} data-testid="connect-popup">
                              {/* Popup Header */}
                              <div className="p-5 text-center" style={{ background: SOCIAL_PLATFORMS.find(p => p.key === connectingPlatform)?.bg || "#f5f5f5" }}>
                                <div className="text-4xl mb-2">{SOCIAL_PLATFORMS.find(p => p.key === connectingPlatform)?.icon}</div>
                                <h3 className="text-base font-bold text-foreground">Connect {SOCIAL_PLATFORMS.find(p => p.key === connectingPlatform)?.name}</h3>
                              </div>

                              <div className="p-5">
                                {connectStep === "confirm" && (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-4">This will allow ToolsYourWay Marketing Bot to:</p>
                                    <ul className="space-y-2 mb-5">
                                      <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500" /> Post content to your {SOCIAL_PLATFORMS.find(p => p.key === connectingPlatform)?.name}</li>
                                      <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500" /> Schedule posts on your behalf</li>
                                      <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500" /> Read engagement analytics</li>
                                    </ul>
                                    <Button className="w-full" onClick={confirmConnect} data-testid="confirm-connect">
                                      Connect {SOCIAL_PLATFORMS.find(p => p.key === connectingPlatform)?.name}
                                    </Button>
                                    <button className="w-full text-xs text-muted-foreground mt-2 py-2" onClick={() => setConnectPopupOpen(false)}>Cancel</button>
                                  </div>
                                )}

                                {connectStep === "loading" && (
                                  <div className="text-center py-6">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground">Connecting to {SOCIAL_PLATFORMS.find(p => p.key === connectingPlatform)?.name}...</p>
                                  </div>
                                )}

                                {connectStep === "pages" && (
                                  <div>
                                    <p className="text-sm font-medium text-foreground mb-1">Where should we post?</p>
                                    <p className="text-xs text-muted-foreground mb-4">Select a Page or your Personal Profile</p>
                                    <div className="space-y-2">
                                      {pagePickerPages.map((page) => (
                                        <button key={page.id}
                                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 transition-all text-left"
                                          onClick={() => { selectPage.mutate({ platform: connectingPlatform, pageId: page.id, pageName: page.name, accountType: page.type }); setConnectPopupOpen(false); }}
                                          data-testid={`page-${page.id}`}
                                        >
                                          <span className="text-lg">{page.type === "page" ? "🏢" : "👤"}</span>
                                          <div className="flex-1">
                                            <div className="text-sm font-medium">{page.name}</div>
                                            <div className="text-[10px] text-muted-foreground capitalize">{page.type}</div>
                                          </div>
                                          <span className="text-xs text-primary">Select</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {connectStep === "done" && (
                                  <div className="text-center py-6">
                                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                                    <p className="text-sm font-semibold text-foreground">Connected successfully!</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Page Picker Dialog (for changing page later) */}
                        {pagePickerOpen && !connectPopupOpen && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPagePickerOpen(false)}>
                            <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="page-picker-dialog">
                              <h3 className="text-base font-bold text-foreground mb-1">Where should we post?</h3>
                              <p className="text-xs text-muted-foreground mb-4">Choose a Page or Profile for {pagePickerPlatform}</p>
                              <div className="space-y-2">
                                {pagePickerPages.map((page) => (
                                  <button
                                    key={page.id}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 transition-all text-left"
                                    onClick={() => selectPage.mutate({ platform: pagePickerPlatform, pageId: page.id, pageName: page.name, accountType: page.type })}
                                    data-testid={`page-option-${page.id}`}
                                  >
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: page.type === "page" ? "#1E165010" : "#0D9E9810" }}>
                                      {page.type === "page" ? "🏢" : "👤"}
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-foreground">{page.name}</div>
                                      <div className="text-[10px] text-muted-foreground capitalize">{page.type}</div>
                                    </div>
                                    <span className="text-xs text-primary">Select →</span>
                                  </button>
                                ))}
                              </div>
                              <button className="mt-3 text-xs text-muted-foreground hover:text-foreground w-full text-center py-2" onClick={() => setPagePickerOpen(false)}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                  /* Non-marketing bots keep the simple channels list */
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Connected Channels</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {meta.channels.map((ch) => (
                          <div key={ch} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer" data-testid={`channel-${ch}`}>
                            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                            <span className="text-xs font-medium text-foreground truncate">{ch}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">Click a channel to configure connection settings.</p>
                    </CardContent>
                  </Card>
                  )}

                  {/* Schedule */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Schedule
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Run Frequency</Label>
                          <Select defaultValue="daily">
                            <SelectTrigger data-testid="select-frequency">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Every hour</SelectItem>
                              <SelectItem value="3x">3 times / day</SelectItem>
                              <SelectItem value="daily">Once daily</SelectItem>
                              <SelectItem value="weekly">Once a week</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Preferred Time</Label>
                          <Input type="time" defaultValue="09:00" data-testid="input-time" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Language */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Language & Region
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Bot Output Language</Label>
                          <Select defaultValue="English">
                            <SelectTrigger data-testid="select-language">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGES.map((lang) => (
                                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Timezone</Label>
                          <Select defaultValue="IST">
                            <SelectTrigger data-testid="select-timezone">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IST">India (IST)</SelectItem>
                              <SelectItem value="GST">Gulf (GST)</SelectItem>
                              <SelectItem value="CST">China (CST)</SelectItem>
                              <SelectItem value="JST">Japan (JST)</SelectItem>
                              <SelectItem value="UTC">UTC</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button className="w-full sm:w-auto" data-testid="button-save-settings"
                    onClick={() => toast({ title: "Settings saved", description: "Bot configuration updated." })}
                  >
                    Save Settings
                  </Button>
                </div>
              </TabsContent>

              {/* ========== METRICS TAB ========== */}
              <TabsContent value="metrics">
                {!isActive ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Activate the bot to start collecting metrics.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card data-testid="metric-tasks">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-foreground">{metrics.tasksCompleted}</div>
                          <div className="text-xs text-muted-foreground">Tasks Completed</div>
                        </CardContent>
                      </Card>
                      <Card data-testid="metric-success">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold" style={{ color: "#0D9E98" }}>{metrics.successRate}%</div>
                          <div className="text-xs text-muted-foreground">Success Rate</div>
                        </CardContent>
                      </Card>
                      <Card data-testid="metric-response">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-foreground">{metrics.avgResponseTime}</div>
                          <div className="text-xs text-muted-foreground">Avg Response</div>
                        </CardContent>
                      </Card>
                      <Card data-testid="metric-uptime">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold" style={{ color: "#C98A1A" }}>{metrics.uptime}</div>
                          <div className="text-xs text-muted-foreground">Uptime</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Performance Overview */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Performance This Week</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[
                            { label: "Tasks executed", value: metrics.tasksCompleted, max: 150, color: meta.color },
                            { label: "Success rate", value: parseFloat(metrics.successRate), max: 100, color: "#0D9E98" },
                            { label: "Engagement score", value: 78 + Math.floor(Math.random() * 15), max: 100, color: "#C98A1A" },
                          ].map((bar) => (
                            <div key={bar.label}>
                              <div className="flex justify-between text-xs mb-1.5">
                                <span className="text-muted-foreground">{bar.label}</span>
                                <span className="font-medium text-foreground">{bar.value}{bar.max === 100 ? "%" : ""}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${(bar.value / bar.max) * 100}%`, background: bar.color }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
