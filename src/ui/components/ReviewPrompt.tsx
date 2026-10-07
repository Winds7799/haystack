import { useEffect } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import { tapFeedback } from '@/game/feedback';
import { STRAW_PALETTE, mixHex, rgbaFromHex, strawColorIndex } from '@/game/palette';
import { MAX_STARS } from '@/game/scoring';
import { useReviewPrompt } from '@/state/reviewPrompt';
import { color, font, layout, motion, radius, space, type } from '../tokens';
import { Button } from './Button';

interface ReviewPromptProps {
  reducedMotion: boolean;
  onClose: () => void;
}

/**
 * Where "Rate" goes: the store app's review page, or the store's website on a
 * device without the app. The spaces in the store's name never break.
 */
const STORE =
  Platform.OS === 'ios'
    ? {
        name: 'The\u00A0App\u00A0Store',
        label: 'Rate on the\u00A0App\u00A0Store',
        app: 'itms-apps://apps.apple.com/app/id6808530241?action=write-review',
        web: 'https://apps.apple.com/app/id6808530241?action=write-review',
      }
    : {
        name: 'Google\u00A0Play',
        label: 'Rate on Google\u00A0Play',
        app: 'market://details?id=com.dahbed55.haystack',
        web: 'https://play.google.com/store/apps/details?id=com.dahbed55.haystack',
      };

/** Each sentence starts a line of its own, and "this needle" is never split. */
const DETAIL =
  `${STORE.name} is one very big haystack.\n` +
  'A rating helps the next player find this\u00A0needle.';

async function openStore(): Promise<boolean> {
  for (const url of [STORE.app, STORE.web]) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // No store app on this device. The website will do.
    }
  }
  return false;
}

/**
 * A short note from the maker, shown over the results after a cleared level,
 * asking for a store rating. The stars are ornament: the note never asks for
 * a number, and nothing here is offered in return.
 */
export function ReviewPrompt({ reducedMotion, onClose }: ReviewPromptProps) {
  const shown = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (!reducedMotion) {
      shown.value = withTiming(1, { duration: motion.normal, easing: Easing.out(Easing.cubic) });
    }
  }, [reducedMotion, shown]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 16 }],
  }));

  const onRate = async () => {
    if (await openStore()) {
      useReviewPrompt.getState().stopAsking();
    }
    onClose();
  };

  const onLater = () => {
    useReviewPrompt.getState().askLater();
    onClose();
  };

  const onNever = () => {
    tapFeedback();
    useReviewPrompt.getState().stopAsking();
    onClose();
  };

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.sheet}>
          <Hero />

          <View style={styles.note}>
            <View style={styles.frame} pointerEvents="none" />
            <View style={styles.eyebrow}>
              <View style={styles.eyebrowRule} />
              <Text style={styles.eyebrowLabel}>A SMALL FAVOUR</Text>
              <View style={styles.eyebrowRule} />
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {'Found what you\nwere looking for?'}
            </Text>
            <Text style={styles.detail}>{DETAIL}</Text>
            <Text style={styles.signature}>— Winds, who hid the needles</Text>
            <Seam />
          </View>

          <View style={styles.actions}>
            <Button
              label={STORE.label}
              tone="primary"
              onPress={() => {
                void onRate();
              }}
              style={styles.wide}
            />
            <Button label="Not now" onPress={onLater} style={styles.wide} />
            <Pressable
              accessibilityRole="button"
              onPress={onNever}
              style={({ pressed }) => [styles.never, pressed && styles.pressed]}
            >
              <Text style={styles.neverLabel}>Don’t ask again</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const HERO_WIDTH = 342;
const HERO_HEIGHT = 196;
const RADIANS = Math.PI / 180;

/** x, y, length, angle in degrees, width at the middle, light step, tone step, bow. */
type Stalk = readonly [number, number, number, number, number, number, number, number];

/**
 * The pile, back to front. Long dark stalks lie flat at the foot; shorter,
 * brighter ones cross on top, the same straw colours the board uses.
 */
