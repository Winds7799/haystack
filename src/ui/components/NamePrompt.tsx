import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { NAME_LIMIT, tidyName } from '@/state/useIdentity';
import { color, font, radius, space, type } from '../tokens';
import { Button } from './Button';

interface NamePromptProps {
  onSubmit: (name: string) => void;
  onSkip: () => void;
}

/** Asked once, the first time a time is good enough to post. */
export function NamePrompt({ onSubmit, onSkip }: NamePromptProps) {
  const [draft, setDraft] = useState('');
  const name = tidyName(draft);

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <Text style={styles.title} accessibilityRole="header">
          What should the board call you?
        </Text>
        <Text style={styles.detail}>
          This appears next to your times. There is no account and no sign in.
        </Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Your name"
          placeholderTextColor={color.textMuted}
          maxLength={NAME_LIMIT}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel="Your name on the leaderboard"
          onSubmitEditing={() => name && onSubmit(name)}
          style={styles.input}
        />
        <View style={styles.actions}>
          <Button label="Not now" onPress={onSkip} />
          <Button
            label="Post it"
            tone="primary"
            disabled={name.length === 0}
            onPress={() => onSubmit(name)}
          />
        </View>
      </View>
    </View>
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
    paddingHorizontal: space.xl,
    backgroundColor: color.scrim,
  },
  panel: { alignSelf: 'stretch', gap: space.md },
  title: {
    color: color.text,
    fontFamily: font.display,
    fontSize: type.heading,
    textAlign: 'center',
  },
  detail: {
    color: color.textMuted,
    fontFamily: font.body,
    fontSize: type.label,
    textAlign: 'center',
  },
  input: {
    color: color.text,
    fontFamily: font.body,
    fontSize: type.heading,
    textAlign: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: space.md },
});
