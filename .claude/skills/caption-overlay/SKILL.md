---
name: caption-overlay
description: Add Snapchat or TikTok style text captions to video. Use when adding text overlays, captions, subtitles, or text-on-video in any project. Knows exact styles, fonts, colors, positioning, FFmpeg commands, and canvas rendering.
allowed-tools: Read Grep Glob Bash Write Edit
argument-hint: [snapchat|tiktok] [style] "caption text" [options]
---

# Caption Overlay Skill

You are an expert at adding Snapchat-style and TikTok-style text caption overlays to video. You know the exact styles, colors, fonts, positioning, and rendering pipeline. Use this knowledge to implement captions in ANY project — not just the caption-overlay repo.

## Quick Reference

**Install dependencies:**
```bash
npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg @ffprobe-installer/ffprobe @napi-rs/canvas
```

---

## SNAPCHAT STYLE CAPTIONS

Snapchat captions are a **full-width horizontal bar** stretching edge-to-edge across the video with centered text inside.

### Visual Layout
```
 ┌──────────────────────────┐
 │                          │
 │        (video)           │
 │                          │
 │                          │
 │██████████████████████████│  ← full-width bar, ~100px from bottom
 │██  Your caption text   ██│  ← white text centered in bar
 │██████████████████████████│
 │                          │
 └──────────────────────────┘
```

### Exact Style Definitions (copy these exactly)

```js
const SNAPCHAT_STYLES = {
  classic_white: {
    // THE authentic Snapchat look
    background: { color: 'rgba(0, 0, 0, 0.6)' },  // semi-transparent black
    text: { color: '#FFFFFF' },                      // white text
    font: "500 24px 'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    padding: { x: 15, y: 6 },
    borderRadius: 0,        // square corners
    fullWidth: true,         // bar spans entire video width
  },
  neon_pink: {
    background: { color: '#FF1493' },  // hot pink
    text: { color: '#FFFFFF' },
    font: "bold 24px 'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    padding: { x: 30, y: 15 },
    borderRadius: 8,
    shadow: { color: '#FF1493', blur: 20 },  // pink glow
  },
  story_blue: {
    background: { gradient: ['#667eea', '#764ba2'] },  // blue-purple gradient
    text: { color: '#FFFFFF' },
    font: "bold 24px 'Avenir Next'",
    padding: { x: 30, y: 15 },
    borderRadius: 12,
    shadow: { color: 'rgba(0,0,0,0.3)', blur: 10, offsetY: 4 },
  },
  fire_orange: {
    background: { color: '#FF6B35' },
    text: { color: '#FFFFFF' },
    font: "bold 24px 'Avenir Next'",
    padding: { x: 30, y: 15 },
    borderRadius: 8,
  },
  purple_dream: {
    background: { gradient: ['#8B5CF6', '#EC4899'] },  // purple-pink gradient
    text: { color: '#FFFFFF' },
    font: "bold 24px 'Avenir Next'",
    padding: { x: 30, y: 15 },
    borderRadius: 20,       // pill shape
    shadow: { color: 'rgba(139, 92, 246, 0.5)', blur: 15 },  // purple glow
  },
  dark_mode: {
    background: { color: 'rgba(0, 0, 0, 0.75)' },  // darker than classic
    text: { color: '#FFFFFF' },
    font: "500 24px 'Avenir Next'",
    padding: { x: 30, y: 15 },
    borderRadius: 4,
    fullWidth: true,
  },
  yellow_pop: {
    background: { color: '#FFE135' },  // yellow
    text: { color: '#000000' },        // black text on yellow
    font: "bold 24px 'Avenir Next'",
    padding: { x: 35, y: 18 },
    borderRadius: 0,
    shadow: { color: 'rgba(0,0,0,0.3)', offsetX: 4, offsetY: 4 },  // hard drop shadow
  },
  mint_fresh: {
    background: { color: '#98FF98' },  // mint green
    text: { color: '#1a1a1a' },        // dark gray text
    font: "bold 24px 'Avenir Next'",
    padding: { x: 30, y: 15 },
    borderRadius: 8,
  },
};
```

### Snapchat Rendering Rules
- Bar spans **full width** of video (edge to edge)
- Text is **horizontally centered**
- Default position: **bottom of frame**, ~100-120px above bottom edge
- Bar height **scales with text** (more text = taller bar)
- Long text **word-wraps** at ~90% of video width
- Font size scales: `renderedSize = baseFontSize * (videoWidth / 1080) * 1.8`
- Explicit `\n` newlines are respected

---

## TIKTOK STYLE CAPTIONS

