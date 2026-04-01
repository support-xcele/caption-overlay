/**
 * Caption Overlay Service
 *
 * Adds CapCut-style captions to videos using FFmpeg.
 * Supports:
 * - Single caption throughout video
 * - Timed captions at different timestamps
 * - Various styles (bold, minimal, etc.)
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';

// Set FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

/**
 * CapCut-style caption presets
 */
export const CAPTION_PRESETS = {
    // Snapchat-accurate classic caption: semi-transparent black bar, white text
    // Font: Avenir Next / Helvetica Neue, weight 500, rgba(0,0,0,0.6) background
    snapchat_classic: {
        font: 'Helvetica Neue',
        fontSize: 44,
        fontColor: 'white',
        strokeColor: null,
        strokeWidth: 0,
        shadowColor: null,
        shadowX: 0,
        shadowY: 0,
        position: 'bottom',
        marginBottom: 120,
        boxColor: 'black@0.6',
        boxBorderW: 540,  // Full-width bar (extends box to fill width)
    },
    capcut_default: {
        font: 'Arial',
        fontSize: 48,
        fontColor: 'white',
        strokeColor: 'black',
        strokeWidth: 3,
        shadowColor: 'black@0.5',
        shadowX: 3,
        shadowY: 3,
        position: 'bottom',
        marginBottom: 120,
    },
    capcut_bold: {
        font: 'Arial',
        fontSize: 56,
        fontColor: 'white',
        strokeColor: 'black',
        strokeWidth: 4,
        shadowColor: 'black@0.6',
        shadowX: 4,
        shadowY: 4,
        position: 'bottom',
        marginBottom: 120,
    },
    capcut_minimal: {
        font: 'Arial',
        fontSize: 42,
        fontColor: 'white',
        strokeColor: 'black',
        strokeWidth: 2,
        shadowColor: 'black@0.3',
        shadowX: 2,
        shadowY: 2,
        position: 'bottom',
        marginBottom: 100,
    },
    capcut_top: {
        font: 'Arial',
        fontSize: 48,
        fontColor: 'white',
        strokeColor: 'black',
        strokeWidth: 3,
        shadowColor: 'black@0.5',
        shadowX: 3,
        shadowY: 3,
        position: 'top',
        marginTop: 80,
    },
    capcut_center: {
        font: 'Arial',
        fontSize: 52,
        fontColor: 'white',
        strokeColor: 'black',
        strokeWidth: 4,
        shadowColor: 'black@0.6',
        shadowX: 4,
        shadowY: 4,
        position: 'center',
    },
};

/**
 * Get video duration
 */
export async function getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                resolve(metadata.format.duration || 0);
            }
        });
    });
}

/**
 * Escape text for FFmpeg drawtext filter
 */
function escapeText(text) {
    return text
        .replace(/\\/g, '\\\\\\\\')
        .replace(/'/g, "\\'")
        .replace(/:/g, '\\:')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');
}

/**
 * Build drawtext filter for FFmpeg
 */
function buildDrawtextFilter(text, style, duration, startTime = 0, endTime = null) {
    const preset = typeof style === 'string' ? CAPTION_PRESETS[style] : { ...CAPTION_PRESETS.capcut_default, ...style };

    // Calculate Y position
    let yPosition;
    if (preset.position === 'top') {
        yPosition = preset.marginTop || 80;
    } else if (preset.position === 'center') {
        yPosition = '(h-text_h)/2';
    } else {
        // Bottom position (default)
        yPosition = `h-${preset.marginBottom || 120}-text_h`;
    }

    // Build the filter
    let filter = `drawtext=text='${escapeText(text)}'`;
    if (preset.font) {
        filter += `:font='${preset.font}'`;
    }
    filter += `:fontsize=${preset.fontSize}`;
    filter += `:fontcolor=${preset.fontColor}`;
    if (preset.strokeWidth && preset.strokeColor) {
        filter += `:borderw=${preset.strokeWidth}`;
        filter += `:bordercolor=${preset.strokeColor}`;
    }
    if (preset.shadowColor) {
        filter += `:shadowcolor=${preset.shadowColor}`;
        filter += `:shadowx=${preset.shadowX || 0}`;
        filter += `:shadowy=${preset.shadowY || 0}`;
    }
    filter += `:x=(w-text_w)/2`; // Center horizontally
    filter += `:y=${yPosition}`;

    // Box background (for Snapchat-style bar captions)
    if (preset.boxColor) {
        filter += `:box=1:boxcolor=${preset.boxColor}:boxborderw=${preset.boxBorderW || 15}`;
    }

    // Add enable condition for timed captions
    if (endTime !== null) {
        filter += `:enable='between(t,${startTime},${endTime})'`;
    }

    return filter;
}

/**
 * Add a single caption to the entire video
 */
export async function addSingleCaption(videoPath, outputPath, captionText, style = 'capcut_default') {
    const duration = await getVideoDuration(videoPath);

    return new Promise((resolve, reject) => {
        const filter = buildDrawtextFilter(captionText, style, duration);

        ffmpeg(videoPath)
            .videoFilters(filter)
            .outputOptions(['-c:a', 'copy']) // Copy audio without re-encoding
            .output(outputPath)
            .on('start', (cmd) => {
                console.log('FFmpeg command:', cmd);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`Caption overlay: ${progress.percent.toFixed(1)}%`);
                }
            })
            .on('end', () => {
                console.log(`Caption added successfully: ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject(err);
            })
            .run();
    });
}

/**
 * Add hook + value caption (hook first half, value second half)
 */
export async function addHookValueCaption(videoPath, outputPath, hookText, valueText, style = 'capcut_default') {
    const duration = await getVideoDuration(videoPath);
    const midpoint = duration / 2;

    return new Promise((resolve, reject) => {
        const hookFilter = buildDrawtextFilter(hookText, style, duration, 0, midpoint);
        const valueFilter = buildDrawtextFilter(valueText, style, duration, midpoint, duration);

        ffmpeg(videoPath)
            .videoFilters([hookFilter, valueFilter])
            .outputOptions(['-c:a', 'copy'])
            .output(outputPath)
            .on('start', (cmd) => {
                console.log('FFmpeg command:', cmd);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`Caption overlay: ${progress.percent.toFixed(1)}%`);
                }
            })
            .on('end', () => {
                console.log(`Captions added successfully: ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject(err);
            })
            .run();
    });
}

