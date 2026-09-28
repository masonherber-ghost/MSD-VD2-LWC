-- Recruitment schema — consolidated baseline.
--
-- Ported from the previous build (_reference). That database reached this shape
-- through a base schema.sql plus 32 migrations of churn (renames, column drops,
-- backfills, table rebuilds). None of that history means anything to a fresh
-- database, and _reference/server/db/schema.sql had drifted out of sync with it,
-- so this is the END STATE taken from the live recruitment.db, not a replay.
--
-- Three deliberate changes from the reference are marked CHANGED below.

-- ---------------------------------------------------------------------------
-- Identity: ciam -> contacts -> accounts
-- ---------------------------------------------------------------------------

-- Login credentials. One row per user regardless of role.
CREATE TABLE IF NOT EXISTS ciam (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  -- CHANGED: the reference stored plaintext and compared it inside the SQL
  -- (WHERE email = ? AND password = ?). Now scrypt: salt + derived key, both
  -- hex, verified with timingSafeEqual.
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- People. Every person who interacts with the platform gets a row.
-- `domain` splits employers from job seekers.
CREATE TABLE IF NOT EXISTS contacts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  ciam_id           INTEGER UNIQUE,            -- null until they have a login
  domain            TEXT NOT NULL CHECK (domain IN ('client', 'employer')),
  employer_role     TEXT DEFAULT 'member' CHECK (employer_role IN ('admin', 'member')),
  -- 'active'  = a portal user who has accepted
  -- 'pending' = invited, not yet accepted
  -- 'none'    = a real person we hold details for who is NOT a portal user
  invitation_status TEXT DEFAULT 'active' CHECK (invitation_status IN ('active', 'pending', 'none')),
  invite_email      TEXT,                      -- used when inviting before a ciam account exists
  account_id        INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  first_name        TEXT,
  last_name         TEXT,
  phone             TEXT,
  job_title         TEXT,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ciam_id) REFERENCES ciam(id) ON DELETE CASCADE
);

