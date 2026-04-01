/**
 * Caption Rendering Service
 *
 * Generates CapCut-style caption overlays for videos.
 * Handles hook/value caption timing and styling.
 */

// ============================================================================
// Types
// ============================================================================

export type CaptionPreset = 'capcut_default' | 'capcut_bold' | 'capcut_minimal' | 'capcut_neon' | 'capcut_outline';
export type CaptionPosition = 'top' | 'center' | 'bottom';

export interface CaptionStyle {
    preset: CaptionPreset;
    font: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold' | 'black';
    color: string;
    backgroundColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    shadowColor?: string;
    shadowBlur?: number;
    position: CaptionPosition;
    animation?: CaptionAnimation;
}

export type CaptionAnimation = 'fade' | 'slide_up' | 'pop' | 'typewriter' | 'none';

export interface CaptionConfig {
    hookText: string;
    valueText: string;
    midpointPercent: number; // 0.0 - 1.0, default 0.5
    style: CaptionStyle;
    videoDuration: number; // in seconds
}

export interface CaptionTiming {
    hookStartTime: number;
    hookEndTime: number;
    valueStartTime: number;
    valueEndTime: number;
}

export interface SafeBox {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface RenderResult {
    success: boolean;
    outputUrl?: string;
    error?: string;
    captionData: CaptionData;
}

export interface CaptionData {
    hook: {
        text: string;
        startTime: number;
        endTime: number;
    };
    value: {
        text: string;
        startTime: number;
        endTime: number;
    };
    style: CaptionStyle;
}

// ============================================================================
// Caption Presets
// ============================================================================

export const CAPTION_PRESETS: Record<CaptionPreset, Omit<CaptionStyle, 'position'>> = {
    capcut_default: {
        preset: 'capcut_default',
        font: 'Avenir Next',
        fontSize: 42,
        fontWeight: 'normal',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2,
    },
    capcut_bold: {
        preset: 'capcut_bold',
        font: 'Bebas Neue',
        fontSize: 56,
        fontWeight: 'black',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 4,
        shadowColor: 'rgba(0, 0, 0, 0.8)',
        shadowBlur: 10,
    },
    capcut_minimal: {
        preset: 'capcut_minimal',
        font: 'Inter',
        fontSize: 36,
        fontWeight: 'normal',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 1,
    },
    capcut_neon: {
        preset: 'capcut_neon',
        font: 'Orbitron',
        fontSize: 44,
        fontWeight: 'bold',
        color: '#00FF88',
        strokeColor: '#003322',
        strokeWidth: 2,
        shadowColor: '#00FF88',
        shadowBlur: 20,
    },
    capcut_outline: {
        preset: 'capcut_outline',
        font: 'Poppins',
        fontSize: 48,
        fontWeight: 'bold',
        color: 'transparent',
        strokeColor: '#FFFFFF',
        strokeWidth: 3,
    },
};

// ============================================================================
// Platform Safe Boxes
// ============================================================================

export const PLATFORM_SAFE_BOXES: Record<string, SafeBox> = {
    instagram: {
        top: 60,      // Account for story/reel UI
        bottom: 120,  // Account for like/comment buttons
        left: 20,
        right: 20,
    },
    tiktok: {
        top: 80,
        bottom: 150,
        left: 20,
        right: 80,   // Account for right-side icons
    },
    youtube_shorts: {
        top: 60,
        bottom: 100,
        left: 20,
        right: 20,
    },
};

// ============================================================================
// Caption Timing
// ============================================================================

/**
 * Calculate caption timing based on video duration and midpoint
 */
export function calculateCaptionTiming(
    videoDuration: number,
    midpointPercent: number = 0.5
): CaptionTiming {
    const midpointTime = videoDuration * midpointPercent;

    // Add small buffer for transition
    const transitionBuffer = 0.2; // 200ms

    return {
        hookStartTime: 0.5, // Start slightly after video begins
        hookEndTime: midpointTime - transitionBuffer,
        valueStartTime: midpointTime + transitionBuffer,
        valueEndTime: videoDuration - 0.5, // End slightly before video ends
    };
}

/**
 * Get timing presets
 */
export type TimingPreset = 'standard' | 'early_switch' | 'late_switch' | 'quick_hook';

export function getTimingPreset(preset: TimingPreset): number {
    switch (preset) {
        case 'early_switch':
            return 0.4; // 40% - switch earlier
        case 'late_switch':
            return 0.6; // 60% - switch later
        case 'quick_hook':
            return 0.3; // 30% - very quick hook
        case 'standard':
        default:
            return 0.5; // 50% - standard midpoint
    }
}

// ============================================================================
// Style Helpers
// ============================================================================

/**
 * Get a caption style with preset and position
 */
export function getCaptionStyle(
    preset: CaptionPreset = 'capcut_default',
    position: CaptionPosition = 'bottom'
): CaptionStyle {
    return {
        ...CAPTION_PRESETS[preset],
        position,
    };
}

/**
 * Create custom caption style
 */
export function createCustomStyle(
    basePreset: CaptionPreset,
    overrides: Partial<CaptionStyle>
): CaptionStyle {
    return {
        ...CAPTION_PRESETS[basePreset],
        position: 'bottom',
        ...overrides,
    };
}

/**
 * Get CSS for caption rendering
 */
export function getCaptionCSS(style: CaptionStyle, safeBox: SafeBox): string {
    const positionCSS = getPositionCSS(style.position, safeBox);

    // Use Snapchat-accurate font stack for Avenir Next
    const fontStack = style.font === 'Avenir Next'
        ? "'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif"
        : `'${style.font}', sans-serif`;

    let css = `
        font-family: ${fontStack};
        font-size: ${style.fontSize}px;
        font-weight: ${style.fontWeight === 'normal' ? '500' : style.fontWeight};
        color: ${style.color};
        text-align: center;
        ${positionCSS}
        padding: 10px 15px;
        max-width: calc(100% - ${safeBox.left + safeBox.right}px);
        word-wrap: break-word;
    `;

    if (style.backgroundColor) {
        css += `background-color: ${style.backgroundColor}; border-radius: 4px;`;
    }

    if (style.strokeWidth && style.strokeColor) {
        css += `-webkit-text-stroke: ${style.strokeWidth}px ${style.strokeColor};`;
    }

    if (style.shadowBlur && style.shadowColor) {
        css += `text-shadow: 0 0 ${style.shadowBlur}px ${style.shadowColor};`;
    }

    return css;
}

function getPositionCSS(position: CaptionPosition, safeBox: SafeBox): string {
    switch (position) {
        case 'top':
            return `position: absolute; top: ${safeBox.top}px; left: 50%; transform: translateX(-50%);`;
        case 'center':
            return `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);`;
        case 'bottom':
        default:
            return `position: absolute; bottom: ${safeBox.bottom}px; left: 50%; transform: translateX(-50%);`;
    }
}

// ============================================================================
// FFmpeg Command Generation
// ============================================================================

/**
 * Generate FFmpeg filter for caption overlay
 * This creates the drawtext filter command for FFmpeg
 */
export function generateFFmpegCaptionFilter(
    config: CaptionConfig,
    videoWidth: number,
    videoHeight: number,
    safeBox: SafeBox = PLATFORM_SAFE_BOXES.instagram
): string {
    const timing = calculateCaptionTiming(config.videoDuration, config.midpointPercent);

    // Escape text for FFmpeg
    const hookText = escapeFFmpegText(config.hookText);
    const valueText = escapeFFmpegText(config.valueText);

    // Calculate position
    const yPosition = config.style.position === 'top'
        ? safeBox.top
        : config.style.position === 'center'
            ? `(h-text_h)/2`
            : `h-${safeBox.bottom}-text_h`;

    // Build drawtext filters
    const hookFilter = buildDrawtextFilter(
        hookText,
        config.style,
        yPosition,
        timing.hookStartTime,
        timing.hookEndTime
    );

    const valueFilter = buildDrawtextFilter(
        valueText,
        config.style,
        yPosition,
        timing.valueStartTime,
        timing.valueEndTime
    );

    return `${hookFilter},${valueFilter}`;
}

function buildDrawtextFilter(
    text: string,
    style: CaptionStyle,
    yPosition: string | number,
    startTime: number,
    endTime: number
): string {
    const fontFile = getFontPath(style.font);

    let filter = `drawtext=text='${text}'`;
    filter += `:fontfile='${fontFile}'`;
    filter += `:fontsize=${style.fontSize}`;
    filter += `:fontcolor=${style.color}`;
    filter += `:x=(w-text_w)/2`;
    filter += `:y=${yPosition}`;
    filter += `:enable='between(t,${startTime},${endTime})'`;

    if (style.strokeWidth && style.strokeColor) {
        filter += `:borderw=${style.strokeWidth}`;
        filter += `:bordercolor=${style.strokeColor}`;
    }

    if (style.shadowBlur && style.shadowColor) {
        filter += `:shadowcolor=${style.shadowColor}`;
        filter += `:shadowx=2:shadowy=2`;
    }

    if (style.backgroundColor) {
        filter += `:box=1:boxcolor=${style.backgroundColor}:boxborderw=10`;
    }

    return filter;
}

function escapeFFmpegText(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/:/g, '\\:')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/%/g, '%%');
}

