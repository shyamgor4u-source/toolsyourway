import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Chip, LinkAction, Pill, type Tone } from "../components/ui";
import { api } from "../api/client";
import {
  marketing,
  type DestinationDefaults,
  type PlatformDestinations,
  type PostStatus,
  type PostStatusAction,
  type PublishStatus,
  type ScheduledPost,
} from "../api/marketing";
import { colors, font, radius, spacing } from "../theme";

type Tab = "destinations" | "posts";

const STATUS_TONE: Record<PostStatus, Tone> = {
  draft: "muted",
  scheduled: "default",
  approved: "success",
  publishing: "warning",
  published: "success",
  partial_failed: "warning",
  failed: "danger",
  cancelled: "muted",
};

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "DRAFT",
  scheduled: "SCHEDULED",
  approved: "APPROVED",
  publishing: "PUBLISHING",
  published: "PUBLISHED",
  partial_failed: "PARTIAL",
  failed: "FAILED",
  cancelled: "CANCELLED",
};

// Which status-change actions are valid for a given post status. Mirrors the
// backend's narrow transition rules so we never offer an action that 400s.
function allowedActions(status: PostStatus): PostStatusAction[] {
  switch (status) {
    case "draft":
    case "scheduled":
      return ["approve", "cancel"];
    case "approved":
      return ["unapprove", "cancel"];
    case "failed":
    case "partial_failed":
      return ["retry", "approve", "cancel"];
    case "publishing":
    case "published":
    case "cancelled":
      return [];
    default:
      return [];
  }
}

const ACTION_LABEL: Record<PostStatusAction, string> = {
  approve: "Approve",
  unapprove: "Unapprove",
  cancel: "Cancel",
  retry: "Retry",
};

const ACTION_TONE: Record<PostStatusAction, Tone> = {
  approve: "success",
  unapprove: "warning",
  cancel: "danger",
  retry: "default",
};