/**
 * Add timed captions to video
 */
export async function addTimedCaptions(videoPath, outputPath, captions, defaultStyle = 'capcut_default') {
    const duration = await getVideoDuration(videoPath);

    return new Promise((resolve, reject) => {
        const filters = captions.map(caption => {
            const style = caption.style || defaultStyle;
            return buildDrawtextFilter(
                caption.text,
                style,
                duration,
                caption.startTime,
                caption.endTime
            );
        });

        ffmpeg(videoPath)
            .videoFilters(filters)
            .outputOptions(['-c:a', 'copy'])
            .output(outputPath)
            .on('start', (cmd) => {
                console.log('FFmpeg command:', cmd);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`Caption overlay: ${progress.percent.toFixed(1)}%`);
                }
            })
            .on('end', () => {
                console.log(`Captions added successfully: ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject(err);
            })
            .run();
    });
}

/**
 * Add multi-line caption with word wrapping
 */
export async function addMultiLineCaption(videoPath, outputPath, lines, style = 'capcut_default') {
    const duration = await getVideoDuration(videoPath);
    const preset = typeof style === 'string' ? CAPTION_PRESETS[style] : { ...CAPTION_PRESETS.capcut_default, ...style };

    return new Promise((resolve, reject) => {
        // Build filters for each line
        const filters = lines.map((line, index) => {
            // Adjust Y position for each line
            const lineHeight = preset.fontSize * 1.3;
            const totalHeight = lines.length * lineHeight;
            const startY = preset.position === 'top'
                ? (preset.marginTop || 80) + index * lineHeight
                : preset.position === 'center'
                    ? `((h-${totalHeight})/2)+${index * lineHeight}`
                    : `h-${preset.marginBottom || 120}-${totalHeight - index * lineHeight}`;

            const customPreset = { ...preset, marginBottom: undefined, marginTop: undefined };

            let filter = `drawtext=text='${escapeText(line)}'`;
            filter += `:fontsize=${customPreset.fontSize}`;
            filter += `:fontcolor=${customPreset.fontColor}`;
            filter += `:borderw=${customPreset.strokeWidth}`;
            filter += `:bordercolor=${customPreset.strokeColor}`;
            filter += `:shadowcolor=${customPreset.shadowColor}`;
            filter += `:shadowx=${customPreset.shadowX}`;
            filter += `:shadowy=${customPreset.shadowY}`;
            filter += `:x=(w-text_w)/2`;
            filter += `:y=${startY}`;

            return filter;
        });

        ffmpeg(videoPath)
            .videoFilters(filters)
            .outputOptions(['-c:a', 'copy'])
            .output(outputPath)
            .on('start', (cmd) => {
                console.log('FFmpeg command:', cmd);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`Caption overlay: ${progress.percent.toFixed(1)}%`);
                }
            })
            .on('end', () => {
                console.log(`Multi-line caption added: ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject(err);
            })
            .run();
    });
}

// Export for testing
export default {
    CAPTION_PRESETS,
    getVideoDuration,
    addSingleCaption,
    addHookValueCaption,
    addTimedCaptions,
    addMultiLineCaption,
};
