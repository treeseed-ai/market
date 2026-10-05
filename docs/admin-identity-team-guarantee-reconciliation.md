# Admin Identity and Team Guarantee Reconciliation

Date: 2026-07-25

Requirements input: `/home/adrian/Downloads/treeseed.journeys.csv`, rows 1–20.

Canonical source: package-local manifests under
`packages/admin/guarantees/{user,team}/`.

The downloaded CSV is an input report and was not edited. The package manifests
correct stale `/admin/**` routes to the current `/auth`, `/app/account`,
`/app/teams`, `/team-invites`, `/u`, and `/t` surfaces. Generated run CSV, JSON,
Markdown, and execution-graph artifacts are derived from those manifests.

## Reconciliation

| CSV | Guarantee | Canonical entry route | Execution key | Canonical prerequisite |
| ---: | --- | --- | --- | --- |
| 1 | `guarantee.user.auth.register-user.001` | `/auth/register` | `admin.identity.onboarding` | none |
| 2 | `guarantee.user.auth.verify-email.002` | `/auth/register` (shared registration, Mailpit confirmation, dashboard journey) | `admin.identity.onboarding` | shared with 001 |
| 3 | `guarantee.user.auth.forgot-reset-password.003` | `/auth/forgot-password` | `admin.identity.password-reset` | 001 + 002 |
| 4 | `guarantee.user.auth.user-login.004` | `/auth/sign-in` | `admin.identity.login` | 003 |
| 5 | `guarantee.user.auth.user-logout.005` | `/app/` | `admin.identity.logout` | 016 |
| 6 | `guarantee.user.account.edit-account-settings.006` | `/app/account` | `admin.account.edit-profile` | 004 |
| 7 | `guarantee.user.account.manage-sessions.007` | `/app/account/sessions` | `admin.account.sessions` | 004 |
| 8 | `guarantee.user.account.manage-notifications.008` | `/app/account/notifications` | `admin.account.notifications` | 004 |
| 9 | `guarantee.user.account.manage-appearance.009` | `/app/account/appearance` | `admin.account.appearance` | 004 |
| 10 | `guarantee.user.account.view-user-profile.010` | `/u/{username}` | `admin.account.public-profile` | 006 |
| 11 | `guarantee.user.account.delete-user.011` | `/app/account/delete` | `admin.account.delete` | 005 |
| 12 | `guarantee.team.team.create-team.012` | `/app/teams/new` | `admin.team.create` | 004 |
| 13 | `guarantee.team.team.switch-active-team.013` | `/app/teams` | `admin.team.select-active` | 012 |
| 14 | `guarantee.team.team.edit-team-settings.014` | `/app/teams/{teamId}/edit` | `admin.team.edit` | 013 |
| 15 | `guarantee.team.team.view-team-profile.015` | `/t/{slug}` | `admin.team.public-profile` | 014 |
| 16 | `guarantee.team.team.delete-team.016` | `/app/teams/{teamId}/delete` | `admin.team.delete` | 015 + 020 |
| 17 | `guarantee.team.membership.invite-team-members.017` | `/app/teams/{teamId}/members` | `admin.team.invite` | 014 |
| 18 | `guarantee.team.membership.accept-team-invitation.018` | `/team-invites/{token}/accept` | `admin.team.accept-invite` | 017 |
| 19 | `guarantee.team.membership.change-member-role.019` | `/app/teams/{teamId}/members` | `admin.team.change-member-role` | 018 |
| 20 | `guarantee.team.membership.remove-team-member.020` | `/app/teams/{teamId}/members` | `admin.team.remove-member` | 019 |

Rows 1 and 2 intentionally remain separate product promises while sharing one
composite execution per required device. No other row shares an execution key.
Later-index dependencies for destructive lifecycle operations are intentional
and are ordered topologically rather than by CSV position.

## Implemented journey boundaries

- Onboarding covers invalid registration, valid form submission, the Check
  Email page, exact-message lookup through Mailpit, confirmation-link
  navigation, verified session creation, and authenticated dashboard arrival.
- Password reset covers request, Mailpit delivery, reset-link navigation,
  password replacement, and successful authentication with the new password.
- Account journeys mutate and reload profile, session, notification, and
  appearance state. Public profile verification uses an anonymous context and
  asserts private data is absent.
- Team journeys create and select run-scoped teams, persist active-team browser
  state, edit identity, verify anonymous profile redaction, deliver and accept
  an exact invitation, change and remove the resulting membership, then delete
  the team and clear its active context.
- Logout proves the primary session is revoked. Account deletion runs last from
  the preserved onboarding session, exercises confirmation and reauthentication
  guards, deletes the identity, and proves it can no longer authenticate.

## Execution and evidence contract

Each required device gets one topological execution graph. A graph node is
identified by execution key and device; each distinct node executes once.
Shared guarantee IDs receive the same status and evidence paths. Graph artifacts
record dependencies, produced and consumed run state, status, and evidence.

Run state supports durable markers and one browser-storage input per node.
Validation rejects missing or unrelated producers, duplicate producers, cycles,
consumer-before-producer ordering, multiple browser-storage inputs, and active
journeys without meaningful interaction and durable assertions.

Run-scoped substitutions (`runId`, `runShort`, and `deviceId`) isolate emails,
usernames, team slugs, invitation recipients, and cleanup identifiers between
repeated runs.

## Accepted local runs

- `2026-07-25T22-21-27-420Z`: 20 passed; 0 failed, blocked, or skipped.
- `2026-07-25T22-35-39-881Z`: 20 passed; 0 failed, blocked, or skipped.

Each run contains 38 unique execution-key/device nodes, 36 populated state
entries, zero graph self-cycles, zero duplicate nodes, and zero missing
evidence paths. The Register User and Verify Email results share the same scene
evidence on both required devices. Post-run cleanup removed both invited
identities, and all four run-owned public team lookups return HTTP 404.
