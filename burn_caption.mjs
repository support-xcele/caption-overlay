/**
 * CLI: node burn_caption.mjs <input> <output> <caption> [yPercent] [styleId]
 * Used by edit_pipeline.py to burn a single caption onto a video.
 */
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const ffmpegPath  = req('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = req('@ffprobe-installer/ffprobe').path;
process.env.FFMPEG_PATH  = ffmpegPath;
process.env.FFPROBE_PATH = ffprobePath;
const ffDir  = ffmpegPath.replace(/[/\\][^/\\]+$/, '');
const fpDir  = ffprobePath.replace(/[/\\][^/\\]+$/, '');
process.env.PATH = ffDir + ';' + fpDir + ';' + (process.env.PATH || '');

import * as sceneCaptionService from './services/sceneCaptionService.js';

import { readFileSync } from 'fs';

const [,, inputPath, outputPath, captionArg, yPctStr, styleId] = process.argv;

if (!inputPath || !outputPath || !captionArg) {
  console.error('Usage: node burn_caption.mjs <input> <output> <caption|@file> [yPercent=72] [styleId=classic_white]');
  process.exit(1);
}

// Support @filename to read caption from file (avoids CLI encoding issues with emoji)
const captionText = captionArg.startsWith('@')
  ? readFileSync(captionArg.slice(1), 'utf8').trim()
  : captionArg;

const yPct    = parseFloat(yPctStr || '72') / 100;
const style   = styleId || 'classic_white';

const meta = await sceneCaptionService.getVideoMetadata(inputPath);

const scenes = [{
  sceneNumber: 0,
  startTime: 0,
  endTime: meta.duration,
  duration: meta.duration,
  caption: captionText,
  style,
  styleType: 'snapchat',
  position: { x: 0.5, y: yPct },
  fontSize: 24,
}];

const result = await sceneCaptionService.applySceneCaptions(inputPath, scenes, outputPath);

if (result.success) {
  console.log('OK');
} else {
  console.error('FAILED');
  process.exit(1);
}
