// src/routes.ts
import { createPlaywrightRouter } from 'crawlee';
import {
  handleAsiaSocietyList,
  handleAsiaSocietyDetail,
} from './scrapers/asiaSociety.js';

// Import the new Scandinavia House handlers
import {
  handleScandinaviaHouseList,
  handleScandinaviaHouseDetail,
} from './scrapers/scandinaviaHouse.js'; // <-- NEW IMPORT

export const router = createPlaywrightRouter();

// This is now the MASTER "DEFAULT" (List) Handler
router.addHandler('DEFAULT', async (context) => {
  const { request, log } = context;
  const siteName = request.userData.siteName;

  log.info(`[MASTER LIST]: Routing for ${siteName} at ${request.url}`);

  switch (siteName) {
    case 'asiaSociety':
      return handleAsiaSocietyList(context);
    case 'scandinaviaHouse': // <-- NEW CASE
      return handleScandinaviaHouseList(context);
    default:
      log.error(`[MASTER LIST]: No handler found for site: ${siteName}`);
  }
});

// This is now the MASTER "DETAIL" Handler
router.addHandler('DETAIL', async (context) => {
  const { request, log } = context;
  const siteName = request.userData.siteName;

  log.info(`[MASTER DETAIL]: Routing for ${siteName} at ${request.url}`);

  switch (siteName) {
    case 'asiaSociety':
      return handleAsiaSocietyDetail(context);
    case 'scandinaviaHouse': // <-- NEW CASE
      return handleScandinaviaHouseDetail(context);
    default:
      log.error(`[MASTER DETAIL]: No handler found for site: ${siteName}`);
  }
});
