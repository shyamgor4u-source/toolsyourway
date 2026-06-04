import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../api/client";
import { colors, font, radius, spacing } from "../theme";

type Mode = "login" | "register";

export function AuthScreen() {
  const { login, register, error } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
    } catch {
      // error surfaced via context
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.brand}>
            <Text style={styles.logoMark}>TYW</Text>
            <Text style={styles.brandTitle}>ToolsYourWay</Text>
            <Text style={styles.brandTagline}>Your AI company command center</Text>
          </View>

          <Card>
            <View style={styles.tabs}>
              <Tab label="Log in" active={mode === "login"} onPress={() => setMode("login")} />
              <Tab label="Register" active={mode === "register"} onPress={() => setMode("register")} />
            </View>

            {mode === "register" && (
              <Field label="Name" placeholder="Jane Founder" value={name} onChangeText={setName} />
            )}
            <Field
              label="Email"
              placeholder="you@company.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Field
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title={mode === "login" ? "Log in" : "Create account"}
              onPress={submit}
              loading={busy}
            />
          </Card>

          <Text style={styles.backend}>Backend: {API_BASE_URL}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.xl },
  brand: { alignItems: "center", gap: spacing.sm },
  logoMark: {
    color: colors.white,
    backgroundColor: colors.accent,
    fontSize: font.h3,
    fontWeight: "900",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    overflow: "hidden",
    letterSpacing: 1,
  },
  brandTitle: { color: colors.text, fontSize: font.h1, fontWeight: "800" },
  brandTagline: { color: colors.textMuted, fontSize: font.body },
  tabs: { flexDirection: "row", backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4, marginBottom: spacing.lg },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: "center", borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.textMuted, fontWeight: "700", fontSize: font.body },
  tabTextActive: { color: colors.white },
  error: { color: colors.danger, fontSize: font.small, marginBottom: spacing.md },
  backend: { color: colors.textFaint, fontSize: font.tiny, textAlign: "center" },
});
