# Caption Overlay

Snapchat & TikTok style text caption overlays for video using FFmpeg and Canvas.

## Features

- **Snapchat-style captions**: Semi-transparent black bar with white text, full-width bar, 8 style presets
- **TikTok-style captions**: Word-by-word highlight animation, 7 style presets
- **Canvas rendering**: Color emoji support via `@napi-rs/canvas` (Skia)
- **FFmpeg drawtext fallback**: Works without canvas dependencies
- **Scene-based captions**: Per-scene styling, timing, and positioning
- **Hook/Value pattern**: Caption changes at configurable midpoint
- **Platform safe zones**: Instagram, TikTok, YouTube Shorts UI avoidance
- **Template system**: Save/load/duplicate caption presets

## Install

```bash
npm install
```

## Quick Start

```js
import { addSingleCaption } from './index.js';

// Snapchat-style caption on entire video
await addSingleCaption('input.mp4', 'output.mp4', 'Your text here', 'snapchat_classic');
```

## Demo

```bash
node demo.js input.mp4
```

Produces three videos: Snapchat caption, hook/value caption, and timed captions.

---

## Visual Guide — How Captions Look & Where They're Placed

All captions are designed for **vertical video (1080x1920)** — the standard format for Instagram Reels, TikTok, and YouTube Shorts.

### Snapchat-Style Captions

Snapchat captions render as a **full-width horizontal bar** stretching edge-to-edge across the video with text centered inside. They look like the text overlay you'd add to a Snapchat story.

```
 ┌──────────────────────────┐
 │                          │
 │                          │
 │        (video)           │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │██████████████████████████│ <-- full-width bar, ~100px from bottom
 │██  Your caption text   ██│ <-- white text centered in the bar
 │██████████████████████████│
 │                          │
 └──────────────────────────┘
```

**Layout rules:**
- The bar spans the **full width** of the video (edge to edge, no side margins)
- Text is **horizontally centered** within the bar
- Default position is **bottom of frame**, ~100-120px above the bottom edge (to stay above Instagram/TikTok UI buttons)
- Bar height **scales with text** — more text or larger font = taller bar
- Long text **word-wraps** within the bar (wraps at ~90% of video width)
- Explicit `\n` newlines in the caption text are respected
- Font size **scales proportionally** to video width (base size designed for 1080px wide)
- The bar background has **rounded corners** on styled presets (neon_pink, story_blue, etc.) but **no rounding** on classic Snapchat style

**Snapchat style breakdown:**

| Style ID | Background | Text Color | Font | Border Radius | Extra |
|----------|-----------|------------|------|---------------|-------|
| `classic_white` | Black at 60% opacity | White | Avenir Next / Helvetica Neue, weight 500 | 0 (square) | Full-width bar — the authentic Snapchat look |
| `neon_pink` | Solid #FF1493 (hot pink) | White | Avenir Next, bold | 8px rounded | Pink glow effect around the bar |
| `story_blue` | Gradient #667eea to #764ba2 (blue-purple) | White | Avenir Next, bold | 12px rounded | Subtle drop shadow below bar |
| `fire_orange` | Solid #FF6B35 (orange) | White | Avenir Next, bold | 8px rounded | — |
| `purple_dream` | Gradient #8B5CF6 to #EC4899 (purple-pink) | White | Avenir Next, bold | 20px (pill shape) | Purple glow effect |
| `dark_mode` | Black at 75% opacity | White | Avenir Next, weight 500 | 4px | Full-width bar, darker than classic |
| `yellow_pop` | Solid #FFE135 (yellow) | Black | Avenir Next, bold | 0 (square) | Hard drop shadow offset 4px right + 4px down |
| `mint_fresh` | Solid #98FF98 (mint green) | Dark gray #1a1a1a | Avenir Next, bold | 8px rounded | — |

### TikTok-Style Captions

TikTok captions show **all words at once** with the **current word highlighted** in a different color. Each word lights up one at a time in sequence, creating the word-by-word karaoke effect you see on TikTok.

```
 ┌──────────────────────────┐
 │                          │
 │                          │
 │        (video)           │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │  This is what the        │ <-- white text, no background bar
 │  caption LOOKS like      │ <-- "LOOKS" highlighted in yellow
 │                          │
 │                          │
 │                          │
 └──────────────────────────┘
```

