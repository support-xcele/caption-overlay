/**
 * Scene Caption Service
 *
 * Manages per-scene captions and applies them to videos using FFmpeg.
 * Supports both Snapchat-style (image overlay) and TikTok-style (word-by-word) captions.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import {
    generateSnapchatCaption,
    generateTikTokSRT,
    generateTikTokASS,
    generateTikTokCaptionCanvas,
    generateTikTokFFmpegFilter,
    resolveFont,
    hexToASS,
    SNAPCHAT_STYLES,
    TIKTOK_STYLES,
} from './captionStyleService.js';

// Get FFmpeg paths
const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';

/**
 * Strip all emoji from text for ASS rendering.
 * Complex emoji (flags, ZWJ sequences) render as □ boxes in libass,
 * so we strip everything — same regex as the Snapchat drawtext path.
 */
function stripProblematicEmoji(text) {
    return text
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// ============================================================================
// VIDEO METADATA
// ============================================================================

/**
 * Get video metadata using FFprobe
 */
export async function getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
        const args = [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            videoPath
        ];

        const proc = spawn(ffprobePath, args);
        let output = '';
        let errorOutput = '';

        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { errorOutput += data.toString(); });

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`FFprobe error: ${errorOutput}`));
                return;
            }

            try {
                const data = JSON.parse(output);
                const videoStream = data.streams?.find(s => s.codec_type === 'video');

                resolve({
                    duration: parseFloat(data.format?.duration || 0),
                    width: videoStream?.width || 1080,
                    height: videoStream?.height || 1920,
                    fps: eval(videoStream?.r_frame_rate || '30/1'),
                });
            } catch (e) {
                reject(new Error(`Failed to parse FFprobe output: ${e.message}`));
            }
        });
    });
}

// ============================================================================
// SNAPCHAT-STYLE CAPTION OVERLAY
// ============================================================================

/**
 * Apply Snapchat-style captions to video
 * Supports two render paths:
 *   1. Canvas (if available): generates PNG overlays composited via FFmpeg overlay filter
 *   2. FFmpeg drawtext (fallback): uses drawtext filter directly with timing
 */
