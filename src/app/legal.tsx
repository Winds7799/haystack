import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tapFeedback } from '@/game/feedback';
import {
  DOCUMENTS,
  LAST_UPDATED,
  PUBLISHER,
  legalIncomplete,
  type Document,
} from '@/legal/documents';
import { Screen } from '@/ui/components/Screen';
import { color, font, layout, radius, space, type } from '@/ui/tokens';

export default function LegalScreen() {
  const params = useLocalSearchParams<{ doc?: string }>();
  const opening = DOCUMENTS.find((entry) => entry.id === params.doc) ?? DOCUMENTS[0];
  const [shown, setShown] = useState<Document>(opening);

  return (
    <Screen title="Legal" lede={`Last updated ${LAST_UPDATED}.`} onBack={() => router.back()}>
      <View style={styles.tabs}>
        {DOCUMENTS.map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityLabel={`Show ${entry.title}`}
            accessibilityState={{ selected: entry.id === shown.id }}
            onPress={() => {
              tapFeedback();
              setShown(entry);
            }}
            style={[styles.tab, entry.id === shown.id && styles.tabOn]}
          >
            <Text style={[styles.tabText, entry.id === shown.id && styles.tabTextOn]}>
              {entry.title}
            </Text>
          </Pressable>
        ))}
      </View>

      {shown.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading} accessibilityRole="header">
            {section.heading}
          </Text>
          {section.body.map((paragraph) => (
            <Text key={paragraph} style={styles.body}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.heading} accessibilityRole="header">
          Contact
        </Text>
        <Text style={styles.body}>{`Questions, reports and removal requests: ${PUBLISHER.contact}`}</Text>
        <Text style={styles.body}>
          {`These terms are governed by the law of ${PUBLISHER.jurisdiction}.`}
        </Text>
      </View>

      {__DEV__ && legalIncomplete() ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Development note: the contact address and jurisdiction in
            src/legal/documents.ts are still placeholders. The App Store will
            reject the app with these in place.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: space.sm, marginBottom: space.lg },
  tab: {
    minHeight: layout.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  tabOn: { borderColor: color.gold, backgroundColor: color.surfaceHigh },
  tabText: { color: color.textMuted, fontFamily: font.body, fontSize: type.label },
  tabTextOn: { color: color.gold },
  section: { marginBottom: space.xl, gap: space.sm },
  heading: { color: color.text, fontFamily: font.display, fontSize: type.heading },
  body: { color: color.textMuted, fontFamily: font.body, fontSize: type.body, lineHeight: 22 },
  warning: {
    marginBottom: space.xl,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.warning,
  },
  warningText: { color: color.text, fontFamily: font.mono, fontSize: type.caption, lineHeight: 18 },
});
