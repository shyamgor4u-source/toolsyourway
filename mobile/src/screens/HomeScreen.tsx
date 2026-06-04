import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { Card, Pill } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { auth, type DashboardData } from "../api/auth";
import { colors, font, spacing } from "../theme";

export function HomeScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    auth
      .dashboard()
      .then(setData)
      .catch((e) => setErr((e as { message?: string })?.message || "Could not load dashboard"));
  }, []);

  const activeBots = data?.bots?.filter((b) => b.status === "active").length ?? 0;
  const totalBots = data?.bots?.length ?? 0;

  return (
    <Screen
      title={`Hi, ${user?.name?.split(" ")[0] || "Founder"}`}
      subtitle="Your AI company command center"
    >
      <Card style={styles.hero}>
        <Text style={styles.heroLabel}>COMMAND CENTER</Text>
        <Text style={styles.heroTitle}>Run your company with a team of AI bots</Text>
        <Text style={styles.heroBody}>
          Delegate marketing, outreach, email, and data work to specialized bots — then review and
          approve their output from one place.
        </Text>
        <View style={styles.row}>
          <Pill label={user?.plan && user.plan !== "none" ? `PLAN: ${user.plan.toUpperCase()}` : "TRIAL"} />
          <Pill label={`${activeBots}/${totalBots || 9} BOTS ACTIVE`} tone="success" />
        </View>
      </Card>

      <View style={styles.statsRow}>
        <Stat label="Active bots" value={String(activeBots)} />
        <Stat label="Awaiting approval" value="0" />
        <Stat label="Tasks today" value="—" />
      </View>

      <Card>
        <Text style={styles.cardTitle}>Quick start</Text>
        <Bullet text="Open the Bots tab to enable a suite (Founder, Influencer, Marketing…)." />
        <Bullet text="Use the Manager tab to brief the AI manager on what you need." />
        <Bullet text="Review generated posts, emails & assets in Approvals." />
      </Card>

      {err ? (
        <Text style={styles.err}>{err} — showing placeholder values.</Text>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, borderColor: colors.primaryLight, gap: spacing.sm },
  heroLabel: { color: colors.accentSoft, fontSize: font.tiny, fontWeight: "800", letterSpacing: 1.5 },
  heroTitle: { color: colors.white, fontSize: font.h2, fontWeight: "800" },
  heroBody: { color: colors.textMuted, fontSize: font.body, lineHeight: 21 },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, flexWrap: "wrap" },
  statsRow: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, alignItems: "center", paddingVertical: spacing.lg },
  statValue: { color: colors.text, fontSize: font.h2, fontWeight: "800" },
  statLabel: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing.xs, textAlign: "center" },
  cardTitle: { color: colors.text, fontSize: font.h3, fontWeight: "700", marginBottom: spacing.md },
  bullet: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  bulletDot: { color: colors.accent, fontSize: font.body, fontWeight: "800" },
  bulletText: { color: colors.textMuted, fontSize: font.body, flex: 1, lineHeight: 20 },
  err: { color: colors.warning, fontSize: font.small },
});
