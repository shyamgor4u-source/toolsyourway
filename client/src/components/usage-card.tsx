import { useState } from "react";
import { useTrialStatus } from "@/components/trial-banner";
import { CreditsModal } from "@/components/credits-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { Film, ImageIcon, Zap, Crown, Calendar, TrendingUp } from "lucide-react";

// Format a reset date nicely
function formatResetDate(iso: string | null): string {
  if (!iso) return "End of billing cycle";
  const d = new Date(iso);
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Resetting soon";
  if (days === 1) return "Resets tomorrow";
  return `Resets in ${days} days`;
}

export function UsageCard() {
  const { data: trial, isLoading } = useTrialStatus();
  const [creditsOpen, setCreditsOpen] = useState(false);

  if (isLoading || !trial) return null;
  // Admins with 9999 caps \u2014 show simplified card
  const isUnlimited = trial.videoCap >= 9999;

  const videoPct = trial.videoCap > 0 ? Math.min(100, (trial.videoUsageCount / trial.videoCap) * 100) : 0;
  const imagePct = trial.imageCap > 0 ? Math.min(100, (trial.imageUsageCount / trial.imageCap) * 100) : 0;
  const videoRemaining = Math.max(0, trial.videoCap - trial.videoUsageCount);
  const imageRemaining = Math.max(0, trial.imageCap - trial.imageUsageCount);

  // Color based on usage level
  const getBarClass = (pct: number) => {
    if (pct >= 90) return "[&>div]:bg-red-500";
    if (pct >= 75) return "[&>div]:bg-orange-500";
    return "[&>div]:bg-[#1E1650]";
  };

  return (
    <>
      <Card className="border-border/60" data-testid="card-usage">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#1E1650]" />
                Usage This Month
              </CardTitle>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1E1650]/10 text-[#1E1650] font-medium">
                  {trial.planLabel}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatResetDate(trial.usageResetAt)}
                </span>
              </div>
            </div>
            {trial.paygCredits > 0 && (
              <div className="text-right" data-testid="text-credits-balance">
                <div className="text-xs text-muted-foreground">PAYG Credits</div>
                <div className="font-semibold text-[#E9A820] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  {trial.paygCredits}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isUnlimited ? (
            <div className="text-center py-4">
              <Crown className="w-8 h-8 text-[#E9A820] mx-auto mb-2" />
              <div className="font-semibold text-[#1E1650]">Unlimited Access</div>
              <div className="text-sm text-muted-foreground">
                {trial.videoUsageCount} videos \u00b7 {trial.imageUsageCount} images generated this month
              </div>
            </div>
          ) : (
            <>
              {/* Videos */}
              <div data-testid="usage-videos">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Film className="w-4 h-4 text-[#1E1650]" />
                    <span className="font-medium">AI Videos</span>
                  </div>
                  <div className="text-sm tabular-nums">
                    <span className={videoPct >= 90 ? "text-red-600 font-semibold" : videoPct >= 75 ? "text-orange-600 font-medium" : "text-gray-700"}>
                      {trial.videoUsageCount}
                    </span>
                    <span className="text-muted-foreground"> / {trial.videoCap}</span>
                  </div>
                </div>
                <Progress value={videoPct} className={`h-2 ${getBarClass(videoPct)}`} />
                <div className="text-xs text-muted-foreground mt-1">
                  {videoRemaining} video{videoRemaining !== 1 ? "s" : ""} remaining
                  {videoPct >= 80 && videoRemaining > 0 && " \u2014 running low"}
                </div>
              </div>

              {/* Images */}
              <div data-testid="usage-images">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <ImageIcon className="w-4 h-4 text-[#1E1650]" />
                    <span className="font-medium">AI Images</span>
                  </div>
                  <div className="text-sm tabular-nums">
                    <span className={imagePct >= 90 ? "text-red-600 font-semibold" : imagePct >= 75 ? "text-orange-600 font-medium" : "text-gray-700"}>
                      {trial.imageUsageCount}
                    </span>
                    <span className="text-muted-foreground"> / {trial.imageCap}</span>
                  </div>
                </div>
                <Progress value={imagePct} className={`h-2 ${getBarClass(imagePct)}`} />
                <div className="text-xs text-muted-foreground mt-1">
                  {imageRemaining} image{imageRemaining !== 1 ? "s" : ""} remaining
                </div>
              </div>
            </>
          )}

          {/* CTAs */}
          {!isUnlimited && (
            <div className="flex gap-2 pt-2 border-t border-border/60 flex-wrap">
              {(videoPct >= 75 || imagePct >= 75) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#E9A820] text-[#C98A1A] hover:bg-[#E9A820]/10"
                  onClick={() => setCreditsOpen(true)}
                  data-testid="button-usage-buy-credits"
                >
                  <Zap className="w-3.5 h-3.5 mr-1" />
                  Buy Top-up Credits
                </Button>
              )}
              {trial.plan === "none" && (
                <Link href="/pricing" className="flex-1">
                  <Button size="sm" className="w-full bg-[#1E1650] hover:bg-[#3D309A] text-white" data-testid="button-usage-upgrade">
                    <Crown className="w-3.5 h-3.5 mr-1" />
                    {trial.status === "active" ? "Upgrade for more" : "Pick a Plan"}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <CreditsModal open={creditsOpen} onClose={() => setCreditsOpen(false)} />
    </>
  );
}
