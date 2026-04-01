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

### Style Presets

**Caption Presets** (FFmpeg drawtext):
- `snapchat_classic` — Semi-transparent black bar, white text (Helvetica Neue)
- `capcut_default` — White text, black stroke + shadow
- `capcut_bold` — Large bold text, heavy shadow
- `capcut_minimal` — Subtle, small text
- `capcut_top` — Top-positioned
- `capcut_center` — Center-positioned

**Snapchat Styles** (Canvas rendering):
- `classic_white` — Classic Snapchat black bar
- `neon_pink` — Hot pink with glow
- `story_blue` — Blue-purple gradient
- `fire_orange` — Solid orange
- `purple_dream` — Purple-pink gradient with glow
- `dark_mode` — Semi-transparent dark bar
- `yellow_pop` — Yellow with drop shadow
- `mint_fresh` — Mint green

**TikTok Styles** (Word-by-word animation):
- `classic_yellow` — Yellow highlight
- `bounce_cyan` — Cyan with bounce
- `gradient_glow` — Pink-purple gradient glow
- `minimal_white` — Subtle white with underline
- `neon_green` — Green with neon glow
- `fire_red` — Red highlight
- `instagram_clean` — Clean white

### Scene-Based Captions

```js
import { applySceneCaptions } from './index.js';

await applySceneCaptions(videoPath, [
  { sceneNumber: 0, startTime: 0, endTime: 3, caption: 'Scene 1', style: 'classic_white', styleType: 'snapchat' },
  { sceneNumber: 1, startTime: 3, endTime: 6, caption: 'Scene 2', style: 'neon_pink', styleType: 'snapchat' },
], outputPath);
```

### Templates

```js
import { captionTemplates } from './index.js';

const all = await captionTemplates.getAllTemplates();
const custom = await captionTemplates.createTemplate({ name: 'My Style', styleType: 'snapchat', styleId: 'neon_pink' });
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
