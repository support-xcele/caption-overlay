/**
 * Caption Overlay — Snapchat & TikTok style text overlays for video
 *
 * Usage:
 *   import { addSingleCaption, addTimedCaptions, addHookValueCaption } from 'caption-overlay';
 *   await addSingleCaption('input.mp4', 'output.mp4', 'Hello world', 'snapchat_classic');
 */

// Simple FFmpeg-based overlay (easiest entry point)
export {
    CAPTION_PRESETS,
    getVideoDuration,
    addSingleCaption,
    addHookValueCaption,
    addTimedCaptions,
    addMultiLineCaption,
} from './services/captionOverlayService.js';

// Style definitions and canvas rendering
export {
    SNAPCHAT_STYLES,
    TIKTOK_STYLES,
    generateSnapchatCaption,
    generateTikTokSRT,
    generateTikTokASS,
    generateTikTokCaptionCanvas,
    generateTikTokFFmpegFilter,
    hexToASS,
    resolveFont,
    createSceneCaptions,
    getAllStyles,
} from './services/captionStyleService.js';

// Scene-based caption application (multi-scene videos)
export {
    getVideoMetadata,
    applySnapchatCaptions,
    applyTikTokCaptions,
    applySceneCaptions,
    applySingleCaption,
    previewCaption,
} from './services/sceneCaptionService.js';

// Hook/value timing and TypeScript types
export {
    CAPTION_PRESETS as RENDER_PRESETS,
    PLATFORM_SAFE_BOXES,
    calculateCaptionTiming,
    getTimingPreset,
    getCaptionStyle,
    createCustomStyle,
    getCaptionCSS,
    generateFFmpegCaptionFilter,
    generateCaptionData,
    validateCaptions,
    getPresetDescriptions,
} from './services/captionRenderService.ts';

// Template management (save/load caption presets)
export {
    default as captionTemplates,
} from './services/captionTemplateService.js';
