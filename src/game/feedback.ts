import * as Haptics from 'expo-haptics';

/**
 * Haptics are a nicety, and some devices simply do not have them. A failure
 * here must never interrupt play, so every call swallows its own error.
 */
function fire(run: () => Promise<void>): void {
  run().catch(() => undefined);
}

export function missBuzz(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function winBuzz(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function tapBuzz(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}
