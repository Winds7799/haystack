import { hasName, useIdentity } from '@/state/useIdentity';
import { leaderboardReady, submitScore, type Score } from './leaderboard';

/**
 * Posting a time must never affect the game. If there is no board configured,
 * no name yet, or no network, the run stands exactly as it did — the score is
 * simply held until the player has a name, and dropped if they decline one.
 */

type Pending = Omit<Score, 'name'>;

let held: Pending | null = null;
let listener: ((pending: Pending | null) => void) | null = null;

/** The results screen watches this to know when to ask for a name. */
export function onPending(next: ((pending: Pending | null) => void) | null): void {
  listener = next;
  listener?.(held);
}

function send(score: Pending, name: string): void {
  submitScore(useIdentity.getState().playerId, { ...score, name }).catch(() => {
    // The board is a courtesy. A failed post is not the player's problem.
  });
}

export function postScore(score: Pending): void {
  if (!leaderboardReady()) {
    return;
  }
  if (hasName()) {
    send(score, useIdentity.getState().name);
    return;
  }
  held = score;
  listener?.(held);
}

/** Called once the player has typed a name, with the time that prompted it. */
export function claimHeldScore(name: string): void {
  const score = held;
  held = null;
  listener?.(null);
  useIdentity.getState().setName(name);
  if (score) {
    send(score, useIdentity.getState().name);
  }
}

/** Called when the player declines to be named. The time is let go. */
export function dropHeldScore(): void {
  held = null;
  listener?.(null);
}
