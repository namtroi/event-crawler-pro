# EventCrawler Pro

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-45ba4b?style=for-the-badge&logo=Playwright&logoColor=white)](https://playwright.dev/)
[![Crawlee](https://img.shields.io/badge/Crawlee-333333?style=for-the-badge&logo=crawlee&logoColor=white)](https://crawlee.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)

A robust, modular web crawler designed to scrape event data from various websites. Built with **Crawlee** and **Playwright**, it features a scalable architecture with type-safe database interactions via **Prisma**.

## 🚀 Key Features

*   **Modular Architecture**: dedicated scrapers for different sites in `src/scrapers`.
*   **Centralized Routing**: `src/routes.ts` manages traffic to specific handlers transparently.
*   **Data Persistence**: Automatically stores crawled event data into a PostgreSQL database using Prisma.
*   **Type Efficiency**: Fully written in TypeScript for reliability and developer experience.
*   **Scalable**: Configured for concurrency and resource management.

## 🛠 Tech Stack

*   **Runtime**: Node.js
*   **Crawler Framework**: [Crawlee](https://crawlee.dev) (PlaywrightCrawler)
*   **Browser Automation**: [Playwright](https://playwright.dev)
*   **Database ORM**: [Prisma](https://www.prisma.io)
*   **Database**: PostgreSQL
*   **Utilities**: `date-fns` for robust date parsing.

## 📦 Getting Started

### Prerequisites

*   **Node.js** (v18 or higher recommended)
*   **PostgreSQL**: Ensure you have a running Postgres instance.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/namtroi/my-event-crawler.git
    cd my-event-crawler
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Install Playwright Browsers**
    ```bash
    npx crawlee install-playwright-browsers
    ```
    > **Note for Linux Users**: You might need to install system dependencies if the above command warns about missing libraries.
    >
    > If you installed Node.js via NVM, `sudo npx` might fail. Tweak the command or install dependencies manually:
    > ```bash
    > # Try without sudo first (updates might prompt for password)
    > npx playwright install-deps
    >
    > # OR install manually (example for Ubuntu)
    > sudo apt-get install libnspr4 libnss3
    > ```

4.  **Configure Environment**
    Create a `.env` file in the root directory and add your database connection string:

    ```env
    # .env
    DATABASE_URL="postgresql://user:password@localhost:5432/my_database?schema=public"
    # If using Supabase or similar via connection pooling:
    # DIRECT_URL="postgresql://user:password@localhost:5432/my_database_direct"
    ```

5.  **Database Migration**
    Push the Prisma schema to your database:

    ```bash
    npx prisma migrate dev --name init
    # OR for prototyping without migrations history:
    # npx prisma db push
    ```

6.  **Generate Prisma Client**
    ```bash
    npx prisma generate
    ```

## ▶️ Usage

Start the crawler with:

```bash
npm start
```

This command runs `src/main.ts`, which initializes the `PlaywrightCrawler` with your defined routes and starting URLs.

### Customizing the Start URLs

Modify `src/main.ts` to add or change the websites you want to crawl:

```typescript
// src/main.ts
const requestsWithSiteData = [
  {
    url: 'https://www.scandinaviahouse.org/events/',
    userData: {
      siteName: 'scandinaviaHouse', // Matches a case in your router
      label: 'DEFAULT',
    },
  },
];
```

## 📂 Project Structure

```
my-event-crawler/
├── prisma/
│   └── schema.prisma      # Database schema definition
├── src/
│   ├── scrapers/          # Individual site scraper logic
│   │   ├── asiaSociety.ts
│   │   └── scandinaviaHouse.ts
│   ├── main.ts            # Entry point & crawler config
│   ├── routes.ts          # Central router definition
│   └── utils.ts           # Helper functions (e.g., date parsing)
├── package.json
└── tsconfig.json
```

## 👨‍💻 Development Guide

### Adding a New Scraper

1.  **Create scraper logic**: Add a file in `src/scrapers/` (e.g., `myNewSite.ts`).
    *   Export a 'List' handler (for pagination/event discovery).
    *   Export a 'Detail' handler (for extracting event data).
2.  **Update Routes**: In `src/routes.ts`:
    *   Import your new handlers.
    *   Add a new `case` in the switch statements for `DEFAULT` (List) and `DETAIL` labels.
3.  **Register URL**: Add the starting URL to `requestsWithSiteData` in `src/main.ts` with the corresponding `siteName`.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License.
