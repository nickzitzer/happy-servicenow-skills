---
name: quick-reference
version: 1.0.0
description: ITSM quick reference card with common operations, state values, priority matrix, and encoded query examples
author: Happy Technologies LLC
tags: [itsm, reference, cheatsheet, quick-start]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp: [SN-Query-Table, SN-Create-Record, SN-Update-Record, SN-Get-Record, SN-List-Incidents, SN-Create-Incident, SN-Update-Incident, SN-Close-Incident, SN-Assign-Incident, SN-Add-Work-Notes, SN-Search-Incidents, SN-List-ChangeRequests, SN-List-Problems]
  rest: [/api/now/table/incident, /api/now/table/change_request, /api/now/table/problem]
  native: []
complexity: beginner
estimated_time: 5 minutes
---

# ITSM Quick Reference

## Overview

A quick reference card for common ITSM operations in ServiceNow. Keep this handy for fast lookups of state values, priority matrices, and common query patterns.

- **What problem does it solve?** Quick lookup for common ITSM values and operations
- **Who should use this skill?** Anyone working with incidents, changes, or problems
- **What are the expected outcomes?** Faster development with fewer documentation lookups

## Procedure

### Incident Operations

### Quick Actions

| Action | MCP Tool | Key Parameters |
|--------|----------|----------------|
| List incidents | `SN-List-Incidents` | `query`, `limit` |
| Create incident | `SN-Create-Incident` | `short_description`, `caller_id`, `category` |
| Update incident | `SN-Update-Incident` | `sys_id`, field updates |
| Get incident | `SN-Get-Incident` | `sys_id` |
| Close incident | `SN-Close-Incident` | `sys_id`, `resolution_code`, `resolution_notes` |
| Assign incident | `SN-Assign-Incident` | `sys_id`, `assigned_to`, `assignment_group` |
| Add work notes | `SN-Add-Work-Notes` | `sys_id`, `work_notes` |
| Search incidents | `SN-Search-Incidents` | Natural language query |

### Create Incident

```
Tool: SN-Create-Incident
Parameters:
  short_description: Unable to access email
  description: User reports Outlook not connecting to server
  caller_id: <user_sys_id>
  category: software
  subcategory: email
  impact: 3
  urgency: 3
```

### Close Incident

```
Tool: SN-Close-Incident
Parameters:
  sys_id: <incident_sys_id>
  resolution_code: Solved (Permanently)
  resolution_notes: Restarted email service and cleared user cache
  close_notes: User confirmed email is working
```

### Assign Incident

```
Tool: SN-Assign-Incident
Parameters:
  sys_id: <incident_sys_id>
  assigned_to: <user_sys_id>
  assignment_group: <group_sys_id>
```

## State Values

### Incident States

| Value | Label | Description |
|-------|-------|-------------|
| 1 | New | Newly created, not yet triaged |
| 2 | In Progress | Work has started |
| 3 | On Hold | Waiting for external input |
| 6 | Resolved | Solution implemented, pending verification |
| 7 | Closed | Verified and closed |
| 8 | Canceled | Canceled (not applicable) |

### Change Request States

| Value | Label | Description |
|-------|-------|-------------|
| -5 | New | Draft state |
| -4 | Assess | Assessment phase |
| -3 | Authorize | Awaiting authorization |
| -2 | Scheduled | Approved and scheduled |
| -1 | Implement | Implementation in progress |
| 0 | Review | Post-implementation review |
| 3 | Closed | Successfully completed |
| 4 | Canceled | Change canceled |

### Problem States

| Value | Label | Description |
|-------|-------|-------------|
| 1 | New | Newly identified |
| 2 | Assess | Under assessment |
| 3 | Root Cause Analysis | Investigating root cause |
| 4 | Fix in Progress | Working on permanent fix |
| 5 | Resolved | Root cause addressed |
| 6 | Closed | Verified and closed |
| 7 | Canceled | Problem canceled |

### Change Types

| Value | Label | Description |
|-------|-------|-------------|
| standard | Standard | Pre-approved, low risk |
| normal | Normal | Requires CAB approval |
| emergency | Emergency | Expedited approval process |

## Priority Matrix

### Impact x Urgency = Priority

|           | Urgency 1 (High) | Urgency 2 (Medium) | Urgency 3 (Low) |
|-----------|------------------|---------------------|------------------|
| **Impact 1 (High)** | Priority 1 (Critical) | Priority 2 (High) | Priority 3 (Moderate) |
| **Impact 2 (Medium)** | Priority 2 (High) | Priority 3 (Moderate) | Priority 4 (Low) |
| **Impact 3 (Low)** | Priority 3 (Moderate) | Priority 4 (Low) | Priority 5 (Planning) |

### Priority Values

