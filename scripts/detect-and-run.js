#!/usr/bin/env node
/**
 * Auto-detection script for Slide Editor
 * Detects system capabilities and recommends the best mode
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const htmlFile = args[0];

function checkNode() {
  try {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    const major = parseInt(version.slice(1).split('.')[0]);
    return major >= 18;
  } catch {
    return false;
  }
}

function checkChrome() {
  const platform = process.platform;
  const chromePaths = {
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
    ],
    linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  };

  const paths = chromePaths[platform] || chromePaths.linux;
  return paths.some(p => existsSync(p));
}

function printBanner() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              Slide Editor v0.3.0 - Auto Detection             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

function printRecommendation(hasNode, hasChrome) {
  console.log('System Check:');
  console.log(`  Node.js 18+: ${hasNode ? '✅ Found' : '❌ Not found'}`);
  console.log(`  Chrome:      ${hasChrome ? '✅ Found' : '❌ Not found'}`);
  console.log('');

  if (hasNode) {
    console.log('✅ Recommendation: Use CLI Mode');
    console.log('   Features: Direct file save, scriptable, offline');
    console.log('');
    console.log('Commands:');
    console.log(`   node ${resolve(__dirname, '../dist/inject.js')} ${htmlFile || 'presentation.html'} --inline --enable --open`);
  } else if (hasChrome) {
    console.log('⚠️  Node.js not found. Recommendation: Use Chrome Extension');
    console.log('   Features: Zero installation, browser-based');
    console.log('');
    console.log('Installation:');
    console.log('   1. Open chrome://extensions/');
    console.log('   2. Enable "Developer mode"');
    console.log('   3. Click "Load unpacked"');
    console.log(`   4. Select: ${resolve(__dirname, '../chrome-extension')}`);
    console.log('');
    console.log('Usage:');
    console.log('   1. Open your HTML file in Chrome');
    console.log('   2. Click Slide Editor icon in toolbar');
    console.log('   3. Click "Enable Editor"');
  } else {
    console.log('❌ Neither Node.js nor Chrome found.');
    console.log('   Please install Node.js (https://nodejs.org) or Google Chrome.');
  }
  console.log('');
}

function runCLIMode() {
  if (!htmlFile) {
    console.log('❌ Please provide an HTML file:');
    console.log(`   node ${import.meta.url} presentation.html`);
    process.exit(1);
  }

  const injectPath = resolve(__dirname, '../dist/inject.js');
  const cmd = `node "${injectPath}" "${htmlFile}" --inline --enable --open`;

  console.log('🚀 Starting CLI Mode...\n');
  console.log(`Command: ${cmd}\n`);

  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    console.error('Error running editor:', e.message);
    process.exit(1);
  }
}

// Main
printBanner();

const hasNode = checkNode();
const hasChrome = checkChrome();

printRecommendation(hasNode, hasChrome);

// If has Node and file provided, offer to run immediately
if (hasNode && htmlFile) {
  runCLIMode();
}
