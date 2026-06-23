import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Bot, Sparkles, Minimize2, Mic, UserCog, Target, Loader2 } from "lucide-react";

const LANGUAGES = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "bn-IN", label: "Bengali" },
  { code: "mr-IN", label: "Marathi" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "ar-SA", label: "Arabic" },
  { code: "zh-CN", label: "Chinese" },
];

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  // Nexus may emit [[NEXUS_ACTION:create_mission|<goal>]] at the end of an
  // assistant turn. We extract the goal here so the UI can render an actionable button.
  missionGoal?: string;
}

// Strip [[NEXUS_ACTION:...]] markers out of displayed text and return the
// extracted goal (if any). The marker is the contract between the system
// prompt and the frontend — see /api/chat system prompt.
function extractMissionAction(text: string): { displayText: string; goal?: string } {
  const m = /\[\[NEXUS_ACTION:create_mission\|([^\]]+)\]\]/.exec(text);
  if (!m) return { displayText: text };
  const goal = m[1].trim();
  const displayText = text.replace(m[0], "").replace(/\n{3,}$/, "\n\n").trim();
  return { displayText, goal };
}

const ROLE_PRESETS = [
  { value: "", label: "Chief of Staff (default)" },
  { value: "LinkedIn Content Strategist", label: "LinkedIn Content Strategist" },
  { value: "Growth Marketer", label: "Growth Marketer" },
  { value: "Senior Recruiter", label: "Senior Recruiter" },
  { value: "Sales Leader", label: "Sales Leader" },
  { value: "Brand Marketer", label: "Brand Marketer" },
  { value: "Product Manager", label: "Product Manager" },
  { value: "CFO", label: "CFO" },
  { value: "Executive Coach", label: "Executive Coach" },
];

export default function AiChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [role, setRole] = useState<string>("");
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [activeModel, setActiveModel] = useState<{ label: string; provider: string } | null>(null);
  const [, nav] = useLocation();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en-IN");
  const recognitionRef = useRef<any>(null);
  const hasSpeechAPI = Boolean(SpeechRecognitionAPI);

  const startRecording = useCallback(() => {
    if (!SpeechRecognitionAPI || isRecording) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = selectedLang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [isRecording, selectedLang]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat", {
        message,
        history: messages,
        role: role || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      const { displayText, goal } = extractMissionAction(String(data.reply || ""));
      setMessages((prev) => [...prev, { role: "assistant", content: displayText, missionGoal: goal }]);
      if (data?.modelLabel) {
        setActiveModel({ label: data.modelLabel, provider: data.provider || "Anthropic" });
      }
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    },
  });

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || sendMessage.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    sendMessage.mutate(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Don't render if not logged in
  if (!user) return null;

  // Render markdown-ish bold
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: formatted }} />
          {i < text.split("\n").length - 1 && <br />}
        </span>
      );
    });
  };

  // One-click “Start this Mission” — calls /api/missions with the extracted goal
  // and navigates to the mission detail page once Nexus has drafted the kickoff posts.
  const startMission = useMutation({
    mutationFn: async (goal: string) => {
      const res = await apiRequest("POST", "/api/missions", { goal, platform: "linkedin", postsPerWeek: 5, durationDays: 60 });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Mission launched",
        description: `Nexus drafted ${data.posts?.length || 0} kickoff posts. ${data.email?.sent ? "Review email sent." : ""}`,
      });
      if (data.mission?.id) {
        setOpen(false);
        nav(`/missions/${data.mission.id}`);
      }
    },
    onError: (err: any) => {
      toast({ title: "Could not start mission", description: err.message || "Try again", variant: "destructive" });
    },
  });

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[999] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #1E1650, #3D309A)",
            boxShadow: "0 6px 24px rgba(30,22,80,0.4)",
          }}
          data-testid="chat-bubble"
        >
          <MessageCircle className="h-6 w-6 text-white" />
          {/* Pulse indicator */}
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-[999] w-[380px] max-w-[calc(100vw-48px)] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border/50"
          style={{
            height: "min(560px, calc(100vh - 48px))",
            boxShadow: "0 24px 80px rgba(12,10,30,0.25)",
          }}
          data-testid="chat-window"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #1E1650, #2D2275)" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <span>Nexus{role ? <span className="text-amber-300/90 font-normal"> · {role}</span> : null}</span>
                  {activeModel && (
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/10 text-amber-200 border border-amber-300/20"
                      title={`${activeModel.provider} · ${activeModel.label}`}
                      data-testid="model-badge"
                    >
                      {activeModel.label}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-white/50 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  AI Chief of Staff · {activeModel ? `Powered by ${activeModel.provider}` : "Online"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowRolePicker(v => !v)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                data-testid="chat-role-picker"
                title="Change Nexus's role"
              >
                <UserCog className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                data-testid="chat-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Role picker (collapsible) */}
          {showRolePicker && (
            <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex-shrink-0">
              <div className="text-[11px] font-medium text-foreground mb-1.5">Have Nexus act as your…</div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background"
                data-testid="role-select"
              >
                {ROLE_PRESETS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <div className="text-[10px] text-muted-foreground mt-1.5">
                Or just type “act as my [role]” in chat — Nexus adapts.
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-background">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: "rgba(30,22,80,0.06)" }}
                >
                  <Bot className="h-6 w-6" style={{ color: "#1E1650" }} />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Hi {user.name?.split(" ")[0]}, I'm Nexus.
                </p>
                <p className="text-xs text-muted-foreground mb-4 px-4">
                  Your AI Chief of Staff. Tell me what you're working on — a launch, a hire, a campaign, a 60-day plan — and I'll think it through with you and ship the work.
                </p>
                {/* Quick actions */}
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {[
                    "Build me a 60-day LinkedIn content plan",
                    "Draft a recruiter outreach sequence",
                    "Critique my pricing page",
                    "Plan a product launch",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setMessages([{ role: "user", content: q }]);
                        sendMessage.mutate(q);
                      }}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      data-testid={`quick-action-${q.slice(0, 10)}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                  data-testid={`message-${msg.role}-${i}`}
                >
                  {renderContent(msg.content)}
                </div>
                {msg.role === "assistant" && msg.missionGoal && (
                  <button
                    onClick={() => startMission.mutate(msg.missionGoal!)}
                    disabled={startMission.isPending}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-amber-500 text-white shadow-sm hover:shadow-md transition disabled:opacity-60"
                    data-testid={`button-start-mission-${i}`}
                  >
                    {startMission.isPending ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Nexus is launching…</>
                    ) : (
                      <><Target className="h-3.5 w-3.5" /> Start this Mission</>
                    )}
                  </button>
                )}
              </div>
            ))}

            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-border bg-background flex-shrink-0">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={role ? `Ask Nexus (acting as ${role})…` : "Ask Nexus anything…"}
              className="flex-1 text-sm border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl px-4"
              disabled={sendMessage.isPending}
              data-testid="chat-input"
            />
            {hasSpeechAPI && (
              <>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="text-[11px] border border-border/50 rounded-lg px-1.5 py-1 bg-background text-muted-foreground h-9 cursor-pointer max-w-[70px]"
                  data-testid="lang-selector"
                  title="Speech language"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={sendMessage.isPending}
                  data-testid="mic-button"
                  title={isRecording ? "Stop recording" : "Start voice input"}
                  className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    isRecording
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Mic className="h-4 w-4" />
                </button>
              </>
            )}
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!input.trim() || sendMessage.isPending}
              className="rounded-xl px-3 h-9"
              data-testid="chat-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