| Value | Label | SLA Target | Description |
|-------|-------|------------|-------------|
| 1 | Critical | 1 hour | Business critical, widespread impact |
| 2 | High | 4 hours | Significant business impact |
| 3 | Moderate | 24 hours | Limited business impact |
| 4 | Low | 72 hours | Minor inconvenience |
| 5 | Planning | No SLA | Future enhancement |

## Common Encoded Queries

### Incident Queries

| Description | Encoded Query |
|-------------|---------------|
| Active incidents | `active=true` |
| P1 incidents | `priority=1` |
| P1 or P2 incidents | `priority=1^ORpriority=2` |
| Unassigned incidents | `assigned_toISEMPTY` |
| Assigned incidents | `assigned_toISNOTEMPTY` |
| Created today | `sys_created_onONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()` |
| Created last 7 days | `sys_created_on>=javascript:gs.daysAgoStart(7)` |
| New state | `state=1` |
| In Progress | `state=2` |
| Resolved or Closed | `state=6^ORstate=7` |
| Not Closed | `state!=7` |
| My incidents | `assigned_to=javascript:gs.getUserID()` |
| My team's incidents | `assignment_group=<group_sys_id>` |
| Contains text | `short_descriptionLIKEnetwork` |
| Starts with | `numberSTARTSWITHINC00100` |
| Category is network | `category=network` |
| Ordered by priority | `ORDERBYpriority` |
| Ordered by created (newest) | `ORDERBYDESCsys_created_on` |

### Change Request Queries

| Description | Encoded Query |
|-------------|---------------|
| Emergency changes | `type=emergency` |
| Normal changes | `type=normal` |
| Standard changes | `type=standard` |
| Scheduled changes | `state=-2` |
| Changes this week | `start_dateONThis week@javascript:gs.beginningOfThisWeek()@javascript:gs.endOfThisWeek()` |
| High risk changes | `risk=1` |
| Pending approval | `state=-3^approval!=approved` |

### Problem Queries

| Description | Encoded Query |
|-------------|---------------|
| Open problems | `state<6` |
| Root cause analysis | `state=3` |
| Known errors | `known_error=true` |
| Problems with workaround | `workaroundISNOTEMPTY` |
| Related to incidents | `related_incidentsISNOTEMPTY` |

## Field Reference

### Common Incident Fields

| Field | Type | Description |
|-------|------|-------------|
| `number` | String | Auto-generated (INC0010001) |
| `short_description` | String | Brief summary (required) |
| `description` | String | Detailed description |
| `caller_id` | Reference | Reporting user |
| `opened_by` | Reference | User who created record |
| `assigned_to` | Reference | Assigned technician |
| `assignment_group` | Reference | Assigned team |
| `state` | Choice | Current state |
| `impact` | Choice | Business impact (1-3) |
| `urgency` | Choice | Time sensitivity (1-3) |
| `priority` | Choice | Calculated priority (1-5) |
| `category` | Choice | Incident category |
| `subcategory` | Choice | Incident subcategory |
| `work_notes` | Journal | Internal notes |
| `comments` | Journal | Customer-visible notes |
| `resolution_code` | Choice | How resolved |
| `resolution_notes` | String | Resolution details |
| `close_code` | Choice | Closure reason |
| `close_notes` | String | Closure notes |
| `cmdb_ci` | Reference | Configuration item |

### Common Change Fields

| Field | Type | Description |
|-------|------|-------------|
| `number` | String | Auto-generated (CHG0010001) |
| `short_description` | String | Brief summary |
| `description` | String | Detailed description |
| `type` | Choice | standard/normal/emergency |
| `state` | Choice | Current state |
| `risk` | Choice | Risk level (1-4) |
| `impact` | Choice | Business impact (1-3) |
| `start_date` | DateTime | Planned start |
| `end_date` | DateTime | Planned end |
| `requested_by` | Reference | Requester |
| `assigned_to` | Reference | Change owner |
| `assignment_group` | Reference | Owning team |
| `cab_required` | Boolean | Needs CAB approval |
| `justification` | String | Business justification |
| `implementation_plan` | String | Implementation steps |
| `backout_plan` | String | Rollback procedure |
| `test_plan` | String | Testing steps |

### Common Problem Fields

| Field | Type | Description |
|-------|------|-------------|
| `number` | String | Auto-generated (PRB0010001) |
| `short_description` | String | Brief summary |
| `description` | String | Detailed description |
| `state` | Choice | Current state |
| `priority` | Choice | Priority (1-5) |
| `assigned_to` | Reference | Problem manager |
| `assignment_group` | Reference | Owning team |
| `known_error` | Boolean | Is known error |
| `workaround` | String | Temporary workaround |
| `cause_notes` | String | Root cause |
| `fix_notes` | String | Permanent fix |
| `related_incidents` | List | Related incidents |
| `cmdb_ci` | Reference | Configuration item |

