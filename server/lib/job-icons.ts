/**
 * Job type -> icon slug.
 *
 * `jobs.icon` stores a SLUG, never a path or a URL. The slug names a file in
 * `src/assets/icons/<slug>.svg`, which the assetsDir mapping serves at
 * `/public/assets/icons/<slug>.svg`. Storing the slug rather than the path
 * keeps the database out of the asset pipeline's business: move the icons and
 * no row has to change.
 *
 * The map is deliberately small. Every entry here has a matching SVG on disk —
 * add a line only when the file lands, never in anticipation of one. A job type
 * with no entry resolves to `null`, and a null icon is a real state the UI must
 * handle (it falls back to the shipped `standard:job_profile` card icon), not
 * a missing-file placeholder.
 *
 * Source artwork lives in `_reference/icons/`, named for the job type. The copy
 * in `src/assets/icons/` is renamed to its slug — that rename is the only
 * transformation.
 */
const JOB_TYPE_ICONS: Readonly<Record<string, string>> = {
  'Building & Trades': 'building-trades',
}

/** Every job type that has an icon. Useful for a picklist or a seed script. */
export const MAPPED_JOB_TYPES = Object.keys(JOB_TYPE_ICONS)

/**
 * The icon slug for a job type, or null when the type is unknown, unmapped or
 * absent.
 *
 * Matching is case- and whitespace-insensitive so that "building & trades"
 * typed into a form resolves the same as the canonical label. It is NOT fuzzy:
 * a type that is not in the map gets no icon rather than a plausible-looking
 * wrong one.
 */
export function iconForJobType(jobType: unknown): string | null {
  if (typeof jobType !== 'string') return null

  const wanted = normalise(jobType)
  if (!wanted) return null

  for (const [type, slug] of Object.entries(JOB_TYPE_ICONS)) {
    if (normalise(type) === wanted) return slug
  }
  return null
}

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}
