import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * LWR config hook: load `routes` from routes.json.
 *
 * WHY THIS EXISTS. `lwr.config.json` is the only file LWR reads, it is JSON, and
 * JSON has no include mechanism — so routes cannot simply live somewhere else.
 * What LWR does offer is `hooks`: modules it instantiates during config
 * resolution, whose `initConfigs` may mutate the global config *before* routes
 * are normalised and validated. That is the supported seam, and it is the one
 * this uses.
 *
 * It runs for `npm run dev` AND `npm run build`, because hooks are part of
 * config resolution rather than of the dev server.
 *
 * So: routes.json is the source of truth. `lwr.config.json` has no `routes`
 * block at all — adding one back would be silently overwritten by this hook.
 */
export default class RoutesHook {
    initConfigs(globalConfig) {
        const file = join(globalConfig.rootDir, 'routes.json');
        const { routes } = JSON.parse(readFileSync(file, 'utf8'));

        if (!Array.isArray(routes) || routes.length === 0) {
            throw new Error(`routes.json must hold a non-empty "routes" array (${file})`);
        }

        // By reference, as the hook contract expects.
        globalConfig.routes = routes;
    }
}
