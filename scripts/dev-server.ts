/**
 * Dev server: the LWR site and the SQLite-backed read API on one port.
 *
 * Mount the API through getInternalServer(), NOT through LwrApp.use(). LwrApp's
 * use/get/post wrap the handler and call it with LWR's own ExpressRequest /
 * ExpressResponse shims, which have no res.json — an Express Router handed
 * those never responds and the request hangs. LwrApp.use() also takes a single
 * middleware argument, so a path prefix would be silently dropped.
 * getInternalServer() returns the raw Express 4 app instead.
 *
 * Order matters: LWR attaches its own catch-all view middleware inside init(),
 * and Express matches in registration order, so /api must be mounted BEFORE
 * init() or the catch-all answers first and returns the LWC shell as HTML.
 *
 * Run with `npm run dev` (tsx). `lwr build` / `lwr start` are untouched and
 * still produce a purely static site with no API.
 */
import fs from 'node:fs';
import express from 'express';
import { createServer } from 'lwr';

import { writeBundle } from './build-css.mjs';

import { accountsRouter } from '../server/routes/accounts.ts';
import { authRouter } from '../server/routes/auth.ts';
import { adminRouter } from '../server/routes/admin.ts';
import { candidatesRouter } from '../server/routes/candidates.ts';
import { contactsRouter } from '../server/routes/contacts.ts';
import { jobsRouter } from '../server/routes/jobs.ts';
import { errorHandler, notFoundHandler } from '../server/middleware/error-handler.ts';
import { DB_PATH } from '../server/database.ts';

const api = express.Router();

api.use(express.json());
api.get('/health', (_req, res) => {
    res.json({ status: 'ok', db: DB_PATH, timestamp: new Date().toISOString() });
});

// Generic table CRUD for the /data screen. Read-write, unlike everything else.
api.use('/admin', adminRouter);

api.use('/auth', authRouter);
api.use('/accounts', accountsRouter);
api.use('/candidates', candidatesRouter);
api.use('/contacts', contactsRouter);
api.use('/jobs', jobsRouter);

// A miss under /api is a JSON 404, never the LWC shell.
api.use(notFoundHandler);
api.use(errorHandler);

// The site stylesheet is bundled from src/assets/css/site/ (scripts/build-css.mjs).
// `predev` wrote it; rewrite it whenever a source changes, so editing a
// component's .css shows on the next reload. Debounced: an editor save can
// fire several events.
let cssTimer: NodeJS.Timeout | undefined;
fs.watch('src/assets/css/site', { recursive: true }, () => {
    clearTimeout(cssTimer);
    cssTimer = setTimeout(() => {
        try {
            if (writeBundle()) console.log('css: rebuilt src/assets/css/site.css');
        } catch (e) {
            console.error('css: bundle failed —', e instanceof Error ? e.message : e);
        }
    }, 100);
});

const app = createServer({ serverMode: 'dev' });
app.getInternalServer<'express'>().use('/api', api);

await app.init();
await app.listen(({ port, serverMode }) => {
    console.log(`\nLWR (${serverMode}) + API available at: http://localhost:${port}`);
    console.log(`  site  http://localhost:${port}/`);
    console.log(`  api   http://localhost:${port}/api/health`);
    console.log(`  db    ${DB_PATH}\n`);
});
