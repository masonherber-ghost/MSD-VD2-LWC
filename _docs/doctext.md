Test Title: View and manage job vacancies across lifecycle statuses.
Scenario ID: QA-R1.1-EMP-004
Target Experience Fidelity Level: Expected
Employers come back to this page every visit.
Given (Preconditions):
Employer user is logged into the portal (SVD-941).
Employer organisation has multiple vacancies in various lifecycle states (Draft, In Review, Published, and Closed).
When (Action Sequence):
User navigates to the Job vacancies list (SVD-941, SVD-968).
User interacts with basic filtering or sorting controls for employers with many vacancies.
Then (Expected Outcome):
Portal renders a unified list of all vacancies belonging exclusively to the user's organisation (SVD-946 boundary).
Each listing displays an accurate status mapped to backend Salesforce/CMS state (SVD-944, SVD-962): Draft, Under Review, Published, Withdrawn, or Closed.
State-governed action controls display dynamically per item:
Draft  > Action: "Resume / Edit" or "Discard".
In Review > Action: "View Details" (Read-Only).
Published > Action: "View Details" (Read-Only) or "Close".
Closed > Action: "View Details" (Read-Only).
Discarded drafts are completely excluded from the visible display list.
Upon submission, the vacancy is locked against direct employer edits or withdrawal. Explanatory content is displayed prompting the user to contact MSD to request any updates or withdrawal.
Use-Case Variations & Offramps:
Variation 4A (Empty State): Organisation has zero active vacancies. Workspace displays helpful guidance and a prominent "Create Vacancy" call-to-action button.
In & Outs (as agreed in meeting with Anna, 05/10/26):
In: Employer-facing status labels may need to be different from the the current SF staff-facing labels. Can we review these and match them up to be more intuitive for our staff as well as our employers
