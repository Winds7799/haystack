import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { EBGaramond_400Regular, EBGaramond_500Medium } from '@expo-google-fonts/eb-garamond';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, StyleSheet } from 'react-native';
import { prepareAudio, setSoundEnabled } from '@/audio';
import { useProgress } from '@/state/useProgress';
import { color } from '@/ui/tokens';
import { useSkiaReady } from '@/game/useSkiaReady';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsReady] = useFonts({
    EBGaramond_400Regular,
    EBGaramond_500Medium,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });
  const sound = useProgress((state) => state.settings.sound);
  // On web, Skia is WebAssembly and has to finish loading before any canvas
  // is touched. On native it is already there.
  const skiaReady = useSkiaReady();

  useEffect(() => {
    prepareAudio();
  }, []);

  useEffect(() => {
    setSoundEnabled(sound);
  }, [sound]);

  useEffect(() => {
    if (fontsReady && skiaReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsReady, skiaReady]);

  if (!fontsReady || !skiaReady) {
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