function getFontPath(fontName: string): string {
    // Map font names to system font paths
    // In production, these would be actual font file paths
    const fontPaths: Record<string, string> = {
        'Montserrat': '/usr/share/fonts/truetype/montserrat/Montserrat-Bold.ttf',
        'Bebas Neue': '/usr/share/fonts/truetype/bebas-neue/BebasNeue-Regular.ttf',
        'Inter': '/usr/share/fonts/truetype/inter/Inter-Regular.ttf',
        'Orbitron': '/usr/share/fonts/truetype/orbitron/Orbitron-Bold.ttf',
        'Poppins': '/usr/share/fonts/truetype/poppins/Poppins-Bold.ttf',
    };

    return fontPaths[fontName] || fontPaths['Montserrat'];
}

// ============================================================================
// Caption Data Generation
// ============================================================================

/**
 * Generate caption data for storage and display
 */
export function generateCaptionData(config: CaptionConfig): CaptionData {
    const timing = calculateCaptionTiming(config.videoDuration, config.midpointPercent);

    return {
        hook: {
            text: config.hookText,
            startTime: timing.hookStartTime,
            endTime: timing.hookEndTime,
        },
        value: {
            text: config.valueText,
            startTime: timing.valueStartTime,
            endTime: timing.valueEndTime,
        },
        style: config.style,
    };
}

