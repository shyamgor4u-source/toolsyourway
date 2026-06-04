import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { Card, Pill } from "../components/ui";
import { colors, font, spacing } from "../theme";

type Item = { id: string; kind: string; title: string; via: string };

// Placeholder queue. Will be replaced by a live feed of bot-generated
// posts/emails/assets awaiting human approval from the backend.
const SAMPLE: Item[] = [
  { id: "1", kind: "POST", title: "LinkedIn: launch announcement", via: "Marketing / Social" },
  { id: "2", kind: "EMAIL", title: "Outreach sequence — step 1", via: "Outreach" },
  { id: "3", kind: "ASSET", title: "Hero image for blog post", via: "Marketing / Social" },
];

export function ApprovalsScreen() {
  return (
    <Screen title="Approvals" subtitle="Posts, emails & assets awaiting your review">
      <Card style={styles.emptyHint}>
        <Text style={styles.emptyText}>
          Items your bots produce show up here for one-tap approval. The list below is sample data
          until the approvals feed is connected.
        </Text>
      </Card>

      {SAMPLE.map((item) => (
        <Card key={item.id} style={styles.item}>
          <View style={styles.itemHead}>
            <Pill label={item.kind} tone="warning" />
            <Text style={styles.via}>{item.via}</Text>
          </View>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <View style={styles.actions}>
            <Text style={styles.approve}>Approve</Text>
            <Text style={styles.reject}>Reject</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyHint: { borderStyle: "dashed" },
  emptyText: { color: colors.textMuted, fontSize: font.small, lineHeight: 19 },
  item: { gap: spacing.sm },
  itemHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  via: { color: colors.textFaint, fontSize: font.tiny, fontWeight: "600" },
  itemTitle: { color: colors.text, fontSize: font.body, fontWeight: "600" },
  actions: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.xs },
  approve: { color: colors.success, fontWeight: "700", fontSize: font.body },
  reject: { color: colors.danger, fontWeight: "700", fontSize: font.body },
});
