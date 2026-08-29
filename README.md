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

## Leaderboard

The board is off by default and the game is complete without it. Everything
below is optional, and takes about three minutes.

1. Create a project at [supabase.com](https://supabase.com). The free tier is
   more than enough.
2. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql).
   That file is generated from the level curve by `node tools/make-schema.mjs`
   — regenerate it if you retune `par` values, since the anti-cheat bounds are
   derived from them.
3. In **Project settings → API**, copy the project URL and the `anon` key into
   `app.json`:

   ```json
   "extra": {
     "supabaseUrl": "https://YOUR-PROJECT.supabase.co",
     "supabaseAnonKey": "eyJ..."
   }
   ```

The anon key is meant to be public — row level security is what protects the
table, not the secrecy of that string.

### How it works

There are no accounts. On first run the app generates a random player id and
keeps it on the device; the display name is a label hanging off that id, asked
for once, the first time a finish is ready to post. Reinstalling starts a new
player. That is the trade for asking nobody to sign in.

One row per player per level, and a standing best only ever moves downwards —
a slower resubmission is a no-op, enforced in the database rather than trusted
to the client.

### What the anti-cheat does and does not do

Times are reported by the client, so nothing here can prove a run happened.
`check_score()` rejects times below a per-level floor (a third of the
three-star par) and above an hour, rejects impossible star counts, and cleans
up names. That catches carelessness and casual tampering. It does not stop
someone determined, and it is not meant to.

If you want times that are actually verifiable, the shape of it is: submit the
board seed and the tap that ended the run, and have the server replay the
generator to confirm the needle was where the player says it was. That is a
real piece of work, not a flag to flip.

### Before shipping this to the App Store

Display names are user-generated content. Apple's guideline 1.2 expects apps
carrying UGC to offer a way to report objectionable content and to act on it.
The schema trims names, caps them at 24 characters and rejects control
characters, which is hygiene, not moderation. Either add a report path and a
blocklist, or switch to generated handles, before submitting.

## Hints and ads

A hint dims the board and lights a quarter of it for a second and a half. It
costs ten seconds, and taking any hint at all caps the level at two stars.
Hints are not limited to one per level — each one costs another ad.

### Going live, iOS first

Ads are configured per platform, so iOS can earn while Android is still on
test units. Until a platform has a real unit, it serves Google's samples and
earns nothing — `usingTestAds()` reports this, and Settings shows a "test ads"
note so it cannot ship unnoticed.

In [AdMob](https://admob.google.com), create the app and a **rewarded** ad
unit, then fill in two places:

```jsonc
// app.json
"react-native-google-mobile-ads": {
  "iosAppId": "ca-app-pub-XXXX~XXXX"      // the app
},
"extra": {
  "ads": { "iosRewardedUnitId": "ca-app-pub-XXXX/XXXX" }   // the unit
}
```

The app ID is native and needs a rebuild. The unit ID is read at runtime.
Android gets the same two fields when you are ready for it.

**Consent.** `AdsConsent.gatherConsent()` runs once, lazily, before the first
ad — a player who never asks for a hint never sees a consent form. Serving
personalised ads in the EU or UK without this breaches Google's policy and
they will stop filling. Settings carries an "Ad privacy choices" entry, which
the same rules require.

**Tracking.** There is deliberately no App Tracking Transparency prompt, so
first launch still asks for nothing. That means non-personalised ads on iOS,
which earn less. To change it, set `userTrackingUsageDescription` in the
plugin config and request ATT before the first ad.

**Before submitting:** ads mean the App Store privacy questionnaire has to
declare identifiers and usage data. That is a form, not code, but the app will
be rejected without it.

The ad module is loaded lazily inside a try/catch. On a build made before this
dependency existed, or with no network, `adsAvailable()` is false and a hint is
simply granted. Nobody loses a hint to an outage.

**This requires a new native build.** `npx expo start` alone will not pick up
the ad SDK.

## Legal

`src/legal/documents.ts` holds the privacy policy and terms as data; `/legal`
renders them and Settings links to it. They describe what the app actually
does, in plain language.

**They are not finished.** Three placeholders in `PUBLISHER` have to be filled
in before submitting:

- `contact` — a support address you are willing to publish. Apple requires
  one, and the privacy policy and the report duty both point at it.
- `jurisdiction` — whose law governs the terms.
- `LAST_UPDATED` — bump it whenever the wording changes.

`legalIncomplete()` reports whether they are still placeholders, and the legal
screen shows a warning about it in development builds.

None of this is legal advice. The text is accurate about the app's behaviour,
which is the hard part, but have someone qualified read it before you ship.

### Why each piece exists

| Requirement | Where |
| --- | --- |
| Privacy policy, in app and as a URL | `/legal`, and you must also paste a hosted copy into App Store Connect |
| Objectionable content, zero tolerance | Terms, "Names on the leaderboard" |
| A way to report content | Report control on every leaderboard row, writing to `public.reports` |
| A way to erase your data | Settings, "Remove my leaderboard entry" |
| Ad consent, EU and UK | `AdsConsent.gatherConsent()`, plus Settings, "Ad privacy choices" |

Apple expects reports acted on **within 24 hours**. `public.reports` is
write-only from the app — read it from the Supabase dashboard.

**You still need a hosted privacy policy URL.** App Store Connect asks for a
link, not a screen. Publishing the same text on any static page satisfies it.

### The hosted copy

App Store Connect wants a privacy policy **URL**, not a screen. `docs/` holds
static pages generated from the same `src/legal/documents.ts` the app renders,
so the two can never disagree.

```bash
node tools/make-legal.mjs   # rebuild docs/ after editing the wording
```

To publish them on GitHub Pages:

1. Create a repository and push this project to it.
2. **Settings → Pages → Source:** Deploy from a branch, branch `main`, folder
   `/docs`.
3. A minute later the policy is at
   `https://<user>.github.io/<repo>/privacy.html`. Paste that into App Store
   Connect.

The generator refuses to run while `PUBLISHER` still holds placeholders, so a
policy with `REPLACE ME` in it cannot reach the web by accident.