**Layout rules:**
- **No background bar** — text floats directly over the video
- Text has a **black stroke/outline** (2-4px) and **drop shadow** for readability against any background
- Words are **horizontally centered** as a block
- Default position is **bottom of frame**, ~60px above the bottom edge (measured from video bottom to text baseline)
- Text wraps into lines of **3-5 words per line** (configurable per style via `wordsPerLine`)
- All lines are **visible simultaneously** — the highlight just moves word to word
- Word highlight advances at **2.5 words per second** by default (configurable via `wordsPerSecond`)
- In `static` display mode, all words show in the highlight color for the entire duration (no animation)
- In `animated` display mode (default), one PNG is rendered per word-highlight state, composited via FFmpeg overlay with timing
- Font size scales to video width (base sizes are designed for 1080px wide)

**TikTok style breakdown:**

| Style ID | Highlight Color | Base Color | Stroke | Extra |
|----------|----------------|------------|--------|-------|
| `classic_yellow` | Yellow #FFFF00 | White | Black 3px | The standard TikTok caption look |
| `bounce_cyan` | Cyan #00FFFF | White | Black 2px | 3 words per line |
| `gradient_glow` | Pink #FF1493 | White | Black 2px | Glow effect, pink shadow |
| `minimal_white` | White | White at 50% opacity | None | Underline on active word, shadow only |
| `neon_green` | Green #00FF00 | White | Dark green 2px | Neon glow effect |
| `fire_red` | Red #FF4444 | White | Black 3px | Red glow |
| `instagram_clean` | White | White | None | Very subtle shadow, clean look |

### FFmpeg Drawtext Presets (captionOverlayService)

These are simpler presets that use FFmpeg's `drawtext` filter directly (no canvas needed). They render a single text string with stroke and shadow — no background bar (except `snapchat_classic`).

```
 ┌──────────────────────────┐
 │                          │
 │                          │
 │        (video)           │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │                          │
 │     Your caption text    │ <-- white text with black outline
 │                          │     120px from bottom edge
 │                          │
 │                          │
 └──────────────────────────┘
```

| Preset | Font | Size | Color | Stroke | Shadow | Position |
|--------|------|------|-------|--------|--------|----------|
| `snapchat_classic` | Helvetica Neue | 44px | White | None | None | Bottom, 120px up. Has black bar at 60% opacity behind text |
| `capcut_default` | Arial | 48px | White | Black 3px | Black at 50%, offset 3px | Bottom, 120px up |
| `capcut_bold` | Arial | 56px | White | Black 4px | Black at 60%, offset 4px | Bottom, 120px up |
| `capcut_minimal` | Arial | 42px | White | Black 2px | Black at 30%, offset 2px | Bottom, 100px up |
| `capcut_top` | Arial | 48px | White | Black 3px | Black at 50%, offset 3px | **Top**, 80px down |
| `capcut_center` | Arial | 52px | White | Black 4px | Black at 60%, offset 4px | **Center** of frame |

### Position Customization

Captions can be placed at custom positions using normalized coordinates (0.0 to 1.0):

```js
await applySceneCaptions(videoPath, [{
  sceneNumber: 0,
  startTime: 0,
  endTime: 5,
  caption: 'Custom position',
  style: 'classic_white',
  styleType: 'snapchat',
  position: { x: 0.5, y: 0.7 },  // 50% from left, 70% from top
}], outputPath);
```

- `x: 0.5` = horizontally centered (default behavior)
- `y: 0.0` = top of frame
- `y: 0.5` = middle of frame
- `y: 1.0` = bottom of frame

### Platform Safe Zones

Captions automatically avoid platform UI elements when using the render service:

```
 ┌──────────────────────────┐
 │ ░░░ top safe zone ░░░░░░ │  Instagram: 60px / TikTok: 80px / YT Shorts: 60px
 │                          │
 │                          │
 │  ┌── safe area ────────┐ │
 │  │                     │ │
 │  │  Captions render    │ │  Left margin: 20px (all platforms)
 │  │  inside this box    │ │  Right margin: 20px (IG/YT) or 80px (TikTok — icons)
 │  │                     │ │
 │  └─────────────────────┘ │
 │                          │
 │ ░░░ bottom safe zone ░░░ │  Instagram: 120px / TikTok: 150px / YT Shorts: 100px
 └──────────────────────────┘
```

The bottom safe zone is larger on TikTok (150px) because of the like/comment/share buttons. The right safe zone is larger on TikTok (80px) because of the vertical icon bar.

### Hook / Value Caption Pattern

A special two-phase caption designed for engagement. The "hook" text shows during the first half of the video to grab attention, then switches to the "value" text for the payoff.

```
 FIRST HALF OF VIDEO:                SECOND HALF OF VIDEO:

 ┌──────────────────────────┐       ┌──────────────────────────┐
 │                          │       │                          │
 │        (video)           │       │        (video)           │
 │                          │       │                          │
 │                          │       │                          │
 │                          │       │                          │
 │                          │       │                          │
 │                          │       │                          │
 │                          │       │                          │
 │                          │       │                          │
 │                          │       │                          │
 │                          │       │                          │
 │                          │       │                          │
 │   "Wait for it..."      │       │   "Here's the secret"    │
 │                          │       │                          │
 │                          │       │                          │
 └──────────────────────────┘       └──────────────────────────┘
       0s ─────── 50%                    50% ─────── end
```