const PILE: readonly Stalk[] = [
  [118, 157, 116, -6, 6, 1, 2, 1],
  [226, 155, 118, 6, 6, 1, 3, -1],
  [172, 161, 120, -1, 6, 0, 1, 0],
  [84, 151, 84, -16, 5, 2, 0, 1],
  [262, 149, 82, 18, 5, 2, 4, -1],
  [66, 146, 64, -10, 5, 2, 5, 0],
  [280, 141, 62, 14, 5, 3, 1, 0],
  [138, 143, 108, 10, 6, 3, 0, 1],
  [206, 141, 110, -12, 6, 4, 2, -1],
  [112, 135, 84, -30, 5, 4, 4, 0],
  [234, 133, 86, 28, 5, 3, 1, 1],
  [168, 135, 104, -20, 6, 5, 1, 0],
  [186, 128, 96, 16, 5, 5, 3, -1],
  [148, 118, 92, -9, 5, 6, 2, 0],
  [200, 117, 90, 11, 5, 6, 0, 1],
  [172, 108, 76, -34, 5, 7, 1, 0],
  [130, 124, 72, 36, 5, 6, 3, 0],
  [216, 124, 72, -40, 5, 5, 6, 0],
  [170, 103, 66, 4, 5, 8, 2, 0],
];

/** Laid across the needle, so it sits half buried rather than on top. */
const OVER: readonly Stalk[] = [
  [150, 114, 72, 58, 5, 8, 1, 0],
  [188, 104, 86, -50, 5, 9, 3, 1],
  [216, 96, 64, 72, 5, 7, 4, 0],
  [170, 112, 98, 8, 5, 7, 2, -1],
];

/** The eye end, the heading, and the size of the needle. */
const NEEDLE = { x: 100, y: 128, angle: -16, length: 140, width: 5.4 } as const;

/** A stalk as the board draws one: a pointed lens, full width in the middle. */
function stalkPath([x, y, length, angle, width, , , bow]: Stalk): string {
  const alongX = Math.cos(angle * RADIANS);
  const alongY = Math.sin(angle * RADIANS);
  const endX = alongX * (length / 2);
  const endY = alongY * (length / 2);
  const bendX = x - alongY * bow;
  const bendY = y + alongX * bow;
  return (
    `M ${x - endX} ${y - endY} ` +
    `Q ${bendX - alongY * width} ${bendY + alongX * width} ${x + endX} ${y + endY} ` +
    `Q ${bendX + alongY * width} ${bendY - alongX * width} ${x - endX} ${y - endY} Z`
  );
}

function stalkColour([, , , , , light, tone]: Stalk): Float32Array {
  return STRAW_PALETTE[strawColorIndex(light, tone)];
}

/** A point `along` the needle from its eye end, `across` from its spine. */
function onNeedle(along: number, across: number): [number, number] {
  const alongX = Math.cos(NEEDLE.angle * RADIANS);
  const alongY = Math.sin(NEEDLE.angle * RADIANS);
  return [NEEDLE.x + alongX * along - alongY * across, NEEDLE.y + alongY * along + alongX * across];
}

/** Round at the eye end, straight along the shaft, then drawn to a point. */
function needlePath(offsetX: number, offsetY: number): string {
  const half = NEEDLE.width / 2;
  const shaft = NEEDLE.length * 0.7;
  const [a, b, tip, c, d] = [
    onNeedle(0, -half),
    onNeedle(shaft, -half * 0.85),
    onNeedle(NEEDLE.length, 0),
    onNeedle(shaft, half * 0.85),
    onNeedle(0, half),
  ].map(([x, y]) => `${x + offsetX} ${y + offsetY}`);
  return `M ${a} L ${b} L ${tip} L ${c} L ${d} A ${half} ${half} 0 0 1 ${a} Z`;
}

const EYE = onNeedle(NEEDLE.length * 0.075, 0);
const SHINE = [
  onNeedle(4, -NEEDLE.width * 0.2),
  onNeedle(NEEDLE.length * 0.7 - 4, -NEEDLE.width * 0.18),
];

/** Eight rays from the eye: four long on the square, four short between them. */
function glintPath(): string {
  const [x, y] = EYE;
  return [
    [0, 17, 1.25],
    [90, 17, 1.25],
    [45, 8.5, 0.9],
    [135, 8.5, 0.9],
  ]
    .map(([angle, reach, waist]) => {
      const dx = Math.cos(angle * RADIANS);
      const dy = Math.sin(angle * RADIANS);
      return (
        `M ${x - dx * reach} ${y - dy * reach} L ${x - dy * waist} ${y + dx * waist} ` +
        `L ${x + dx * reach} ${y + dy * reach} L ${x + dy * waist} ${y - dx * waist} Z`
      );
    })
    .join(' ');
}

