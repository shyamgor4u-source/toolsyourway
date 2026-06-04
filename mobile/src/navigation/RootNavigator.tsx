import React from "react";
import { Text } from "react-native";
import { NavigationContainer, type LinkingOptions } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { AuthScreen } from "../screens/AuthScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { BotsScreen } from "../screens/BotsScreen";
import { ManagerScreen } from "../screens/ManagerScreen";
import { ApprovalsScreen } from "../screens/ApprovalsScreen";
import { AccountScreen } from "../screens/AccountScreen";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Home: "◆",
  Bots: "✦",
  Manager: "⚡",
  Approvals: "✓",
  Account: "●",
};

// Deep links: toolsyourway://home, toolsyourway://approvals, etc.
const linking: LinkingOptions<Record<string, undefined>> = {
  prefixes: ["toolsyourway://"],
  config: {
    screens: {
      Home: "home",
      Bots: "bots",
      Manager: "manager",
      Approvals: "approvals",
      Account: "account",
    },
  },
};

function TabIcon({ name, color }: { name: string; color: string }) {
  return <Text style={{ color, fontSize: 18 }}>{ICONS[name] ?? "•"}</Text>;
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer linking={linking}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Bots" component={BotsScreen} />
        <Tab.Screen name="Manager" component={ManagerScreen} />
        <Tab.Screen name="Approvals" component={ApprovalsScreen} />
        <Tab.Screen name="Account" component={AccountScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
