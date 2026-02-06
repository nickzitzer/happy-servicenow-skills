---
name: sla-analysis
version: 1.0.0
description: SLA performance tracking including breach detection, achievement metrics, and trend analysis
author: Happy Technologies LLC
tags: [reporting, sla, performance, metrics, breach, compliance, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-NL-Search
    - SN-Get-Record
  rest:
    - /api/now/table/task_sla
    - /api/now/table/contract_sla
    - /api/now/table/cmn_schedule
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# SLA Analysis

## Overview

This skill provides comprehensive SLA (Service Level Agreement) performance analysis for ServiceNow ITSM. It enables you to:

- Detect SLA breaches and near-breaches in real-time
- Calculate SLA achievement rates by service, priority, or time period
- Analyze trends to identify systemic issues
- Generate reports for stakeholder communication
- Identify at-risk SLAs before they breach

**When to use:** For SLA compliance reporting, identifying performance issues, preparing executive summaries, or investigating breach patterns.

## Prerequisites

- **Roles:** `sla_admin`, `itil`, or `report_admin`
- **Access:** Read access to `task_sla`, `contract_sla`, `incident`, and related tables
- **Knowledge:** Understanding of SLA definitions and business impact
- **Data:** Active SLA definitions must be configured in ServiceNow

## Procedure

### Step 1: Query SLA Status Overview

Get a snapshot of current SLA status across all active tasks.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: active=true
  fields: sys_id,task,sla,stage,percentage,has_breached,business_time_left,planned_end_time
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/task_sla?sysparm_query=active=true&sysparm_fields=sys_id,task,sla,stage,percentage,has_breached,business_time_left,planned_end_time&sysparm_limit=100
```

### Step 2: Detect Breached SLAs

Identify all SLAs that have already breached.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: has_breached=true^active=true
  fields: sys_id,task,sla,stage,percentage,original_breach_time,business_time_left
  limit: 50
```

**SLA Stage Values Reference:**
| Stage | Description | Action Required |
|-------|-------------|-----------------|
| In Progress | SLA timer running | Monitor |
| Paused | Timer paused (awaiting user) | Review pause reason |
| Breached | SLA has breached | Immediate attention |
| Achieved | SLA met successfully | No action |
| Cancelled | SLA no longer applicable | Review cancellation |

### Step 3: Identify At-Risk SLAs

Find SLAs that are approaching breach (>75% elapsed).

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: active=true^has_breached=false^percentage>=75
  fields: sys_id,task,sla,percentage,business_time_left,planned_end_time,stage
  limit: 50
  order_by: percentage
  order_direction: desc
```

**Using REST API:**
```bash
GET /api/now/table/task_sla?sysparm_query=active=true^has_breached=false^percentage>=75&sysparm_fields=sys_id,task,sla,percentage,business_time_left,planned_end_time,stage&sysparm_limit=50&sysparm_orderby=percentage&sysparm_orderbydesc=percentage
```

### Step 4: Calculate Achievement Metrics

Query completed SLAs to calculate achievement rates.

**Get Achieved SLAs (Last 30 Days):**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: active=false^has_breached=false^end_timeONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,task,sla,end_time
  limit: 1000
```

**Get Breached SLAs (Last 30 Days):**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: active=false^has_breached=true^end_timeONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,task,sla,end_time
  limit: 1000
```

**Calculate Achievement Rate:**
```
Achievement Rate = (Achieved SLAs / Total Completed SLAs) * 100
```

### Step 5: Analyze Trends by SLA Definition

Group metrics by SLA definition to identify problematic SLAs.

**Query SLA Definitions:**
```
Tool: SN-Query-Table
Parameters:
  table_name: contract_sla
  query: active=true
  fields: sys_id,name,collection,duration,schedule,relative_duration_works_on
  limit: 100
```

**Query Breaches by SLA Definition:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: has_breached=true^end_timeONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sla,task,end_time
  limit: 500
```

### Step 6: Generate Time-Based Trend Analysis

Analyze SLA performance over time periods.

**Weekly Breach Count (Last 4 Weeks):**

For each week, query:
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: has_breached=true^end_timeONLast 7 days@javascript:gs.daysAgoStart(7)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,sla,task
  limit: 500
```

Repeat with `daysAgoStart(14)@javascript:gs.daysAgoEnd(7)` for previous weeks.

### Step 7: SLA Performance by Priority

Analyze SLA achievement rates segmented by incident priority.

**Join task_sla with incident data:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: task.sys_class_name=incident^active=false^end_timeONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,task,task.priority,sla,has_breached
  limit: 500
```

**Expected Output Analysis:**
| Priority | Total SLAs | Achieved | Breached | Achievement % |
|----------|------------|----------|----------|---------------|
| P1 - Critical | 25 | 20 | 5 | 80% |
| P2 - High | 150 | 135 | 15 | 90% |
| P3 - Moderate | 400 | 380 | 20 | 95% |
| P4 - Low | 200 | 198 | 2 | 99% |

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Primary tool for querying task_sla and contract_sla tables |
| `SN-NL-Search` | Natural language queries like "show breached SLAs this week" |
| `SN-Get-Record` | Get details of specific SLA record |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/task_sla` | GET | Query active/completed SLAs |
| `/api/now/table/contract_sla` | GET | Query SLA definitions |
| `/api/now/stats/task_sla` | GET | Aggregate statistics |

### Key Tables

| Table | Description |
|-------|-------------|
| `task_sla` | Individual SLA records attached to tasks |
| `contract_sla` | SLA definitions (terms, duration, schedule) |
| `cmn_schedule` | Business schedules for SLA calculations |
| `sla_condition_class` | SLA start/stop/pause conditions |

## Best Practices

- **Real-Time Monitoring:** Check at-risk SLAs (>75%) at least twice daily
- **Root Cause Analysis:** When breach rates increase, investigate by category and assignment group
- **Business Hours:** Consider schedules; breaches during non-business hours may indicate configuration issues
- **Trending:** Compare week-over-week, not just snapshots
- **Segmentation:** Analyze by priority, category, and assignment group for actionable insights
- **ITIL Alignment:** SLA management supports Continual Service Improvement (CSI)

## Troubleshooting

### "No task_sla records found"

**Cause:** SLA definitions may not be attached to the workflow or active
**Solution:** Verify `contract_sla` records exist and are active; check SLA conditions match task criteria

### "Inconsistent breach times"

**Cause:** Schedule not correctly applied or daylight saving time issues
**Solution:** Review `cmn_schedule` configuration; check timezone settings

### "Percentage shows over 100%"

**Cause:** SLA has breached but task remains open; percentage continues accumulating
**Solution:** This is expected behavior; filter by `has_breached=true` for clear breach identification

### "SLA not starting/stopping correctly"

**Cause:** Start/stop conditions not met
**Solution:** Review `sla_condition_class` entries for the SLA definition

## Examples

### Example 1: Daily SLA Health Check

**Objective:** Morning check of SLA status

**Step 1: Get breach summary**
```
Tool: SN-NL-Search
Parameters:
  table_name: task_sla
  query: "active SLAs that have breached"
  fields: task,sla,percentage,business_time_left
  limit: 20
```

**Step 2: Get at-risk SLAs**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: active=true^has_breached=false^percentage>=80
  fields: task,sla,percentage,planned_end_time
  limit: 20
```

**Output Summary:**
```
=== SLA HEALTH CHECK ===
Date: [Today]

CRITICAL (Breached): 3 SLAs
- INC0012345 - Resolution SLA - 120% (P1)
- INC0012400 - Response SLA - 105% (P2)
- INC0012456 - Resolution SLA - 150% (P2)

AT RISK (>80%): 7 SLAs
- INC0012500 - Resolution SLA - 85% (2 hours remaining)
- INC0012501 - Resolution SLA - 82% (3 hours remaining)
[...]

OVERALL HEALTH: Needs Attention
Action: Escalate breached P1 incident immediately
```

### Example 2: Monthly SLA Performance Report

**Objective:** Generate monthly executive summary

**Step 1: Total SLAs processed**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: active=false^end_timeONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,has_breached,sla
  limit: 2000
```

**Step 2: Count by SLA type**
Process results to create summary:

```
=== MONTHLY SLA PERFORMANCE REPORT ===
Period: [Last 30 Days]

SUMMARY:
- Total SLAs Completed: 1,247
- Achieved: 1,185 (95.0%)
- Breached: 62 (5.0%)

BY SLA TYPE:
| SLA Definition        | Total | Achieved | Breached | Rate |
|-----------------------|-------|----------|----------|------|
| P1 Resolution (4hr)   | 45    | 38       | 7        | 84%  |
| P2 Resolution (8hr)   | 189   | 175      | 14       | 93%  |
| P3 Resolution (24hr)  | 512   | 498      | 14       | 97%  |
| P4 Resolution (72hr)  | 301   | 294      | 7        | 98%  |
| Response SLA (1hr)    | 200   | 180      | 20       | 90%  |

TREND (Week-over-Week):
Week 1: 96% achievement
Week 2: 95% achievement
Week 3: 94% achievement
Week 4: 95% achievement

RECOMMENDATIONS:
1. P1 Resolution SLA at 84% - below target; investigate root cause
2. Response SLA showing consistent underperformance - review staffing levels
```

### Example 3: Breach Root Cause Analysis

**Objective:** Investigate why P1 Resolution SLA is underperforming

**Step 1: Get breached P1 SLAs**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: has_breached=true^task.priority=1^sla.nameLIKEResolution^end_timeONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: task,task.number,task.assignment_group,task.category,task.short_description,original_breach_time,end_time
  limit: 50
```

**Step 2: Analyze patterns**
```
=== P1 RESOLUTION SLA BREACH ANALYSIS ===

BREACHES BY ASSIGNMENT GROUP:
- Network Operations: 4 breaches (57%)
- Application Support: 2 breaches (29%)
- Desktop Support: 1 breach (14%)

BREACHES BY CATEGORY:
- Network: 4 (57%)
- Software: 2 (29%)
- Hardware: 1 (14%)

COMMON PATTERNS:
1. 5 of 7 breaches occurred during night shift (11pm-7am)
2. Network issues taking longest to resolve (avg 6.2 hours vs 4hr target)
3. 3 breaches had multiple reassignments before resolution

ROOT CAUSE HYPOTHESIS:
- Insufficient night shift coverage for Network team
- Complex network issues exceeding 4-hour P1 target

RECOMMENDATIONS:
1. Add on-call network engineer for night shift
2. Review P1 network SLA target (consider 6-hour resolution)
3. Implement warm handoff procedures to reduce reassignment delays
```

## Related Skills

- `reporting/executive-dashboard` - Executive KPI generation
- `reporting/trend-analysis` - Incident volume and pattern analysis
- `itsm/incident-lifecycle` - Full incident management
- `itsm/major-incident` - Major incident handling

## References

- [ServiceNow SLA Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/service-level-management/concept/c_ServiceLevelManagement.html)
- [task_sla Table](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/table-administration/reference/r_TaskSlaTable.html)
- [ITIL Service Level Management](https://www.itil.org)
