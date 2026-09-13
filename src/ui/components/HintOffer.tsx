import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { buy, fetchOffer, restore, storeAvailable, type Offer } from '@/iap/hints';
import { useProgress } from '@/state/useProgress';
import { color, font, radius, space, type } from '../tokens';
import { Button } from './Button';

interface HintOfferProps {
  onClose: () => void;
}

type Stage = 'loading' | 'ready' | 'buying' | 'restoring' | 'unavailable';

/**
 * Shown when the free hint is spent. One product, one price, one Restore —
 * Apple requires the last of those for anything bought once and kept.
 * The clock keeps running underneath: pausing here would make the sheet a
 * free breather every level.
 */
export function HintOffer({ onClose }: HintOfferProps) {
  const [stage, setStage] = useState<Stage>(storeAvailable() ? 'loading' : 'unavailable');
  const [offer, setOffer] = useState<Offer | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const owned = useProgress((state) => state.unlimitedHints);

  useEffect(() => {
    if (!storeAvailable()) {
      return;
    }
    let cancelled = false;
    fetchOffer().then((found) => {
      if (cancelled) {
        return;
      }
      setOffer(found);
      setStage(found ? 'ready' : 'unavailable');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The entitlement lands through the store listener, not this component.
  useEffect(() => {
    if (owned) {
      onClose();
    }
  }, [owned, onClose]);

  const onBuy = async () => {
    setStage('buying');
    setNote(null);
    try {
      await buy();
    } catch {
      setNote('The purchase did not go through.');
    }
    setStage('ready');
  };

  const onRestore = async () => {
    setStage('restoring');
    setNote(null);
    const found = await restore();
    if (found) {
      useProgress.getState().grantUnlimitedHints();
      return;
    }
    setNote('Nothing to restore on this Apple ID.');
    setStage('ready');
  };

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <Text style={styles.title} accessibilityRole="header">
          Unlimited hints
        </Text>
        <Text style={styles.detail}>
          One purchase, every level, every device on this Apple ID. Each hint still costs time and
          the third star — this lifts the limit, not the price.
        </Text>

        {stage === 'unavailable' ? (
          <Text style={styles.detail}>
            {storeAvailable()
              ? 'The store could not be reached. Try again in a moment.'
              : 'Purchases are made on the iPhone app.'}
          </Text>
        ) : null}
        {note ? <Text style={styles.note}>{note}</Text> : null}

        <View style={styles.actions}>
          {stage === 'ready' || stage === 'buying' || stage === 'restoring' ? (
            <Button
              label={stage === 'buying' ? 'Opening' : `Buy for ${offer?.price ?? '…'}`}
              tone="primary"
              disabled={stage !== 'ready'}
              accessibilityLabel={`Buy unlimited hints for ${offer?.price ?? 'the listed price'}`}
              onPress={() => {
                void onBuy();
              }}
            />
          ) : null}
          {stage === 'loading' ? <Button label="Checking the store" disabled onPress={onClose} /> : null}
          <Button label="Not now" onPress={onClose} />
        </View>
        {storeAvailable() ? (
          <Button
            label={stage === 'restoring' ? 'Checking' : 'Restore purchase'}
            disabled={stage === 'restoring' || stage === 'buying'}
            accessibilityLabel="Restore a purchase made on another device"
            onPress={() => {
              void onRestore();
            }}
            style={styles.restore}
          />
        ) : null}
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
  panel: {
    alignSelf: 'stretch',
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
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
    lineHeight: 20,
  },
  note: { color: color.gold, fontFamily: font.body, fontSize: type.caption, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: space.md },
  restore: { alignSelf: 'center' },
});