export async function applySnapchatCaptions(videoPath, sceneCaptions, outputPath, options = {}) {
    const tempDir = options.tempDir || path.join(process.cwd(), 'temp', `captions_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
        // Get video metadata
        const metadata = await getVideoMetadata(videoPath);
        const { width, height } = metadata;
        console.log(`   📐 Snapchat captions: video ${width}x${height}, ${sceneCaptions.length} scenes`);

        // Generate captions for each scene — result may be canvas (PNG) or ffmpeg (drawtext)
        const captionResults = [];
        for (const scene of sceneCaptions) {
            if (!scene.caption || scene.caption.trim() === '') continue;

            const captionResult = await generateSnapchatCaption(
                scene.caption,
                scene.style || 'classic_white',
                {
                    videoWidth: width,
                    videoHeight: height,
                    fontName: resolveFont(scene.font),
                    customFontSize: scene.fontSize,
                    textColor: scene.textColor,
                    borderColor: scene.borderColor,
                    borderStyle: scene.borderStyle,
                    borderWidth: scene.borderWidth,
                }
            );

            captionResults.push({
                ...scene,
                result: captionResult,
            });
        }

        if (captionResults.length === 0) {
            console.log('   ⚠️ No Snapchat caption text found, copying video as-is');
            fs.copyFileSync(videoPath, outputPath);
            return { success: true, outputPath };
        }

        // Check which render path to use (all results will be the same type)
        const renderType = captionResults[0].result.type;
        console.log(`   🎨 Snapchat render path: ${renderType}`);

        if (renderType === 'canvas') {
            return applySnapchatCaptionsCanvas(videoPath, captionResults, outputPath, options, tempDir, width, height);
        } else {
            return applySnapchatCaptionsDrawtext(videoPath, captionResults, outputPath, options, tempDir, width, height);
        }

    } catch (error) {
        throw error;
    }
}

/**
 * Snapchat captions via Canvas PNG overlay (when canvas module is available)
 */
function applySnapchatCaptionsCanvas(videoPath, captionResults, outputPath, options, tempDir, width, height) {
    // Write PNG images and build overlay filter
    const captionImages = [];
    for (const cap of captionResults) {
        const imagePath = path.join(tempDir, `caption_${cap.sceneNumber}.png`);
        fs.writeFileSync(imagePath, cap.result.buffer);
        captionImages.push({
            ...cap,
            imagePath,
            imageWidth: cap.result.width,
            imageHeight: cap.result.height,
        });
    }

    const filterParts = [];
    const inputArgs = ['-i', videoPath];

    for (const cap of captionImages) {
        inputArgs.push('-i', cap.imagePath);
    }

    let lastOutput = '[0:v]';
    for (let i = 0; i < captionImages.length; i++) {
        const cap = captionImages[i];
        const inputLabel = `[${i + 1}:v]`;
        const outputLabel = i === captionImages.length - 1 ? '[vout]' : `[v${i}]`;

        let posX, posY;
        if (cap.position && typeof cap.position.x === 'number' && typeof cap.position.y === 'number') {
            posX = `(${Math.round(cap.position.x * width)}-overlay_w/2)`;
            // Match editor preview: top = (y - 0.04) * containerHeight
            posY = Math.round((cap.position.y - 0.04) * height);
            posY = Math.max(10, Math.min(posY, height - cap.imageHeight - 10));
        } else {
            posX = -2;  // Start at -2 to account for canvas bleed (ensures edge-to-edge)
            posY = options.position === 'top' ? 60 : height - cap.imageHeight - 100;
        }

        const enable = `between(t,${cap.startTime},${cap.endTime})`;
        console.log(`   🖼️ Snapchat overlay: PNG=${cap.imageWidth}x${cap.imageHeight}, pos=(${posX}, ${posY}), enable=${enable}, caption="${cap.caption?.substring(0, 30)}"`);
        filterParts.push(
            `${lastOutput}${inputLabel}overlay=x=${posX}:y=${posY}:enable='${enable}'${outputLabel}`
        );
        lastOutput = outputLabel;
    }

    return new Promise((resolve, reject) => {
        const args = [
            ...inputArgs,
            '-filter_complex', filterParts.join(';'),
            '-map', '[vout]',
            '-map', '0:a?',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'copy',
            '-y',
            outputPath
        ];

        console.log('🎬 Applying Snapchat captions (canvas overlay)...');
        const proc = spawn(ffmpegPath, args);
        let errorOutput = '';

        proc.stderr.on('data', (data) => { errorOutput += data.toString(); });

        proc.on('close', (code) => {
            captionImages.forEach(cap => {
                try { fs.unlinkSync(cap.imagePath); } catch (e) { }
            });

            if (code !== 0) {
                reject(new Error(`FFmpeg error: ${errorOutput}`));
                return;
            }
            resolve({ success: true, outputPath });
        });
    });
}

/**
 * Snapchat captions via FFmpeg drawtext filter (when canvas is NOT available)
 */
function applySnapchatCaptionsDrawtext(videoPath, captionResults, outputPath, options, tempDir, width, height) {
    // Build drawtext filter chain with timing for each scene
    const drawtextFilters = [];

    for (const cap of captionResults) {
        // The result.filter is already a complete drawtext=... string
        // Add enable timing to restrict it to this scene's time range
        const baseFilter = cap.result.filter;
        const enable = `between(t\\,${cap.startTime}\\,${cap.endTime})`;
        drawtextFilters.push(`${baseFilter}:enable='${enable}'`);
        console.log(`   ✏️ Snapchat scene ${cap.sceneNumber}: "${cap.caption.substring(0, 40)}" [${cap.startTime}s-${cap.endTime}s]`);
    }

    // If user provided a normalized position, override the y position in each filter
    for (let i = 0; i < captionResults.length; i++) {
        const cap = captionResults[i];
        if (cap.position && typeof cap.position.y === 'number') {
            const yPixel = Math.round(cap.position.y * height);
            // Replace the y= parameter in the drawtext filter
            drawtextFilters[i] = drawtextFilters[i].replace(/y=[^:]+/, `y=${yPixel}`);
        }
    }

    const filterChain = drawtextFilters.join(',');

    return new Promise((resolve, reject) => {
        const args = [
            '-i', videoPath,
            '-vf', filterChain,
            '-map', '0:v:0', '-map', '0:a:0?',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'aac', '-b:a', '128k',
            '-movflags', '+faststart',
            '-y',
            outputPath
        ];

        console.log(`   🎬 Applying Snapchat captions (drawtext)...`);
        console.log(`   🎬 FFmpeg filter: ${filterChain.substring(0, 200)}...`);

        const proc = spawn(ffmpegPath, args);
        let errorOutput = '';

        proc.stderr.on('data', (data) => { errorOutput += data.toString(); });

        proc.on('close', (code) => {
            if (errorOutput.includes('Error') || errorOutput.includes('error')) {
                console.log(`   ⚠️ FFmpeg stderr (errors): ${errorOutput.split('\n').filter(l => l.toLowerCase().includes('error')).join('; ')}`);
            }

            if (code !== 0) {
                console.error(`   ❌ FFmpeg Snapchat caption error (code ${code}): ${errorOutput.substring(0, 500)}`);
                reject(new Error(`FFmpeg error (code ${code}): ${errorOutput.substring(0, 200)}`));
                return;
            }

            const outSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
            console.log(`   ✅ Snapchat caption overlay complete: ${outputPath} (${(outSize / 1024 / 1024).toFixed(1)}MB)`);
            resolve({ success: true, outputPath });
        });
    });
}

// ============================================================================
// TIKTOK-STYLE CAPTION OVERLAY
// ============================================================================

/**
 * Apply TikTok-style word-by-word captions using canvas PNG overlays.
 * Renders each word-highlight state as a PNG via @napi-rs/canvas (Skia),
 * which supports color emojis natively via NotoColorEmoji.
 */
export async function applyTikTokCaptions(videoPath, sceneCaptions, outputPath, options = {}) {
    const tempDir = options.tempDir || path.join(process.cwd(), 'temp', `captions_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
        const metadata = await getVideoMetadata(videoPath);
        console.log(`   📐 Video: ${metadata.width}x${metadata.height}, ${metadata.duration.toFixed(1)}s`);

        // Generate canvas PNGs for all scenes
        const allPngs = []; // { imagePath, startTime, endTime }
        let hasContent = false;
        let pngIdx = 0;

        for (const scene of sceneCaptions) {
            if (!scene.caption || scene.caption.trim() === '') {
                console.log(`   ⏭️ Scene ${scene.sceneNumber}: empty caption, skipping`);
                continue;
            }

            // Calculate marginV from position (always in actual pixels)
            let marginV = Math.round(60 * (metadata.width / 1080));
            if (scene.position && typeof scene.position.y === 'number') {
                const marginFromBottom = Math.round((1 - scene.position.y) * metadata.height);
                marginV = Math.max(20, Math.min(marginFromBottom, metadata.height - 100));
            }

            // Generate PNGs via canvas (supports color emojis)
            const pngs = generateTikTokCaptionCanvas(
                scene.caption,
                scene.style || 'classic_yellow',
                {
                    startTime: scene.startTime,
                    duration: scene.duration || (scene.endTime - scene.startTime),
                    wordsPerSecond: options.wordsPerSecond || 2.5,
                    videoWidth: metadata.width,
                    videoHeight: metadata.height,
                    marginV,
                    displayMode: scene.displayMode || 'animated',
                    font: scene.font,
                    fontSize: scene.fontSize,
                    fontWeight: scene.fontWeight,
                    textColor: scene.textColor,
                    borderColor: scene.borderColor,
                    borderStyle: scene.borderStyle,
                    borderWidth: scene.borderWidth,
                }
            );

            // Write PNGs to temp directory
            for (const png of pngs) {
                const imagePath = path.join(tempDir, `tiktok_${pngIdx}.png`);
                fs.writeFileSync(imagePath, png.buffer);
                allPngs.push({ imagePath, startTime: png.startTime, endTime: png.endTime });
                pngIdx++;
            }

            hasContent = true;
            console.log(`   ✏️ Scene ${scene.sceneNumber}: "${scene.caption.substring(0, 40)}" → ${pngs.length} PNGs`);
        }

        if (!hasContent) {
            console.log('   ⚠️ No caption text found, copying video as-is');
            fs.copyFileSync(videoPath, outputPath);
            return { success: true, outputPath };
        }

        console.log(`   🎨 Total TikTok caption PNGs: ${allPngs.length}`);

        // Build FFmpeg overlay filter chain (same pattern as Snapchat canvas)
        const inputArgs = ['-i', videoPath];
        for (const png of allPngs) {
            inputArgs.push('-i', png.imagePath);
        }

        const filterParts = [];
        let lastOutput = '[0:v]';
        for (let i = 0; i < allPngs.length; i++) {
            const png = allPngs[i];
            const inputLabel = `[${i + 1}:v]`;
            const outputLabel = i === allPngs.length - 1 ? '[vout]' : `[v${i}]`;
            const enable = `between(t,${png.startTime.toFixed(3)},${png.endTime.toFixed(3)})`;
            filterParts.push(
                `${lastOutput}${inputLabel}overlay=x=0:y=0:enable='${enable}'${outputLabel}`
            );
            lastOutput = outputLabel;
        }

        return new Promise((resolve, reject) => {
            const args = [
                ...inputArgs,
                '-filter_complex', filterParts.join(';'),
                '-map', '[vout]',
                '-map', '0:a?',
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-c:a', 'copy',
                '-movflags', '+faststart',
                '-y',
                outputPath
            ];

            console.log(`   🎬 Applying TikTok captions (canvas overlay, ${allPngs.length} PNGs)...`);

            const proc = spawn(ffmpegPath, args);
            let errorOutput = '';

            proc.stderr.on('data', (data) => { errorOutput += data.toString(); });

            proc.on('close', (code) => {
                // Cleanup PNGs only (don't rm tempDir — it may contain the output file)
                for (const png of allPngs) {
                    try { fs.unlinkSync(png.imagePath); } catch (e) { }
                }

                if (code !== 0) {
                    console.error(`   ❌ FFmpeg exit code ${code}`);
                    console.error(`   ❌ FFmpeg stderr: ${errorOutput.substring(0, 500)}`);
                    reject(new Error(`FFmpeg error (code ${code}): ${errorOutput.substring(0, 200)}`));
                    return;
                }

                const outSize = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
                console.log(`   ✅ TikTok caption overlay complete: ${outputPath} (${(outSize / 1024 / 1024).toFixed(1)}MB)`);
                resolve({ success: true, outputPath });
            });
        });

    } catch (error) {
        // Only clean up PNG files, not the entire tempDir (it may contain the output)
        for (const png of allPngs || []) {
            try { fs.unlinkSync(png.imagePath); } catch (e) { }
        }
        throw error;
    }
}

