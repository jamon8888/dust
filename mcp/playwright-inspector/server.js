// server.js
const { chromium } = require('playwright');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

(async () => {
  const browser = await chromium.launch({ headless: false }); // visible pour debug
  const page = await browser.newPage();

  // Interception des requêtes réseau
  page.on('request', req => {
    console.log(JSON.stringify({
      type: 'network-request',
      method: req.method(),
      url: req.url(),
      headers: req.headers()
    }));
  });

  // Pour chaque ligne MCP (ex: instruction JSON), on agit
  rl.on('line', async (line) => {
    try {
      const input = JSON.parse(line);
      if (input.type === 'navigate') {
        await page.goto(input.url, { waitUntil: 'networkidle' });
        console.log(JSON.stringify({ type: 'navigated', url: input.url }));
      }

      if (input.type === 'extract') {
        const content = await page.content();
        console.log(JSON.stringify({ type: 'dom', html: content }));
      }

      if (input.type === 'querySelector') {
        const value = await page.$eval(input.selector, el => el.textContent.trim());
        console.log(JSON.stringify({ type: 'text', selector: input.selector, value }));
      }

    } catch (err) {
      console.error(JSON.stringify({ type: 'error', error: err.message }));
    }
  });

  process.on('SIGINT', async () => {
    await browser.close();
    process.exit(0);
  });
})();
