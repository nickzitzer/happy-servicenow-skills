---
name: incident-triage
version: 1.0.0
description: Intelligent incident triage, prioritization, and assignment based on impact, urgency, and content analysis
author: Happy Technologies LLC
tags: [itsm, incident, triage, assignment, priority, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-NL-Search
    - SN-Query-Table
    - SN-Assign-Incident
    - SN-Update-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/incident
    - /api/now/table/sys_user_group
    - /api/now/table/sys_user
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# Incident Triage

## Overview

This skill provides a structured approach to triaging ServiceNow incidents. It helps you:

- Identify high-priority unassigned incidents
- Analyze incident content for proper categorization
- Determine appropriate assignment groups
- Apply consistent prioritization using the Impact/Urgency matrix
- Document triage decisions with clear work notes

**When to use:** When incidents need to be reviewed, prioritized, and assigned to the appropriate team.

## Prerequisites

- **Roles:** `itil` or `incident_manager`
- **Access:** Read/write access to incident table
- **Knowledge:** Understanding of your organization's support groups and their responsibilities

## Procedure

### Step 1: Identify Incidents Requiring Triage

Query for active incidents that are unassigned or in "New" state.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: "active high priority incidents where assigned to is empty"
  fields: number,short_description,description,impact,urgency,category,priority
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=active=true^assigned_toISEMPTY^ORstate=1&sysparm_fields=sys_id,number,short_description,description,impact,urgency,category,priority&sysparm_limit=20
```

### Step 2: Analyze Each Incident

For each incident, analyze the content to determine:

1. **Category Identification** - Look for keywords:
   - Network: "network", "connectivity", "VPN", "wifi", "firewall"
   - Hardware: "laptop", "monitor", "keyboard", "printer", "device"
   - Software: "application", "software", "crash", "error", "update"
   - Email: "email", "outlook", "mailbox", "calendar"
   - Security: "password", "access", "locked", "breach", "phishing"
   - SAP/ERP: "SAP", "ERP", "finance system", "procurement"

2. **Priority Validation** - Verify Impact/Urgency matrix:

| Impact ↓ / Urgency → | High (1) | Medium (2) | Low (3) |
|----------------------|----------|------------|---------|
| High (1)             | P1       | P2         | P3      |
| Medium (2)           | P2       | P3         | P4      |
| Low (3)              | P3       | P4         | P5      |

3. **Escalation Indicators** - Check for:
   - Executive mentioned
   - Revenue impact
   - Security breach
   - Outage affecting multiple users
   - SLA at risk

### Step 3: Determine Assignment Group

Map categories to assignment groups (customize for your organization):

| Category | Assignment Group | Notes |
|----------|------------------|-------|
| Network | Network Operations | Infrastructure team |
| Hardware | Desktop Support | On-site support |
| Software | Application Support | App-specific teams |
| Email | Messaging Team | Exchange/O365 |
| Security | Security Operations | Immediate attention |
| SAP/ERP | ERP Support | Business applications |
| Unknown | Service Desk L2 | General escalation |

**Find assignment group sys_id:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_group
  query: name=Network Operations
  fields: sys_id,name
  limit: 1
```

### Step 4: Assign the Incident

**Using MCP:**
```
Tool: SN-Assign-Incident
Parameters:
  sys_id: [incident_sys_id]
  assignment_group: Network Operations
  work_notes: "Triage: Assigned to Network Operations based on keyword analysis (VPN connectivity issue). Priority validated as P2 per impact/urgency matrix."
```

**Using REST API:**
```bash
PATCH /api/now/table/incident/{sys_id}
Content-Type: application/json

{
  "assignment_group": "[group_sys_id]",
  "work_notes": "Triage: Assigned to Network Operations..."
}
```

### Step 5: Document Triage Decision

Add comprehensive work notes explaining the triage decision:

```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [incident_sys_id]
  work_notes: |
    === TRIAGE ANALYSIS ===
    Analyst: [Your name or AI Triage]
    Time: [Current timestamp]

    Category: Network
    Keywords detected: VPN, connectivity

    Priority Assessment:
    - Impact: 2 (Medium) - Single user affected
    - Urgency: 1 (High) - User cannot work
    - Calculated Priority: P2

    Assignment: Network Operations
    Rationale: VPN connectivity issues are handled by Network Ops per routing rules

    Next Steps: Network team to investigate VPN tunnel status
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-NL-Search` | Natural language queries for incidents |
| `SN-Query-Table` | Structured queries for groups, users |
| `SN-Assign-Incident` | Assign with group and work notes |
| `SN-Update-Record` | Update priority, category, other fields |
| `SN-Add-Work-Notes` | Document triage decisions |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/incident` | GET | Query incidents |
| `/api/now/table/incident/{sys_id}` | PATCH | Update incident |
| `/api/now/table/sys_user_group` | GET | Find assignment groups |

## Best Practices

- **Document Everything:** Always add work notes explaining triage decisions
- **Validate Priority:** Don't trust user-reported priority; verify with matrix
- **Check History:** Review similar past incidents for patterns
- **Escalate Quickly:** P1 incidents should be assigned within 5 minutes
- **Follow ITIL:** Triage is part of Incident Identification & Logging

## Troubleshooting

### "No incidents found matching criteria"

**Cause:** Query too restrictive or no unassigned incidents exist
**Solution:** Broaden the query or check different states

### "Assignment group not found"

**Cause:** Group name doesn't match exactly
**Solution:** Query sys_user_group with LIKE operator: `nameLIKENetwork`

### "Insufficient permissions to assign"

**Cause:** Missing `itil` role or incident is in read-only state
**Solution:** Verify roles; check if incident is closed or cancelled

## Examples

### Example 1: Network Issue Triage

**Input:** Incident INC0012345 - "Cannot connect to VPN from home"

**Analysis:**
- Keywords: "VPN", "connect" → Network category
- Impact: Medium (single user)
- Urgency: High (cannot work)
- Priority: P2

**Action:**
```
Tool: SN-Assign-Incident
Parameters:
  sys_id: abc123...
  assignment_group: Network Operations
  work_notes: "Triage: VPN connectivity issue assigned to Network Ops. P2 priority."
```

### Example 2: Security Escalation

**Input:** Incident INC0012346 - "Suspicious email with attachment clicked"

**Analysis:**
- Keywords: "suspicious", "email", "clicked" → Security category
- Impact: Potentially High (security risk)
- Urgency: High (immediate action needed)
- Priority: **Escalate to P1**

**Action:**
1. Update priority to P1
2. Assign to Security Operations
3. Add urgent work notes
4. Consider notifying security manager

## Related Skills

- `itsm/incident-lifecycle` - Full incident management
- `itsm/major-incident` - Major incident handling
- `itsm/problem-analysis` - Finding root causes
- `security/incident-response` - Security-specific triage

## References

- [ServiceNow Incident Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/incident-management/concept/c_IncidentManagement.html)
- [ITIL Incident Management](https://www.itil.org)
