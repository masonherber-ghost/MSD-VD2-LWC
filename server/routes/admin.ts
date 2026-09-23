import { Router } from 'express'
import { parseId } from '../lib/http.ts'
import * as admin from '../repositories/admin-repository.ts'

export const adminRouter = Router()

/** Query keys the list endpoint owns; anything else is an equality filter. */
const RESERVED = new Set(['_start', '_end', '_sort', '_order', 'q'])

/** The registry itself — the client builds every grid and form from this. */
adminRouter.get('/schema', (_req, res, next) => {
  try {
    res.json(admin.schema())
  } catch (e) {
    next(e)
  }
})

adminRouter.get('/:table', (req, res, next) => {
  try {
    const filters: Record<string, string> = {}
    for (const [key, value] of Object.entries(req.query)) {
      if (!RESERVED.has(key) && typeof value === 'string') filters[key] = value
    }

    const order = req.query._order === 'desc' ? 'desc' : 'asc'
    res.json(
      admin.list(req.params.table, {
        start: req.query._start ? Number(req.query._start) : undefined,
        end: req.query._end ? Number(req.query._end) : undefined,
        sort: typeof req.query._sort === 'string' ? req.query._sort : undefined,
        order,
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        filters,
      }),
    )
  } catch (e) {
    next(e)
  }
})

adminRouter.get('/:table/:id', (req, res, next) => {
  try {
    res.json(admin.getOne(req.params.table, parseId(req.params.id)))
  } catch (e) {
    next(e)
  }
})

adminRouter.post('/:table', (req, res, next) => {
  try {
    res.status(201).json(admin.create(req.params.table, req.body ?? {}))
  } catch (e) {
    next(e)
  }
})

adminRouter.patch('/:table/:id', (req, res, next) => {
  try {
    res.json(admin.update(req.params.table, parseId(req.params.id), req.body ?? {}))
  } catch (e) {
    next(e)
  }
})

adminRouter.delete('/:table/:id', (req, res, next) => {
  try {
    res.json(admin.remove(req.params.table, parseId(req.params.id)))
  } catch (e) {
    next(e)
  }
})
