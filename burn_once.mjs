import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const ffmpegPath  = req('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = req('@ffprobe-installer/ffprobe').path;
process.env.FFMPEG_PATH  = ffmpegPath;
process.env.FFPROBE_PATH = ffprobePath;
const dir = ffmpegPath.replace(/[/\\][^/\\]+$/, '');
const dir2 = ffprobePath.replace(/[/\\][^/\\]+$/, '');
process.env.PATH = dir + ';' + dir2 + ';' + (process.env.PATH || '');

import * as sceneCaptionService from './services/sceneCaptionService.js';

const meta = await sceneCaptionService.getVideoMetadata('B:\\original_video.mp4');
console.log('Video:', meta.width + 'x' + meta.height, meta.duration.toFixed(2) + 's');

const scenes = [{
  sceneNumber: 0,
  startTime: 0,
  endTime: meta.duration,
  duration: meta.duration,
  caption: 'DM me on Telegram',
  style: 'classic_white',
  styleType: 'snapchat',
  position: { x: 0.5, y: 0.68 },
  fontSize: 24,
}];

console.log('Burning...');
const result = await sceneCaptionService.applySceneCaptions('B:\\original_video.mp4', scenes, 'B:\\caption_output.mp4');
console.log('Done:', JSON.stringify(result));
