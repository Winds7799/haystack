import { BlurView } from 'expo-blur';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, space, type } from '../tokens';
import { Button } from './Button';

interface PauseSheetProps {
  levelId: number;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export function PauseSheet({ levelId, onResume, onRestart, onQuit }: PauseSheetProps) {
  return (
    <BlurView
      intensity={40}
      tint="dark"
      experimentalBlurMethod="dimezisBlurView"
      style={styles.root}
    >
      <View style={styles.panel}>
        <Text style={styles.title}>Paused</Text>
        <Text style={styles.detail}>{`Level ${levelId}. The clock is stopped.`}</Text>
        <Button label="Resume" tone="primary" onPress={onResume} style={styles.button} />
        <Button label="Restart" onPress={onRestart} style={styles.button} />
        <Button label="Quit" onPress={onQuit} style={styles.button} />
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    alignItems: 'stretch',
    gap: space.sm,
    paddingHorizontal: space.xl,
    minWidth: 220,
  },
  title: {
    color: color.text,
    fontFamily: font.display,
    fontSize: type.title,
    textAlign: 'center',
  },
  detail: {
    color: color.textMuted,
    fontFamily: font.body,
    fontSize: type.label,
    textAlign: 'center',
    marginBottom: space.md,
  },
  button: { alignSelf: 'stretch' },
});
