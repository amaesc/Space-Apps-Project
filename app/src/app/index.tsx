import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface OnboardingSlide {
  id: string;
  step: string;
  badge: string;
  titlePrefix: string;
  titleAccent: string;
  description: string;
  image: number;
  isMascotCutout?: boolean;
  chips: { label: string; color: string }[];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "harmonize",
    step: "01",
    badge: "01 · HARMONIZED CALENDAR",
    titlePrefix: "HARMONIZE FIRE ",
    titleAccent: "IN ONE CALENDAR",
    description:
      "25 years of MODIS and VIIRS hotspots unified with a monthly kₘ factor to spot true anomalies without sensor bias.",
    image: require("@/assets/images/mascot-wave.png"),
    isMascotCutout: true,
    chips: [
      { label: "MODIS 1km", color: "#38bdf8" },
      { label: "VIIRS 375m", color: "#a855f7" },
      { label: "2000–2026", color: "#fb923c" },
    ],
  },
  {
    id: "iot",
    step: "02",
    badge: "02 · FIELD TELEMETRY",
    titlePrefix: "ESP32 IOT STATION ",
    titleAccent: "& LIVE FALLBACK",
    description:
      "On-site measurements of temperature, humidity, wind, rain, and AS3935 lightning strikes, with automatic Open-Meteo fallback.",
    image: require("@/assets/images/mascot-pod.jpg"),
    chips: [
      { label: "ESP32-CHIH-04", color: "#34d399" },
      { label: "HDW High", color: "#fb923c" },
      { label: "Open-Meteo", color: "#38bdf8" },
    ],
  },
  {
    id: "origin",
    step: "03",
    badge: "03 · ORIGIN ATTRIBUTION",
    titlePrefix: "ANTICIPATE RISKS ",
    titleAccent: "& ESTIMATE ORIGIN",
    description:
      "Probabilistic cross-analysis with CONAFOR, GOES-GLM, and CONANP to prioritize preventive inspections in Sierra de Chihuahua.",
    image: require("@/assets/images/fire-active.jpg"),
    chips: [
      { label: "82% Human origin", color: "#fb923c" },
      { label: "GOES-GLM", color: "#38bdf8" },
      { label: "NOM-015", color: "#a855f7" },
    ],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLast = activeIndex === SLIDES.length - 1;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index?: number | null }> }) => {
      const idx = viewableItems[0]?.index;
      if (typeof idx === "number") {
        setActiveIndex(idx);
      }
    }
  ).current;

  const handleNext = () => {
    if (isLast) {
      router.replace("/login");
      return;
    }
    listRef.current?.scrollToIndex({
      index: activeIndex + 1,
      animated: true,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Resplandores ambientales */}
      <View pointerEvents="none" style={styles.glowViolet} />
      <View pointerEvents="none" style={styles.glowEmber} />

      {/* Header superior estilo FluidNav */}
      <View style={styles.header}>
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

        <Pressable
          onPress={() => router.replace("/login")}
          style={({ pressed }) => [
            styles.skipBtn,
            pressed && styles.pressedOpacity,
          ]}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Carrusel de slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {/* Tarjeta visual Double-Bezel */}
            <View style={styles.bezelOuter}>
              <View style={styles.bezelTopLine} />
              <View style={styles.bezelInner}>
                {item.isMascotCutout ? (
                  <View style={styles.mascotStage}>
                    <View style={styles.holoRingOuter} />
                    <View style={styles.holoRingInner} />
                    <Image
                      source={item.image}
                      style={styles.mascotCutout}
                      contentFit="contain"
                    />
                  </View>
                ) : (
                  <View style={styles.photoWrap}>
                    <Image
                      source={item.image}
                      style={styles.photoImage}
                      contentFit="cover"
                    />
                  </View>
                )}

                {/* Chips de telemetría */}
                <View style={styles.chipsRow}>
                  {item.chips.map((chip) => (
                    <View key={chip.label} style={styles.chip}>
                      <View
                        style={[styles.chipDot, { backgroundColor: chip.color }]}
                      />
                      <Text style={styles.chipText}>{chip.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Texto del slide */}
            <View style={styles.copyBlock}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>

              <Text style={styles.title}>
                {item.titlePrefix}
                <Text style={styles.titleAccent}>{item.titleAccent}</Text>
              </Text>

              <Text style={styles.description}>{item.description}</Text>
            </View>
          </View>
        )}
      />

      {/* Footer: paginación + CTA */}
      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {SLIDES.map((slide, idx) => {
            const active = idx === activeIndex;
            return (
              <View
                key={slide.id}
                style={[styles.dot, active && styles.dotActive]}
              />
            );
          })}
        </View>

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.ctaBtn,
            pressed && styles.ctaPressed,
          ]}
        >
          <Text style={styles.ctaText}>
            {isLast ? "Get Started" : "Next"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0d0818",
  },
  glowViolet: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(124, 58, 237, 0.22)",
  },
  glowEmber: {
    position: "absolute",
    bottom: 80,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(249, 115, 22, 0.14)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
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
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  skipText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  pressedOpacity: {
    opacity: 0.7,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    justifyContent: "space-between",
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
    padding: 14,
    gap: 12,
  },
  mascotStage: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f091c",
    borderRadius: 16,
    overflow: "hidden",
  },
  holoRingOuter: {
    position: "absolute",
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(167, 139, 250, 0.35)",
  },
  holoRingInner: {
    position: "absolute",
    width: 152,
    height: 152,
    borderRadius: 76,
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.45)",
    backgroundColor: "rgba(249, 115, 22, 0.08)",
  },
  mascotCutout: {
    width: 168,
    height: 186,
  },
  photoWrap: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#0f091c",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#0d0818",
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "600",
  },
  copyBlock: {
    paddingTop: 14,
    paddingBottom: 8,
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
    letterSpacing: -0.4,
  },
  titleAccent: {
    color: "#fb923c",
  },
  description: {
    marginTop: 10,
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  dotActive: {
    width: 24,
    backgroundColor: "#f97316",
  },
  ctaBtn: {
    backgroundColor: "#f97316",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
