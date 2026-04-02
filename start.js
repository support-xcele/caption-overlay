// Entry point: set FFmpeg paths in PATH before loading services
import { createRequire } from 'module';
const req = createRequire(import.meta.url);

try {
  const ffmpegPath  = req('@ffmpeg-installer/ffmpeg').path;
  const ffprobePath = req('@ffprobe-installer/ffprobe').path;
  process.env.FFMPEG_PATH  = ffmpegPath;
  process.env.FFPROBE_PATH = ffprobePath;
  const ffmpegDir  = ffmpegPath.replace(/[/\\][^/\\]+$/, '');
  const ffprobeDir = ffprobePath.replace(/[/\\][^/\\]+$/, '');
  process.env.PATH = ffmpegDir + ';' + ffprobeDir + ';' + (process.env.PATH || '');
  console.log('FFmpeg:', ffmpegPath);
  console.log('FFprobe:', ffprobePath);
} catch(e) {
  const base = 'C:\\Users\\igsup\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1-full_build\\bin';
  process.env.FFMPEG_PATH  = base + '\\ffmpeg.exe';
  process.env.FFPROBE_PATH = base + '\\ffprobe.exe';
  process.env.PATH = base + ';' + (process.env.PATH || '');
  console.log('Using winget FFmpeg');
}

await import('./server.js');