const ART = {
  pile: PILE.map((stalk) => ({ path: stalkPath(stalk), colour: stalkColour(stalk) })),
  over: OVER.map((stalk) => ({ path: stalkPath(stalk), colour: stalkColour(stalk) })),
  needle: needlePath(0, 0),
  needleShadow: needlePath(1.6, 2.6),
  shine: `M ${SHINE[0].join(' ')} L ${SHINE[1].join(' ')}`,
  glint: glintPath(),
};

/**
 * A low pile of straw under a lamp, with the needle half buried in it and
 * catching the light at its eye. Drawn at one size and centred, so a wider
 * card only shows more of the dark around the lamplight.
 */
function Hero() {
  const pileX = HERO_WIDTH / 2;
  return (
    <View style={styles.hero} pointerEvents="none">
      <Canvas style={styles.heroCanvas}>
        <Rect x={0} y={0} width={HERO_WIDTH} height={HERO_HEIGHT}>
          <RadialGradient
            c={vec(pileX, 6)}
            r={HERO_HEIGHT}
            colors={[
              rgbaFromHex(color.gold, 0.3),
              rgbaFromHex(color.gold, 0.11),
              rgbaFromHex(color.gold, 0),
            ]}
            positions={[0, 0.38, 0.8]}
          />
        </Rect>
        <Group origin={vec(pileX, 160)} transform={[{ scaleY: 0.12 }]}>
          <Circle cx={pileX} cy={160} r={130}>
            <RadialGradient
              c={vec(pileX, 160)}
              r={130}
              colors={[rgbaFromHex(color.shadow, 0.7), rgbaFromHex(color.shadow, 0)]}
            />
          </Circle>
        </Group>
        <Group origin={vec(pileX, 122)} transform={[{ scaleY: 0.42 }]}>
          <Circle cx={pileX} cy={122} r={130}>
            <RadialGradient
              c={vec(pileX, 122)}
              r={130}
              colors={[rgbaFromHex(color.gold, 0.2), rgbaFromHex(color.gold, 0)]}
            />
          </Circle>
        </Group>

        {ART.pile.map((stalk, index) => (
          <Path key={index} path={stalk.path} color={stalk.colour} />
        ))}

        <Path path={ART.needleShadow} color={rgbaFromHex(color.shadow, 0.55)} />
        <Path path={ART.needle}>
          <LinearGradient
            start={vec(...onNeedle(0, -NEEDLE.width / 2))}
            end={vec(...onNeedle(0, NEEDLE.width / 2))}
            colors={[mixHex(color.steel, color.text, 0.5), color.steel, color.steelDeep]}
            positions={[0, 0.45, 1]}
          />
        </Path>
        <Path
          path={ART.shine}
          style="stroke"
          strokeWidth={1}
          strokeCap="round"
          color={rgbaFromHex(color.text, 0.7)}
        />
        <Group origin={vec(...EYE)} transform={[{ rotate: NEEDLE.angle * RADIANS }]}>
          <Oval x={EYE[0] - 4.4} y={EYE[1] - 1} width={8.8} height={2} color={color.ink} />
        </Group>

        {ART.over.map((stalk, index) => (
          <Path key={index} path={stalk.path} color={stalk.colour} />
        ))}

        <Circle c={vec(...EYE)} r={18}>
          <RadialGradient
            c={vec(...EYE)}
            r={18}
            colors={[
              rgbaFromHex(color.text, 0.75),
              rgbaFromHex(color.gold, 0.22),
              rgbaFromHex(color.gold, 0),
            ]}
            positions={[0, 0.35, 1]}
          />
        </Circle>
        <Path path={ART.glint} color={color.text} />
        <Circle c={vec(...EYE)} r={1.6} color={color.text} />
      </Canvas>
    </View>
  );
}

const STAR_SIZE = 18;
const STAR_GAP = 6;
/** Light falls from the upper left, as it does on the board. */
const LIGHT = { x: -0.6, y: -0.8 };

/**
 * A faceted brass star: ten triangles meeting at the middle, each shaded by
 * how squarely its outer edge faces the light.
 */
