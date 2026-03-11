import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { loginUrl } = useAuth();

  function handleLogin() {
    if (Platform.OS === "web") {
      window.location.href = loginUrl;
    } else {
      Linking.openURL(loginUrl);
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Platform.OS === "web" ? 67 : insets.top,
          paddingBottom: Platform.OS === "web" ? 34 : insets.bottom,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.icon}
          />
        </View>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Sign in with your Replit account to continue</Text>
        <Pressable
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.loginButtonPressed,
          ]}
          onPress={handleLogin}
        >
          <Text style={styles.loginButtonText}>Sign in with Replit</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 8,
  },
  icon: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  loginButton: {
    marginTop: 16,
    backgroundColor: "#F26207",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  loginButtonPressed: {
    opacity: 0.85,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
