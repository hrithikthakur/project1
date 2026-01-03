# Risk Acceptance Workflow - Implementation

## Overview

Proper implementation of Risk Acceptance (Rule 2) that aligns with the principle: **"Acceptance is a temporary posture, not a permanent state."**

---

## Changes Implemented

### 1. Risk Model Updates ✅

**File:** `backend/app/models/risk.py`

Added new fields to track acceptance state:

```python
# Acceptance fields (for ACCEPTED status)
accepted_at: Optional[datetime] = None
accepted_by: Optional[str] = None  # Actor ID who approved acceptance
acceptance_boundary: Optional[dict] = None  # Boundary condition
next_date: Optional[datetime] = None  # Next review date

# Mitigation fields (for MITIGATING status)  
mitigation_started_at: Optional[datetime] = None
mitigation_decision: Optional[str] = None
mitigation_action: Optional[str] = None
mitigation_due_date: Optional[datetime] = None
```

Added `MITIGATING` status to `RiskStatus` enum:
- `ACTIVE` - Risk exists, no action yet
- `MITIGATING` - Actively working on mitigation 🆕
- `MITIGATED` - Mitigation completed
- `RESOLVED` - Risk no longer exists
- `ACCEPTED` - Risk accepted, quiet monitoring

---

### 2. Rule 2 Enhancement ✅

**File:** `backend/app/engine/decision_risk_engine.py`

#### When Accept Risk Decision is Approved:

**Step 1: Update Risk State**
```python
{
    "status": "accepted",
    "accepted_at": now(),
    "accepted_by": approver_actor_id,
    "acceptance_boundary": {
        "type": "date" | "threshold" | "event",
        "date": boundary_date,
        "threshold": threshold_value,
        "trigger": event_trigger
    },
    "next_date": min(boundary_date, now + 7 days)
}
```

**Step 2: Set Next Review Date**
- **Default review interval:** 7 days
- **Logic:** `next_date = min(boundary_date, now + 7 days)`
- If boundary is sooner → use boundary date
- If no boundary → use now + 7 days

**Step 3: Configure Escalation Behavior**
```python
{
    "suppress_escalation_until": boundary_date,
    "escalation_mode": "quiet_monitoring"
}
```

#### Acceptance Boundary Types

1. **Date Boundary**
   ```python
   {
       "type": "date",
       "date": "2026-02-03"
   }
   ```
   Accept until specific date

2. **Threshold Boundary**
   ```python
   {
       "type": "threshold",
       "threshold": "P80 > 30 days"
   }
   ```
   Accept unless threshold exceeded

3. **Event Boundary**
   ```python
   {
       "type": "event",
       "trigger": "milestone_missed"
   }
   ```
   Accept unless event occurs

---

### 3. Frontend Display ✅

**File:** `frontend/src/components/RisksView.tsx`

#### Accepted Risk Card Display

Shows comprehensive acceptance information:

```
┌─────────────────────────────────────────────┐
│ ✓ Risk Accepted                             │
│                                             │
│ Accepted on: Jan 3, 2026 at 2:30 PM       │
│ Accepted by: actor_001                      │
│ Next review: Jan 10, 2026                   │
│                                             │
│ ─────────────────────────────────────────  │
│ Boundary: Until Feb 3, 2026                │
│                                             │
│ 🔕 Quiet Monitoring:                       │
│ Escalations suppressed. Monitoring for     │
│ boundary breach or next review date.       │
└─────────────────────────────────────────────┘
```

**Visual Design:**
- Gray background (`#f8f9fa`)
- Gray left border (`#95a5a6`)
- Check mark icon (✓)
- Quiet monitoring notice with bell-off icon (🔕)
- Blue info box explaining behavior

#### Mitigating Risk Card Display

Shows mitigation progress:

```
┌─────────────────────────────────────────────┐
│ 🛠️ Mitigation In Progress                   │
│                                             │
│ Action: Break migration into 3 smaller     │
│         incremental steps with rollback    │
│                                             │
│ Started: Jan 3, 2026                       │
│ Due: Jan 17, 2026                          │
└─────────────────────────────────────────────┘
```

**Visual Design:**
- Light blue background (`#e3f2fd`)
- Blue left border (`#3498db`)
- Wrench icon (🛠️)
- Action description
- Timeline information

#### Status Badge Colors

- `active` - 🔴 Red (`#e74c3c`)
- `mitigating` - 🔵 Blue (`#3498db`) 🆕
- `mitigated` - 🟠 Orange (`#f39c12`)
- `resolved` - 🟢 Green (`#27ae60`)
- `accepted` - ⚪ Gray (`#95a5a6`)

---

### 4. Sample Data ✅

**File:** `data/mock_world.json`

#### Accepted Risk Example

```json
{
    "id": "risk_002",
    "title": "Resource Availability Constraint",
    "description": "Key engineers may be unavailable...",
    "status": "accepted",
    "accepted_at": "2026-01-03T14:30:00Z",
    "accepted_by": "actor_001",
    "acceptance_boundary": {
        "type": "date",
        "date": "2026-02-03"
    },
    "next_date": "2026-01-10T00:00:00Z"
}
```

#### Mitigating Risk Example

```json
{
    "id": "risk_003",
    "title": "Database Migration Complexity",
    "status": "mitigating",
    "mitigation_started_at": "2026-01-03T16:00:00Z",
    "mitigation_action": "Break migration into 3 smaller steps...",
    "mitigation_due_date": "2026-01-17T00:00:00Z"
}
```

---

## Escalation Behavior

