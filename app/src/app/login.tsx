import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthMode = "login" | "register";

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    if (!email.trim().includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setError("Enter your full name.");
      return;
    }
    router.replace("/home");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cabecera */}
          <View style={styles.topRow}>
            <View style={styles.brandRow}>
              <View style={styles.brandIconWrap}>
                <Image
                  source={require("@/assets/images/mascot-pod.jpg")}
                  style={styles.brandIcon}
                  contentFit="cover"
                />
              </View>
              <Text style={styles.brandText}>UNDEFINED</Text>
            </View>

            <Pressable onPress={() => router.replace("/")}>
              <Text style={styles.backText}>View intro</Text>
            </Pressable>
          </View>

          <View style={styles.heroCopy}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ACCESS CENTER</Text>
            </View>
            <Text style={styles.title}>
              OPERATIONAL <Text style={styles.titleAccent}>FIRE CONTROL</Text>
            </Text>
            <Text style={styles.subtitle}>
              Access the harmonized MODIS / VIIRS calendar and IoT field
              telemetry for Sierra de Chihuahua.
            </Text>
          </View>

          {/* Tarjeta Double-Bezel */}
          <View style={styles.bezelOuter}>
            <View style={styles.bezelTopLine} />
            <View style={styles.bezelInner}>
              {/* Tabs */}
              <View style={styles.tabBar}>
                <Pressable
                  onPress={() => {
                    setMode("login");
                    setError(null);
                  }}
                  style={[styles.tab, mode === "login" && styles.tabActive]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      mode === "login" && styles.tabTextActive,
                    ]}
                  >
                    Sign in
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMode("register");
                    setError(null);
                  }}
                  style={[styles.tab, mode === "register" && styles.tabActive]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      mode === "register" && styles.tabTextActive,
                    ]}
                  >
                    Create account
                  </Text>
                </Pressable>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {mode === "register" && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>FULL NAME</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ana Lopez"
                    placeholderTextColor="#64748b"
                    style={styles.input}
                  />
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="operator@undefined.mx"
                  placeholderTextColor="#64748b"
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>PASSWORD</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="At least 6 characters"
                  placeholderTextColor="#64748b"
                  style={styles.input}
                />
              </View>

              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.submitText}>
                  {mode === "login" ? "Sign in" : "Create account"}
                </Text>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                onPress={() => router.replace("/home")}
                style={({ pressed }) => [
                  styles.googleBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.googleBadge}>G</Text>
                <Text style={styles.googleText}>
                  {mode === "login"
                    ? "Continue with Google"
                    : "Sign up with Google"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0d0818",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(251, 146, 60, 0.45)",
    backgroundColor: "#1a122e",
  },
  brandIcon: {
    width: "100%",
    height: "100%",
  },
  brandText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2.2,
  },
  backText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  heroCopy: {
    marginBottom: 20,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(251, 146, 60, 0.35)",
    backgroundColor: "rgba(249, 115, 22, 0.12)",
  },
  badgeText: {
    color: "#fb923c",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  title: {
    marginTop: 12,
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 30,
  },
  titleAccent: {
    color: "#fb923c",
  },
  subtitle: {
    marginTop: 8,
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 20,
  },
  bezelOuter: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.24)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 6,
    overflow: "hidden",
  },
  bezelTopLine: {
    position: "absolute",
    top: 0,
    left: 40,
    right: 40,
    height: 2,
    backgroundColor: "#f97316",
    opacity: 0.75,
  },
  bezelInner: {
    borderRadius: 20,
    backgroundColor: "#140d24",
    padding: 18,
    gap: 14,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#0d0818",
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#f97316",
  },
  tabText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.4)",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: "#fecaca",
    fontSize: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#0d0818",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 14,
  },
  submitBtn: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: "#f97316",
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  dividerText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.3,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingVertical: 12,
  },
  googleBadge: {
    color: "#fb923c",
    fontSize: 15,
    fontWeight: "800",
  },
  googleText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
});
