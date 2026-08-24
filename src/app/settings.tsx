import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { adsAvailable, openAdPrivacyOptions, usingTestAds } from '@/ads/rewarded';
import { leaderboardReady } from '@/net/leaderboard';
import { useIdentity } from '@/state/useIdentity';
import { useProgress } from '@/state/useProgress';
import { Button } from '@/ui/components/Button';
import { Screen } from '@/ui/components/Screen';
import { NamePrompt } from '@/ui/components/NamePrompt';
import { Toggle } from '@/ui/components/Toggle';
import { color, font, space, type } from '@/ui/tokens';

export default function SettingsScreen() {
  const settings = useProgress((state) => state.settings);
  const set = useProgress((state) => state.set);
  const reset = useProgress((state) => state.reset);
  const [confirming, setConfirming] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const name = useIdentity((state) => state.name);

  const onReset = useCallback(() => {
    reset();
    setConfirming(false);
  }, [reset]);

  return (
    <Screen title="Settings" onBack={() => router.back()}>
      <View style={styles.group}>
        <Toggle
          label="Sound"
          detail="Barn atmosphere, straw, and the tone on a find."
          value={settings.sound}
          onChange={(value) => set('sound', value)}
        />
        <Toggle
          label="Haptics"
          value={settings.haptics}
          onChange={(value) => set('haptics', value)}
        />
        <Toggle
          label="Reduced motion"
          detail="Stops the drift, the pan momentum, and the flourish on a find."
          value={settings.reducedMotion}
          onChange={(value) => set('reducedMotion', value)}
        />
        <Toggle
          label="Left-handed layout"
          detail="Moves hint and pause to the other side."
          value={settings.leftHanded}
          onChange={(value) => set('leftHanded', value)}
        />
        <Toggle
          label="Colour-blind-safe decoys"
          detail="Decoys keep their own thickness and their heads and legs grow, so they differ by shape and not only by colour."
          value={settings.colourBlindSafe}
          onChange={(value) => set('colourBlindSafe', value)}
        />
      </View>

      {leaderboardReady() ? (
        <View style={styles.group}>
          <Button
            label={name ? 'Change your name' : 'Set your name'}
            note={name || 'not set'}
            accessibilityLabel={
              name ? `Change your leaderboard name, currently ${name}` : 'Set your leaderboard name'
            }
            onPress={() => setRenaming(true)}
            style={styles.wide}
          />
        </View>
      ) : null}

      {adsAvailable() ? (
        <View style={styles.group}>
          <Button
            label="Ad privacy choices"
            note={usingTestAds() ? 'test ads' : undefined}
            accessibilityLabel="Change your advertising privacy choices"
            onPress={() => {
              void openAdPrivacyOptions();
            }}
            style={styles.wide}
          />
        </View>
      ) : null}

      <View style={styles.group}>
        <Button label="How to play" onPress={() => router.push('/how-to-play')} style={styles.wide} />
        {__DEV__ ? (
          <Button label="Debug" onPress={() => router.push('/debug')} style={styles.wide} />
        ) : null}
      </View>

      <View style={styles.group}>
        {confirming ? (
          <>
            <Text style={styles.warning}>
              This clears every best time and star, and locks the levels again.
            </Text>
            <View style={styles.row}>
              <Button label="Reset progress" tone="primary" onPress={onReset} />
              <Button label="Keep it" onPress={() => setConfirming(false)} />
            </View>
          </>
        ) : (
          <Button
            label="Reset progress"
            onPress={() => setConfirming(true)}
            style={styles.wide}
          />
        )}
      </View>
      {renaming ? (
        <NamePrompt
          onSubmit={(chosen) => {
            useIdentity.getState().setName(chosen);
            setRenaming(false);
          }}
          onSkip={() => setRenaming(false)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: space.xl,
    gap: space.sm,
  },
  row: { flexDirection: 'row', gap: space.md },
  wide: { alignSelf: 'stretch' },
  warning: {
    color: color.textMuted,
    fontFamily: font.body,
    fontSize: type.label,
  },
});
