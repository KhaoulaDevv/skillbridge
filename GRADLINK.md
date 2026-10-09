# SkillBridge — graduate recruitment workspace

This project extends the original job-portal codebase by jrodolfo. Keep its LICENSE and attribution. Describe SkillBridge's changes as your contribution in the PFE report.

## Running locally

Run `Start-JobPortal.cmd`, or the default VS Code build task. React runs at http://localhost:5173 and Spring Boot at http://localhost:8080. The launcher uses the project database on MySQL port 3308. Backend changes require a Maven package build and a backend restart. Frontend changes reload through Vite.

## Accounts and workflow

- Applicants register, complete a profile, upload a PDF CV (up to 5 MB), browse openings, inspect skill matching, apply, and use application conversations.
- Administrators create company workspaces and a recruiter account for each company. Recruiters sign in through the same login page. Each company currently has one recruiter account.
- Recruiters manage only their own company's jobs, applications, interviews, candidate profiles/CVs and conversations. Administrators can manage all workspaces.
- Application stages include Applied, Reviewing, Interview, Offer, Hired, Rejected and Withdrawn. Existing Accepted records remain supported. Moving a stage records a timestamp and actor; older records do not acquire invented history.
- Interviews retain their separate date, duration and location. Moving a pipeline stage does not schedule a meeting. Rejection or withdrawal clears an interview.
- Messages stay in the portal. The Email candidate button opens a draft in the user's email client; there is no automatic SMTP delivery.

## Explainable matching

The Spring service `SkillMatchingService` compares explicitly entered, comma/semicolon/newline-separated skills. It trims text, folds case, deduplicates and normalizes a small documented alias set (for example React.js → React).

Score = 100 × matched required skills / unique required skills, rounded to an integer. Every required skill has equal weight. No required skills means no score, rather than a misleading zero. Missing candidate skills produce zero coverage when requirements exist. The response includes matching skills, missing skills, requirements, method name and an explanation. It does not infer skills from a CV, use demographic attributes or make hiring decisions.

For a PFE evaluation, create a labeled collection of candidate/job skill pairs, measure matching agreement with human assessments, and document the limitations of exact matching. The current implementation is a deterministic baseline, not a trained AI model.

## Analytics

Counts and stage distributions come from records visible to the current staff account. Hires means current HIRED applications. Interviews counts applications with a saved interview. Average days to hire uses application creation and the first recorded HIRED history event for currently hired applications; unknown history is excluded. Stage bars show current distribution, not historical conversion rates.

## Data and access

Flyway V6 adds company ownership, candidate profiles, PDF storage, messages and history without deleting existing jobs or applications. Existing jobs have no company owner and remain managed by the platform administrator. Jobs with applications cannot be reassigned through the workspace API. Password hashes and CV bytes are excluded from normal JSON responses; CV downloads require explicit authorization. Company creation is transactional, so a failed operation does not leave a partial recruiter account.

## Verification

Backend tests use the isolated H2 test profile, including company isolation, CV permissions, stage history, messaging, interview permissions and matching edge cases. Run Maven `test` using Java 21. On Node 26, run frontend Vitest with `NODE_OPTIONS=--no-experimental-webstorage` so the browser test environment supplies localStorage.
