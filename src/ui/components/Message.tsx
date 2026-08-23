import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { color, font, space, type } from '../tokens';

interface MessageProps {
  title: string;
  detail?: string;
  busy?: boolean;
}

/** The one way this app says "nothing to look at yet" or "that did not work". */
export function Message({ title, detail, busy = false }: MessageProps) {
  return (
    <View style={styles.root}>
      {busy ? <ActivityIndicator color={color.gold} style={styles.spinner} /> : null}
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    gap: space.sm,
  },
  spinner: {
    marginBottom: space.xs,
  },
  title: {
    color: color.text,
    fontFamily: font.display,
    fontSize: type.heading,
    textAlign: 'center',
  },
  detail: {
    color: color.textMuted,
    fontFamily: font.body,
    fontSize: type.body,
    textAlign: 'center',
  },
});
