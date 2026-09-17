import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Canvas,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { completeFeedback, tapFeedback } from '@/game/feedback';
import { formatDuration, type FinaleSummary } from '@/game/finale';
import { color, font, monitor, motion, space, type } from '../tokens';

interface FinaleProps {
  summary: FinaleSummary;
  reducedMotion: boolean;
  /** A tap anywhere. There is no button: the card is the whole message. */
  onDismiss: () => void;
}

/** Appends an alpha byte to a six-digit hex colour. */
function alpha(hex: string, value: number): string {
  return `${hex}${Math.round(value * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

/**
 * The results monitor after level one hundred: an old office CRT showing the
 * player's all-time numbers on the left and their rank on the right, with one
 * line of verdict under the screen. No buttons — a tap anywhere closes it.
 */
export function Finale({ summary, reducedMotion, onDismiss }: FinaleProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const screen = useSharedValue(reducedMotion ? 1 : 0);
  const grade = useSharedValue(reducedMotion ? 1 : 0);
  const verdict = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      completeFeedback();
      return;
    }
    // The monitor warms up, the grade stamps in, the verdict fades on.
    screen.value = withTiming(1, { duration: motion.slow, easing: Easing.out(Easing.cubic) });
    grade.value = withDelay(
      motion.slow + 200,
      withSequence(
        withTiming(1.12, { duration: motion.normal, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: motion.quick })
      )
    );
    verdict.value = withDelay(motion.slow + 900, withTiming(1, { duration: motion.slow }));
    const chime = setTimeout(completeFeedback, motion.slow + 200);
    return () => clearTimeout(chime);
  }, [grade, reducedMotion, screen, verdict]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screen.value,
    transform: [{ scale: 0.96 + screen.value * 0.04 }],
  }));
  const gradeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, grade.value),
    transform: [{ scale: grade.value }],
  }));
  const verdictStyle = useAnimatedStyle(() => ({
    opacity: verdict.value,
    transform: [{ translateY: (1 - verdict.value) * 6 }],
  }));

  const [letter, plus] = summary.rank.endsWith('+')
    ? [summary.rank.slice(0, -1), '+']
    : [summary.rank, ''];

  const rows: [string, string][] = [
    ['Levels cleared', `${summary.levelsDone} / ${summary.levelsTotal}`],
    ['Total play time', formatDuration(summary.totalMs)],
    ['Stars', `${summary.stars} / ${summary.starsTotal}`],
    ['First tries', `${summary.firstTries}`],
  ];

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current.width === width && current.height === height ? current : { width, height }
    );
  };

  return (
    <Pressable
      style={styles.root}
      accessibilityRole="button"
      accessibilityLabel={`Results. Rank ${summary.rank}. ${summary.stars} of ${summary.starsTotal} stars in ${formatDuration(summary.totalMs)}. ${summary.verdict} Tap to continue.`}
      onPress={() => {
        tapFeedback();
        onDismiss();
      }}
    >
      <Animated.View style={[styles.bezel, screenStyle]}>
        <View style={styles.screen} onLayout={onLayout}>
          {size.width > 0 ? <Phosphor width={size.width} height={size.height} /> : null}

          <View style={styles.chrome}>
            <View style={styles.header}>
              <Text style={styles.heading} accessibilityRole="header">
                RESULTS
              </Text>
              <Ticks count={6} style={styles.headerTicks} />
            </View>
            <View style={styles.rule} />

            <View style={styles.body}>
              <View style={styles.column}>
                {rows.map(([label, value], index) => (
                  <View key={label}>
                    {index === 2 ? <View style={styles.columnRule} /> : null}
                    <View style={styles.row}>
                      <Text style={styles.label}>{label.toUpperCase()}</Text>
                      <Text style={styles.value}>{value}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.divider} />
              <View style={styles.rankWell}>
                <Animated.View style={[styles.grade, gradeStyle]}>
                  <Text style={styles.gradeLetter}>{letter}</Text>
                  {plus ? <Text style={[styles.gradeLetter, styles.gradePlus]}>{plus}</Text> : null}
                </Animated.View>
              </View>
            </View>

            <View style={styles.rule} />
            <View style={styles.footer}>
              <Ticks count={3} />
              <Ticks count={6} />
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.Text style={[styles.verdict, verdictStyle]}>{summary.verdict}</Animated.Text>
    </Pressable>
  );
}

/** The little segmented bars an old status screen keeps in its corners. */
function Ticks({ count, style }: { count: number; style?: object }) {
  return (
    <View style={[styles.ticks, style]} pointerEvents="none">
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.tick} />
      ))}
    </View>
  );
}

/**
 * The lit tube behind the chrome: a teal wash, one bright bloom across the
 * upper half, dark corners, faint ghosted panels, and scanlines over it all.
 */
function Phosphor({ width, height }: { width: number; height: number }) {
  const scanlines = useMemo(() => {
    const path = Skia.PathBuilder.Make();
    for (let y = 1.5; y < height; y += 3) {
      path.moveTo(0, y).lineTo(width, y);
    }
    return path.detach();
  }, [width, height]);

  const ghosts = useMemo(
    () => [
      { x: width * 0.05, y: height * 0.2, width: width * 0.24, height: height * 0.62 },
      { x: width * 0.36, y: height * 0.22, width: width * 0.16, height: height * 0.26 },
      { x: width * 0.56, y: height * 0.14, width: width * 0.38, height: height * 0.7 },
      { x: width * 0.6, y: height * 0.2, width: width * 0.13, height: height * 0.2 },
      { x: width * 0.77, y: height * 0.2, width: width * 0.13, height: height * 0.2 },
    ],
    [width, height]
  );

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={[monitor.screenBright, monitor.screen, monitor.screenDeep]}
          positions={[0, 0.5, 1]}
        />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width * 0.5, height * 0.4)}
          r={width * 0.62}
          colors={[alpha(monitor.glow, 0.42), alpha(monitor.glow, 0.14), alpha(monitor.glow, 0)]}
          positions={[0, 0.45, 1]}
        />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width * 0.5, height * 0.5)}
          r={width * 0.72}
          colors={[alpha(monitor.screenDeep, 0), alpha(monitor.screenDeep, 0.85)]}
          positions={[0.55, 1]}
        />
      </Rect>
      {ghosts.map((ghost, index) => (
        <RoundedRect
          key={index}
          {...ghost}
          r={2}
          color={alpha(monitor.line, 0.12)}
          style="stroke"
          strokeWidth={1}
        />
      ))}
      <Path path={scanlines} color={alpha(color.shadow, 0.22)} style="stroke" strokeWidth={1} />
    </Canvas>
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
    gap: space.xxl,
    paddingHorizontal: space.lg,
    backgroundColor: color.scrim,
  },
  /** The monitor's housing: matte grey plastic with a lighter moulded edge. */
  bezel: {
    alignSelf: 'stretch',
    maxWidth: 560,
    width: '100%',
    marginHorizontal: 'auto',
    padding: 10,
    borderRadius: 8,
    backgroundColor: monitor.bezel,
    borderWidth: 1,
    borderColor: monitor.bezelEdge,
    shadowColor: monitor.glow,
    shadowOpacity: 0.22,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
  },
  /** Sized by its rows, so a narrow phone never clips the bottom edge. */
  screen: {
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: monitor.screen,
    borderWidth: 1,
    borderColor: alpha(monitor.glow, 0.55),
  },
  chrome: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: space.sm,
  },
  headerTicks: {
    position: 'absolute',
    right: 0,
    top: 2,
  },
  heading: {
    color: monitor.text,
    fontFamily: font.monitor,
    fontSize: type.heading + 2,
    letterSpacing: 1,
    textShadowColor: alpha(monitor.glow, 0.7),
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  rule: {
    height: 1,
    backgroundColor: alpha(monitor.line, 0.6),
  },
  body: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: space.sm,
  },
  column: {
    width: '42%',
    justifyContent: 'center',
    paddingRight: space.md,
  },
  columnRule: {
    height: 1,
    marginVertical: space.xs,
    backgroundColor: alpha(monitor.line, 0.45),
  },
  row: {
    paddingVertical: 3,
  },
  label: {
    color: monitor.label,
    fontFamily: font.monitor,
    fontSize: type.caption,
    letterSpacing: 0.5,
  },
  value: {
    marginTop: 1,
    color: monitor.text,
    fontFamily: font.monitorMedium,
    fontSize: type.title - 3,
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    width: 1,
    backgroundColor: alpha(monitor.line, 0.45),
  },
  rankWell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grade: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeLetter: {
    color: monitor.text,
    fontFamily: font.monitorBold,
    fontSize: 104,
    lineHeight: 112,
    letterSpacing: -2,
    textShadowColor: alpha(monitor.glow, 0.6),
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  gradePlus: {
    color: monitor.plus,
    textShadowColor: alpha(monitor.plus, 0.45),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: space.sm,
  },
  ticks: {
    flexDirection: 'row',
    gap: 3,
  },
  tick: {
    width: 9,
    height: 3,
    backgroundColor: alpha(monitor.line, 0.7),
  },
  verdict: {
    color: monitor.text,
    fontFamily: font.body,
    fontSize: type.heading,
    textAlign: 'center',
    textShadowColor: color.shadow,
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
});
