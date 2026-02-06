---
name: incident-lifecycle
version: 1.0.0
description: Complete incident lifecycle management from creation through resolution and closure
author: Happy Technologies LLC
tags: [itsm, incident, lifecycle, resolution, closure, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Create-Incident
    - SN-Get-Incident
    - SN-Update-Incident
    - SN-Assign-Incident
    - SN-Resolve-Incident
    - SN-Close-Incident
    - SN-Add-Work-Notes
    - SN-Add-Comment
    - SN-Query-Table
  rest:
    - /api/now/table/incident
    - /api/now/table/sys_journal_field
  native:
    - Bash
complexity: intermediate
estimated_time: varies
---

# Incident Lifecycle Management

## Overview

This skill covers the complete lifecycle of an incident in ServiceNow, following ITIL best practices:

1. **Creation** - Log the incident with proper details
2. **Categorization** - Classify by type and service
3. **Prioritization** - Set impact, urgency, and priority
4. **Assignment** - Route to appropriate team
5. **Investigation** - Diagnose the issue
6. **Resolution** - Fix the issue and document
7. **Closure** - Verify and close the incident

## Prerequisites

- **Roles:** `itil` for most operations, `incident_manager` for some overrides
- **Access:** Read/write to incident table
- **Knowledge:** ITIL incident management fundamentals

## Procedure

### Phase 1: Incident Creation

Create a well-documented incident with all required information.

**Using MCP:**
```
Tool: SN-Create-Incident
Parameters:
  short_description: "Brief summary of the issue"
  description: "Detailed description including:
    - What happened
    - When it started
    - Who is affected
    - What has been tried"
  caller_id: [user_sys_id or username]
  category: software
  subcategory: application
  impact: 2
  urgency: 2
  assignment_group: Service Desk
```

**Using REST API:**
```bash
POST /api/now/table/incident
Content-Type: application/json

{
  "short_description": "Brief summary",
  "description": "Detailed description...",
  "caller_id": "user_sys_id",
  "category": "software",
  "impact": "2",
  "urgency": "2",
  "assignment_group": "group_sys_id"
}
```

**Best Practices for Creation:**
- Short description should be 10-50 characters
- Description should include who, what, when, where
- Always set caller (the affected user)
- Set category/subcategory for proper routing

### Phase 2: Categorization & Prioritization

Ensure the incident is properly classified.

**Category Hierarchy:**
```
Hardware
├── Computer
├── Monitor
├── Printer
└── Mobile Device

Software
├── Operating System
├── Application
├── Email
└── Database

Network
├── Connectivity
├── VPN
└── WiFi

Request
├── Access
├── Installation
└── Information
```

**Priority Matrix:**
| Impact ↓ / Urgency → | 1-High | 2-Medium | 3-Low |
|----------------------|--------|----------|-------|
| 1-High               | P1     | P2       | P3    |
| 2-Medium             | P2     | P3       | P4    |
| 3-Low                | P3     | P4       | P5    |

### Phase 3: Assignment

Route to the appropriate resolution team.

**Using MCP:**
```
Tool: SN-Assign-Incident
Parameters:
  sys_id: [incident_sys_id]
  assignment_group: Desktop Support
  assigned_to: john.smith  # Optional: specific person
  work_notes: "Assigned based on hardware category"
```

### Phase 4: Investigation & Diagnosis

Document all investigation steps.

**Add Work Notes (Internal):**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [incident_sys_id]
  work_notes: |
    Investigation Steps:
    1. Verified user credentials - OK
    2. Checked network connectivity - OK
    3. Reviewed application logs - Found error
    4. Identified root cause: Corrupted cache

    Next: Clear application cache and test
```

**Add Comments (Customer-visible):**
```
Tool: SN-Add-Comment
Parameters:
  sys_id: [incident_sys_id]
  comment: "We are investigating your issue and have identified a potential cause. We will update you shortly with a solution."
```

**State Transitions During Work:**
```
New (1) → In Progress (2) → On Hold (3) → In Progress (2) → Resolved (6)
```

**Update State:**
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  data:
    state: 2  # In Progress
    work_notes: "Starting investigation"
```

### Phase 5: Resolution

Document the fix and resolve the incident.

**Using MCP:**
```
Tool: SN-Resolve-Incident
Parameters:
  sys_id: [incident_sys_id]
  resolution_code: Solved (Permanently)
  resolution_notes: |
    Root Cause: Application cache was corrupted after update

    Resolution:
    1. Cleared application cache folder
    2. Restarted application service
    3. Verified user can now access the application

    Prevention: Scheduled cache cleanup added to maintenance window
```

**Resolution Codes:**
- `Solved (Permanently)` - Issue fully resolved
- `Solved (Workaround)` - Temporary fix applied
- `Not Solved (Not Reproducible)` - Could not reproduce
- `Not Solved (Too Costly)` - Fix not cost-effective
- `Closed/Resolved by Caller` - User resolved themselves

### Phase 6: Closure

Verify with user and close the incident.

**Add Customer Comment for Verification:**
```
Tool: SN-Add-Comment
Parameters:
  sys_id: [incident_sys_id]
  comment: "Your incident has been resolved. Please confirm the issue is fixed. If you don't respond within 3 business days, this incident will be automatically closed."
```

**Close the Incident:**
```
Tool: SN-Close-Incident
Parameters:
  sys_id: [incident_sys_id]
  close_code: Solved (Permanently)
  close_notes: "User confirmed resolution. Closing incident."
```

## State Flow Diagram

```
┌─────────┐    ┌────────────┐    ┌─────────┐
│   New   │───►│ In Progress│───►│ On Hold │
│   (1)   │    │    (2)     │◄───│   (3)   │
└────┬────┘    └─────┬──────┘    └─────────┘
     │               │
     │               ▼
     │         ┌──────────┐    ┌─────────┐
     └────────►│ Resolved │───►│ Closed  │
               │   (6)    │    │   (7)   │
               └──────────┘    └─────────┘
```

## Tool Usage Summary

| Phase | MCP Tools | REST Endpoints |
|-------|-----------|----------------|
| Create | SN-Create-Incident | POST /incident |
| Update | SN-Update-Record | PATCH /incident/{id} |
| Assign | SN-Assign-Incident | PATCH /incident/{id} |
| Notes | SN-Add-Work-Notes, SN-Add-Comment | POST /sys_journal_field |
| Resolve | SN-Resolve-Incident | PATCH /incident/{id} |
| Close | SN-Close-Incident | PATCH /incident/{id} |

## Best Practices

- **Update Regularly:** Add work notes every 30-60 minutes during active work
- **Customer Communication:** Add comments at key milestones
- **Complete Documentation:** Future incidents benefit from detailed notes
- **Proper Closure:** Always get user confirmation when possible
- **Link Related Records:** Connect to problems, changes, or knowledge articles

## Troubleshooting

### Cannot change state

**Cause:** State transition not allowed or missing required fields
**Solution:** Check state transition rules; ensure resolution fields are set before resolving

### Work notes not appearing

**Cause:** Journal field permissions or wrong field name
**Solution:** Verify role permissions; use `work_notes` not `comments` for internal notes

### Incident auto-reopened

**Cause:** User replied to notification email
**Solution:** Check inbound email actions; update work notes to acknowledge

## Related Skills

- `itsm/incident-triage` - Initial triage process
- `itsm/major-incident` - P1 incident handling
- `itsm/problem-analysis` - Root cause analysis
- `admin/sla-management` - SLA tracking

## References

- [ServiceNow Incident Management](https://docs.servicenow.com)
- [ITIL 4 Incident Management Practice](https://www.itil.org)
