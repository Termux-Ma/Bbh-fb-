const puppeteer = require('puppeteer');
const config = require('./config');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Set Facebook cookie from config
  const cookieParts = config.cookie.split(';').map(part => {
    const [name, value] = part.trim().split('=');
    return { name, value, domain: '.facebook.com', path: '/' };
  });
  await page.setCookie(...cookieParts);

  await page.goto('https://www.facebook.com/messages', { waitUntil: 'networkidle2' });

  console.log('Logged in, watching for messages...');

  // Function to check new messages every 10 seconds
  setInterval(async () => {
    try {
      await page.reload({ waitUntil: 'networkidle2' });
      // Get unread threads count
      const unreadCount = await page.evaluate(() => {
        const unread = document.querySelectorAll('[aria-label*="unread"]');
        return unread.length;
      });
      if (unreadCount > 0) {
        console.log('You have unread messages:', unreadCount);

        // Open first unread chat
        await page.click('[aria-label*="unread"]');
        await page.waitForTimeout(2000);

        // Get the last message text
        const lastMessage = await page.evaluate(() => {
          const messages = document.querySelectorAll('[role="row"] div[dir="auto"] span');
          return messages[messages.length - 1]?.innerText || '';
        });
        console.log('Last message:', lastMessage);

        // Type and send reply
        const inputBox = await page.$('[aria-label="Message"]');
        await inputBox.type(config.replyMessage, { delay: 50 });
        await page.keyboard.press('Enter');
        console.log('Reply sent:', config.replyMessage);
      } else {
        console.log('No unread messages.');
      }
    } catch (err) {
      console.error('Error checking messages:', err);
    }
  }, 10000);
})();
