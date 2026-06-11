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

export type Tone = "default" | "success" | "warning" | "danger" | "muted";

function toneToColor(tone: Tone): string {
  switch (tone) {
    case "success":
      return colors.success;
    case "warning":
      return colors.warning;
    case "danger":
      return colors.danger;
    case "muted":
      return colors.textFaint;
    default:
      return colors.accentSoft;
  }
}

export function Pill({ label, tone = "default" }: { label: string; tone?: Tone }) {
  const toneColor = toneToColor(tone);
  return (
    <View style={[styles.pill, { borderColor: toneColor }]}>
      <Text style={[styles.pillText, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

// A compact selectable/static chip — used for destination targets.
export function Chip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <View
      style={[
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.chipDisabled,
      ]}
    >
      {onPress ? (
        <Text style={[styles.chipCheck, selected && styles.chipCheckOn]}>
          {selected ? "✓" : "○"}
        </Text>
      ) : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
  if (!onPress || disabled) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {body}
    </Pressable>
  );
}

// A tiny inline text-button for compact row actions (approve/cancel/retry).
export function LinkAction({
  label,
  tone = "default",
  disabled,
  onPress,
}: {
  label: string;
  tone?: Tone;
  disabled?: boolean;
  onPress: () => void;
}) {
  const color = disabled ? colors.textFaint : toneToColor(tone);
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6}>
      <Text style={[styles.linkAction, { color, opacity: disabled ? 0.5 : 1 }]}>{label}</Text>
    </Pressable>
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
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
  },
  chipSelected: { borderColor: colors.accent, backgroundColor: colors.primaryLight },
  chipDisabled: { opacity: 0.5 },
  chipCheck: { color: colors.textFaint, fontSize: font.tiny, fontWeight: "700" },
  chipCheckOn: { color: colors.accent },
  chipText: { color: colors.textMuted, fontSize: font.tiny, fontWeight: "600", maxWidth: 200 },
  chipTextSelected: { color: colors.text },
  linkAction: { fontWeight: "700", fontSize: font.small },
});
