import { Router } from 'express'
import { HttpError } from '../middleware/error-handler.ts'
import { parseEnum, parseId, parseOptionalId } from '../lib/http.ts'
import * as candidateRepository from '../repositories/candidate-repository.ts'
import type { CandidateStatus, MatchLevel } from '../types.ts'

export const candidatesRouter = Router()

const STATUSES = [
  'applied', 'screening', 'shortlisted', 'interview', 'offer', 'rejected', 'sourced',
] as const satisfies readonly CandidateStatus[]
const MATCH_LEVELS = ['strong', 'partial', 'low', 'none'] as const satisfies readonly MatchLevel[]

/**
 * Candidates across every job on an account, in one query.
 *
 * The previous build had no cross-job endpoint, so the dashboard issued one
 * request per job and stitched them together client-side.
 */
candidatesRouter.get('/', (req, res, next) => {
  try {
    const accountId = parseOptionalId(req.query.account_id, 'account_id')
    if (!accountId) {
      next(new HttpError(400, 'account_id is required.'))
      return
    }
    res.json(
      candidateRepository.findByAccount(accountId, {
        status: parseEnum(req.query.status, STATUSES, 'status', { optional: true }),
      }),
    )
  } catch (e) {
    next(e)
  }
})

candidatesRouter.get('/job/:jobId', (req, res, next) => {
  try {
    res.json(
      candidateRepository.findByJobId(
        parseId(req.params.jobId, 'jobId'),
        parseEnum(req.query.status, STATUSES, 'status', { optional: true }),
      ),
    )
  } catch (e) {
    next(e)
  }
})

candidatesRouter.get('/job/:jobId/status-counts', (req, res, next) => {
  try {
    res.json(candidateRepository.statusCountsByJob(parseId(req.params.jobId, 'jobId')))
  } catch (e) {
    next(e)
  }
})

candidatesRouter.get('/:id', (req, res, next) => {
  try {
    const candidate = candidateRepository.findById(parseId(req.params.id))
    if (!candidate) {
      next(new HttpError(404, 'Candidate not found.'))
      return
    }
    res.json(candidate)
  } catch (e) {
    next(e)
  }
})
