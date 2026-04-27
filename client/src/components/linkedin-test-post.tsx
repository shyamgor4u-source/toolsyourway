import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Linkedin, Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function LinkedInTestPost({
  open,
  onClose,
  connection,
}: {
  open: boolean;
  onClose: () => void;
  connection: any;
}) {
  const { toast } = useToast();
  const [text, setText] = useState(
    "Hello LinkedIn! Testing ToolsYourWay's AI-powered posting integration — this post was drafted and published via ToolsYourWay.com in under 10 seconds.",
  );
  const [result, setResult] = useState<{ url?: string; postId?: string } | null>(null);

  const postMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/publish/linkedin-post", { text });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Post failed");
      return data;
    },
    onSuccess: (data) => {
      setResult({ url: data.url, postId: data.postId });
      toast({ title: "Posted to LinkedIn", description: "Your post is live." });
    },
    onError: (e: any) => {
      toast({ title: "Post failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setResult(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg" data-testid="dialog-linkedin-test">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Linkedin className="w-5 h-5 text-[#0A66C2]" />
            Test Post to LinkedIn
          </DialogTitle>
          <DialogDescription>
            This will publish a real post to your LinkedIn feed as{" "}
            <strong>{connection?.displayName || connection?.accountName || "your account"}</strong>.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <div className="font-semibold text-[#1E1650]">Posted successfully</div>
              <div className="text-xs text-muted-foreground mt-1">Post ID: {result.postId}</div>
            </div>
            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-[#0A66C2] hover:underline"
                data-testid="link-posted-url"
              >
                View on LinkedIn
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <Button variant="outline" size="sm" onClick={() => setResult(null)} className="ml-2">
              Post another
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
              {connection?.profilePictureUrl ? (
                <img
                  src={connection.profilePictureUrl}
                  alt={connection.displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center text-white">
                  <Linkedin className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{connection?.displayName || connection?.accountName}</div>
                <div className="text-xs text-muted-foreground">Posting to your personal feed · Public</div>
              </div>
            </div>

            <Textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What do you want to share?"
              className="text-sm"
              data-testid="textarea-linkedin-post"
            />
            <div className="text-xs text-muted-foreground text-right">{text.length} / 3000 characters</div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#0A66C2] hover:bg-[#004182] text-white"
                disabled={!text.trim() || postMut.isPending}
                onClick={() => postMut.mutate()}
                data-testid="button-post-linkedin"
              >
                {postMut.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Linkedin className="w-4 h-4 mr-2" />
                    Post to LinkedIn
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
