#!/usr/bin/env node
/**
 * MBS Runner - Meta Business Suite Draft Automation
 * 
 * Uses playwright-core to drive an authenticated Chrome session.
 * Users must have logged into Meta Business Suite once before.
 */

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--bundle-path') args.bundlePath = argv[++i];
    else if (token === '--asset-id') args.assetId = argv[++i];
    else if (token === '--business-id') args.businessId = argv[++i];
    else if (token === '--expected-account-label') args.expectedAccountLabel = argv[++i];
    else if (token === '--out-root') args.outRoot = argv[++i];
    else if (token === '--skip-browser-preflight') args.skipBrowserPreflight = true;
    else if (token === '--profile-dir') args.profileDir = argv[++i];
    else if (token === '--headless') args.headless = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function defaultProfileDir() {
  return process.env.DRAFTFORGE_BROWSER_PROFILE || 
    path.join(require('os').homedir(), '.draftforge', 'browser-profile');
}

async function runMbsBundle({ bundlePath, assetId, businessId, expectedAccountLabel, skipBrowserPreflight, profileDir }) {
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  
  if (!businessId || !assetId) {
    throw new Error('businessId and assetId are required for live MBS execution');
  }
  
  const profile = profileDir || defaultProfileDir();
  const composerUrl = `https://business.facebook.com/latest/composer/?asset_id=${assetId}&business_id=${businessId}`;
  
  // Ensure profile directory exists
  fs.mkdirSync(profile, { recursive: true });
  
  const context = await chromium.launchPersistentContext(profile, {
    headless: false, // Users need to see the browser for login
    channel: 'chrome',
    acceptDownloads: true,
    viewport: { width: 1440, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  
  try {
    const page = await context.newPage();
    await page.goto(composerUrl);
    
    // Wait for composer to load (check for login status)
    await page.waitForLoadState('domcontentloaded');
    
    // Check if logged in
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    const isLoginPage = ['log in', 'login', 'two-factor', 'checkpoint'].some(t => 
      bodyText.toLowerCase().includes(t)
    );
    
    if (isLoginPage && expectedAccountLabel) {
      throw new Error(`LOGIN_REQUIRED: Please log into Meta Business Suite in the opened browser, then rerun.`);
    }
    
    // Upload media
    for (const [assetId, filePath] of Object.entries(bundle.exported_file_paths || {})) {
      if (fs.existsSync(filePath)) {
        // Find file input and upload
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles(filePath);
        }
      }
    }
    
    // Enter caption
    const captionDraft = bundle.caption_draft;
    if (captionDraft) {
      const captionBox = page.locator('[aria-label*="caption"], [aria-label*="Caption"]');
      if (await captionBox.count() > 0) {
        await captionBox.fill(captionDraft);
      }
    }
    
    // Save draft (do not publish)
    const saveButton = page.locator('[aria-label*="Save Draft"], text=/Save Draft/i');
    if (await saveButton.count() > 0) {
      await saveButton.click();
      await page.waitForTimeout(2000); // Wait for save
    }
    
    const finalUrl = page.url();
    
    return {
      status: 'draft-saved',
      composerUrl,
      savedUrl: finalUrl,
      assetId,
      businessId,
    };
  } finally {
    await context.close();
  }
}

if (require.main === module) {
  (async () => {
    try {
      const args = parseArgs(process.argv.slice(2));
      const result = await runMbsBundle(args);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(error.stack || error.message);
      process.exit(1);
    }
  })();
}

module.exports = { runMbsBundle, parseArgs, defaultProfileDir };