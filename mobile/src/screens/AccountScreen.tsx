import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { Button, Card } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../api/client";
import { colors, font, spacing } from "../theme";

export function AccountScreen() {
  const { user, logout } = useAuth();

  const open = (path: string) => {
    void Linking.openURL(`${API_BASE_URL}${path}`);
  };

  return (
    <Screen title="Account" subtitle={user?.email}>
      <Card>
        <Row label="Name" value={user?.name || "—"} />
        <Row label="Email" value={user?.email || "—"} />
        <Row label="Plan" value={user?.plan && user.plan !== "none" ? user.plan : "Trial / none"} />
        <Row label="Sign-in" value={user?.authProvider || "email"} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Billing</Text>
        <Text style={styles.note}>
          Plan upgrades and payments are handled on the web app for now. We'll add in-app billing
          once the App Store / Play billing strategy is finalized.
        </Text>
        <Button title="Manage billing on the web" variant="ghost" onPress={() => open("/#/pricing")} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Legal</Text>
        <Link label="Terms of Service" onPress={() => open("/#/terms")} />
        <Link label="Privacy Policy" onPress={() => open("/#/privacy")} />
        <Link label="Refund Policy" onPress={() => open("/#/refund")} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Connection</Text>
        <Row label="Backend URL" value={API_BASE_URL} />
      </Card>

      <Button title="Log out" variant="ghost" onPress={() => void logout()} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Text style={styles.link} onPress={onPress}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, gap: spacing.lg },
  rowLabel: { color: colors.textMuted, fontSize: font.body },
  rowValue: { color: colors.text, fontSize: font.body, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  cardTitle: { color: colors.text, fontSize: font.h3, fontWeight: "700", marginBottom: spacing.md },
  note: { color: colors.textMuted, fontSize: font.small, lineHeight: 19, marginBottom: spacing.md },
  link: { color: colors.accentSoft, fontSize: font.body, paddingVertical: spacing.sm, fontWeight: "600" },
});
