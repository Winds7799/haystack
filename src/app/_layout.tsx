import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { EBGaramond_400Regular, EBGaramond_500Medium } from '@expo-google-fonts/eb-garamond';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import {
  RobotoCondensed_400Regular,
  RobotoCondensed_500Medium,
  RobotoCondensed_700Bold,
} from '@expo-google-fonts/roboto-condensed';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { prepareAudio, setSoundEnabled } from '@/audio';
import { closeStore, prepareStore, restore, storeAvailable } from '@/iap/hints';
import { useProgress } from '@/state/useProgress';
import { color } from '@/ui/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsReady] = useFonts({
    EBGaramond_400Regular,
    EBGaramond_500Medium,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    RobotoCondensed_400Regular,
    RobotoCondensed_500Medium,
    RobotoCondensed_700Bold,
  });
  const sound = useProgress((state) => state.settings.sound);

  useEffect(() => {
    prepareAudio();
  }, []);

  // The store listener is what turns a purchase into the entitlement. A quiet
  // restore on launch covers a reinstall or a second device, so nobody has to
  // find the button in Settings to get back what they paid for.
  useEffect(() => {
    if (!storeAvailable()) {
      return;
    }
    const grant = () => useProgress.getState().grantUnlimitedHints();
    prepareStore(grant).then((ready) => {
      if (ready && !useProgress.getState().unlimitedHints) {
        restore().then((owned) => {
          if (owned) {
            grant();
          }
        });
      }
    });
    return closeStore;
  }, []);

  useEffect(() => {
    setSoundEnabled(sound);
  }, [sound]);

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: styles.screen,
            animation: 'fade',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink },
  screen: { backgroundColor: color.ink },
});
