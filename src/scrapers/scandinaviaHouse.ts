// src/scrapers/scandinaviaHouse.ts
import { PlaywrightCrawlingContext } from 'crawlee';
import { PrismaClient } from '@prisma/client';
import {
  cleanAndTruncateText,
  getEventCountry,
  classifyEvent,
  parseScandinaviaHouseDateTime,
} from '../utils.js';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Handles the "List" page for Scandinavia House.
 * Its job is to find links to specific events and enqueue them.
 */
export async function handleScandinaviaHouseList({
  page,
  enqueueLinks,
  log,
}: PlaywrightCrawlingContext) {
  log.info(`[scandinaviaHouse LIST]: Processing ${page.url()}`);

  // TODO: *** FIND THE CORRECT SELECTOR FOR THE EVENT LINK ***
  // Inspect the events list page and find the CSS selector for the <a> tag that links to the detail page.
  const eventCardSelector =
    'h3.tribe-events-calendar-list__event-title a.tribe-events-calendar-list__event-title-link';

  const nextButtonSelector =
    '.tribe-events-c-nav__list-item--next a.tribe-events-c-nav__next';

  try {
    // Wait for the event cards to be visible

    await page.waitForSelector(eventCardSelector, { timeout: 15000 });

    // Find all links that match the selector AND the glob pattern
    await enqueueLinks({
      selector: eventCardSelector,
      label: 'DETAIL', // Send to the DETAIL handler
      globs: [
        // CRITICAL: Only allow URLs that match this pattern
        'https://www.scandinaviahouse.org/event/*',
      ],
      // Pass metadata to the next request
      userData: {
        siteName: 'scandinaviaHouse', // Identify the new site
        label: 'DETAIL', // Identify the handler for the router
      },
    });

    log.info(
      `[scandinaviaHouse LIST]: Found and enqueued links from ${page.url()}`
    );

    await enqueueLinks({
      selector: nextButtonSelector,
      label: 'DEFAULT',
      globs: ['https://www.scandinaviahouse.org/events/list/page/*/'],
      userData: {
        siteName: 'scandinaviaHouse',
        label: 'DEFAULT',
      },
      limit: 1,
    });

    log.info(
      `[scandinaviaHouse LIST]: Successfully checked for next page link.`
    );
  } catch (error) {
    log.error(
      `[scandinaviaHouse LIST]: No event links found on ${page.url()}. Check selector '${eventCardSelector}'.`,
      { error }
    );
  }
}

/**
 * Handles the "Detail" page for Scandinavia House events.
 * Extracts and saves event data.
 */
