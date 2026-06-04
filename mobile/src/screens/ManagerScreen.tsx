import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { Button, Card } from "../components/ui";
import { colors, font, radius, spacing } from "../theme";

const EXAMPLES = [
  "Plan a 2-week LinkedIn content series for our launch.",
  "Draft a cold outreach email to 20 SaaS founders.",
  "Summarize last month's signups and flag any drop-offs.",
];

export function ManagerScreen() {
  const [prompt, setPrompt] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const run = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    // Placeholder workflow: this will POST to the backend AI manager endpoint
    // once it's wired. For now we echo the brief so the UX is testable.
    setSubmitted(trimmed);
  };

  return (
    <Screen title="AI Manager" subtitle="Brief your virtual manager, it delegates to the right bot">
      <Card>
        <Text style={styles.label}>What do you need done?</Text>
        <TextInput
          style={styles.textarea}
          placeholder="e.g. Plan and schedule this week's marketing posts…"
          placeholderTextColor={colors.textFaint}
          multiline
          value={prompt}
          onChangeText={setPrompt}
        />
        <Button title="Send to manager" onPress={run} disabled={!prompt.trim()} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Try an example</Text>
        {EXAMPLES.map((ex) => (
          <Text key={ex} style={styles.example} onPress={() => setPrompt(ex)}>
            “{ex}”
          </Text>
        ))}
      </Card>

      {submitted ? (
        <Card style={styles.resultCard}>
          <Text style={styles.resultLabel}>BRIEF RECEIVED (DEMO)</Text>
          <Text style={styles.resultText}>{submitted}</Text>
          <Text style={styles.resultHint}>
            Connect this to the backend AI manager endpoint to generate a real plan and route tasks
            to your bots.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: font.small, fontWeight: "600", marginBottom: spacing.sm },
  textarea: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.text,
    fontSize: font.body,
    minHeight: 110,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  cardTitle: { color: colors.text, fontSize: font.h3, fontWeight: "700", marginBottom: spacing.md },
  example: { color: colors.accentSoft, fontSize: font.body, marginBottom: spacing.sm, lineHeight: 20 },
  resultCard: { borderColor: colors.accent },
  resultLabel: { color: colors.accentSoft, fontSize: font.tiny, fontWeight: "800", letterSpacing: 1 },
  resultText: { color: colors.text, fontSize: font.body, marginTop: spacing.sm, lineHeight: 21 },
  resultHint: { color: colors.textFaint, fontSize: font.small, marginTop: spacing.md, lineHeight: 18 },
});