function starArt(size: number) {
  const outer = size * 0.4375;
  const inner = outer * 0.423;
  const centreX = size / 2;
  // Centres the star's body rather than its points, which hang lower.
  const centreY = size / 2 + outer * 0.0955;
  const points = Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const reach = index % 2 === 0 ? outer : inner;
    return [centreX + reach * Math.cos(angle), centreY + reach * Math.sin(angle)] as const;
  });
  const facets = points.map((from, index) => {
    const to = points[(index + 1) % points.length];
    const normalX = to[1] - from[1];
    const normalY = from[0] - to[0];
    const facing = (normalX * LIGHT.x + normalY * LIGHT.y) / Math.hypot(normalX, normalY);
    return {
      path: `M ${centreX} ${centreY} L ${from.join(' ')} L ${to.join(' ')} Z`,
      colour:
        facing >= 0
          ? mixHex(color.gold, color.text, facing * 0.5)
          : mixHex(color.gold, color.goldDim, -facing),
    };
  });
  return {
    outline: `M ${points.map((point) => point.join(' ')).join(' L ')} Z`,
    facets,
  };
}

const STAR = starArt(STAR_SIZE);

/** Three stars set into the bottom edge of the frame, like a cleared level. */
function Seam() {
  const width = MAX_STARS * STAR_SIZE + (MAX_STARS - 1) * STAR_GAP;
  return (
    <View style={styles.seam} pointerEvents="none">
      <View style={styles.seamBreak}>
        <Canvas style={{ width, height: STAR_SIZE }}>
          {Array.from({ length: MAX_STARS }, (_, index) => (
            <Group key={index} transform={[{ translateX: index * (STAR_SIZE + STAR_GAP) }]}>
              <Path path={STAR.outline} color={mixHex(color.gold, color.goldDim, 0.3)} />
              {STAR.facets.map((facet, facetIndex) => (
                <Path key={facetIndex} path={facet.path} color={facet.colour} />
              ))}
            </Group>
          ))}
        </Canvas>
      </View>
    </View>
  );
}

const CARD_RADIUS = radius.lg + space.md;

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
  /** Carries the shadow. iOS clips a shadow on a view that clips its content. */
  card: {
    alignSelf: 'stretch',
    maxWidth: 420,
    width: '100%',
    marginHorizontal: 'auto',
    borderRadius: CARD_RADIUS,
    backgroundColor: color.surface,
    shadowColor: color.shadow,
    shadowOpacity: 0.7,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 30 },
  },
  /** Clips the lamplight to the card's corners. */
  sheet: {
    overflow: 'hidden',
    padding: space.md,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    alignItems: 'center',
  },
  heroCanvas: { width: HERO_WIDTH, height: HERO_HEIGHT },
  /** Type starts just under the pile. */
  note: {
    alignItems: 'center',
    paddingTop: HERO_HEIGHT - space.xxl,
    paddingHorizontal: space.md,
    paddingBottom: space.xxl,
  },
  /** Drawn over the note rather than around it, so it never moves the type. */
  frame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
  },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  eyebrowRule: { width: space.lg, height: 1, backgroundColor: color.goldDim },
  eyebrowLabel: {
    color: color.gold,
    fontFamily: font.monoMedium,
    fontSize: type.caption,
    letterSpacing: 2,
  },
  title: {
    marginTop: space.sm,
    color: color.text,
    fontFamily: font.display,
    fontSize: type.display,
    lineHeight: 38,
    textAlign: 'center',
  },
  detail: {
    marginTop: space.md,
    color: color.textMuted,
    fontFamily: font.body,
    fontSize: type.body,
    lineHeight: 22,
    textAlign: 'center',
  },
  signature: {
    marginTop: space.lg,
    color: color.gold,
    fontFamily: font.displayItalic,
    fontSize: type.heading,
    lineHeight: 24,
    textAlign: 'center',
  },
  seam: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -STAR_SIZE / 2,
    alignItems: 'center',
  },
  /** Breaks the frame's bottom edge where the stars sit. */
  seamBreak: { paddingHorizontal: space.sm, backgroundColor: color.surface },
  actions: { gap: space.sm, paddingTop: space.xxl },
  wide: { alignSelf: 'stretch' },
  never: {
    minHeight: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  neverLabel: {
    color: color.textMuted,
    fontFamily: font.monoMedium,
    fontSize: type.label,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
