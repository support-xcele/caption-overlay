/**
 * Caption Style Service
 *
 * Provides Snapchat-style and TikTok-style caption rendering.
 * Uses FFmpeg drawtext filter for portability (no native dependencies).
 * Canvas support is optional for advanced styling.
 */

import fs from 'fs';
import path from 'path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { readdirSync } from 'fs';

// Register system fonts with explicit family names
// (variable font TTFs often embed unexpected names that don't match CSS family names)
const FONT_NAME_OVERRIDES = {
    'AppleColorEmoji': 'Apple Color Emoji',
    'Inter': 'Inter',
    'NunitoSans': 'Nunito Sans',
    'Montserrat': 'Montserrat',
    'Oswald': 'Oswald',
    'Poppins': 'Poppins',
    'BebasNeue': 'Bebas Neue',
    'Anton': 'Anton',
    'Bangers': 'Bangers',
    'PermanentMarker': 'Permanent Marker',
    'Pacifico': 'Pacifico',
    'Righteous': 'Righteous',
    'Lobster': 'Lobster',
};
try {
    const fontDirs = ['/usr/share/fonts/google', '/usr/share/fonts/noto', '/usr/share/fonts/dejavu'];
    for (const dir of fontDirs) {
        try {
            for (const file of readdirSync(dir)) {
                if (file.endsWith('.ttf')) {
                    const fontPath = path.join(dir, file);
                    const baseName = file.replace(/-.*\.ttf$|\.ttf$/, '');
                    const overrideName = FONT_NAME_OVERRIDES[baseName];
                    if (overrideName) {
                        GlobalFonts.registerFromPath(fontPath, overrideName);
                    } else {
                        GlobalFonts.registerFromPath(fontPath);
                    }
                }
            }
        } catch (e) { /* dir may not exist locally */ }
    }
    const families = GlobalFonts.families.map(f => f.family).join(', ');
    console.log('✅ @napi-rs/canvas fonts:', families);
} catch (e) {
    console.log('ℹ️ Font registration skipped:', e.message);
}

// ============================================================================
// SNAPCHAT-STYLE CAPTION PRESETS
// ============================================================================

// Snapchat uses a proprietary font "Snapchat Sans" (replaced Avenir in 2016).
// Best CSS fallback stack: Avenir Next > Helvetica Neue > Helvetica > Arial
const SNAP_FONT = "500 24px 'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SNAP_FONT_BOLD = "bold 24px 'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export const SNAPCHAT_STYLES = {
    // The real Snapchat classic caption: semi-transparent black bar, white text, full width
    classic_white: {
        id: 'classic_white',
        name: 'Classic Snapchat',
        background: { color: 'rgba(0, 0, 0, 0.6)', blur: 0 },
        text: { color: '#FFFFFF', font: SNAP_FONT, align: 'center' },
        padding: { x: 15, y: 6 },
        borderRadius: 0,
        shadow: null,
        fullWidth: true,
    },
    neon_pink: {
        id: 'neon_pink',
        name: 'Neon Pink',
        background: { color: '#FF1493', blur: 0 },
        text: { color: '#FFFFFF', font: SNAP_FONT_BOLD, align: 'center' },
        padding: { x: 30, y: 15 },
        borderRadius: 8,
        shadow: { color: '#FF1493', blur: 20, offsetX: 0, offsetY: 0 },
        glow: true,
    },
    story_blue: {
        id: 'story_blue',
        name: 'Story Blue',
        background: { gradient: ['#667eea', '#764ba2'], blur: 0 },
        text: { color: '#FFFFFF', font: SNAP_FONT_BOLD, align: 'center' },
        padding: { x: 30, y: 15 },
        borderRadius: 12,
        shadow: { color: 'rgba(0,0,0,0.3)', blur: 10, offsetX: 0, offsetY: 4 },
    },
    fire_orange: {
        id: 'fire_orange',
        name: 'Fire Orange',
        background: { color: '#FF6B35', blur: 0 },
        text: { color: '#FFFFFF', font: SNAP_FONT_BOLD, align: 'center' },
        padding: { x: 30, y: 15 },
        borderRadius: 8,
        shadow: null,
    },
    mint_fresh: {
        id: 'mint_fresh',
        name: 'Mint Fresh',
        background: { color: '#98FF98', blur: 0 },
        text: { color: '#1a1a1a', font: SNAP_FONT_BOLD, align: 'center' },
        padding: { x: 30, y: 15 },
        borderRadius: 8,
        shadow: null,
    },
    dark_mode: {
        id: 'dark_mode',
        name: 'Dark Mode',
        background: { color: 'rgba(0, 0, 0, 0.75)', blur: 10 },
        text: { color: '#FFFFFF', font: SNAP_FONT, align: 'center' },
        padding: { x: 30, y: 15 },
        borderRadius: 4,
        shadow: null,
        fullWidth: true,
    },
    yellow_pop: {
        id: 'yellow_pop',
        name: 'Yellow Pop',
        background: { color: '#FFE135', blur: 0 },
        text: { color: '#000000', font: SNAP_FONT_BOLD, align: 'center' },
        padding: { x: 35, y: 18 },
        borderRadius: 0,
        shadow: { color: 'rgba(0,0,0,0.3)', blur: 0, offsetX: 4, offsetY: 4 },
    },
    purple_dream: {
        id: 'purple_dream',
        name: 'Purple Dream',
        background: { gradient: ['#8B5CF6', '#EC4899'], blur: 0 },
        text: { color: '#FFFFFF', font: SNAP_FONT_BOLD, align: 'center' },
        padding: { x: 30, y: 15 },
        borderRadius: 20,
        shadow: { color: 'rgba(139, 92, 246, 0.5)', blur: 15, offsetX: 0, offsetY: 0 },
        glow: true,
    },
};