The midpoint is configurable:
- `standard` — 50% (default)
- `early_switch` — 40% (shorter hook)
- `late_switch` — 60% (longer hook)
- `quick_hook` — 30% (very short hook)

There's a 200ms gap between hook and value for a clean transition.

### Font Rendering

The system uses this font fallback chain:
1. **User-selected font** (Inter, Montserrat, Bebas Neue, Poppins, Bangers, etc.)
2. **DejaVu Sans** (default fallback — available on Linux servers)
3. **Apple Color Emoji / Noto Color Emoji** (for color emoji rendering via Skia)

Font size scaling formula: `renderedSize = baseFontSize * (videoWidth / 1080) * 1.8`

For a 1080px wide video with base size 24px, the rendered size is `24 * 1 * 1.8 = 43px`.

### Emoji Handling

- Color emojis (face, hand, flag) render correctly via `@napi-rs/canvas` Skia backend + NotoColorEmoji
- Keycap emoji sequences (1, 2, etc.) are normalized to plain digits to avoid rendering gaps
- For ASS subtitle rendering (TikTok drawtext path), all emojis are stripped because libass renders them as boxes

---

## API

### Simple Overlay (captionOverlayService)

```js
import { addSingleCaption, addHookValueCaption, addTimedCaptions, addMultiLineCaption } from './index.js';

// Single caption for entire video
await addSingleCaption(videoPath, outputPath, 'Caption text', 'snapchat_classic');

// Hook text first half, value text second half
await addHookValueCaption(videoPath, outputPath, 'Wait for it...', 'Boom!', 'capcut_bold');

// Timed captions
await addTimedCaptions(videoPath, outputPath, [
  { text: 'First', startTime: 0, endTime: 3 },
  { text: 'Second', startTime: 3, endTime: 6 },
], 'capcut_default');

// Multi-line
await addMultiLineCaption(videoPath, outputPath, ['Line 1', 'Line 2'], 'capcut_default');
```

### Scene-Based Captions

```js
import { applySceneCaptions } from './index.js';

await applySceneCaptions(videoPath, [
  {
    sceneNumber: 0,
    startTime: 0,
    endTime: 3,
    caption: 'Scene 1',
    style: 'classic_white',
    styleType: 'snapchat',       // 'snapchat' or 'tiktok'
    position: { x: 0.5, y: 0.8 }, // optional custom position
    font: 'Montserrat',           // optional font override
    fontSize: 32,                  // optional size override
    textColor: '#FFFFFF',          // optional color override
    borderColor: '#000000',        // optional stroke color
    borderStyle: 'full',           // 'full' (stroke), 'shadow', or 'none'
  },
  {
    sceneNumber: 1,
    startTime: 3,
    endTime: 6,
    caption: 'Scene 2',
    style: 'neon_pink',
    styleType: 'snapchat',
  },
], outputPath);
```

### TikTok Animated Captions

```js
import { applyTikTokCaptions } from './index.js';

await applyTikTokCaptions(videoPath, [
  {
    sceneNumber: 0,
    startTime: 0,
    endTime: 5,
    caption: 'Each word lights up one at a time',
    style: 'classic_yellow',
    displayMode: 'animated',    // 'animated' (word-by-word) or 'static' (all at once)
  },
], outputPath, {
  wordsPerSecond: 2.5,  // how fast words highlight
});
```

### Templates

```js
import { captionTemplates } from './index.js';

const all = await captionTemplates.getAllTemplates();
const custom = await captionTemplates.createTemplate({ name: 'My Style', styleType: 'snapchat', styleId: 'neon_pink' });
await captionTemplates.duplicateTemplate(custom.id, 'My Style v2');
await captionTemplates.deleteTemplate(custom.id);
```

## Dependencies

- `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` — FFmpeg wrapper
- `@napi-rs/canvas` — Canvas rendering with color emoji support (optional for drawtext path)
- `@ffprobe-installer/ffprobe` — Video metadata

## Files

| File | Purpose |
|------|---------|
| `services/captionOverlayService.js` | Simple FFmpeg drawtext overlay |
| `services/captionStyleService.js` | Style presets + Canvas/FFmpeg rendering engine |
| `services/sceneCaptionService.js` | Multi-scene orchestrator |
| `services/captionRenderService.ts` | TypeScript types + timing + CSS generation |
| `services/captionTemplateService.js` | Template CRUD with JSON persistence |
