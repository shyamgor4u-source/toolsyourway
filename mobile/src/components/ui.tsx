import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { colors, font, radius, spacing } from "../theme";

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
}) {
  const isGhost = variant === "ghost";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isGhost ? styles.buttonGhost : styles.buttonPrimary,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.accent : colors.white} />
      ) : (
        <Text style={[styles.buttonText, isGhost && styles.buttonTextGhost]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, ...rest } = props;
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        autoCapitalize="none"
        {...rest}
      />
    </View>
  );
}

export function Pill({ label, tone = "default" }: { label: string; tone?: "default" | "success" | "warning" }) {
  const toneColor =
    tone === "success" ? colors.success : tone === "warning" ? colors.warning : colors.accentSoft;
  return (
    <View style={[styles.pill, { borderColor: toneColor }]}>
      <Text style={[styles.pillText, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.accent },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: font.body },
  buttonTextGhost: { color: colors.accent },
  label: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.xs, fontWeight: "600" },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: font.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
  },
  pillText: { fontSize: font.tiny, fontWeight: "700", letterSpacing: 0.4 },
});
