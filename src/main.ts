// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { config } from 'dotenv';
import { router } from './routes.js';

// Load environment variables (e.g., DATABASE_URL)
config();

// These should be the "List" pages.
const requestsWithSiteData = [
  // {
  //   url: 'https://asiasociety.org/seattle',
  //   userData: {
  //     siteName: 'asiaSociety', // Label for Asia Society
  //     label: 'DEFAULT', // Start with the list handler
  //   },
  // },
  {
    url: 'https://www.scandinaviahouse.org/events/', // <-- NEW START URL
    userData: {
      siteName: 'scandinaviaHouse', // <-- NEW LABEL
      label: 'DEFAULT',
    },
  },
];

// Initialize the crawler
const crawler = new PlaywrightCrawler({
  // Use the router we defined
  requestHandler: router,

  // (Optional but Recommended)
  maxRequestsPerCrawl: 20,
  maxConcurrency: 10,
  maxRequestsPerMinute: 20, // Be nice to their servers
  // headless: false,
  // launchContext: {
  //   launchOptions: {
  //     slowMo: 500,
  //   },
  // },
});

// Run the crawler
console.log('Starting crawler...');
await crawler.run(requestsWithSiteData);
console.log('Crawler finished.');