## Resolution Codes

### Incident Resolution Codes

| Value | Label |
|-------|-------|
| Solved (Work Around) | Temporary fix applied |
| Solved (Permanently) | Root cause addressed |
| Solved Remotely (Work Around) | Remote temporary fix |
| Solved Remotely (Permanently) | Remote permanent fix |
| Not Solved (Not Reproducible) | Cannot reproduce |
| Not Solved (Too Costly) | Fix not cost-effective |
| Closed/Resolved by Caller | User resolved |

### Close Codes

| Value | Label |
|-------|-------|
| Solved | Resolved successfully |
| Closed/Resolved by Caller | User resolved |
| Not Solved (Not Reproducible) | Cannot reproduce |
| Closed (Cancelled) | Request withdrawn |

## Category Reference

### Incident Categories

| Category | Subcategories |
|----------|---------------|
| `hardware` | cpu, disk, keyboard, memory, monitor, mouse |
| `software` | email, operating system, application |
| `network` | connectivity, dhcp, dns, firewall, vpn |
| `database` | db2, ms sql server, oracle |
| `inquiry` | request, password reset |

## MCP Tools Quick Reference

### Incident Tools

| Tool | Purpose | Required Parameters |
|------|---------|---------------------|
| `SN-List-Incidents` | Query incidents | - |
| `SN-Get-Incident` | Get single incident | `sys_id` |
| `SN-Create-Incident` | Create incident | `short_description` |
| `SN-Update-Incident` | Update incident | `sys_id` |
| `SN-Close-Incident` | Close incident | `sys_id`, `resolution_code` |
| `SN-Assign-Incident` | Assign incident | `sys_id` |
| `SN-Add-Work-Notes` | Add work notes | `sys_id`, `work_notes` |
| `SN-Search-Incidents` | NL search | `query` |

### Generic Tools

| Tool | Purpose | Required Parameters |
|------|---------|---------------------|
| `SN-Query-Table` | Query any table | `table_name` |
| `SN-Get-Record` | Get any record | `table_name`, `sys_id` |
| `SN-Create-Record` | Create any record | `table_name`, `data` |
| `SN-Update-Record` | Update any record | `table_name`, `sys_id`, `data` |

## Common Workflows

### Triage New Incident

```
1. Query: SN-Query-Table(table_name: incident, query: state=1^active=true)
2. Review: Check short_description, category, caller_id
3. Categorize: SN-Update-Incident(sys_id: X, category: network, subcategory: connectivity)
4. Prioritize: SN-Update-Incident(sys_id: X, impact: 2, urgency: 2)
5. Assign: SN-Assign-Incident(sys_id: X, assignment_group: <network_team>)
```

### Escalate Incident

```
1. Update state: SN-Update-Incident(sys_id: X, state: 2)
2. Add notes: SN-Add-Work-Notes(sys_id: X, work_notes: Escalating to L2 per procedure)
3. Reassign: SN-Assign-Incident(sys_id: X, assignment_group: <l2_team>)
```

### Resolve Incident

```
1. Update: SN-Update-Incident(sys_id: X, state: 6, resolution_code: Solved (Permanently), resolution_notes: Restarted service)
2. Notify: SN-Add-Work-Notes(sys_id: X, work_notes: Resolution confirmed by user)
```

### Close Incident

```
1. Close: SN-Close-Incident(sys_id: X, resolution_code: Solved (Permanently), resolution_notes: Service restored, close_notes: Verified with user)
```

## REST API Endpoints

### Table API

| Table | Endpoint |
|-------|----------|
| Incident | `/api/now/table/incident` |
| Change Request | `/api/now/table/change_request` |
| Problem | `/api/now/table/problem` |
| Task | `/api/now/table/task` |
| User | `/api/now/table/sys_user` |
| Group | `/api/now/table/sys_user_group` |
| CI | `/api/now/table/cmdb_ci` |

### Common Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `sysparm_query` | Encoded query | `active=true^priority=1` |
| `sysparm_fields` | Fields to return | `number,short_description,state` |
| `sysparm_limit` | Max records | `100` |
| `sysparm_offset` | Skip records | `50` |
| `sysparm_display_value` | Display values | `all`, `true`, `false` |

## Related Skills

- `itsm/incident-lifecycle` - Full incident lifecycle management
- `itsm/incident-triage` - Detailed triage procedures
- `itsm/natural-language-queries` - Natural language search
- `admin/generic-crud-operations` - Detailed CRUD operations

## References

- [ServiceNow ITSM Documentation](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/incident-management/concept/c_IncidentManagement.html)
- [Incident State Flow](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/incident-management/concept/c_IncidentStateFlow.html)
- [Change Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/change-management/concept/c_ITILChangeManagement.html)