// ============================================================================
// Caption Validation
// ============================================================================

export interface CaptionValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate caption text and configuration
 */
export function validateCaptions(config: CaptionConfig): CaptionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check hook text
    if (!config.hookText || config.hookText.trim().length === 0) {
        errors.push('Hook text is required');
    } else if (config.hookText.length > 100) {
        warnings.push('Hook text is very long and may not display well');
    }

    // Check value text
    if (!config.valueText || config.valueText.trim().length === 0) {
        errors.push('Value text is required');
    } else if (config.valueText.length > 150) {
        warnings.push('Value text is very long and may not display well');
    }

    // Check timing
    if (config.midpointPercent < 0.2 || config.midpointPercent > 0.8) {
        warnings.push('Midpoint is at an extreme position, captions may feel unbalanced');
    }

    // Check video duration
    if (config.videoDuration < 3) {
        warnings.push('Video is very short, captions may flash too quickly');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

// ============================================================================
// Export Helpers
// ============================================================================

/**
 * Get all available presets with descriptions
 */
export function getPresetDescriptions(): Array<{ id: CaptionPreset; name: string; description: string }> {
    return [
        {
            id: 'capcut_default',
            name: 'Default',
            description: 'Clean white text on dark background, universally readable',
        },
        {
            id: 'capcut_bold',
            name: 'Bold Impact',
            description: 'Large, bold text with heavy shadow for maximum impact',
        },
        {
            id: 'capcut_minimal',
            name: 'Minimal',
            description: 'Subtle, understated text that doesn\'t distract',
        },
        {
            id: 'capcut_neon',
            name: 'Neon Glow',
            description: 'Vibrant green with glow effect, great for tech/gaming',
        },
        {
            id: 'capcut_outline',
            name: 'Outline',
            description: 'Outlined text without fill, modern and trendy',
        },
    ];
}
