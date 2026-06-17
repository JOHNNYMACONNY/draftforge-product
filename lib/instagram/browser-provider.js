const os = require('node:os');
const path = require('node:path');

const PROVIDERS = new Set(['persistent-playwright', 'cdp']);

function defaultSocialDraftProfileDir() {
  return process.env.DRAFTFORGE_BROWSER_PROFILE || 
    path.join(os.homedir(), '.draftforge', 'browser-profile');
}

function normalizeBrowserProviderConfig(config = {}) {
  const provider = config.browserProvider || config['browser-provider'] || 'persistent-playwright';
  if (!PROVIDERS.has(provider)) {
    throw new Error(`Unsupported browser provider: ${provider}`);
  }

  const headlessValue = config.browserHeadless ?? config['browser-headless'];
  const headless = headlessValue === true || String(headlessValue || '').toLowerCase() === 'true';

  return {
    provider,
    profileDir: path.resolve(config.browserProfileDir || config['browser-profile-dir'] || defaultSocialDraftProfileDir()),
    headless,
    channel: config.browserChannel || config['browser-channel'] || 'chrome',
  };
}

function createPlaywrightFacades(page) {
  return {
    Page: {
      async enable() {},
      async navigate({ url }) {
        await page.goto(url);
        if (typeof page.waitForLoadState === 'function') {
          await page.waitForLoadState('domcontentloaded').catch(() => {});
        }
      },
    },
    Runtime: {
      async enable() {},
      async evaluate({ expression }) {
        const value = await page.evaluate(expression);
        return {
          result: { value },
        };
      },
    },
  };
}

function isLoginLikeText(bodyText) {
  const text = String(bodyText || '').toLowerCase();
  return text.includes('log in')
    || text.includes('login')
    || text.includes('two-factor')
    || text.includes('two factor')
    || text.includes('checkpoint')
    || text.includes('enter your password');
}

async function assertPersistentSessionUsable({ page, expectedAccountLabel }) {
  const snapshot = await page.evaluate(() => ({
    href: location.href,
    title: document.title,
    bodyText: document.body ? document.body.innerText : '',
  }));
  const bodyText = String(snapshot.bodyText || '');
  const accountSeen = expectedAccountLabel
    ? bodyText.toLowerCase().includes(String(expectedAccountLabel).toLowerCase())
    : true;
  if (isLoginLikeText(bodyText) && !accountSeen) {
    throw new Error('LOGIN_REQUIRED: SocialDraftBrowser is not authenticated for Meta Business Suite. Run the bootstrap/login command once, then rerun automation.');
  }
  return { ...snapshot, accountSeen };
}

async function openPersistentPlaywrightPage({ composerUrl, preferredUrl, expectedAccountLabel, browserProfileDir, browserHeadless, browserChannel }) {
  const { chromium } = require('playwright-core');
  const context = await chromium.launchPersistentContext(
    browserProfileDir || defaultSocialDraftProfileDir(),
    {
      headless: browserHeadless === true,
      channel: browserChannel || 'chrome',
      acceptDownloads: true,
      viewport: { width: 1440, height: 1000 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    },
  );
  let page = context.pages().find((candidate) => {
    const url = candidate.url();
    return url && url !== 'about:blank' && url.includes('business.facebook.com');
  });
  if (!page) {
    page = context.pages()[0] || await context.newPage();
  }

  const targetUrl = preferredUrl || composerUrl;
  try {
    if (targetUrl) {
      await page.goto(targetUrl);
      await page.waitForLoadState('domcontentloaded').catch(() => {});
    }

    await assertPersistentSessionUsable({ page, expectedAccountLabel });
  } catch (error) {
    await context.close().catch(() => {});
    throw error;
  }
  const { Page, Runtime } = createPlaywrightFacades(page);
  return {
    browser: context,
    page,
    Page,
    Runtime,
    target: {
      id: 'persistent-playwright',
      title: await page.title().catch(() => 'Meta Business Suite'),
      url: page.url(),
      type: 'page',
    },
  };
}

module.exports = {
  createPlaywrightFacades,
  defaultSocialDraftProfileDir,
  normalizeBrowserProviderConfig,
  openPersistentPlaywrightPage,
};
