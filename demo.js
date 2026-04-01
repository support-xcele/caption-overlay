/**
 * Demo — Caption Overlay
 *
 * Usage:
 *   node demo.js input.mp4
 *
 * Produces three output files showing different caption styles.
 */

import path from 'path';
import {
    addSingleCaption,
    addHookValueCaption,
    addTimedCaptions,
    CAPTION_PRESETS,
} from './index.js';

const inputVideo = process.argv[2];

if (!inputVideo) {
    console.log('Usage: node demo.js <input-video.mp4>');
    console.log('');
    console.log('Available presets:');
    for (const [name, preset] of Object.entries(CAPTION_PRESETS)) {
        console.log(`  ${name} — ${preset.font}, ${preset.fontSize}px, ${preset.fontColor}`);
    }
    process.exit(1);
}

const dir = path.dirname(inputVideo);
const base = path.basename(inputVideo, path.extname(inputVideo));

async function run() {
    console.log('=== Caption Overlay Demo ===\n');

    // 1. Snapchat-style single caption
    const out1 = path.join(dir, `${base}_snapchat.mp4`);
    console.log('1. Adding Snapchat-style caption...');
    await addSingleCaption(inputVideo, out1, 'This is a Snapchat caption', 'snapchat_classic');
    console.log(`   -> ${out1}\n`);

    // 2. Hook + Value caption (text changes at midpoint)
    const out2 = path.join(dir, `${base}_hookvalue.mp4`);
    console.log('2. Adding hook/value caption...');
    await addHookValueCaption(inputVideo, out2, 'Wait for it...', 'Mind blown!', 'capcut_bold');
    console.log(`   -> ${out2}\n`);

    // 3. Timed captions
    const out3 = path.join(dir, `${base}_timed.mp4`);
    console.log('3. Adding timed captions...');
    await addTimedCaptions(inputVideo, out3, [
        { text: 'First caption', startTime: 0, endTime: 2 },
        { text: 'Second caption', startTime: 2, endTime: 4 },
        { text: 'Third caption', startTime: 4, endTime: 6 },
    ], 'capcut_default');
    console.log(`   -> ${out3}\n`);

    console.log('Done!');
}

run().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