### ✅ Allowed (Always Visible)

1. **Show risk on milestone page** - Risk remains visible
2. **Include in probability model** - Still affects forecasts
3. **Track drift** - Monitor if situation changes
4. **Display on dashboards** - Full transparency
5. **Include in reports** - Risk is documented

### ❌ Suppressed (Quiet Monitoring)

1. **"High urgency" alerts every day** - No noisy notifications
2. **Auto-creating duplicate issues** - Unless risk materializes
3. **Escalation emails** - Suppressed until boundary
4. **Urgent notifications** - Only if boundary breached
5. **Status meeting alerts** - Marked as "monitoring"

---

## Workflow Examples

### Example 1: Accept Risk with Date Boundary

**Scenario:** Team decides to accept technical debt risk for 30 days

**Decision:**
```json
{
    "decision_type": "accept_risk",
    "risk_id": "risk_002",
    "acceptance_until": "2026-02-03"
}
```

**Engine Actions:**
1. Sets `risk.status = "accepted"`
2. Records `accepted_at`, `accepted_by`, `acceptance_boundary`
3. Calculates `next_date = min(Feb 3, Jan 10) = Jan 10` (7 days)
4. Suppresses escalations until Feb 3
5. Sets escalation mode to "quiet_monitoring"

**Result:**
- Risk shown with gray "ACCEPTED" badge
- Next review: Jan 10 (in 7 days)
- Boundary: Feb 3
- No urgent alerts until boundary or review date

### Example 2: Accept Risk with Threshold

**Scenario:** Accept schedule risk unless delay > 30 days

**Decision:**
```json
{
    "decision_type": "accept_risk",
    "risk_id": "risk_003",
    "threshold": "P80_delay > 30 days"
}
```

**Engine Actions:**
1. Sets status to "accepted"
2. Stores threshold boundary
3. Calculates `next_date = now + 7 days`
4. Monitors P80 delay continuously
5. Escalates only if threshold breached

**Result:**
- Quiet monitoring active
- Forecast still includes risk
- Alert only if P80 > 30 days
- Review every 7 days

### Example 3: Mitigate Risk

**Scenario:** Team decides to actively mitigate dependency risk

**Decision:**
```json
{
    "decision_type": "mitigate_risk",
    "risk_id": "risk_003",
    "action": "Break migration into smaller steps",
    "due_date": "2026-01-17"
}
```

**Engine Actions:**
1. Sets `risk.status = "mitigating"`
2. Records action, start date, due date
3. Sets `next_date = due_date`
4. Schedules forecast recomputation on completion

**Result:**
- Risk shown with blue "MITIGATING" badge
- Action plan visible
- Due date: Jan 17
- Active monitoring of progress

---

## Testing

### View Accepted Risk
1. Navigate to Risks page
2. Find "Resource Availability Constraint" (risk_002)
3. See gray "accepted" badge
4. View acceptance details in card body
5. Note "Quiet Monitoring" message

### View Mitigating Risk
1. Navigate to Risks page
2. Find "Database Migration Complexity" (risk_003)
3. See blue "mitigating" badge
4. View mitigation action and timeline

### Test Rule 2 via Engine
```bash
cd backend
./venv/bin/python -m app.engine.demo_decision_risk_engine
```

Look for Demo 2: Accept Risk Decision Approved

---

## Key Principles

### 1. Temporary Posture
✅ Acceptance is time-bounded  
✅ Regular reviews enforced (7 days default)  
✅ Boundary conditions tracked  

### 2. Transparency
✅ Risk remains visible everywhere  
✅ Acceptance clearly labeled  
✅ Who accepted and when documented  

### 3. Quiet Monitoring
✅ No noisy daily alerts  
✅ Still included in models  
✅ Escalate only on breach  

### 4. Accountability
✅ `accepted_by` field tracks approver  
✅ `next_date` ensures follow-up  
✅ `acceptance_boundary` defines limits  

---

## API Examples

### Accept Risk via Decision
```bash
# Create accept risk decision
curl -X POST http://localhost:8000/api/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "id": "dec_accept_001",
    "decision_type": "accept_risk",
    "subtype": "ACCEPT_UNTIL_DATE",
    "milestone_name": "MVP Launch",
    "status": "approved",
    "risk_id": "risk_002",
    "acceptance_until": "2026-02-03"
  }'

# Process via Decision-Risk Engine
curl -X POST "http://localhost:8000/api/decision-risk-engine/events/decision-approved?decision_id=dec_accept_001"
```

### View Updated Risk
```bash
curl http://localhost:8000/api/risks/risk_002 | python3 -m json.tool
```

Expected output includes:
```json
{
    "status": "accepted",
    "accepted_at": "2026-01-03T...",
    "accepted_by": "actor_001",
    "acceptance_boundary": {
        "type": "date",
        "date": "2026-02-03"
    },
    "next_date": "2026-01-10T..."
}
```

---

## Summary

✅ **Risk Model** - Extended with acceptance & mitigation fields  
✅ **Rule 2** - Properly implements acceptance workflow  
✅ **Frontend** - Beautiful display of acceptance info  
✅ **Sample Data** - Examples of accepted & mitigating risks  
✅ **Documentation** - Complete workflow guide  

**Result:** Risks can now be properly accepted with full tracking, quiet monitoring, and regular reviews. The system enforces that acceptance is temporary and bounded, not a way to ignore risks permanently.

---

**View it live:** Navigate to the Risks page and see risk_002 (Accepted) and risk_003 (Mitigating)! 🎉

