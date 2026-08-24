import * as Haptics from 'expo-haptics';
import { play } from '@/audio';
import { useProgress } from '@/state/useProgress';

/**
 * Haptics are a nicety, and some devices simply do not have them. A failure
 * here must never interrupt play, so every call swallows its own error.
 */
function buzz(run: () => Promise<void>): void {
  if (!useProgress.getState().settings.haptics) {
    return;
  }
  run().catch(() => undefined);
}

export function missFeedback(): void {
  buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  play('clack');
}

export function winFeedback(): void {
  buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  play('find');
}

export function partialFeedback(): void {
  buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  play('find');
}

export function panFeedback(): void {
  play('rustle');
}

/**
 * Any control anywhere. Deliberately lighter than anything the board does, so
 * pressing a button never reads as having hit something.
 */
export function tapFeedback(): void {
  buzz(() => Haptics.selectionAsync());
  play('tap');
}
