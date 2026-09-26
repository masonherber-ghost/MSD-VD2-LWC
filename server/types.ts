/**
 * Entity contract shared by the server and the client.
 *
 * The previous build had `shared/types/index.js`, but nothing imported it — the
 * real contract lived in SQL column names and was re-derived by hand in every
 * component. This file is imported by both `server/repositories/*` and
 * `src/lib/api-client.ts`, so a column rename breaks the build instead of
 * breaking a page at runtime.
 *
 * Conventions, all inherited from the schema:
 *  - snake_case field names, matching the columns
 *  - booleans are 0 | 1 INTEGERs in the DB; repositories expose them as booleans
 *  - child arrays are ALWAYS present, empty when there is nothing. The previous
 *    build attached them only when non-empty, so consumers needed `?? []` and
 *    two rows of the same entity could have different shapes.
 */

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type Domain = 'client' | 'employer'
export type EmployerRole = 'admin' | 'member'
export type InvitationStatus = 'active' | 'pending' | 'none'

export interface Contact {
  id: number
  ciam_id: number | null
  domain: Domain
  employer_role: EmployerRole
  invitation_status: InvitationStatus
  invite_email: string | null
  account_id: number | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  job_title: string | null
  created_at: string
  updated_at: string
}

/** A contact as shown in Manage team — joins the login email and account pointers. */
export interface AccountMember extends Contact {
  email: string | null
  is_primary_contact: boolean
  is_secondary_contact: boolean
}

export interface Account {
  id: number
  contact_id: number | null
  secondary_contact_id: number | null
  company_name: string | null
  industry: string | null
  company_type: string | null
  company_address: string | null
  workplace_address: string | null
  trading_name: string | null
  ird_number: string | null
  nzbn: string | null
  gst_registered: boolean
  preferred_language: string | null
  web_address: string | null
  logo_url: string | null
  company_description: string | null
  verified: boolean
  selling_point_1: string | null
  selling_point_2: string | null
  selling_point_3: string | null
  campaign_length_weeks: number | null
  max_shortlist: number | null
  interview_options: string[]
  pre_employment_checks: string[]
  show_company_profile: boolean
  created_at: string
  updated_at: string
}

/** What `/api/auth/login` and `/api/auth/me/:ciamId` return: the ciam + contact + account join. */
export interface AuthUser {
  id: number // ciam.id
  email: string
  contact_id: number | null
  domain: Domain | null
  employer_role: EmployerRole | null
  invitation_status: InvitationStatus | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  job_title: string | null
  account_id: number | null
  account: Account | null
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export type JobStatus = 'draft' | 'in_review' | 'active' | 'closed'

export interface JobSchedule {
  schedule_type: string | null
  hours: string | null
  additional_info: string | null
  days: string[]
}

export interface JobLanguage {
  id: number
  language_name: string
  abilities: string[]
}

export interface JobDriverLicence {
  class_value: string
  class_label: string
  stage: string | null
}

export interface Job {
  id: number
  account_id: number
  contact_id: number | null
  vacancy_contact_id: number | null
  title: string
  subtitle: string | null
  company_name: string | null
  description: string | null
  about_us: string | null
  location: string | null
  pay: string | null
  contract_type: string | null
  start_date: string | null
  hours_description: string | null
  posted_date: string | null
  closing_date: string | null
  external_job_id: string | null
  experience_level: string | null
  education_required: string | null
  job_type: string | null
  /** Icon slug -> src/assets/icons/<slug>.svg. Derived from job_type. */
  icon: string | null
  driver_licence_label: string | null
  max_shortlist: number | null
  positions_available: number | null
  application_management: string[]
  interview_options: string[]
  campaign_length_weeks: number | null
  views: number
  status: JobStatus
  created_at: string
  updated_at: string
}

/** A job in a list: counts and creator name, no children. */
export interface JobListItem extends Job {
  candidate_count: number
  new_candidate_count: number
  creator_name: string | null
}

/** A job on its own page: every child collection hydrated. */
export interface JobDetail extends Job {
  responsibilities: string[]
  selling_points: string[]
  pre_employment_checks: string[]
  employer_values: string[]
  skills: string[]
  certificates: string[]
  licence_endorsements: string[]
  languages: JobLanguage[]
  driver_licences: JobDriverLicence[]
  schedule: JobSchedule | null
  vacancy_contact: Pick<
    Contact,
    'id' | 'first_name' | 'last_name' | 'job_title' | 'phone'
  > | null
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export type CandidateStatus =
  | 'applied' | 'screening' | 'shortlisted' | 'interview' | 'offer' | 'rejected' | 'sourced'
export type MatchLevel = 'strong' | 'partial' | 'low' | 'none'

export interface CandidateStrength { id: number; title: string; description: string | null }
export interface CandidateExperience {
  id: number
  role: string
  organization: string
  period: string | null
  start_date: string | null
  end_date: string | null
  description: string | null
}
export interface CandidateEducation {
  id: number
  title: string
  institution: string | null
  status: string | null
  description: string | null
}
export interface CandidateLanguage { id: number; name: string; skills: string | null }
export interface CandidatePreferences {
  interested_in: string | null
  hours: string | null
  availability: string | null
  availability_times: string | null
  location: string | null
  transport: string | null
}
export interface CandidateNextUp { type: string | null; date_time: string | null }

export interface Candidate {
  id: number
  job_id: number
  contact_id: number | null
  initials: string | null
  role: string | null
  avatar_color: string | null
  location: string | null
  phone: string | null
  email: string
  applied_on: string | null
  source: string | null
  referral: string | null
  status: CandidateStatus
  match_level: MatchLevel
  personal_summary: string | null
  resume_url: string | null
  cover_letter: string | null
  driver_licence_classes: string | null
  driver_licence_endorsements: string | null
  applied_at: string
  updated_at: string
}

/**
 * A candidate with every child collection hydrated. One shape for both the list
 * and the detail endpoint — the previous build returned snake_case children from
 * the list and camelCase children from the detail, for the same entity.
 */
export interface CandidateDetail extends Candidate {
  job_title: string | null
  strengths: CandidateStrength[]
  experience: CandidateExperience[]
  education: CandidateEducation[]
  languages: CandidateLanguage[]
  work_skills: string[]
  other_skills: string[]
  preferences: CandidatePreferences | null
  next_up: CandidateNextUp | null
}

export type CandidateStatusCounts = Record<CandidateStatus, number>