// ============================================================================
// UNIFIED CAPTION APPLICATION
// ============================================================================

/**
 * Apply captions to video (auto-selects method based on style type)
 */
export async function applySceneCaptions(videoPath, sceneCaptions, outputPath, options = {}) {
    // Use styleType from first scene with actual caption text (empty scenes may have stale defaults)
    const firstWithText = sceneCaptions.find(s => s.caption && s.caption.trim() !== '');
    const styleType = firstWithText?.styleType || sceneCaptions[0]?.styleType || 'snapchat';

    if (styleType === 'tiktok') {
        return applyTikTokCaptions(videoPath, sceneCaptions, outputPath, options);
    } else {
        return applySnapchatCaptions(videoPath, sceneCaptions, outputPath, options);
    }
}

/**
 * Apply single caption to entire video
 */
export async function applySingleCaption(videoPath, caption, style, outputPath, options = {}) {
    const metadata = await getVideoMetadata(videoPath);

    const sceneCaptions = [{
        sceneNumber: 0,
        startTime: 0,
        endTime: metadata.duration,
        duration: metadata.duration,
        caption: caption,
        style: style,
        styleType: options.styleType || 'snapchat',
    }];

    return applySceneCaptions(videoPath, sceneCaptions, outputPath, options);
}

/**
 * Preview caption (returns base64 image)
 */
export async function previewCaption(text, styleId, styleType = 'snapchat') {
    if (styleType === 'snapchat') {
        const result = await generateSnapchatCaption(text, styleId);
        return {
            type: 'image',
            data: `data:image/png;base64,${result.buffer.toString('base64')}`,
            width: result.width,
            height: result.height,
        };
    } else {
        // For TikTok, return style info (can't easily preview animation)
        const style = TIKTOK_STYLES[styleId] || TIKTOK_STYLES.classic_yellow;
        return {
            type: 'info',
            style: style,
            highlightColor: style.highlightColor,
            animation: style.animation,
        };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    getVideoMetadata,
    applySnapchatCaptions,
    applyTikTokCaptions,
    applySceneCaptions,
    applySingleCaption,
    previewCaption,
};