-- Employer companies. One account per company, many contacts per account.
-- contact_id / secondary_contact_id record AUTHORITY, not who registered:
-- if the registering user says they are not the authorised contact, the person
-- they name becomes primary and the registrant is demoted to secondary.
CREATE TABLE IF NOT EXISTS accounts (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id            INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  secondary_contact_id  INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  company_name          TEXT,
  industry              TEXT,
  -- The sub-industry under `industry`, shown as "Industry > Detail". MSD's
  -- record like the rest of the classification, so it is read-only in the
  -- portal: deliberately absent from ACCOUNT_UPDATABLE.
  industry_detail       TEXT,
  company_type          TEXT,
  company_address       TEXT,
  workplace_address     TEXT,
  trading_name          TEXT,
  ird_number            TEXT,
  nzbn                  TEXT,
  gst_registered        INTEGER DEFAULT 0,
  preferred_language    TEXT DEFAULT 'English',
  web_address           TEXT,
  logo_url              TEXT,                  -- path only; file lives in server/uploads
  company_description   TEXT,
  verified              INTEGER DEFAULT 0,
  -- MSD's assigned relationship manager for this employer. MSD's record, so
  -- the portal shows it and never writes it: it is deliberately absent from
  -- ACCOUNT_UPDATABLE in account-repository.ts, which is what actually enforces
  -- that. Set it through /data or a seed script.
  relationship_manager  TEXT,
  selling_point_1       TEXT,
  selling_point_2       TEXT,
  selling_point_3       TEXT,
  campaign_length_weeks INTEGER DEFAULT 3,
  max_shortlist         INTEGER,
  interview_options     TEXT DEFAULT '[]',     -- JSON array
  pre_employment_checks TEXT DEFAULT '[]',     -- JSON array
  show_company_profile  INTEGER DEFAULT 1,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS jobs (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  -- CHANGED: the reference scoped jobs by the individual (ciam_id) via
  -- `user_id IN (SELECT id FROM contacts WHERE ciam_id = ?)`, so a second admin
  -- on the same employer account could not see a colleague's vacancies — the
  -- multi-user model existed and was then bypassed. Jobs now belong to the
  -- ACCOUNT; contact_id records who created it.
  account_id             INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- CHANGED: was `user_id`, which actually referenced contacts(id) and misled
  -- every join that read it.
  contact_id             INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  vacancy_contact_id     INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  title                  TEXT NOT NULL,
  subtitle               TEXT,
  company_name           TEXT,                 -- when it differs from the account
  description            TEXT,
  about_us               TEXT,
  location               TEXT,
  pay                    TEXT,                 -- free text, e.g. "$33 - 49 per hour"
  contract_type          TEXT,
  start_date             TEXT,
  hours_description      TEXT,                 -- e.g. "Part time, 36h/week"
  posted_date            TEXT,
  closing_date           TEXT,
  external_job_id        TEXT,                 -- stable business key; re-seed matches on it
  experience_level       TEXT,
  education_required     TEXT,
  job_type               TEXT,
  -- Icon SLUG, not a path: names src/assets/icons/<slug>.svg. Auto-filled
  -- from job_type by server/lib/job-icons.ts on every write that carries a
  -- job_type and no explicit icon, so it can still be overridden per job.
  -- NULL is a real state -- the card falls back to standard:job_profile.
  icon                   TEXT,
  driver_licence_label   TEXT,
  max_shortlist          INTEGER,
  positions_available    INTEGER,
  application_management TEXT DEFAULT '[]',    -- JSON array
  interview_options      TEXT DEFAULT '[]',    -- JSON array
  campaign_length_weeks  INTEGER DEFAULT 3,
  views                  INTEGER DEFAULT 0,
  status                 TEXT DEFAULT 'draft'
                           CHECK (status IN ('draft', 'in_review', 'active', 'closed')),
  created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_responsibilities (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id  INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_selling_points (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id  INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_pre_employment_checks (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id  INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_employer_values (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id  INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_skills (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id     INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_certificates (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id           INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  certificate_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_schedule (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id          INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  schedule_type   TEXT,                        -- e.g. "Set schedule"
  hours           TEXT,                        -- e.g. "Day time (9am - 5pm)"
  additional_info TEXT
);

CREATE TABLE IF NOT EXISTS job_schedule_days (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id   INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  day_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_languages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id        INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  language_name TEXT NOT NULL
);

-- Abilities hang off the language, not the job.
CREATE TABLE IF NOT EXISTS job_language_abilities (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  language_id INTEGER NOT NULL REFERENCES job_languages(id) ON DELETE CASCADE,
  ability     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_driver_licences (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id      INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  class_value TEXT NOT NULL,
  class_label TEXT NOT NULL,
  stage       TEXT
);

CREATE TABLE IF NOT EXISTS job_licence_endorsements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id      INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  endorsement TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Candidates
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS candidates (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id                      INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contact_id                  INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  initials                    TEXT,
  role                        TEXT,
  avatar_color                TEXT,
  location                    TEXT,
  phone                       TEXT,
  email                       TEXT NOT NULL,
  applied_on                  TEXT,
  source                      TEXT,
  referral                    TEXT,
  -- 'shortlisted' is in this list because the previous build's data and UI both
  -- used it, while its schema comment listed a vocabulary that did not include
  -- it. Resolving the drift in favour of what is actually used: 5 of the 9
  -- seeded candidates are shortlisted, and the UI's tabs are
  -- applied / shortlisted / rejected.
  status                      TEXT DEFAULT 'applied'
                                CHECK (status IN ('applied', 'screening', 'shortlisted',
                                                  'interview', 'offer', 'rejected', 'sourced')),
  match_level                 TEXT DEFAULT 'none'
                                CHECK (match_level IN ('strong', 'partial', 'low', 'none')),
  personal_summary            TEXT,
  resume_url                  TEXT,
  cover_letter                TEXT,
  driver_licence_classes      TEXT,
  driver_licence_endorsements TEXT,
  applied_at                  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidate_strengths (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT
);

CREATE TABLE IF NOT EXISTS candidate_experience (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  role         TEXT NOT NULL,
  organization TEXT NOT NULL,
  period       TEXT,
  start_date   TEXT,
  end_date     TEXT,
  description  TEXT
);

CREATE TABLE IF NOT EXISTS candidate_education (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  institution  TEXT,
  status       TEXT,                           -- e.g. "Completed", "In Progress"
  description  TEXT
);

CREATE TABLE IF NOT EXISTS candidate_languages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  skills       TEXT                            -- e.g. "Fluent - Read, write and speak"
);

CREATE TABLE IF NOT EXISTS candidate_skills (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  skill_name   TEXT NOT NULL,
  skill_type   TEXT                            -- 'work' or 'other'
);

CREATE TABLE IF NOT EXISTS candidate_preferences (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id       INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  interested_in      TEXT,
  hours              TEXT,
  availability       TEXT,
  availability_times TEXT,
  location           TEXT,
  transport          TEXT
);

CREATE TABLE IF NOT EXISTS candidate_next_up (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  type         TEXT,                           -- e.g. "Interview"
  date_time    TEXT
);

-- ---------------------------------------------------------------------------
-- Supporting
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ird_verification_codes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ird_number TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used       INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Indexes
--
-- The reference had 8 and none on contacts.account_id, which every
-- account-scoped page filters on. Covering every foreign key that is read.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_contacts_account_id      ON contacts (account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_domain          ON contacts (domain);
CREATE INDEX IF NOT EXISTS idx_accounts_contact_id      ON accounts (contact_id);
CREATE INDEX IF NOT EXISTS idx_accounts_secondary       ON accounts (secondary_contact_id);

CREATE INDEX IF NOT EXISTS idx_jobs_account_id          ON jobs (account_id);
CREATE INDEX IF NOT EXISTS idx_jobs_contact_id          ON jobs (contact_id);
CREATE INDEX IF NOT EXISTS idx_jobs_vacancy_contact_id  ON jobs (vacancy_contact_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status              ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_external_job_id     ON jobs (external_job_id);

CREATE INDEX IF NOT EXISTS idx_candidates_job_id        ON candidates (job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_contact_id    ON candidates (contact_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status        ON candidates (status);
CREATE INDEX IF NOT EXISTS idx_candidates_email         ON candidates (email);

CREATE INDEX IF NOT EXISTS idx_job_responsibilities_job ON job_responsibilities (job_id);
CREATE INDEX IF NOT EXISTS idx_job_selling_points_job   ON job_selling_points (job_id);
CREATE INDEX IF NOT EXISTS idx_job_pre_emp_checks_job   ON job_pre_employment_checks (job_id);
CREATE INDEX IF NOT EXISTS idx_job_employer_values_job  ON job_employer_values (job_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_job           ON job_skills (job_id);
CREATE INDEX IF NOT EXISTS idx_job_certificates_job     ON job_certificates (job_id);
CREATE INDEX IF NOT EXISTS idx_job_schedule_job         ON job_schedule (job_id);
CREATE INDEX IF NOT EXISTS idx_job_schedule_days_job    ON job_schedule_days (job_id);
CREATE INDEX IF NOT EXISTS idx_job_languages_job        ON job_languages (job_id);
CREATE INDEX IF NOT EXISTS idx_job_lang_abilities_lang  ON job_language_abilities (language_id);
CREATE INDEX IF NOT EXISTS idx_job_driver_licences_job  ON job_driver_licences (job_id);
CREATE INDEX IF NOT EXISTS idx_job_licence_endorse_job  ON job_licence_endorsements (job_id);

CREATE INDEX IF NOT EXISTS idx_cand_strengths_cid       ON candidate_strengths (candidate_id);
CREATE INDEX IF NOT EXISTS idx_cand_experience_cid      ON candidate_experience (candidate_id);
CREATE INDEX IF NOT EXISTS idx_cand_education_cid       ON candidate_education (candidate_id);
CREATE INDEX IF NOT EXISTS idx_cand_languages_cid       ON candidate_languages (candidate_id);
CREATE INDEX IF NOT EXISTS idx_cand_skills_cid          ON candidate_skills (candidate_id);
CREATE INDEX IF NOT EXISTS idx_cand_preferences_cid     ON candidate_preferences (candidate_id);
CREATE INDEX IF NOT EXISTS idx_cand_next_up_cid         ON candidate_next_up (candidate_id);
