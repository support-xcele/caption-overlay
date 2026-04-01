/**
 * Caption Template Service
 *
 * Manages saved caption templates (styles, colors, fonts).
 * Uses database for persistence with JSON fallback.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON fallback file
const TEMPLATES_FILE = path.join(__dirname, '..', 'caption_templates.json');

// Default templates that ship with the system
const DEFAULT_TEMPLATES = [
    {
        id: 'default_snapchat_white',
        name: 'Clean White',
        description: 'Classic white background with black text',
        styleType: 'snapchat',
        styleId: 'classic_white',
        isDefault: true,
        config: {
            position: 'bottom',
            fontSize: 48,
        },
    },
    {
        id: 'default_snapchat_neon',
        name: 'Neon Pink',
        description: 'Bold neon pink for attention-grabbing captions',
        styleType: 'snapchat',
        styleId: 'neon_pink',
        isDefault: true,
        config: {
            position: 'bottom',
            fontSize: 48,
        },
    },
    {
        id: 'default_tiktok_yellow',
        name: 'TikTok Classic',
        description: 'Yellow highlight word-by-word animation',
        styleType: 'tiktok',
        styleId: 'classic_yellow',
        isDefault: true,
        config: {
            wordsPerSecond: 2.5,
            position: 'bottom',
        },
    },
    {
        id: 'default_tiktok_bounce',
        name: 'Bouncy Cyan',
        description: 'Cyan highlight with bounce animation',
        styleType: 'tiktok',
        styleId: 'bounce_cyan',
        isDefault: true,
        config: {
            wordsPerSecond: 2,
            position: 'center',
        },
    },
    {
        id: 'default_snapchat_dark',
        name: 'Dark Mode',
        description: 'Semi-transparent dark background',
        styleType: 'snapchat',
        styleId: 'dark_mode',
        isDefault: true,
        config: {
            position: 'bottom',
            fontSize: 48,
        },
    },
    {
        id: 'default_snapchat_gradient',
        name: 'Purple Dream',
        description: 'Purple to pink gradient with glow',
        styleType: 'snapchat',
        styleId: 'purple_dream',
        isDefault: true,
        config: {
            position: 'bottom',
            fontSize: 48,
        },
    },
];

// In-memory cache
let templatesCache = null;

// ============================================================================
// JSON FILE STORAGE (Fallback)
// ============================================================================

function loadTemplatesFromFile() {
    try {
        if (fs.existsSync(TEMPLATES_FILE)) {
            const data = fs.readFileSync(TEMPLATES_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading caption templates from file:', error);
    }
    return { templates: [...DEFAULT_TEMPLATES], lastId: DEFAULT_TEMPLATES.length };
}

function saveTemplatesToFile(data) {
    try {
        fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving caption templates to file:', error);
    }
}

function getTemplatesData() {
    if (!templatesCache) {
        templatesCache = loadTemplatesFromFile();
    }
    return templatesCache;
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all caption templates
 */
export async function getAllTemplates(includeDefaults = true) {
    const data = getTemplatesData();
    if (includeDefaults) {
        return data.templates;
    }
    return data.templates.filter(t => !t.isDefault);
}

/**
 * Get template by ID
 */
export async function getTemplateById(id) {
    const data = getTemplatesData();
    return data.templates.find(t => t.id === id) || null;
}

/**
 * Get templates by style type
 */
export async function getTemplatesByType(styleType) {
    const data = getTemplatesData();
    return data.templates.filter(t => t.styleType === styleType);
}

/**
 * Create a new template
 */
export async function createTemplate(templateData) {
    const data = getTemplatesData();

    const newTemplate = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: templateData.name || 'Untitled Template',
        description: templateData.description || '',
        styleType: templateData.styleType || 'snapchat',
        styleId: templateData.styleId || 'classic_white',
        isDefault: false,
        config: templateData.config || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    data.templates.push(newTemplate);
    data.lastId++;
    saveTemplatesToFile(data);

    return newTemplate;
}

/**
 * Update an existing template
 */
export async function updateTemplate(id, updates) {
    const data = getTemplatesData();
    const index = data.templates.findIndex(t => t.id === id);

    if (index === -1) {
        return null;
    }

    // Don't allow updating default templates
    if (data.templates[index].isDefault) {
        throw new Error('Cannot modify default templates');
    }

    data.templates[index] = {
        ...data.templates[index],
        ...updates,
        id: data.templates[index].id, // Preserve ID
        isDefault: false, // Can't make custom templates default
        updatedAt: new Date().toISOString(),
    };

    saveTemplatesToFile(data);
    return data.templates[index];
}

/**
 * Delete a template
 */
export async function deleteTemplate(id) {
    const data = getTemplatesData();
    const index = data.templates.findIndex(t => t.id === id);

    if (index === -1) {
        return false;
    }

    // Don't allow deleting default templates
    if (data.templates[index].isDefault) {
        throw new Error('Cannot delete default templates');
    }

    data.templates.splice(index, 1);
    saveTemplatesToFile(data);
    return true;
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(id, newName) {
    const original = await getTemplateById(id);
    if (!original) {
        throw new Error('Template not found');
    }

    return createTemplate({
        ...original,
        name: newName || `${original.name} (Copy)`,
        isDefault: false,
    });
}

/**
 * Reset to default templates (removes all custom templates)
 */
export async function resetToDefaults() {
    templatesCache = {
        templates: [...DEFAULT_TEMPLATES],
        lastId: DEFAULT_TEMPLATES.length,
    };
    saveTemplatesToFile(templatesCache);
    return templatesCache.templates;
}

/**
 * Get template statistics
 */
export async function getTemplateStats() {
    const data = getTemplatesData();
    return {
        total: data.templates.length,
        defaults: data.templates.filter(t => t.isDefault).length,
        custom: data.templates.filter(t => !t.isDefault).length,
        byType: {
            snapchat: data.templates.filter(t => t.styleType === 'snapchat').length,
            tiktok: data.templates.filter(t => t.styleType === 'tiktok').length,
        },
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    getAllTemplates,
    getTemplateById,
    getTemplatesByType,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    resetToDefaults,
    getTemplateStats,
    DEFAULT_TEMPLATES,
};
