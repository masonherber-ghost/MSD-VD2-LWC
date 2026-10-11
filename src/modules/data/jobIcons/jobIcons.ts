/**
 * The vacancy category icon, as a URL a template can put in `src`.
 *
 * `jobs.icon` stores a SLUG, not a path — see `server/lib/job-icons.ts`. The
 * file it names is served by the `assetsDir` mapping, so the URL is written
 * ABSOLUTE: the static build gives every asset its own hashed directory, and a
 * relative path would resolve against whichever one it happened to be written
 * in. (`rules-architecture.md` § `url()` inside a stylesheet must be absolute
 * describes the same trap for CSS.)
 *
 * The slug is narrowed to [a-z0-9-] before it reaches an href. The server's own
 * map is the only thing that writes it today, but the /data screen can edit the
 * column raw, and a value carrying a slash would point somewhere else entirely.
 *
 * An unusable value returns '' so the caller falls back to the shipped icon.
 * A job type with no artwork is a real state, not an error.
 *
 * Shared rather than duplicated: `example/jobs3` and `example/jobDetail` both
 * render this icon, and a sanitiser that exists twice is a sanitiser that will
 * eventually differ.
 */
export function iconUrl(slug: unknown): string {
    const name = String(slug ?? '');
    return /^[a-z0-9-]+$/.test(name) ? `/public/assets/icons/${name}.svg` : '';
}
