import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font, space, type } from '../tokens';
import { Button } from './Button';

interface ScreenProps {
  title: string;
  /** One line under the title. Optional, and never an apology. */
  lede?: string;
  children: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  scroll?: boolean;
}

/** Every screen but the board itself: a title, a body, and a way back. */
export function Screen({
  title,
  lede,
  children,
  onBack,
  backLabel = 'Back',
  scroll = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const body = <View style={styles.body}>{children}</View>;
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space.lg }]}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {lede ? <Text style={styles.lede}>{lede}</Text> : null}
      </View>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
      {onBack ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
          <Button label={backLabel} onPress={onBack} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink },
  header: { paddingHorizontal: space.xl, paddingBottom: space.lg, gap: space.xs },
  title: { color: color.text, fontFamily: font.display, fontSize: type.title },
  lede: { color: color.textMuted, fontFamily: font.body, fontSize: type.label },
  scroll: { paddingBottom: space.xl },
  body: { flex: 1, paddingHorizontal: space.xl },
  footer: { alignItems: 'center', paddingTop: space.md },
});