TikTok captions show **all words at once** with the **current word highlighted** in a different color. Words light up one at a time (karaoke effect).

### Visual Layout
```
 ┌──────────────────────────┐
 │                          │
 │        (video)           │
 │                          │
 │                          │
 │  This is what the        │  ← white text, NO background bar
 │  caption LOOKS like      │  ← "LOOKS" highlighted in yellow
 │                          │
 └──────────────────────────┘
```

### Exact Style Definitions

```js
const TIKTOK_STYLES = {
  classic_yellow: {
    // THE standard TikTok caption look
    highlightColor: '#FFFF00',    // yellow for active word
    baseColor: '#FFFFFF',          // white for other words
    font: 'bold 56px Arial',
    stroke: { color: '#000000', width: 3 },   // black outline
    shadow: { color: 'rgba(0,0,0,0.8)', blur: 4, offsetX: 2, offsetY: 2 },
    wordsPerLine: 4,
  },
  bounce_cyan: {
    highlightColor: '#00FFFF',
    baseColor: '#FFFFFF',
    font: 'bold 52px Arial',
    stroke: { color: '#000000', width: 2 },
    shadow: { color: 'rgba(0,0,0,0.6)', blur: 6, offsetY: 3 },
    wordsPerLine: 3,
  },
  gradient_glow: {
    highlightColor: '#FF1493',     // pink highlight
    baseColor: '#FFFFFF',
    font: 'bold 50px Arial',
    stroke: { color: '#000000', width: 2 },
    shadow: { color: 'rgba(255,20,147,0.5)', blur: 10 },  // pink glow
    wordsPerLine: 4,
  },
  minimal_white: {
    highlightColor: '#FFFFFF',
    baseColor: 'rgba(255,255,255,0.5)',  // dimmed white for inactive
    font: '500 48px Arial',
    stroke: null,                          // no outline
    shadow: { color: 'rgba(0,0,0,0.9)', blur: 8, offsetY: 2 },
    wordsPerLine: 5,
    underline: true,
  },
  neon_green: {
    highlightColor: '#00FF00',
    baseColor: '#FFFFFF',
    font: 'bold 54px Arial',
    stroke: { color: '#003300', width: 2 },  // dark green outline
    shadow: { color: '#00FF00', blur: 15 },  // neon glow
    wordsPerLine: 3,
  },
  fire_red: {
    highlightColor: '#FF4444',
    baseColor: '#FFFFFF',
    font: 'bold 56px Arial',
    stroke: { color: '#000000', width: 3 },
    shadow: { color: 'rgba(255,68,68,0.6)', blur: 8 },  // red glow
    wordsPerLine: 4,
  },
  instagram_clean: {
    highlightColor: '#FFFFFF',
    baseColor: '#FFFFFF',
    font: '500 48px Arial',
    stroke: null,
    shadow: { color: 'rgba(0,0,0,0.4)', blur: 3, offsetY: 1 },  // very subtle
    wordsPerLine: 5,
  },
};
```

### TikTok Rendering Rules
- **No background bar** — text floats over video
- Black stroke/outline (2-4px) + drop shadow for readability
- Words **horizontally centered** as a block
- Default position: **bottom of frame**, ~60px above bottom
- Lines wrap at **3-5 words per line** (per style `wordsPerLine`)
- All lines **visible simultaneously** — highlight moves word to word
- Word highlight speed: **2.5 words/second** default (configurable `wordsPerSecond`)
- `displayMode: 'animated'` = word-by-word highlight (default)
- `displayMode: 'static'` = all words in highlight color, no animation

---

## FFMPEG DRAWTEXT PRESETS (Simple path, no canvas needed)

```js
const CAPTION_PRESETS = {
  snapchat_classic: {
    font: 'Helvetica Neue', fontSize: 44, fontColor: 'white',
    strokeWidth: 0, position: 'bottom', marginBottom: 120,
    boxColor: 'black@0.6', boxBorderW: 540,  // full-width bar
  },
  capcut_default: {
    font: 'Arial', fontSize: 48, fontColor: 'white',
    strokeColor: 'black', strokeWidth: 3,
    shadowColor: 'black@0.5', shadowX: 3, shadowY: 3,
    position: 'bottom', marginBottom: 120,
  },
  capcut_bold: {
    font: 'Arial', fontSize: 56, fontColor: 'white',
    strokeColor: 'black', strokeWidth: 4,
    shadowColor: 'black@0.6', shadowX: 4, shadowY: 4,
    position: 'bottom', marginBottom: 120,
  },
  capcut_minimal: {
    font: 'Arial', fontSize: 42, fontColor: 'white',
    strokeColor: 'black', strokeWidth: 2,
    shadowColor: 'black@0.3', shadowX: 2, shadowY: 2,
    position: 'bottom', marginBottom: 100,
  },
  capcut_top: {
    font: 'Arial', fontSize: 48, fontColor: 'white',
    strokeColor: 'black', strokeWidth: 3,
    shadowColor: 'black@0.5', shadowX: 3, shadowY: 3,
    position: 'top', marginTop: 80,
  },
  capcut_center: {
    font: 'Arial', fontSize: 52, fontColor: 'white',
    strokeColor: 'black', strokeWidth: 4,
    shadowColor: 'black@0.6', shadowX: 4, shadowY: 4,
    position: 'center',
  },
};
```