export async function handleScandinaviaHouseDetail({
  page,
  request,
  log,
}: PlaywrightCrawlingContext) {
  if (!request.loadedUrl) {
    log.error(
      `[scandinaviaHouse DETAIL]: Request object has no loadedUrl. Cannot process.`
    );
    return;
  }
  log.info(`[scandinaviaHouse DETAIL]: Scraping ${request.loadedUrl}`);

  // Base URL (not strictly needed since images are absolute, but for consistency)
  const siteUrl = 'https://www.scandinaviahouse.org';

  try {
    // 0. CRITICAL: Wait for the main content to load. If the title doesn't appear, the page failed to load.
    await page.waitForSelector('h1.tribe-events-single-event-title', {
      timeout: 30000,
    });

    // --- 1. DATA EXTRACTION (Use short timeout or try/catch for optional fields) ---

    // 1. Title (Must exist, or the previous waitForSelector fails)
    const title = (
      await page.locator('h1.tribe-events-single-event-title').textContent()
    )?.trim();

    // 2. Raw Description (Should be stable)
    const rawDescription = await page
      .locator('div.tribe-events-single-event-description')
      .innerText();

    // 3. Image URL (Use try/catch for image as it might not exist)
    const relativeImage = await page
      .locator('div.tribe-events-event-image img')
      .getAttribute('src');

    const image = relativeImage ? relativeImage : null; // Image is usually an absolute path already

    // 4. Date and Time Extraction - ROBUST LOGIC
    let dateString = '';

    // Attempt 1: Get the full schedule string from the header (e.g., "November 20—6:00 pm – 8:00 pm")
    const scheduleHeaderLocator = page.locator('.tribe-events-schedule h2');
    try {
      dateString =
        (await scheduleHeaderLocator.textContent({ timeout: 5000 }))?.trim() ||
        '';
    } catch (e) {
      log.info(
        '[scandinaviaHouse DETAIL]: Schedule header H2 not found or timed out. Falling back to parts.'
      );
    }

    // Attempt 2: If H2 failed, fall back to combining date and time parts
    if (!dateString) {
      // Use shorter timeout to avoid blocking if elements are missing on virtual events
      const datePart = (
        await page
          .locator('.tribe-events-abbr.tribe-events-start-date')
          .textContent({ timeout: 5000 })
      )?.trim();

      const timePart = (
        await page
          .locator('.tribe-recurring-event-time')
          .textContent({ timeout: 5000 })
      )?.trim();

      dateString = `${datePart || ''} ${timePart || ''}`.trim();
    }

    // 5. Address (Use try/catch for address as it might be an online/virtual event)
    let address = '58 Park Avenue, New York, NY 10016'; // Default value (Scandinavia House)
    try {
      const addressContainer = await page
        .locator('.tribe-events-address .tribe-address')
        .textContent({ timeout: 5000 });

      if (addressContainer) {
        // Clean up address: remove excessive space, 'United States', and standardize separators
        address = addressContainer
          .replace(/\s+/g, ' ')
          .replace('United States', '')
          .replace('New York , NY', 'New York, NY')
          .trim();
      }
    } catch (e) {
      // The address locator timed out (likely a virtual event), keep default/null later.
    }

    // 6. Price (Optional field, very short timeout)
    let price = null;
    try {
      // Try getting price text from the cost element
      price =
        (
          await page
            .locator('.tribe-events-cost span')
            .textContent({ timeout: 3000 })
        )?.trim() || null;
    } catch (e) {
      // Ignore if price is not found
    }

    if (!title) {
      log.warning(
        `[scandinaviaHouse DETAIL]: No title found at ${request.loadedUrl}. Skipping save.`
      );
      return;
    }

    // --- 2. DATA PROCESSING (Using utility functions) ---
    const description = cleanAndTruncateText(rawDescription, 3);
    const city = 'New York'; // Fixed city for this venue
    const country = getEventCountry(title || '', description || '');
    const category = classifyEvent(title || '', description || '');

    // Use the specialized parsing function
    const eventDateTime = parseScandinaviaHouseDateTime(
      dateString,
      'America/New_York'
    );

    // --- 3. UPSERT TO DATABASE ---
    await prisma.events_crawler.upsert({
      where: { website_url: request.loadedUrl },
      update: {
        event_title: title.trim(),
        event_city: city,
        address: address,
        description: description?.trim(),
        image: image,
        ticket_price: price,
        country: country,
        event_datetime: eventDateTime,
        category: category,
        updated_at: new Date(),
      },
      create: {
        website_url: request.loadedUrl,
        event_title: title.trim(),
        event_city: city,
        address: address,
        description: description?.trim(),
        image: image,
        ticket_price: price,
        event_datetime: eventDateTime,
        country: country,
        category: category,
      },
    });

    log.info(`[scandinaviaHouse SUCCESS]: Saved event: ${title.trim()}`);
  } catch (error) {
    if (error instanceof Error) {
      log.error(
        `[scandinaviaHouse DETAIL]: FAILED TO SCRAPE ${request.loadedUrl}: ${error.message}`
      );
    } else {
      log.error(
        `[scandinaviaHouse DETAIL]: Failed to scrape ${
          request.loadedUrl
        }. Unknown error: ${String(error)}`
      );
    }
  }
}
