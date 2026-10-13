import { Router } from 'express'
import { HttpError } from '../middleware/error-handler.ts'
import { parseEnum, parseId, parseOptionalId } from '../lib/http.ts'
import * as jobRepository from '../repositories/job-repository.ts'
import { DomainError } from '../repositories/account-repository.ts'
import type { JobStatus } from '../types.ts'

export const jobsRouter = Router()

const JOB_STATUSES = ['draft', 'in_review', 'reviewed', 'active', 'closed'] as const satisfies readonly JobStatus[]

/**
 * Jobs for an account. `account_id` is required — jobs belong to the company,
 * not to whoever happened to create them.
 */
jobsRouter.get('/', (req, res, next) => {
  try {
    const accountId = parseOptionalId(req.query.account_id, 'account_id')
    if (!accountId) {
      next(new HttpError(400, 'account_id is required.'))
      return
    }
    res.json(
      jobRepository.findByAccount(accountId, {
        status: parseEnum(req.query.status, JOB_STATUSES, 'status', { optional: true }),
        contact_id: parseOptionalId(req.query.contact_id, 'contact_id'),
      }),
    )
  } catch (e) {
    next(e)
  }
})

jobsRouter.get('/:id', (req, res, next) => {
  try {
    const job = jobRepository.findById(parseId(req.params.id))
    if (!job) {
      next(new HttpError(404, 'Job not found.'))
      return
    }
    res.json(job)
  } catch (e) {
    next(e)
  }
})

/**
 * Close a published vacancy. The repository enforces that only `active` can
 * close; breaking that rule is the caller's mistake, so it is a 400.
 */
jobsRouter.post('/:id/close', (req, res, next) => {
  try {
    const job = jobRepository.close(parseId(req.params.id))
    if (!job) {
      next(new HttpError(404, 'Job not found.'))
      return
    }
    res.json(job)
  } catch (e) {
    next(e instanceof DomainError ? new HttpError(400, e.message) : e)
  }
})

/**
 * Publish a vacancy MSD has reviewed: the employer accepting MSD's changes.
 * Only `reviewed` can be published; anything else is a 400.
 */
jobsRouter.post('/:id/publish', (req, res, next) => {
  try {
    const job = jobRepository.publish(parseId(req.params.id))
    if (!job) {
      next(new HttpError(404, 'Job not found.'))
      return
    }
    res.json(job)
  } catch (e) {
    next(e instanceof DomainError ? new HttpError(400, e.message) : e)
  }
})
