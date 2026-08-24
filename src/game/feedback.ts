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

/** A decoy: something was there, and it was the wrong thing. */
export function missFeedback(): void {
  buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  play('clack');
}

/** Straw: nothing was there at all. Duller, so the two are told apart by ear. */
export function strawFeedback(): void {
  buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
  play('thud');
}

/** The level is over and the result is on screen. */
export function completeFeedback(): void {
  play('fanfare');
}

/** One star landing on the results panel. */
export function starFeedback(): void {
  play('star');
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
