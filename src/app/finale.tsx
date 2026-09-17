import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { summarise } from '@/game/finale';
import { useProgress } from '@/state/useProgress';
import { Finale } from '@/ui/components/Finale';
import { Follow } from '@/ui/components/Follow';
import { color } from '@/ui/tokens';

/** The results monitor, reopened from the landing screen after the hundred. */
export default function FinaleScreen() {
  const records = useProgress((state) => state.records);
  const preferReducedMotion = useProgress((state) => state.settings.reducedMotion);
  const reducedMotion = preferReducedMotion || useReducedMotion();
  const [following, setFollowing] = useState(false);
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.root}>
      {following ? (
        <Follow reducedMotion={reducedMotion} onClose={leave} />
      ) : (
        <Finale
          summary={summarise(records)}
          reducedMotion={reducedMotion}
          onDismiss={() => setFollowing(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink },
});
