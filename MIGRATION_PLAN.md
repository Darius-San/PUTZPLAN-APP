# Putzplan Legacy → React Migration Plan (v2)

This document is the structured blueprint for the second, systematic migration from the legacy debug-demo and extracted modular JS files to the new React (Vite) codebase.

## 1. Legacy Feature Inventory

### Core Domains
- Profiles & Members
- Tasks & Checklists
- Task Executions (with points)
- Urgent Tasks & Availability (min interval)
- Ratings (per user → per task) & Pending Ratings Badge
- Absences (impacting monthly target)
- Temporary Residents (affect task point scaling)
- Period / Monthly Performance & History (pastMonths)
- Progress Bars (task rating, member completion, current rating flow)
- Dashboard Aggregations (today count, total tasks)
- Navigation Phases (multi-step onboarding + dashboard + managers)
- State Persistence & Backup (localStorage, auto backups – TBD port)

### Extracted Legacy Modules (assets/js)
| Module | Purpose | React Target | Priority |
|--------|---------|-------------|----------|
| navigation.js | Phase switching + history | Route/state machine hook | P1 |
| dashboard.js | Show dashboard + stats refresh | `<Dashboard />` effect + selectors | P1 |
| task-table.js | Grid of tasks × members (executions) | `<TaskTable />` | P1 |
| task-execution-modal.js | Select user for execution | `<ExecutionModal />` | P1 |
| task-management.js | Edit tasks + checklist + min days slider | `<TaskManager />` | P2 |
| task-controls.js | (Not yet extracted here) quick actions | `<TaskControls />` | P2 |
| recent-executions.js | Recent executions list | `<RecentExecutions />` | P1 |
| progress-bars.js | Progress metrics | `<ProgressBars />` | P2 |
| profile-overview.js | Rating entrypoint per user | `<RatingProfileOverview />` | P2 |
| profile.js | Individual profile mgmt (TBD) | `<ProfileSettings />` | P3 |
| absences.js | Absence CRUD + impact calc | `<AbsenceManager />` | P2 |
| absence-render.js | UI helpers (merged) | part of Absence UI | P2 |
| absence-list.js | Listing abstraction | part of Absence UI | P2 |
| temporary-residents.js | Temp residents lifecycle | `<TemporaryResidents />` | P2 |
| period.js | Current period + history calc | period store slice | P1 |
| stats-render.js | Monthly performance cards | `<MonthlyPerformance />` | P3 |
| state-restore.js | Persistence / restore | storage service | P1 |
| dynamic-render.js | DOM patch utilities | React diff (not needed) | Drop |
| ui-shims.js | Legacy DOM helpers | React utilities if needed | P3 |
| member-edit.js | Member edit form | `<MemberEditor />` | P3 |
| debug-inline.js | Seed/debug instrumentation | dev tools panel | P3 |
| app-legacy.js | Placeholder (empty) | n/a | Drop |

## 2. Parity Milestones
| Milestone | Scope | Success Criteria | Branch |
|-----------|-------|------------------|--------|
| M1 Dashboard Base | Profiles, Tasks, Executions (create & list) | Can execute task, see counts & today tally matches legacy seeded data | feature/m1-dashboard |
| M2 Task Table & Modal | Grid parity + execution modal | Same counts & stroke display logic; urgent highlighting; min interval gating | feature/m2-task-table |
| M3 Ratings Engine | Rate others’ executions, pending badge | Badge count matches legacy for same sequence of executions | feature/m3-ratings |
| M4 Absences & Temp Residents | CRUD + point scaling | Adjusted points & absence impact visible; monthly target recompute | feature/m4-availability |
| M5 Period History & Performance | Past months aggregation | Monthly performance matches legacy snapshot dataset | feature/m5-period-history |
| M6 Admin / Task Mgmt | Edit tasks, checklist, min days | Persist edits & affect availability calculations | feature/m6-task-mgmt |
| M7 Polish & Backup | LocalStorage versioning, backups | Backup/restore flows; migration script idempotent | feature/m7-backup |

