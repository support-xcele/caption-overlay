import express from 'express';
import { execSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import * as captionStyleService from './services/captionStyleService.js';
import * as sceneCaptionService from './services/sceneCaptionService.js';
import * as captionTemplateService from './services/captionTemplateService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'ui')));

const SOURCE_VIDEO = 'B:\\original_video.mp4';
const TMP = path.join(__dirname, 'tmp');
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

// FFmpeg paths set by start.js before this module loads
const FFMPEG  = process.env.FFMPEG_PATH;
const FFPROBE = process.env.FFPROBE_PATH;
console.log('FFMPEG:', FFMPEG);

// ── GET /api/caption-styles ──────────────────────────────────────────────────
app.get('/api/caption-styles', (req, res) => {
  try {
    const styles = captionStyleService.getAllStyles();
    res.json(styles);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/caption-templates ───────────────────────────────────────────────
app.get('/api/caption-templates', async (req, res) => {
  try {
    const templates = await captionTemplateService.getAllTemplates();
    res.json(templates);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/caption-templates ──────────────────────────────────────────────
app.post('/api/caption-templates', async (req, res) => {
  try {
    const template = await captionTemplateService.createTemplate(req.body);
    res.json({ success: true, template });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/caption-preview ────────────────────────────────────────────────
// Returns a base64 PNG of the caption bar (no video background)
app.post('/api/caption-preview', async (req, res) => {
  const { text, styleId, styleType } = req.body;
  try {
    const preview = await sceneCaptionService.previewCaption(
      text || 'DM me on Telegram',
      styleId || 'classic_white',
      styleType || 'snapchat'
    );
    res.json(preview);
  } catch (e) {
    console.error('Preview error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/preview-frame ──────────────────────────────────────────────────
// Returns a JPEG frame of the video with caption burned in for live preview
app.post('/api/preview-frame', async (req, res) => {
  const { text, styleId, styleType, seekTime, yPercent, fontSize, position, trimStart } = req.body;

  const frameIn  = path.join(TMP, `frame_in_${Date.now()}.mp4`);
  const frameOut = path.join(TMP, `frame_out_${Date.now()}.jpg`);

  try {
    // Extract a short 0.1s clip at seekTime for captioning
    const seek = seekTime || 1;
    execSync(`"${FFMPEG}" -y -ss ${seek} -i "${SOURCE_VIDEO}" -t 0.1 -c copy "${frameIn}"`, { timeout: 10000, stdio: 'pipe' });

    // Apply caption using real service
    const metadata = await sceneCaptionService.getVideoMetadata(frameIn);
    const vidH = metadata.height || 1820;
    let yNorm;
    if (position === 'top')         yNorm = 0.08;
    else if (position === 'center') yNorm = 0.45;
    else                             yNorm = (yPercent || 68) / 100;

    const captionedClip = path.join(TMP, `captioned_${Date.now()}.mp4`);
    const sceneCaptions = [{
      sceneNumber: 0,
      startTime: 0,
      endTime: metadata.duration,
      duration: metadata.duration,
      caption: text || 'DM me on Telegram',
      style: styleId || 'classic_white',
      styleType: styleType || 'snapchat',
      position: { x: 0.5, y: yNorm },
      fontSize: fontSize || 28,
    }];

    await sceneCaptionService.applySceneCaptions(frameIn, sceneCaptions, captionedClip);

    // Extract single frame as JPEG
    execSync(`"${FFMPEG}" -y -i "${captionedClip}" -frames:v 1 -q:v 2 "${frameOut}"`, { timeout: 10000, stdio: 'pipe' });

    const img = readFileSync(frameOut);
    res.set('Content-Type', 'image/jpeg');
    res.send(img);

    // Cleanup
    [frameIn, captionedClip, frameOut].forEach(f => { try { unlinkSync(f); } catch {} });
  } catch (e) {
    console.error('Preview frame error:', e.message);
    // Cleanup on error too
    [frameIn, frameOut].forEach(f => { try { unlinkSync(f); } catch {} });
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/burn ───────────────────────────────────────────────────────────
// Burns captions into full video and streams back for download
app.post('/api/burn', async (req, res) => {
  const { text, styleId, styleType, yPercent, fontSize, position, trimStart } = req.body;
  const outVideo = path.join(TMP, `output_${Date.now()}.mp4`);
  const trimmedInput = path.join(TMP, `trimmed_${Date.now()}.mp4`);

  try {
    // Trim leading silence if requested
    const trim = trimStart || 0;
    if (trim > 0) {
      execSync(`"${FFMPEG}" -y -ss ${trim} -i "${SOURCE_VIDEO}" -c copy "${trimmedInput}"`, { timeout: 30000, stdio: 'pipe' });
    } else {
      execSync(`"${FFMPEG}" -y -i "${SOURCE_VIDEO}" -c copy "${trimmedInput}"`, { timeout: 30000, stdio: 'pipe' });
    }

    const metadata = await sceneCaptionService.getVideoMetadata(trimmedInput);

    let yNorm;
    if (position === 'top')         yNorm = 0.08;
    else if (position === 'center') yNorm = 0.45;
    else                             yNorm = (yPercent || 68) / 100;

    const sceneCaptions = [{
      sceneNumber: 0,
      startTime: 0,
      endTime: metadata.duration,
      duration: metadata.duration,
      caption: text || 'DM me on Telegram',
      style: styleId || 'classic_white',
      styleType: styleType || 'snapchat',
      position: { x: 0.5, y: yNorm },
      fontSize: fontSize || 28,
    }];

    await sceneCaptionService.applySceneCaptions(trimmedInput, sceneCaptions, outVideo);

    const video = readFileSync(outVideo);
    res.set('Content-Type', 'video/mp4');
    res.set('Content-Disposition', `attachment; filename="edited_${Date.now()}.mp4"`);
    res.send(video);

    // Cleanup
    [trimmedInput, outVideo].forEach(f => { try { unlinkSync(f); } catch {} });
  } catch (e) {
    console.error('Burn error:', e.message);
    [trimmedInput, outVideo].forEach(f => { try { unlinkSync(f); } catch {} });
    res.status(500).json({ error: e.message });
  }
});

app.listen(3456, () => {
  console.log('Caption server running at http://localhost:3456');
});
