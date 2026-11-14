import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandIconWrap}>
              <Image
                source={require("@/assets/images/mascot-pod.jpg")}
                style={styles.brandIcon}
                contentFit="cover"
              />
            </View>
            <View>
              <Text style={styles.brandText}>UNDEFINED</Text>
              <Text style={styles.subBrand}>Sierra de Chihuahua · 28d</Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.replace("/")}
            style={styles.outlineBtn}
          >
            <Text style={styles.outlineBtnText}>Onboarding</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>LAST 28 DAYS</Text>
          <Text style={styles.kpiValue}>1,482</Text>
          <Text style={styles.kpiMeta}>
            Harmonized hotspots (MODIS + VIIRS · +18% vs median)
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>FIELD IOT STATION</Text>
          <Text style={styles.stationTitle}>ESP32-CHIH-04 · Bocoyna</Text>
          <Text style={styles.stationMeta}>
            27.4 °C · 22% RH · HDW High · 0 strikes / 5d
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>FEATURED DETECTION</Text>
          <Text style={styles.stationTitle}>Ejido San Juanito · Km 14</Text>
          <Text style={styles.alertText}>
            86% prob. human origin · Possible irregular burn (ref. NOM-015)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0d0818",
  },
  content: {
    padding: 20,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(251, 146, 60, 0.45)",
  },
  brandIcon: {
    width: "100%",
    height: "100%",
  },
  brandText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.8,
  },
  subBrand: {
    color: "#94a3b8",
    fontSize: 11,
  },
  outlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  outlineBtnText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.22)",
    backgroundColor: "#140d24",
    padding: 18,
    gap: 6,
  },
  cardLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  kpiValue: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "800",
  },
  kpiMeta: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  stationTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  stationMeta: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "600",
  },
  alertText: {
    color: "#fb923c",
    fontSize: 12,
    fontWeight: "600",
  },
});
