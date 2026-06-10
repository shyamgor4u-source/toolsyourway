// TODO(marketing): surface Marketing Bot publish-destination selection here.
// Consume GET /api/social/destinations and POST /api/social/destinations/defaults
// to let users pick profile / page / channel targets per platform.
// See docs/SOCIAL_DESTINATIONS.md.
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { Card, Pill } from "../components/ui";
import { BOT_SUITES } from "../data/bots";
import { auth } from "../api/auth";
import { colors, font, spacing } from "../theme";

export function BotsScreen() {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    auth
      .dashboard()
      .then((d) => {
        const active = new Set(
          (d.bots || []).filter((b) => b.status === "active").map((b) => b.botType),
        );
        setActiveKeys(active);
      })
      .catch(() => setActiveKeys(new Set()));
  }, []);

  return (
    <Screen title="Bots" subtitle="Your specialized AI suites">
      {BOT_SUITES.map((bot) => {
        const isActive = activeKeys.has(bot.key);
        return (
          <Card key={bot.key} style={styles.botCard}>
            <Text style={styles.emoji}>{bot.emoji}</Text>
            <View style={styles.botBody}>
              <Text style={styles.botName}>{bot.name}</Text>
              <Text style={styles.botTagline}>{bot.tagline}</Text>
            </View>
            <Pill label={isActive ? "ACTIVE" : "OFF"} tone={isActive ? "success" : "default"} />
          </Card>
        );
      })}
      <Text style={styles.note}>
        Bot enable/disable and configuration sync with your account on the web app today; full
        in-app control is coming next.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  botCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  emoji: { fontSize: 28 },
  botBody: { flex: 1 },
  botName: { color: colors.text, fontSize: font.h3, fontWeight: "700" },
  botTagline: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  note: { color: colors.textFaint, fontSize: font.small, lineHeight: 19, marginTop: spacing.sm },
});