---

## HOW TO IMPLEMENT IN ANY PROJECT

### Option A: Simplest — FFmpeg drawtext (no dependencies beyond FFmpeg)

```js
import ffmpeg from 'fluent-ffmpeg';

function escapeText(text) {
  return text
    .replace(/\\/g, '\\\\\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

async function addSnapchatCaption(videoPath, outputPath, text) {
  const filter = `drawtext=text='${escapeText(text)}'` +
    `:font='Helvetica Neue'` +
    `:fontsize=44` +
    `:fontcolor=white` +
    `:x=(w-text_w)/2` +
    `:y=h-120-text_h` +
    `:box=1:boxcolor=black@0.6:boxborderw=540`;

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .videoFilters(filter)
      .outputOptions(['-c:a', 'copy'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}
```

### Option B: Canvas rendering (color emoji, gradients, glows)

```js
import { createCanvas } from '@napi-rs/canvas';

function renderSnapchatBar(text, videoWidth, style) {
  const fontSize = Math.round(24 * (videoWidth / 1080) * 1.8);
  const font = `500 ${fontSize}px "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

  // Measure text
  const measureCanvas = createCanvas(100, 100);
  const mCtx = measureCanvas.getContext('2d');
  mCtx.font = font;

  // Word wrap
  const maxWidth = videoWidth * 0.9;
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (mCtx.measureText(test).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Render
  const lineHeight = fontSize * 1.3;
  const padX = Math.round(15 * (videoWidth / 1080) * 1.5);
  const padY = Math.round(6 * (videoWidth / 1080) * 1.5);
  const bgHeight = lines.length * lineHeight + padY * 2;
  const canvas = createCanvas(videoWidth + 4, bgHeight);
  const ctx = canvas.getContext('2d');

  // Background bar
  ctx.fillStyle = style.background?.color || 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, videoWidth + 4, bgHeight);

  // Text
  ctx.font = font;
  ctx.fillStyle = style.text?.color || '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.fillText(line, (videoWidth + 4) / 2, padY + lineHeight / 2 + i * lineHeight);
  });

  return canvas.toBuffer('image/png');
}
```

Then composite with FFmpeg:
```bash
ffmpeg -i video.mp4 -i caption.png \
  -filter_complex "[0:v][1:v]overlay=x=0:y=H-h-100:enable='between(t,0,5)'[vout]" \
  -map "[vout]" -map 0:a? -c:v libx264 -preset fast -crf 23 -c:a copy output.mp4
```

### Option C: Full scene-based (multiple captions with timing)

```js
import { applySceneCaptions } from './services/sceneCaptionService.js';