// ============================================================================
// TIKTOK-STYLE CAPTION PRESETS
// ============================================================================

export const TIKTOK_STYLES = {
    classic_yellow: {
        id: 'classic_yellow',
        name: 'Classic Yellow',
        highlightColor: '#FFFF00',
        baseColor: '#FFFFFF',
        font: 'bold 56px Arial',
        stroke: { color: '#000000', width: 3 },
        shadow: { color: 'rgba(0,0,0,0.8)', blur: 4, offsetX: 2, offsetY: 2 },
        animation: 'pop', // pop, bounce, fade, slide, scale
        wordsPerLine: 4,
    },
    bounce_cyan: {
        id: 'bounce_cyan',
        name: 'Bounce Cyan',
        highlightColor: '#00FFFF',
        baseColor: '#FFFFFF',
        font: 'bold 52px Arial',
        stroke: { color: '#000000', width: 2 },
        shadow: { color: 'rgba(0,0,0,0.6)', blur: 6, offsetX: 0, offsetY: 3 },
        animation: 'bounce',
        wordsPerLine: 3,
    },
    gradient_glow: {
        id: 'gradient_glow',
        name: 'Gradient Glow',
        highlightGradient: ['#FF1493', '#8B5CF6'],
        baseColor: '#FFFFFF',
        font: 'bold 50px Arial',
        stroke: { color: '#000000', width: 2 },
        shadow: { color: 'rgba(255,20,147,0.5)', blur: 10, offsetX: 0, offsetY: 0 },
        animation: 'fade',
        wordsPerLine: 4,
        glow: true,
    },
    minimal_white: {
        id: 'minimal_white',
        name: 'Minimal White',
        highlightColor: '#FFFFFF',
        baseColor: 'rgba(255,255,255,0.5)',
        font: '500 48px Arial',
        stroke: null,
        shadow: { color: 'rgba(0,0,0,0.9)', blur: 8, offsetX: 0, offsetY: 2 },
        animation: 'slide',
        wordsPerLine: 5,
        underline: true,
    },
    neon_green: {
        id: 'neon_green',
        name: 'Neon Green',
        highlightColor: '#00FF00',
        baseColor: '#FFFFFF',
        font: 'bold 54px Arial',
        stroke: { color: '#003300', width: 2 },
        shadow: { color: '#00FF00', blur: 15, offsetX: 0, offsetY: 0 },
        animation: 'scale',
        wordsPerLine: 3,
        glow: true,
    },
    fire_red: {
        id: 'fire_red',
        name: 'Fire Red',
        highlightColor: '#FF4444',
        baseColor: '#FFFFFF',
        font: 'bold 56px Arial',
        stroke: { color: '#000000', width: 3 },
        shadow: { color: 'rgba(255,68,68,0.6)', blur: 8, offsetX: 0, offsetY: 0 },
        animation: 'pop',
        wordsPerLine: 4,
    },
    instagram_clean: {
        id: 'instagram_clean',
        name: 'IG Clean',
        highlightColor: '#FFFFFF',
        baseColor: '#FFFFFF',
        font: '500 48px Arial',
        stroke: null,
        shadow: { color: 'rgba(0,0,0,0.4)', blur: 3, offsetX: 0, offsetY: 1 },
        animation: 'fade',
        wordsPerLine: 5,
    },
};

// ============================================================================
// FONT MAPPING (CSS font names → system font names for ASS/FFmpeg)
// ============================================================================

const FONT_MAP = {
    'Snapchat': 'Inter',        // Snapchat Sans is proprietary — Inter is closest match
    'CapCut': 'Inter',           // CapCut uses a custom font — Inter is closest
    'Inter': 'Inter',
    'Nunito Sans': 'Nunito Sans',
    'Montserrat': 'Montserrat',
    'Bebas Neue': 'Bebas Neue',
    'Oswald': 'Oswald',
    'Poppins': 'Poppins',
    'Bangers': 'Bangers',
    'Permanent Marker': 'Permanent Marker',
    'Pacifico': 'Pacifico',
    'Anton': 'Anton',
    'Righteous': 'Righteous',
    'Lobster': 'Lobster',
    'Arial': 'Inter',            // Arial not available in Alpine — Inter is closest
};

