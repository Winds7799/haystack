# Haystack

Search a dense procedurally generated haystack for a single sewing needle, scanning by
panning and zooming. Nails, pins, wire, splinters and staples punish careless tapping.
Thirty levels, five worlds, no backend, no accounts, no ads.

## Running it

Skia is not in Expo Go, so the app needs a development build.

```bash
npm install
npx expo run:android
```

For iOS from a machine without Xcode, build in the cloud once and then load JS locally:

```bash
npx eas-cli build --platform ios --profile development
```

The development build is a shell that loads JS from the dev server, so once it is on a
device you only need `npx expo start` — code changes do not need a rebuild.

```bash
npx tsc --noEmit
```

## How it is put together

The board is generated once per level and baked into a single Skia texture. The frame
loop only translates, scales and blits that image, so a level with 38,000 stalks costs
the same per frame as one with 400.

- `src/game/generate.ts` — seeded from `(levelId, attempt)`. Straw lives in parallel
  typed arrays; the array index *is* the depth, so nothing needs sorting.
- `src/game/render.ts` — groups stalks by palette colour and emits each group as one SVG
  path string. Roughly 390 draw calls for a full board instead of 38,000.
- `src/game/camera.ts` / `useCamera.ts` — worklet-safe camera maths, focal-point pinch,
  clamped pan, decay momentum.
- `src/game/shapes.ts` — the needle and every decoy, built once per kind and reused.
- `src/ui/tokens.ts` — every colour, size and spacing step. A hex value anywhere else is
  a bug.

## Tuning the difficulty curve

`src/game/difficulty.ts` is the whole curve and the only place it is described. The rule
it obeys, which matters more than any individual number:

> Difficulty comes from decoy similarity, not from straw.

More straw makes a level *slower*. Better decoys make it *harder*. When a level needs to
be tougher, raise `similarity` or introduce a new decoy kind. Reach for `strawCount`
last — across all thirty levels it moves only 26,000 → 38,000, while `similarity` moves
0 → 1.

Each level is a plain object:

| field | what it does |
| --- | --- |
| `similarity` | 0 leaves each decoy its own colour and thickness; 1 gives it the needle's. The main lever. Length is never pulled, so it stays a real cue. |
| `decoys` | Which kinds, and how many. A new kind is a bigger jump than more of an old one. |
| `occlusion` | `[min, max]` fraction of the needle's length that straw covers. The generator searches placements until it lands inside the band. |
| `par` | `[three, two]` in seconds. Penalties count towards the total. |
| `modifier` | `drift`, `lantern`, `haze` or `twin`. Never two on one level. |
| `strawCount` | Density. The last thing to touch. |

`occlusion` is measured, not estimated: `measureOcclusion` samples 15 points along the
needle's spine against exactly the straw the renderer will draw over it. Bands narrower
than about 7% are not reachable — that is the sampling resolution.

A `brokenNeedle` ignores `similarity` and is always drawn at 1. It is a needle in every
respect but the eye, which is the point of it.

## Adding a level

1. Add a row to `LEVELS` in `src/game/difficulty.ts`. Ids are contiguous and worlds are
   runs of six; the level select groups by world in table order.
2. Pick `similarity` from its neighbours, then choose decoys.
3. Set `occlusion` a little above the previous level, and `par` from a real play.
4. Run the generator checks — every needle must be tappable, inside its band, and inside
   its own hint halo.

Nothing else needs touching. Level select, unlocking and the debug menu all read from
`LEVELS`.

## Accessibility

- Every control has an `accessibilityLabel` and a 44pt minimum target.
- **Colour-blind-safe decoys** hold thickness back and grow each kind's signature feature
  — nail heads, pin beads, staple legs — so the tell is silhouette, not hue. Colour still
  converges, because removing that would make the game easier rather than fairer.
- **Reduced motion** kills drift, pan momentum and the win flourish, and is taken from
  the system setting as well as the in-app one.
- **Left-handed layout** mirrors the game chrome.
- All UI text respects system font scaling.

## Debug menu

Development builds only. Settings → Debug: jump to any level and force any modifier. The
route exists in release builds but refuses to do anything.

## Regenerating assets

Both are scripts so they can never drift from the design tokens.

```bash
node tools/make-icons.mjs
node tools/make-audio.mjs
```

## Out of scope, deliberately

No multiplayer, leaderboards, daily challenges, ads, in-app purchases, analytics,
accounts, cloud sync or achievements. Everything is local.