await applySceneCaptions(videoPath, [
  {
    sceneNumber: 0,
    startTime: 0,
    endTime: 3,
    caption: 'First scene caption',
    style: 'classic_white',
    styleType: 'snapchat',
    position: { x: 0.5, y: 0.8 },
  },
  {
    sceneNumber: 1,
    startTime: 3,
    endTime: 6,
    caption: 'Word by word highlight',
    style: 'classic_yellow',
    styleType: 'tiktok',
    displayMode: 'animated',
  },
], outputPath);
```

---

## SCENE CAPTION FIELD REFERENCE

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `sceneNumber` | number | — | Scene index (0-based) |
| `startTime` | number | — | Start time in seconds |
| `endTime` | number | — | End time in seconds |
| `caption` | string | — | Text to display (supports `\n`) |
| `style` | string | `'classic_white'` | Style preset ID |
| `styleType` | string | `'snapchat'` | `'snapchat'` or `'tiktok'` |
| `position` | object | bottom | `{ x: 0.5, y: 0.8 }` normalized 0-1 |
| `font` | string | style default | `'Inter'`, `'Montserrat'`, `'Bebas Neue'`, `'Poppins'`, `'Bangers'` |
| `fontSize` | number | style default | Base font size in px |
| `fontWeight` | string | style default | `'normal'`, `'bold'`, `'black'` |
| `textColor` | string | style default | Hex: `'#FFFFFF'` |
| `borderColor` | string | style default | Stroke color: `'#000000'` |
| `borderStyle` | string | `'none'` | `'full'` (stroke), `'shadow'`, `'none'` |
| `borderWidth` | number | `8` | Stroke width in px (scales with video width). Snapchat default=8, TikTok default=style's stroke.width or 8 |
| `displayMode` | string | `'animated'` | TikTok: `'animated'` or `'static'` |

---

## PLATFORM SAFE ZONES

```
Instagram:  top=60px  bottom=120px  left=20px  right=20px
TikTok:     top=80px  bottom=150px  left=20px  right=80px  (right has icon bar)
YT Shorts:  top=60px  bottom=100px  left=20px  right=20px
```

Always place captions **inside** these safe zones so they don't overlap platform UI.

---

## FONT FALLBACK CHAIN

1. User-selected font (Inter, Montserrat, Bebas Neue, Poppins, Bangers, etc.)
2. DejaVu Sans (Linux server fallback)
3. Apple Color Emoji / Noto Color Emoji (for emoji rendering)

**Font mapping for servers** (where web fonts aren't available):
```
Snapchat → Inter       (closest to Snapchat Sans)
CapCut   → Inter
Arial    → Inter       (not in Alpine Linux)
```

---

## EMOJI HANDLING

- Color emojis render via `@napi-rs/canvas` Skia + NotoColorEmoji
- Keycap sequences (1️⃣ 2️⃣) → normalize to plain digits
- ASS subtitle path → strip ALL emojis (libass renders them as boxes)

```js
// Strip emoji for ASS/drawtext paths
text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu, '')
```

---

## HOOK / VALUE CAPTION PATTERN

Two-phase caption: "hook" grabs attention in first half, "value" delivers payoff in second half.

```js
// Timing presets
const midpoints = {
  standard:     0.5,  // 50% — default
  early_switch: 0.4,  // 40% — shorter hook
  late_switch:  0.6,  // 60% — longer hook
  quick_hook:   0.3,  // 30% — very short hook
};

// 200ms transition gap between hook and value
const gap = 0.2;
```

---

## EXPRESS API ENDPOINTS (copy-paste ready)

```js
import * as captionStyleService from './services/captionStyleService.js';
import * as captionTemplateService from './services/captionTemplateService.js';
import * as sceneCaptionService from './services/sceneCaptionService.js';

// List styles
app.get('/api/caption-styles', (req, res) => {
  res.json(captionStyleService.getAllStyles());
});

// Preview (returns base64 PNG for snapchat, style info for tiktok)
app.post('/api/caption-preview', async (req, res) => {
  const { text, styleId, styleType } = req.body;
  const preview = await sceneCaptionService.previewCaption(text, styleId, styleType);
  res.json(preview);
});

// Apply captions to video
app.post('/api/apply-captions', async (req, res) => {
  const { videoPath, sceneCaptions, outputPath } = req.body;
  const result = await sceneCaptionService.applySceneCaptions(videoPath, sceneCaptions, outputPath);
  res.json(result);
});

// Template CRUD
app.get('/api/caption-templates', async (req, res) => {
  res.json(await captionTemplateService.getAllTemplates());
});
app.post('/api/caption-templates', async (req, res) => {
  res.json(await captionTemplateService.createTemplate(req.body));
});
app.put('/api/caption-templates/:id', async (req, res) => {
  res.json(await captionTemplateService.updateTemplate(req.params.id, req.body));
});
app.delete('/api/caption-templates/:id', async (req, res) => {
  res.json({ deleted: await captionTemplateService.deleteTemplate(req.params.id) });
});
```

---

## WHEN TO USE WHAT

| Scenario | Use This |
|----------|----------|
| Quick single caption on video | `addSingleCaption()` with `snapchat_classic` preset |
| Hook + payoff text | `addHookValueCaption()` |
| Multiple timed captions | `addTimedCaptions()` |
| Per-scene with different styles | `applySceneCaptions()` |
| TikTok word-by-word animation | `applySceneCaptions()` with `styleType: 'tiktok'` |
| Need color emojis | Canvas path (default when `@napi-rs/canvas` installed) |
| No canvas available | FFmpeg drawtext path (automatic fallback) |
| Pure FFmpeg, no Node.js | Use the raw FFmpeg commands shown above |