/**
 * Resolve a user-selected font name to a system font name for ASS rendering
 */
export function resolveFont(fontName) {
    return FONT_MAP[fontName] || 'DejaVu Sans';
}

/**
 * Normalize keycap emoji sequences (1️⃣ 2️⃣ etc.) back to plain characters.
 * Canvas fonts typically can't render the combining enclosing keycap (U+20E3),
 * which causes digits to disappear or leave gaps in rendered output.
 */
function normalizeKeycapEmoji(text) {
    // Match digit/# /* + optional FE0F + 20E3 → replace with just the digit/char
    return text.replace(/([0-9#*])\uFE0F?\u20E3/gu, '$1');
}

// ============================================================================
// CANVAS RENDERING FUNCTIONS
// ============================================================================

/**
 * Draw a rounded rectangle
 */
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Generate a Snapchat-style caption
 * Returns either a Canvas buffer (if available) or FFmpeg drawtext parameters
 */
export async function generateSnapchatCaption(text, styleId, options = {}) {
    const style = SNAPCHAT_STYLES[styleId] || SNAPCHAT_STYLES.classic_white;
    const videoWidth = options.videoWidth || 1080;
    const videoHeight = options.videoHeight || 1920;

    // Always use Canvas for image-based captions (supports color emojis via Skia)
    return generateSnapchatCaptionCanvas(text, style, videoWidth, options);
}

/**
 * Generate Snapchat caption using Canvas (image overlay)
 */
async function generateSnapchatCaptionCanvas(text, style, videoWidth, options = {}) {
    text = normalizeKeycapEmoji(text);
    const isFullWidth = true;  // All Snapchat captions use full-width bar
    const maxWidth = options.maxWidth || videoWidth * 0.9;

    // Scale font size relative to video width (base: 24px at 1080px)
    // Factor 1.8 matches CaptionEditor.tsx preview scaling (baseFontSize * 1.8 * previewScale)
    const baseFontSize = options.customFontSize || parseInt(style.text.font.match(/(\d+)px/)?.[1] || 24);
    const scaledFontSize = Math.round(baseFontSize * (videoWidth / 1080) * 1.8);
    console.log(`   📝 Snapchat canvas: text="${text}", baseFontSize=${baseFontSize}, scaledFontSize=${scaledFontSize}, videoWidth=${videoWidth}, customFontSize=${options.customFontSize}, textColor=${options.textColor}, borderStyle=${options.borderStyle}`);
    // Use resolved font from options (DejaVu Sans for Snapchat mode), fallback to DejaVu Sans
    const fontName = options.fontName || 'DejaVu Sans';
    // Extract actual font weight from style string (supports "500", "bold", "normal")
    const fontWeightMatch = style.text.font.match(/^(\d{3}|bold|normal)\s/);
    const fontWeight = options.fontWeight || (fontWeightMatch ? fontWeightMatch[1] : 'normal');
    const scaledFont = `${fontWeight} ${scaledFontSize}px "${fontName}", "Helvetica Neue", Helvetica, Arial, "DejaVu Sans", sans-serif, "Apple Color Emoji", "Noto Color Emoji"`;

    // Create temporary canvas to measure text
    const measureCanvas = createCanvas(100, 100);
    const measureCtx = measureCanvas.getContext('2d');
    measureCtx.font = scaledFont;

    // Scale padding relative to video width (factor 1.5 matches CaptionEditor.tsx preview)
    const scaledPadX = Math.round(style.padding.x * (videoWidth / 1080) * 1.5);
    const scaledPadY = Math.round(style.padding.y * (videoWidth / 1080) * 1.5);

    // Word wrap text (respecting explicit newlines)
    const lines = [];
    const wrapWidth = isFullWidth ? videoWidth - scaledPadX * 2 : maxWidth - scaledPadX * 2;
    const paragraphs = text.split(/\n/);

    for (const paragraph of paragraphs) {
        const words = paragraph.split(/\s+/).filter(w => w.length > 0);
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = measureCtx.measureText(testLine);

            if (metrics.width > wrapWidth) {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
    }

    // Calculate dimensions
    const lineHeight = scaledFontSize * 1.3;
    const textHeight = lines.length * lineHeight;
    const bgWidth = isFullWidth
        ? videoWidth
        : Math.min(
            Math.max(...lines.map(l => measureCtx.measureText(l).width)) + scaledPadX * 2,
            maxWidth
        );
    const bgHeight = textHeight + scaledPadY * 2;

    // Create final canvas (no extra margin for full-width)
    const canvasWidth = isFullWidth ? videoWidth + 4 : bgWidth + 40;  // +4px bleed for edge-to-edge
    const canvasHeight = bgHeight + (isFullWidth ? 0 : 40);
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    console.log(`   📐 Snapchat canvas size: ${canvasWidth}x${canvasHeight}, lines=${lines.length}, lineHeight=${lineHeight.toFixed(1)}, bgWidth=${bgWidth}, bgHeight=${bgHeight.toFixed(1)}`);

    const bgX = isFullWidth ? 0 : 20;
    const bgY = isFullWidth ? 0 : 20;

    // Draw shadow
    if (style.shadow) {
        ctx.shadowColor = style.shadow.color;
        ctx.shadowBlur = style.shadow.blur;
        ctx.shadowOffsetX = style.shadow.offsetX;
        ctx.shadowOffsetY = style.shadow.offsetY;
    }

    // Draw background
    if (style.background.gradient) {
        const gradient = ctx.createLinearGradient(bgX, bgY, bgX + bgWidth, bgY + bgHeight);
        gradient.addColorStop(0, style.background.gradient[0]);
        gradient.addColorStop(1, style.background.gradient[1]);
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = style.background.color;
    }

    roundRect(ctx, bgX, bgY, bgWidth, bgHeight, style.borderRadius);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Draw glow
    if (style.glow) {
        ctx.shadowColor = style.shadow?.color || style.background.color;
        ctx.shadowBlur = 20;
    }

    // Draw text
    ctx.font = scaledFont;
    ctx.fillStyle = options.textColor || style.text.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textStartY = bgY + scaledPadY + lineHeight / 2;

    // Word-by-word rendering helper — use 0.25em spacing to match frontend editor preview
    const spaceWidth = scaledFontSize * 0.25;
    ctx.textAlign = 'left';

    function renderLineWords(line, lineY, drawFn) {
        const lineWords = line.split(' ');
        const wordWidths = lineWords.map(w => ctx.measureText(w).width);
        const totalWidth = wordWidths.reduce((sum, w) => sum + w, 0) + spaceWidth * (lineWords.length - 1);
        let x = bgX + bgWidth / 2 - totalWidth / 2;
        for (let wi = 0; wi < lineWords.length; wi++) {
            drawFn(lineWords[wi], x, lineY);
            x += wordWidths[wi] + spaceWidth;
        }
    }

    // Text stroke/border (if user selected border style)
    const borderStyle = options.borderStyle || 'none';
    if (borderStyle === 'full') {
        const strokeWidth = Math.round((options.borderWidth || 8) * (videoWidth / 1080));
        ctx.strokeStyle = options.borderColor || '#000000';
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        lines.forEach((line, i) => {
            renderLineWords(line, textStartY + i * lineHeight, (word, x, y) => ctx.strokeText(word, x, y));
        });
    } else if (borderStyle === 'shadow') {
        ctx.shadowColor = options.borderColor || 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = Math.round(4 * (videoWidth / 1080));
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = Math.round(2 * (videoWidth / 1080));
    }

    lines.forEach((line, i) => {
        renderLineWords(line, textStartY + i * lineHeight, (word, x, y) => ctx.fillText(word, x, y));
    });

    return {
        type: 'canvas',
        buffer: canvas.toBuffer('image/png'),
        width: canvasWidth,
        height: canvasHeight,
        bgWidth,
        bgHeight,
    };
}

/**
 * Generate Snapchat caption using FFmpeg drawtext filter
 */
function generateSnapchatCaptionFFmpeg(text, style, videoWidth, videoHeight, options = {}) {
    text = normalizeKeycapEmoji(text);
    // Escape text for FFmpeg drawtext filter
    const escapedText = text.trim()
        .replace(/'/g, "'\\''")
        .replace(/:/g, '\\:')
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n');

    // Scale font size relative to video width (base size is for 1080px)
    // Match specifically NNpx to avoid catching font-weight like "500"
    const baseFontSize = options.customFontSize || parseInt(style.text.font.match(/(\d+)px/)?.[1] || 24);
    const fontSize = Math.round(baseFontSize * (videoWidth / 1080) * 1.8);
    const fontColor = style.text.color.replace('#', '');
    const isFullWidth = style.fullWidth || false;

    // Build drawtext filter — account for multi-line text height
    const position = options.position || 'bottom';
    const lineCount = (text.match(/\n/g) || []).length + 1;
    const lineHeight = Math.round(fontSize * 1.3);
    const totalTextHeight = lineCount * lineHeight;
    const yPos = position === 'top' ? 60 : `h-${totalTextHeight}-80`;

    // Extract RGB values for box color
    let boxColor = '0x000000@0.6'; // Default: Snapchat semi-transparent black
    if (style.background.color) {
        if (style.background.color.startsWith('rgba')) {
            const match = style.background.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (match) {
                const [, r, g, b, a] = match;
                boxColor = `0x${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}@${a || 1}`;
            }
        } else if (style.background.color.startsWith('#')) {
            boxColor = style.background.color.replace('#', '0x') + '@0.95';
        }
    }

    // For full-width Snapchat bar, use large boxborderw to extend the background
    const boxBorderW = isFullWidth ? Math.round(videoWidth / 2) : 15;

    // Use font= for fontconfig lookup (fonts installed in Dockerfile)
    const fontName = options.fontName || 'DejaVu Sans';
    const filter = `drawtext=text='${escapedText}':font='${fontName}':fontsize=${fontSize}:fontcolor=0x${fontColor}:x=(w-text_w)/2:y=${yPos}:line_spacing=8:box=1:boxcolor=${boxColor}:boxborderw=${boxBorderW}`;

    return {
        type: 'ffmpeg',
        filter,
        fontSize,
        position,
    };
}

/**
 * Generate TikTok-style word-by-word SRT with styling
 */
export function generateTikTokSRT(text, styleId, options = {}) {
    const style = TIKTOK_STYLES[styleId] || TIKTOK_STYLES.classic_yellow;
    const startTime = options.startTime || 0;
    const duration = options.duration || 5;
    const wordsPerSecond = options.wordsPerSecond || 2.5;

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordDuration = 1 / wordsPerSecond;

    const entries = [];
    let currentTime = startTime;

    // Group words into lines
    const lines = [];
    for (let i = 0; i < words.length; i += style.wordsPerLine) {
        lines.push(words.slice(i, i + style.wordsPerLine));
    }

    let entryIndex = 1;
    lines.forEach((lineWords, lineIndex) => {
        lineWords.forEach((word, wordIndex) => {
            const wordStart = currentTime;
            const wordEnd = Math.min(currentTime + wordDuration, startTime + duration);

            // Build the line with current word highlighted
            const lineText = lineWords.map((w, i) => {
                if (i === wordIndex) {
                    return `<font color="${style.highlightColor}">${w}</font>`;
                }
                return `<font color="${style.baseColor}">${w}</font>`;
            }).join(' ');

            entries.push({
                index: entryIndex++,
                start: formatSRTTime(wordStart),
                end: formatSRTTime(wordEnd),
                text: lineText,
            });

            currentTime = wordEnd;
        });
    });

    // Generate SRT content
    const srtContent = entries.map(e =>
        `${e.index}\n${e.start} --> ${e.end}\n${e.text}\n`
    ).join('\n');

    return {
        srt: srtContent,
        entries,
        style,
    };
}

/**
 * Format time for SRT (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);

    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Convert HTML hex color #RRGGBB to ASS color &H00BBGGRR
 */
export function hexToASS(hex) {
    const clean = hex.replace('#', '');
    const r = clean.slice(0, 2);
    const g = clean.slice(2, 4);
    const b = clean.slice(4, 6);
    return `&H00${b}${g}${r}`.toUpperCase();
}

/**
 * Format time for ASS (H:MM:SS.cc — centiseconds)
 */
function formatASSTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const cs = Math.round((seconds % 1) * 100);

    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

/**
 * Generate TikTok-style word-by-word captions in ASS format.
 * Uses native ASS inline color overrides {\c&HBBGGRR&} for reliable rendering.
 */
export function generateTikTokASS(text, styleId, options = {}) {
    const style = TIKTOK_STYLES[styleId] || TIKTOK_STYLES.classic_yellow;
    const startTime = options.startTime || 0;
    const duration = options.duration || 5;
    const wordsPerSecond = options.wordsPerSecond || 2.5;
    const videoWidth = options.videoWidth || 1080;
    const videoHeight = options.videoHeight || 1920;
    const marginV = options.marginV || 60;
    const displayMode = options.displayMode || 'animated';

    const fontSize = options.fontSize || parseInt(style.font.match(/(\d+)px/)?.[1] || style.font.match(/\d+/)?.[0] || 48);
    const fontWeight = style.font.includes('bold') ? 1 : 0;
    const outlineWidth = style.stroke?.width || 2;
    // Custom color overrides from user's Text Color / Border Color pickers
    const highlightASS = options.textColor
        ? hexToASS(options.textColor)
        : hexToASS(style.highlightColor || style.highlightGradient?.[0] || '#FFFF00');
    const baseASS = options.textColor
        ? hexToASS(options.textColor)
        : hexToASS(style.baseColor || '#FFFFFF');
    const outlineASS = options.borderColor
        ? hexToASS(options.borderColor)
        : hexToASS(style.stroke?.color || '#000000');
    const fontName = resolveFont(options.font);

    // Glow support: colored back and increased shadow
    const outlineValue = options.borderStyle === 'none' ? 0
        : options.borderStyle === 'shadow' ? 1
        : outlineWidth;
    const shadowDepth = style.glow ? 3 : (options.borderStyle === 'shadow' ? 3 : 1);
    const backColour = style.glow
        ? hexToASS(style.highlightGradient?.[1] || style.highlightColor || '#FF1493')
        : '&H80000000';

    const dialogueLines = [];

    if (displayMode === 'static') {
        // Static mode: show full text for entire scene duration in highlight color
        // Convert literal newlines to ASS line break \N
        const assText = text.replace(/\n/g, '\\N');
        dialogueLines.push({
            start: formatASSTime(startTime),
            end: formatASSTime(startTime + duration),
            text: `{\\c${highlightASS}}${assText}`,
        });
    } else {
        // Animated mode: word-by-word highlight
        // Split into paragraphs by explicit newlines, then words per paragraph
        const paragraphs = text.split(/\n/).filter(p => p.trim().length > 0);
        const wordsPerLine = style.wordsPerLine || 4;

        // Build display lines: respect explicit newlines AND wordsPerLine limit
        const displayLines = [];
        for (const paragraph of paragraphs) {
            const pWords = paragraph.split(/\s+/).filter(w => w.length > 0);
            for (let i = 0; i < pWords.length; i += wordsPerLine) {
                displayLines.push(pWords.slice(i, i + wordsPerLine));
            }
        }

        const wordDuration = 1 / wordsPerSecond;
        let currentTime = startTime;

        // For each word, show ALL lines simultaneously with \N breaks
        // Highlight the current word, all others in base color
        for (let lineIdx = 0; lineIdx < displayLines.length; lineIdx++) {
            for (let wordIdx = 0; wordIdx < displayLines[lineIdx].length; wordIdx++) {
                const wordStart = currentTime;
                const wordEnd = Math.min(currentTime + wordDuration, startTime + duration);

                // Build full multi-line text with current word highlighted
                const fullText = displayLines.map((lineWords, li) => {
                    return lineWords.map((w, wi) => {
                        const isHighlighted = (li === lineIdx && wi === wordIdx);
                        const color = isHighlighted ? highlightASS : baseASS;
                        return `{\\c${color}}${w}`;
                    }).join(' ');
                }).join('\\N');

                dialogueLines.push({
                    start: formatASSTime(wordStart),
                    end: formatASSTime(wordEnd),
                    text: fullText,
                });

                currentTime = wordEnd;
            }
        }
    }

    // Add glow blur effect for styles with glow: true
    if (style.glow) {
        for (let i = 0; i < dialogueLines.length; i++) {
            dialogueLines[i].text = `{\\blur4}${dialogueLines[i].text}`;
        }
    }

    // Build complete ASS file content
    const assContent = [
        '[Script Info]',
        'ScriptType: v4.00+',
        `PlayResX: ${videoWidth}`,
        `PlayResY: ${videoHeight}`,
        'WrapStyle: 0',
        '',
        '[V4+ Styles]',
        'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
        `Style: Default,${fontName},${fontSize},${baseASS},&H000000FF,${outlineASS},${backColour},${fontWeight},0,0,0,100,100,0,0,1,${outlineValue},${shadowDepth},2,0,0,${marginV},1`,
        '',
        '[Events]',
        'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
        ...dialogueLines.map(d => `Dialogue: 0,${d.start},${d.end},Default,,0,0,0,,${d.text.replace(/\s+/g, ' ').trim()}`),
    ].join('\n');

    return { assContent, dialogueLines, style, fontName };
}

/**
 * Generate FFmpeg filter for TikTok-style captions
 */
export function generateTikTokFFmpegFilter(styleId) {
    const style = TIKTOK_STYLES[styleId] || TIKTOK_STYLES.classic_yellow;

    // Build ASS style string
    const fontSize = parseInt(style.font.match(/\d+/)?.[0] || 48);
    const fontWeight = style.font.includes('bold') ? 1 : 0;

    let forceStyle = [
        `FontSize=${fontSize}`,
        `Bold=${fontWeight}`,
        `PrimaryColour=&HFFFFFF&`,
        `OutlineColour=&H000000&`,
        `BackColour=&H000000&`,
        `Outline=${style.stroke?.width || 2}`,
        `Shadow=1`,
        `MarginV=60`,
        `Alignment=2`, // Bottom center
    ].join(',');

    return forceStyle;
}

/**
 * Generate per-scene caption data structure
 */
export function createSceneCaptions(scenes, captions) {
    return scenes.map((scene, index) => ({
        sceneNumber: scene.sceneNumber ?? index,
        startTime: scene.startTime || 0,
        endTime: scene.endTime || scene.startTime + (scene.duration || 3),
        duration: scene.duration || (scene.endTime - scene.startTime) || 3,
        caption: captions[index] || '',
        style: captions[index]?.style || 'classic_white',
        styleType: captions[index]?.styleType || 'snapchat', // 'snapchat' or 'tiktok'
    }));
}

/**
 * Get all available caption styles
 */
export function getAllStyles() {
    return {
        snapchat: Object.values(SNAPCHAT_STYLES).map(s => ({
            id: s.id,
            name: s.name,
            type: 'snapchat',
            preview: {
                background: s.background.color || s.background.gradient?.[0],
                gradient: s.background.gradient,
                textColor: s.text.color,
                borderRadius: s.borderRadius,
                glow: s.glow || false,
            }
        })),
        tiktok: Object.values(TIKTOK_STYLES).map(s => ({
            id: s.id,
            name: s.name,
            type: 'tiktok',
            preview: {
                highlightColor: s.highlightColor || s.highlightGradient?.[0],
                baseColor: s.baseColor,
                stroke: s.stroke?.color,
                strokeWidth: s.stroke?.width || 0,
                fontSize: parseInt(s.font?.match(/(\d+)px/)?.[1] || '48'),
                glow: s.glow || false,
            }
        })),
    };
}

// ============================================================================
// TIKTOK CANVAS-BASED PNG RENDERING (color emoji support via Skia)
// ============================================================================

/**
 * Generate TikTok-style caption PNGs using canvas.
 * Returns array of { buffer, startTime, endTime } for FFmpeg overlay.
 * Supports color emojis via Skia/NotoColorEmoji font.
 */
export function generateTikTokCaptionCanvas(text, styleId, options = {}) {
    text = normalizeKeycapEmoji(text);
    const style = TIKTOK_STYLES[styleId] || TIKTOK_STYLES.classic_yellow;
    const startTime = options.startTime || 0;
    const duration = options.duration || 5;
    const wordsPerSecond = options.wordsPerSecond || 2.5;
    const videoWidth = options.videoWidth || 1080;
    const videoHeight = options.videoHeight || 1920;
    const marginV = options.marginV || 60;
    const displayMode = options.displayMode || 'animated';

    const fontSize = options.fontSize || parseInt(style.font.match(/(\d+)px/)?.[1] || style.font.match(/\d+/)?.[0] || 48);
    const scaledFontSize = Math.round(fontSize * (videoWidth / 1080));
    // Resolve font weight: user override > style definition > default to bold (matches CaptionEditor preview)
    let fontWeight = 'normal';
    if (options.fontWeight === 'black') fontWeight = '900';
    else if (options.fontWeight === 'bold') fontWeight = 'bold';
    else if (options.fontWeight) fontWeight = options.fontWeight;
    else {
        const weightMatch = style.font.match(/^(\d{3}|bold|normal)\s/);
        fontWeight = weightMatch ? weightMatch[1] : 'bold';
    }
    const fontName = resolveFont(options.font);

    // Colors — user overrides or style defaults
    const highlightColor = options.textColor || style.highlightColor || style.highlightGradient?.[0] || '#FFFF00';
    const baseColor = options.textColor || style.baseColor || '#FFFFFF';
    const strokeColor = options.borderColor || style.stroke?.color || '#000000';
    const baseStrokeWidth = options.borderWidth || (style.stroke ? (style.stroke.width || 8) : 8);
    const strokeWidth = options.borderStyle === 'none' ? 0
        : Math.round(baseStrokeWidth * (videoWidth / 1080));

    // Shadow
    const shadow = style.shadow || {};
    const shadowBlur = Math.round((shadow.blur || 4) * (videoWidth / 1080));
    const shadowColor = shadow.color || 'rgba(0,0,0,0.5)';
    const shadowOffX = Math.round((shadow.offsetX || 0) * (videoWidth / 1080));
    const shadowOffY = Math.round((shadow.offsetY || 2) * (videoWidth / 1080));

    // Split text into display lines (respect newlines, then wrap by measured width)
    const paragraphs = text.split(/\n/).filter(p => p.trim().length > 0);
    const wordsPerLine = style.wordsPerLine || 4;
    const wordSpacing = scaledFontSize * 0.25;
    const maxLineWidth = videoWidth * 0.85; // 85% of video width to keep text in frame
    // Measure canvas for line width calculations
    const measureCanvas2 = createCanvas(100, 100);
    const measureCtx2 = measureCanvas2.getContext('2d');
    measureCtx2.font = `${fontWeight} ${scaledFontSize}px "${fontName}", "DejaVu Sans", sans-serif`;
    const displayLines = [];
    for (const para of paragraphs) {
        const pWords = para.split(/\s+/).filter(w => w.length > 0);
        // First split by wordsPerLine, then check if any line overflows and wrap further
        for (let i = 0; i < pWords.length; i += wordsPerLine) {
            const chunk = pWords.slice(i, i + wordsPerLine);
            // Check if this chunk fits within maxLineWidth
            const wordWidths = chunk.map(w => measureCtx2.measureText(w).width);
            const totalWidth = wordWidths.reduce((s, w) => s + w, 0) + wordSpacing * (chunk.length - 1);
            if (totalWidth <= maxLineWidth) {
                displayLines.push(chunk);
            } else {
                // Width overflow — break into smaller lines
                let currentLine = [];
                let currentWidth = 0;
                for (let j = 0; j < chunk.length; j++) {
                    const addedWidth = currentLine.length > 0 ? wordSpacing + wordWidths[j] : wordWidths[j];
                    if (currentWidth + addedWidth > maxLineWidth && currentLine.length > 0) {
                        displayLines.push(currentLine);
                        currentLine = [chunk[j]];
                        currentWidth = wordWidths[j];
                    } else {
                        currentLine.push(chunk[j]);
                        currentWidth += addedWidth;
                    }
                }
                if (currentLine.length > 0) displayLines.push(currentLine);
            }
        }
    }

    const lineHeight = scaledFontSize * 1.35;
    const totalTextHeight = displayLines.length * lineHeight;
    // marginV is already in pixels when passed from sceneCaptionService, use directly
    const textBaseY = videoHeight - marginV - totalTextHeight + scaledFontSize;

    // Helper: render a single frame to canvas PNG
    function renderFrame(highlightLineIdx, highlightWordIdx) {
        const canvas = createCanvas(videoWidth, videoHeight);
        const ctx = canvas.getContext('2d');

        ctx.font = `${fontWeight} ${scaledFontSize}px "${fontName}", "DejaVu Sans", sans-serif, "Apple Color Emoji", "Noto Color Emoji"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        for (let li = 0; li < displayLines.length; li++) {
            const lineWords = displayLines[li];
            const lineY = textBaseY + li * lineHeight;

            // Word spacing — use 0.25em to match frontend editor preview
            const spaceWidth = scaledFontSize * 0.25;
            const wordWidths = lineWords.map(w => ctx.measureText(w).width);
            const totalWidth = wordWidths.reduce((sum, w) => sum + w, 0) + spaceWidth * (lineWords.length - 1);
            const startX = (videoWidth - totalWidth) / 2;

            const wordPositions = [];
            let cumulativeX = 0;
            for (let wi = 0; wi < lineWords.length; wi++) {
                wordPositions.push(cumulativeX);
                cumulativeX += wordWidths[wi] + spaceWidth;
            }

            // Render each word individually with controlled spacing
            for (let wi = 0; wi < lineWords.length; wi++) {
                const word = lineWords[wi];
                const wordWidth = wordWidths[wi];
                const wordX = startX + wordPositions[wi];

                // In animated mode, highlight the current word; in static mode, all highlight color
                const isHighlighted = highlightLineIdx === -1 || (li === highlightLineIdx && wi === highlightWordIdx);
                const color = highlightLineIdx === -1 ? highlightColor : (isHighlighted ? highlightColor : baseColor);

                // Shadow
                ctx.shadowColor = shadowColor;
                ctx.shadowBlur = shadowBlur;
                ctx.shadowOffsetX = shadowOffX;
                ctx.shadowOffsetY = shadowOffY;

                // Stroke
                if (strokeWidth > 0) {
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = strokeWidth;
                    ctx.lineJoin = 'round';
                    ctx.textAlign = 'left';
                    ctx.strokeText(word, wordX, lineY);
                }

                // Fill
                ctx.fillStyle = color;
                ctx.shadowColor = 'transparent';
                ctx.textAlign = 'left';
                ctx.fillText(word, wordX, lineY);
            }
            // Reset alignment for next line
            ctx.textAlign = 'center';
        }

        return canvas.toBuffer('image/png');
    }

    const results = [];

    if (displayMode === 'static') {
        // One PNG for entire duration
        results.push({
            buffer: renderFrame(-1, -1),
            startTime,
            endTime: startTime + duration,
        });
    } else {
        // Animated: one PNG per word highlight
        const wordDuration = 1 / wordsPerSecond;
        let currentTime = startTime;

        for (let li = 0; li < displayLines.length; li++) {
            for (let wi = 0; wi < displayLines[li].length; wi++) {
                const wordStart = currentTime;
                const wordEnd = Math.min(currentTime + wordDuration, startTime + duration);

                results.push({
                    buffer: renderFrame(li, wi),
                    startTime: wordStart,
                    endTime: wordEnd,
                });

                currentTime = wordEnd;
            }
        }
    }

    return results;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    SNAPCHAT_STYLES,
    TIKTOK_STYLES,
    generateSnapchatCaption,
    generateTikTokSRT,
    generateTikTokASS,
    generateTikTokCaptionCanvas,
    generateTikTokFFmpegFilter,
    hexToASS,
    createSceneCaptions,
    getAllStyles,
};
