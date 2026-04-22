import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Clock, Zap, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TrialStatus {
  status: "active" | "expired" | "paid" | "none";
  daysRemaining: number;
  hoursRemaining: number;
  endsAt: string | null;
  plan: string;
  paygCredits: number;
  videoUsageCount: number;
  imageUsageCount: number;
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
                  : "Upgrade to a plan or buy PAYG credits to continue creating."}
              </div>
            </div>
          </div>
          <Link href="/pricing">
            <Button size="sm" variant="secondary" className="bg-white text-red-700 hover:bg-red-50 font-semibold" data-testid="button-upgrade-expired">
              Upgrade Now
            </Button>
          </Link>
        </div>
      </div>
    );
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