## 3. Data Model (Target Shape)
```ts
// core entities
User { id: string; name: string; avatar: string; email?: string; }
Task { id: string; title: string; emoji?: string; description?: string; minDaysBetween?: number; checklist?: string[]; basePoints: number; }
TaskExecution { id: string; taskId: string; userId: string; date: ISODate; points: number; verified?: boolean; ratings?: Record<UserId, number>; }
Rating { id: string; executionId: string; raterId: string; value: number; created: ISODate; }
Absence { id: string; userId: string; startDate: ISODate; endDate: ISODate; reason: 'vacation'|'work'|'family'|'other'; }
TemporaryResident { id: string; profileId: string; name: string; icon: string; startDate: ISODate; endDate: ISODate; }
Period { id: string; name: string; start: ISODate; end: ISODate; targetPoints: number; }
```

## 4. Store Slices (Incremental)
- core: users, tasks, executions
- ratings: executionRatings, pending logic
- availability: absences, temporaryResidents, urgencyCalc
- period: current + history, monthly aggregation
- ui: modal state, navigation phase

## 5. Derived Selectors
- getExecutionsByTask(taskId)
- getTodayExecutionCount()
- getUserPointsInPeriod(userId, periodId)
- getPendingRatings(userId)
- isTaskUrgent(taskId)
- getNextExecutionDate(taskId)
- calculateAdjustedTaskPoints(taskId, date)

## 6. React Component Mapping
| Component | Responsibilities | Data Sources |
|-----------|------------------|--------------|
| Dashboard | High-level KPIs, navigation | tasks, executions, selectors |
| TaskTable | Matrix: tasks × members | tasks, users, executions, selectors |
| ExecutionModal | Select user + confirm execution | ui.modal, tasks, users |
| RecentExecutions | Chronological list | executions |
| ProgressBars | Rating/member progress | ratings, users, tasks |
| RatingProfileOverview | Per-user rating CTA | ratings, tasks, users |
| AbsenceManager | CRUD + impact calc | absences, period, selectors |
| TemporaryResidents | Active/past listing + add | temporaryResidents, selectors |
| TaskManager | Edit tasks + checklist + intervals | tasks |
| MonthlyPerformance | Historical performance grid | period, executions |

## 7. Migration Workflow
For each milestone:
1. Create feature branch.
2. Add types + slice tests (failing / red).
3. Implement store logic + selectors.
4. Build minimal components (unstyled skeleton) -> green tests.
5. Port rendering/presentation logic (styling later if needed).
6. Snapshot parity test using seeded deterministic dataset.
7. Add regression test for at least 1 edge case (e.g., min interval gating, overlapping absence, temp resident multiplier).
8. Merge (squash) after review.

## 8. Parity Test Strategy
- Deterministic seed (fixed dates & IDs)
- Mirror legacy scenario: 6 users, 18 tasks, controlled executions timeline
- Golden snapshot JSON for: tasks, executions, pendingRatingsCount(userX)
- For each milestone, assert subset of golden snapshot

## 9. Risk & Mitigation
| Risk | Impact | Mitigation |
|------|--------|------------|
| Divergent date logic | Wrong availability/points | Centralize date utils; freeze `Date.now()` in tests |
| Ratings edge ordering | Incorrect pending badge | Use stable executionId ordering (timestamp+counter) |
| LocalStorage schema drift | Data loss / migration bugs | Add schemaVersion + migration functions; test upgrade paths |
| Urgent task calc mismatch | UX inconsistency | Port logic verbatim + unit test legacy snippet |
| Temp residents scaling overshoot | Points inflation | Cap multiplier; test multiple residents scenario |

## 10. Open Questions
- Rating scale (int range?) confirm from legacy inline (TBD extract)
- Monthly target dynamic vs fixed 100? (legacy hardcoded 100)
- Execution verification workflow? (legacy partial?)

## 11. Immediate Next Steps
- [ ] Implement seed stabilizer util producing deterministic IDs/dates
- [ ] Set up test harness for golden snapshot (M1 base dataset)
- [ ] Add core store slices (users, tasks, executions) with selectors listed
- [ ] Create Dashboard skeleton reading selectors

(Will evolve as we implement milestones.)
