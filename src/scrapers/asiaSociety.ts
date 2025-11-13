// src/scrapers/asiaSociety.ts
import { PlaywrightCrawlingContext } from 'crawlee';
import { PrismaClient } from '@prisma/client';
import {
  cleanAndTruncateText,
  getEventCountry,
  classifyEvent,
  parseEventDateTime,
} from '../utils.js';

// Initialize Prisma client.
// For large-scale projects, you might pass this client via context
// instead of creating a new instance in every scraper file.
const prisma = new PrismaClient();

/**
 * Handles the "List" page for Asia Society.
 * Its job is to find links to specific events and enqueue them.
 */
export async function handleAsiaSocietyList({
  page,
  enqueueLinks,
  log,
}: PlaywrightCrawlingContext) {
  log.info(`[asiaSociety LIST]: Processing ${page.url()}`);

  // TODO: *** CHANGE THIS SELECTOR ***
  const eventCardSelector = 'h4.card-title > a';

  try {
    // Wait for the event cards to be visible
    await page.waitForSelector(eventCardSelector, { timeout: 15000 });

    // Find all links that match the selector AND the glob pattern
    await enqueueLinks({
      selector: eventCardSelector,
      label: 'DETAIL', // Send to the DETAIL handler
      globs: [
        // This is the key: Only allow URLs that match this pattern
        'https://asiasociety.org/seattle/events/*',
      ],
      // CRITICAL: Pass metadata to the next request
      userData: {
        siteName: 'asiaSociety', // Identify the site
        label: 'DETAIL', // Identify the handler for the router
      },
    });

    log.info(`[asiaSociety LIST]: Found and enqueued links from ${page.url()}`);
  } catch (error) {
    log.error(
      `[asiaSociety LIST]: No event links found on ${page.url()}. Check selector '${eventCardSelector}'.`,
      { error }
    );
  }
}

export async function handleAsiaSocietyDetail({
  page,
  request,
  log,
}: PlaywrightCrawlingContext) {
  if (!request.loadedUrl) {
    log.error(
      `[asiaSociety DETAIL]: Request object has no loadedUrl. Cannot process.`
    );
    return; // Exit the function early
  }
  log.info(`[asiaSociety DETAIL]: Scraping ${request.loadedUrl}`);

  // Base URL for constructing absolute image links
  const siteUrl = 'https://asiasociety.org';

  try {
    const title = await page
      .locator('article.node--type-event h1')
      .textContent();

    const rawDescription = await page
      .locator('article.node--type-event div.body > div')
      .innerText();

    const address = await page
      .locator('div.event-details-wdgt div.address > div')
      .textContent();

    // The date and time are in separate nodes.
    const datePart = await page
      .locator('div.event-details-wdgt div.date')
      .textContent(); // Gets "Sat 15 Nov 2025"

    console.log('datePart: ', datePart);

    // The time is a loose text node after the div.date, so we use evaluate
    const timePart = await page
      .locator('div.event-details-wdgt')
      .evaluate((el) => {
        const dateNode = el.querySelector('div.date'); // Check if the next sibling is a text node (nodeType 3)
        if (
          dateNode &&
          dateNode.nextSibling &&
          dateNode.nextSibling.nodeType === Node.TEXT_NODE
        ) {
          return dateNode.nextSibling.textContent?.trim(); // Gets "2 - 2:45 p.m."
        }
        return null;
      });

    console.log('timePart: ', timePart);

    // Combine into a full date-time string
    const dateString = `${datePart} ${timePart || ''}`.trim(); // e.g., "Sat 15 Nov 2025 2 - 2:45 p.m." // 5. Image (Get relative path)

    const relativeImage = await page
      .locator('article.node--type-event div.image img')
      .getAttribute('src');

    // Combine into an absolute URL
    const image = relativeImage ? `${siteUrl}${relativeImage}` : null;

    const price = await page.locator('div.ticket-price > div').textContent();

    if (!title) {
      log.warning(
        `[asiaSociety DETAIL]: No title found at ${request.loadedUrl}. Skipping save.`
      );
      return;
    }

    const description = cleanAndTruncateText(rawDescription, 3);

    const city = 'Seattle'; // We know this from the URL pattern
    const country = getEventCountry(title || '', description || '');
    const category = classifyEvent(title || '', description || '');

    const eventDateTime = parseEventDateTime(dateString, 'America/New_York');

    await prisma.events_crawler.upsert({
      where: {
        website_url: request.loadedUrl, // Unique key
      },
      update: {
        // What to update if it already exists
        event_title: title.trim(),
        event_city: city,
        address: address?.replace(/\s+/g, ' ').trim(), // Clean up whitespace
        description: description?.trim(),
        image: image,
        ticket_price: price?.trim(),
        country: country,
        event_datetime: eventDateTime,
        category: category, // event_datetime: parsedDate,
        // raw_date_string: dateString, // Good to save the original string
        updated_at: new Date(), // Manually set updated_at
      },
      create: {
        // What to create if it's new
        website_url: request.loadedUrl,
        event_title: title.trim(),
        event_city: city,
        address: address?.replace(/\s+/g, ' ').trim(), // Clean up whitespace
        description: description?.trim(),
        image: image,
        ticket_price: price?.trim(),
        event_datetime: eventDateTime,
        country: country,
        category: category, // event_datetime: parsedDate,
      },
    });

    log.info(`[asiaSociety SUCCESS]: Saved event: ${title.trim()}`);
  } catch (error) {
    if (error instanceof Error) {
      log.error(
        `[asiaSociety DETAIL]: Failed to scrape ${request.loadedUrl}: ${error.message}`
      );
    } else {
      // Handle cases where a non-Error object was thrown
      log.error(
        `[asiaSociety DETAIL]: Failed to scrape ${
          request.loadedUrl
        }. Unknown error: ${String(error)}`
      );
    }
  }
}
