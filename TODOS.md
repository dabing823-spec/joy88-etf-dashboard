# TODOS

## AI Advisor

**Priority:** P2
**Phase 2: FastAPI + WebSocket + event-driven triggers**
Enable real-time advisor re-analysis on macro anomalies.
Depends on: Phase 1 stable for 2+ weeks.

**Priority:** P3
**Existing agent test backfill**
pytest infrastructure now exists, backfilling existing agents is cheap (CC ~30min).
Depends on: advisor feature complete.

## Design

**Priority:** P3
**Codebase-wide focus-visible styles**
Only `hover:bg-card-hover` exists, no keyboard focus indicators on most elements.
AdvisorCard has them locally, but all interactive elements need `focus-visible:ring-2 focus-visible:ring-accent`.
Depends on: AdvisorCard complete (CC ~15min).