function capLabels(c: {
  canPostText: boolean;
  canPostImage: boolean;
  canPostVideo: boolean;
  canPostCarousel: boolean;
}): string[] {
  const out: string[] = [];
  if (c.canPostText) out.push("Text");
  if (c.canPostImage) out.push("Image");
  if (c.canPostVideo) out.push("Video");
  if (c.canPostCarousel) out.push("Carousel");
  return out;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "Immediately when approved";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MarketingScreen() {
  const [tab, setTab] = useState<Tab>("destinations");

  const [platforms, setPlatforms] = useState<PlatformDestinations[] | null>(null);
  const [posts, setPosts] = useState<ScheduledPost[] | null>(null);
  const [status, setStatus] = useState<PublishStatus | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected destination IDs per platform (local edit state for defaults).
  const [selected, setSelected] = useState<DestinationDefaults>({});
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [defaultsDirty, setDefaultsDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Per-post action in-flight tracking, so we can disable a row's buttons.
  const [busyPostId, setBusyPostId] = useState<number | null>(null);

  const seedSelection = useCallback((list: PlatformDestinations[]) => {
    const next: DestinationDefaults = {};
    for (const p of list) {
      const ids = p.destinations.filter((d) => d.selectedByDefault).map((d) => d.destinationId);
      if (ids.length) next[p.platform] = ids;
    }
    setSelected(next);
    setDefaultsDirty(false);
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const [dest, postList, pubStatus] = await Promise.all([
          marketing.destinations(),
          marketing.posts(),
          marketing.publishStatus(),
        ]);
        setPlatforms(dest.platforms);
        setPosts(postList);
        setStatus(pubStatus);
        seedSelection(dest.platforms);
      } catch (e) {
        setError((e as { message?: string })?.message || "Failed to load Marketing data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [seedSelection],
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const toggleDestination = useCallback((platform: string, id: string) => {
    setSelected((prev) => {
      const cur = new Set(prev[platform] || []);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      const next = { ...prev };
      if (cur.size) next[platform] = Array.from(cur);
      else delete next[platform];
      return next;
    });
    setDefaultsDirty(true);
    setSavedFlash(false);
  }, []);

  const saveDefaults = useCallback(async () => {
    setSavingDefaults(true);
    setError(null);
    try {
      await marketing.saveDefaults(selected);
      setDefaultsDirty(false);
      setSavedFlash(true);
    } catch (e) {
      setError((e as { message?: string })?.message || "Failed to save defaults.");
    } finally {
      setSavingDefaults(false);
    }
  }, [selected]);

  const changeStatus = useCallback(
    async (id: number, action: PostStatusAction) => {
      setBusyPostId(id);
      setError(null);
      try {
        const updated = await marketing.setStatus(id, action);
        setPosts((prev) =>
          (prev || []).map((p) => (p.id === id ? { ...p, ...updated } : p)),
        );
        // Refresh worker/due counts after a status change (cheap, best-effort).
        marketing.publishStatus().then(setStatus).catch(() => {});
      } catch (e) {
        setError((e as { message?: string })?.message || "Action failed.");
      } finally {
        setBusyPostId(null);
      }
    },
    [],
  );

  const openWebConnect = useCallback(() => {
    // OAuth/connect is web-only for now. Open the web dashboard; do not fake connect.
    Linking.openURL(`${api.baseUrl}/#/dashboard`).catch(() => {});
  }, []);

  const anyConnected = useMemo(
    () => (platforms || []).some((p) => p.connected),
    [platforms],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.headerWrap}>
        <Text style={styles.title}>Marketing Bot</Text>
        <Text style={styles.subtitle}>Publish destinations & scheduled-post approvals</Text>
        <View style={styles.tabs}>
          <TabButton label="Destinations" active={tab === "destinations"} onPress={() => setTab("destinations")} />
          <TabButton
            label={`Approvals${posts && posts.length ? ` (${posts.length})` : ""}`}
            active={tab === "posts"}
            onPress={() => setTab("posts")}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.accent} />
        }
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <>
            {error ? (
              <Card style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </Card>
            ) : null}

            <WorkerHint status={status} />

            {tab === "destinations" ? (
              <DestinationsTab
                platforms={platforms || []}
                selected={selected}
                onToggle={toggleDestination}
                onSave={saveDefaults}
                saving={savingDefaults}
                dirty={defaultsDirty}
                saved={savedFlash}
                anyConnected={anyConnected}
                onConnect={openWebConnect}
              />
            ) : (
              <PostsTab posts={posts || []} busyPostId={busyPostId} onAction={changeStatus} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function WorkerHint({ status }: { status: PublishStatus | null }) {
  if (!status) return null;
  const due = status.dueNow?.length || 0;
  const tone: Tone = status.workerEnabled ? "success" : "warning";
  return (
    <Card style={styles.workerCard}>
      <View style={styles.workerHead}>
        <Pill label={status.workerEnabled ? "WORKER ON" : "WORKER OFF"} tone={tone} />
        <Text style={styles.workerDue}>
          {due} approved post{due === 1 ? "" : "s"} due now
        </Text>
      </View>
      <Text style={styles.workerNote}>
        {status.workerEnabled
          ? "Approved posts that are due will auto-publish on the backend schedule."
          : "Scheduled posts can be approved here, but won't auto-publish until the publish worker is enabled on the backend."}
      </Text>
    </Card>
  );
}

function DestinationsTab({
  platforms,
  selected,
  onToggle,
  onSave,
  saving,
  dirty,
  saved,
  anyConnected,
  onConnect,
}: {
  platforms: PlatformDestinations[];
  selected: DestinationDefaults;
  onToggle: (platform: string, id: string) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  saved: boolean;
  anyConnected: boolean;
  onConnect: () => void;
}) {
  if (!platforms.length) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No platforms available</Text>
        <Text style={styles.emptyText}>Connect your social accounts on the web dashboard to get started.</Text>
        <Button title="Open web dashboard" variant="ghost" onPress={onConnect} />
      </Card>
    );
  }

  return (
    <>
      {!anyConnected ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No accounts connected yet</Text>
          <Text style={styles.emptyText}>
            Connect this platform on the web dashboard first, then return here to pick your default publish targets.
          </Text>
          <Button title="Open web dashboard" variant="ghost" onPress={onConnect} />
        </Card>
      ) : null}

      {platforms.map((p) => {
        const sel = new Set(selected[p.platform] || []);
        return (
          <Card key={p.platform} style={styles.platformCard}>
            <View style={styles.platformHead}>
              <Text style={styles.platformLabel}>{p.label}</Text>
              <Pill label={p.connected ? "CONNECTED" : "NOT CONNECTED"} tone={p.connected ? "success" : "muted"} />
            </View>
            {p.note ? <Text style={styles.platformNote}>{p.note}</Text> : null}

            {!p.connected ? (
              <Pressable onPress={onConnect}>
                <Text style={styles.connectLink}>Connect this platform on the web dashboard →</Text>
              </Pressable>
            ) : p.destinations.length === 0 ? (
              <Text style={styles.platformNote}>No destinations found for this account.</Text>
            ) : (
              <View style={styles.destList}>
                {p.destinations.map((d) => (
                  <View key={d.destinationId} style={styles.destRow}>
                    <Chip
                      label={d.displayName}
                      selected={sel.has(d.destinationId)}
                      onPress={() => onToggle(p.platform, d.destinationId)}
                    />
                    <View style={styles.capRow}>
                      {capLabels(d.capabilities).map((c) => (
                        <View key={c} style={styles.capBadge}>
                          <Text style={styles.capBadgeText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        );
      })}

      <View style={styles.saveBar}>
        {saved && !dirty ? <Text style={styles.savedText}>Defaults saved ✓</Text> : null}
        <Button title="Save default destinations" onPress={onSave} loading={saving} disabled={!dirty} />
      </View>
    </>
  );
}

function PostsTab({
  posts,
  busyPostId,
  onAction,
}: {
  posts: ScheduledPost[];
  busyPostId: number | null;
  onAction: (id: number, action: PostStatusAction) => void;
}) {
  if (!posts.length) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No scheduled posts</Text>
        <Text style={styles.emptyText}>
          Schedule posts from the Marketing Bot on the web dashboard. They'll appear here for approval, and you can
          approve, cancel, or retry them on the go. In-app scheduling is coming next.
        </Text>
      </Card>
    );
  }

  return (
    <>
      {posts.map((post) => {
        const actions = allowedActions(post.status);
        const busy = busyPostId === post.id;
        return (
          <Card key={post.id} style={styles.postCard}>
            <View style={styles.postHead}>
              <Pill label={STATUS_LABEL[post.status] ?? post.status.toUpperCase()} tone={STATUS_TONE[post.status] ?? "default"} />
              <Text style={styles.postWhen}>{formatWhen(post.scheduledFor)}</Text>
            </View>

            <Text style={styles.postContent} numberOfLines={4}>
              {post.content}
            </Text>

            {post.destinations.length ? (
              <View style={styles.chipWrap}>
                {post.destinations.map((d) => (
                  <Chip key={`${d.platform}:${d.destinationId}`} label={d.displayName} />
                ))}
              </View>
            ) : (
              <Text style={styles.postMeta}>Platform: {post.platform}</Text>
            )}

            {post.publishResults?.length ? (
              <View style={styles.results}>
                {post.publishResults.map((r, i) => (
                  <View key={`${r.destinationId}:${i}`} style={styles.resultRow}>
                    <Text style={[styles.resultDot, { color: r.ok ? colors.success : colors.danger }]}>●</Text>
                    <Text style={styles.resultText} numberOfLines={2}>
                      {r.displayName}: {r.ok ? "published" : r.error || "failed"}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {post.lastError ? <Text style={styles.lastError}>Last error: {post.lastError}</Text> : null}

            {actions.length ? (
              <View style={styles.actions}>
                {busy ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  actions.map((a) => (
                    <LinkAction
                      key={a}
                      label={ACTION_LABEL[a]}
                      tone={ACTION_TONE[a]}
                      onPress={() => onAction(post.id, a)}
                    />
                  ))
                )}
              </View>
            ) : null}
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  title: { color: colors.text, fontSize: font.h1, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: font.small },
  tabs: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  tabBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabBtnActive: { borderColor: colors.accent, backgroundColor: colors.primaryLight },
  tabBtnText: { color: colors.textMuted, fontWeight: "700", fontSize: font.small },
  tabBtnTextActive: { color: colors.text },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  center: { paddingVertical: spacing.xxl, alignItems: "center" },

  errorCard: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: font.small },

  workerCard: { gap: spacing.sm },
  workerHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  workerDue: { color: colors.textMuted, fontSize: font.small, fontWeight: "600" },
  workerNote: { color: colors.textFaint, fontSize: font.small, lineHeight: 18 },

  emptyCard: { borderStyle: "dashed", gap: spacing.md },
  emptyTitle: { color: colors.text, fontSize: font.h3, fontWeight: "700" },
  emptyText: { color: colors.textMuted, fontSize: font.small, lineHeight: 19 },

  platformCard: { gap: spacing.sm },
  platformHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  platformLabel: { color: colors.text, fontSize: font.h3, fontWeight: "700" },
  platformNote: { color: colors.textFaint, fontSize: font.small, lineHeight: 18 },
  connectLink: { color: colors.accent, fontSize: font.small, fontWeight: "700", marginTop: spacing.xs },
  destList: { gap: spacing.md, marginTop: spacing.xs },
  destRow: { gap: 6 },
  capRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: spacing.xs },
  capBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  capBadgeText: { color: colors.textFaint, fontSize: 10, fontWeight: "600" },

  saveBar: { gap: spacing.sm },
  savedText: { color: colors.success, fontSize: font.small, fontWeight: "600", textAlign: "center" },

  postCard: { gap: spacing.sm },
  postHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  postWhen: { color: colors.textMuted, fontSize: font.tiny, fontWeight: "600" },
  postContent: { color: colors.text, fontSize: font.body, lineHeight: 20 },
  postMeta: { color: colors.textFaint, fontSize: font.small },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  results: { gap: 4, marginTop: spacing.xs },
  resultRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  resultDot: { fontSize: 10, marginTop: 3 },
  resultText: { color: colors.textMuted, fontSize: font.tiny, flex: 1, lineHeight: 16 },
  lastError: { color: colors.danger, fontSize: font.tiny, lineHeight: 16 },
  actions: {
    flexDirection: "row",
    gap: spacing.xl,
    marginTop: spacing.xs,
    alignItems: "center",
    minHeight: 22,
  },
});
