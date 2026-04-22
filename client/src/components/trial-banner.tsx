import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Clock, Zap, CheckCircle2, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export interface TrialStatus {
  status: "active" | "expired" | "paid" | "none";
  daysRemaining: number;
  hoursRemaining: number;
  endsAt: string | null;
  plan: string;
  planLabel: string;
  paygCredits: number;
  videoUsageCount: number;
  imageUsageCount: number;
  videoCap: number;
  imageCap: number;
  usageResetAt: string | null;
  hasUsedResumeTrial: boolean;
  canResumeTrial: boolean;
}

export function useResumeTrial() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/resume-trial");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Trial extended", description: "You have 3 more days of full access. Make it count." });
      queryClient.invalidateQueries({ queryKey: ["/api/user/trial-status"] });
    },
    onError: (e: any) => {
      toast({ title: "Couldn't resume trial", description: e.message || "Please try again", variant: "destructive" });
    },
  });
}

export function useTrialStatus() {
  return useQuery<TrialStatus>({
    queryKey: ["/api/user/trial-status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/trial-status");
      return res.json();
    },
    refetchInterval: 60_000, // refresh every minute
  });
}

export function TrialBanner() {
  const { data: trial } = useTrialStatus();
  if (!trial) return null;
  if (trial.status === "paid") return null; // paid users & admins don't see this

  // Expired — urgent red banner
  if (trial.status === "expired") {
    return <ExpiredBanner trial={trial} />;
  }

  // Active — countdown banner (color ramps as days decrease)
  if (trial.status === "active") {
    const isUrgent = trial.daysRemaining <= 2;
    const bgClass = isUrgent
      ? "bg-gradient-to-r from-orange-500 to-orange-600"
      : "bg-gradient-to-r from-[#1E1650] to-[#3D309A]";
    const timeLabel =
      trial.daysRemaining > 1
        ? `${trial.daysRemaining} days left`
        : trial.hoursRemaining > 1
        ? `${trial.hoursRemaining} hours left`
        : "Trial ending soon";

    return (
      <div className={`${bgClass} text-white`} data-testid="banner-trial-active">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-between">
          <div className="flex items-center gap-2.5">
            {isUrgent ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            <div className="text-sm">
              <span className="font-semibold">{timeLabel}</span>
              <span className="opacity-90 ml-2">on your free trial — all 9 bots unlocked</span>
            </div>
          </div>
          <Link href="/pricing">
            <Button size="sm" variant="secondary" className="bg-white text-[#1E1650] hover:bg-gray-100 font-semibold" data-testid="button-upgrade-trial">
              <Zap className="w-3.5 h-3.5 mr-1" />
              Lock in Founders Discount
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

function ExpiredBanner({ trial }: { trial: TrialStatus }) {
  const resumeMut = useResumeTrial();
  return (
    <div className="bg-gradient-to-r from-red-600 to-red-700 text-white" data-testid="banner-trial-expired">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-sm">Your 7-day free trial has ended</div>
            <div className="text-xs opacity-90">
              {trial.paygCredits > 0
                ? `You have ${trial.paygCredits} PAYG credits left. Upgrade for unlimited access.`
                : trial.canResumeTrial
                ? "Get 3 more days free, or upgrade to a plan."
                : "Upgrade to a plan or buy PAYG credits to continue creating."}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {trial.canResumeTrial && (
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/15 text-white hover:bg-white/25 border border-white/30 font-semibold"
              onClick={() => resumeMut.mutate()}
              disabled={resumeMut.isPending}
              data-testid="button-resume-trial-banner"
            >
              {resumeMut.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
              )}
              Get 3 More Days Free
            </Button>
          )}
          <Link href="/pricing">
            <Button size="sm" variant="secondary" className="bg-white text-red-700 hover:bg-red-50 font-semibold" data-testid="button-upgrade-expired">
              Upgrade Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Small inline badge — can be used in sidebar or header
export function TrialBadge() {
  const { data: trial } = useTrialStatus();
  if (!trial || trial.status === "paid") return null;

  if (trial.status === "expired") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 text-red-700 text-xs font-medium" data-testid="badge-trial-expired">
        <AlertTriangle className="w-3 h-3" />
        Trial Ended
      </span>
    );
  }
  if (trial.status === "active") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#E9A820]/15 text-[#C98A1A] text-xs font-medium" data-testid="badge-trial-active">
        <Clock className="w-3 h-3" />
        {trial.daysRemaining}d trial
      </span>
    );
  }
  return null;
}
