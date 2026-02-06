---
name: executive-dashboard
version: 1.0.0
description: Executive KPI generation including MTTR, MTBF, resolution rates, and report data aggregation
author: Happy Technologies LLC
tags: [reporting, kpi, executive, metrics, mttr, mtbf, dashboard, analytics]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-NL-Search
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/incident
    - /api/now/table/change_request
    - /api/now/table/problem
    - /api/now/stats/{table}
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Executive Dashboard

## Overview

This skill generates executive-level ITSM KPIs and dashboard data for ServiceNow. It enables you to:

- Calculate MTTR (Mean Time to Resolve) and MTBF (Mean Time Between Failures)
- Generate incident resolution and first contact resolution rates
- Aggregate data for executive dashboards
- Compare performance across time periods
- Identify trends requiring executive attention

**When to use:** For preparing executive briefings, board reports, monthly IT performance reviews, or automated dashboard data generation.

## Prerequisites

- **Roles:** `report_admin`, `itil`, or `analytics_admin`
- **Access:** Read access to incident, problem, change_request, and task tables
- **Knowledge:** Understanding of ITSM KPI definitions and organizational targets
- **Data:** Minimum 30 days of historical data for meaningful metrics

## Procedure

### Step 1: Calculate Mean Time to Resolve (MTTR)

MTTR measures the average time from incident creation to resolution.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: state=6^resolved_atISNOTEMPTY^resolved_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,sys_created_on,resolved_at,priority,category
  limit: 1000
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=state=6^resolved_atISNOTEMPTY^resolved_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)&sysparm_fields=sys_id,number,sys_created_on,resolved_at,priority,category&sysparm_limit=1000
```

**Calculate MTTR:**
```javascript
// For each incident:
// Resolution Time = resolved_at - sys_created_on

// MTTR = Sum of all Resolution Times / Count of Resolved Incidents

// Example calculation (in hours):
Total Resolution Time: 2,400 hours
Resolved Incidents: 150
MTTR = 2,400 / 150 = 16 hours
```

**MTTR by Priority (Target Benchmarks):**
| Priority | Target MTTR | Industry Benchmark |
|----------|-------------|-------------------|
| P1 - Critical | < 4 hours | 2-4 hours |
| P2 - High | < 8 hours | 4-8 hours |
| P3 - Moderate | < 24 hours | 8-24 hours |
| P4 - Low | < 72 hours | 24-72 hours |

### Step 2: Calculate Mean Time Between Failures (MTBF)

MTBF measures reliability - average time between recurring incidents for the same CI or service.

**Query CI-Related Incidents:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: cmdb_ciISNOTEMPTY^sys_created_onONLast 90 days@javascript:gs.daysAgoStart(90)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,cmdb_ci,sys_created_on,category
  limit: 2000
  order_by: cmdb_ci,sys_created_on
```

**Calculate MTBF per CI:**
```javascript
// Group incidents by CI
// For CIs with multiple incidents:
// MTBF = Total operating time / (Number of failures - 1)

// Example for Server-001:
// Incident 1: Jan 5
// Incident 2: Jan 20
// Incident 3: Feb 10
// Time between: 15 days + 21 days = 36 days / 2 = 18 days MTBF
```

**MTBF Target Benchmarks:**
| Service Tier | Target MTBF |
|--------------|-------------|
| Tier 1 (Critical) | > 30 days |
| Tier 2 (Important) | > 14 days |
| Tier 3 (Standard) | > 7 days |

### Step 3: Calculate Resolution Rates

**First Contact Resolution (FCR) Rate:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: state=6^resolved_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)^reassignment_count=0
  fields: sys_id,number
  limit: 1000
```

```
Total Resolved (Last 30 Days): Query count of all resolved incidents
FCR Count: Query count with reassignment_count=0
FCR Rate = (FCR Count / Total Resolved) * 100
```

**Reopen Rate:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: reopen_count>0^sys_created_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,reopen_count
  limit: 500
```

```
Reopen Rate = (Incidents with reopen_count > 0 / Total Resolved) * 100
Target: < 5%
```

### Step 4: Incident Volume Metrics

**Total Incident Volume:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,priority,category,state
  limit: 5000
```

**Volume by Priority:**
Process results to count by priority field.

**Backlog Analysis:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^state!=6^state!=7
  fields: sys_id,priority,sys_created_on,assigned_to
  limit: 1000
```

```
Backlog Metrics:
- Total Open: Count of active incidents
- Aging > 7 days: Filter by sys_created_on
- Unassigned: Filter by assigned_toISEMPTY
```

### Step 5: Change Success Rate

**Query Completed Changes:**
```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: state=3^closed_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,close_code,type
  limit: 500
```

**Close Code Analysis:**
| Close Code | Category |
|------------|----------|
| successful | Success |
| successful_issues | Success with Issues |
| unsuccessful | Failure |
| cancelled | Cancelled |

```
Change Success Rate = (Successful + Successful with Issues) / (Total - Cancelled) * 100
Target: > 95%
```

### Step 6: Problem Management Metrics

**Problems Created vs. Resolved:**
```
Tool: SN-Query-Table
Parameters:
  table_name: problem
  query: sys_created_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,state,known_error,first_reported_by_task
  limit: 200
```

**Known Error Database (KEDB) Growth:**
```
Tool: SN-Query-Table
Parameters:
  table_name: problem
  query: known_error=true
  fields: sys_id,number,sys_created_on
  limit: 500
```

### Step 7: Customer Satisfaction (CSAT)

If using ServiceNow survey:
```
Tool: SN-Query-Table
Parameters:
  table_name: asmt_assessment_instance
  query: metric_type.nameSTARTSWITHIncident^sys_created_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,state,percent_answered
  limit: 500
```

### Step 8: Generate Aggregated Report Data

**Using GlideAggregate Pattern (via Background Script):**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var ga = new GlideAggregate('incident');
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(30));
    ga.addAggregate('COUNT');
    ga.addAggregate('COUNT', 'priority');
    ga.groupBy('priority');
    ga.query();

    var results = [];
    while (ga.next()) {
      results.push({
        priority: ga.getValue('priority'),
        count: ga.getAggregate('COUNT')
      });
    }
    gs.info('Priority Distribution: ' + JSON.stringify(results));
  description: Aggregate incident counts by priority
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Primary tool for querying metrics data |
| `SN-NL-Search` | Natural language queries for quick insights |
| `SN-Execute-Background-Script` | Complex aggregations using GlideAggregate |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/incident` | GET | Query incident data |
| `/api/now/table/change_request` | GET | Query change data |
| `/api/now/table/problem` | GET | Query problem data |
| `/api/now/stats/{table}` | GET | Aggregate statistics |

### Key Fields for Metrics

| Metric | Source Table | Key Fields |
|--------|--------------|------------|
| MTTR | incident | sys_created_on, resolved_at |
| FCR | incident | reassignment_count |
| Reopen Rate | incident | reopen_count |
| Change Success | change_request | close_code, state |
| MTBF | incident | cmdb_ci, sys_created_on |

## Best Practices

- **Consistent Time Windows:** Always use the same time period for comparisons (30 days recommended)
- **Business Calendar:** Exclude weekends/holidays if measuring business time
- **Baseline First:** Establish baselines before setting targets
- **Segment Data:** Break down by priority, category, and team for actionable insights
- **Automate Collection:** Schedule regular data pulls for dashboard refresh
- **ITIL Alignment:** Align KPIs with ITIL Continual Service Improvement (CSI)

## Troubleshooting

### "MTTR seems too high"

**Cause:** Including paused time or non-business hours
**Solution:** Use business_duration field if available, or filter by business schedule

### "Resolution counts don't match reports"

**Cause:** Different date fields being used (resolved_at vs closed_at vs sys_updated_on)
**Solution:** Standardize on resolved_at for resolution metrics

### "MTBF calculation returning errors"

**Cause:** CIs with single incident cannot calculate MTBF
**Solution:** Filter to CIs with 2+ incidents; use "N/A" for single-incident CIs

### "Change success rate very low"

**Cause:** Cancelled changes being counted as failures
**Solution:** Exclude state=cancelled from total; only count closed changes

## Examples

### Example 1: Weekly Executive Summary

**Objective:** Generate weekly IT performance summary

**Queries to Execute:**

1. **Incident Volume:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onONLast 7 days@javascript:gs.daysAgoStart(7)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,priority
  limit: 500
```

2. **Resolved Incidents:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: resolved_atONLast 7 days@javascript:gs.daysAgoStart(7)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,sys_created_on,resolved_at,priority
  limit: 500
```

3. **Current Backlog:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true
  fields: sys_id,priority,sys_created_on
  limit: 500
```

**Output Report:**
```
=== WEEKLY IT PERFORMANCE SUMMARY ===
Week Ending: [Date]

INCIDENT MANAGEMENT:
| Metric | This Week | Last Week | Change |
|--------|-----------|-----------|--------|
| Created | 145 | 132 | +10% |
| Resolved | 152 | 140 | +9% |
| Backlog | 48 | 55 | -13% |
| MTTR (hours) | 14.2 | 15.8 | -10% |

PRIORITY BREAKDOWN:
| Priority | Created | Resolved | Backlog |
|----------|---------|----------|---------|
| P1 | 3 | 4 | 1 |
| P2 | 22 | 25 | 8 |
| P3 | 78 | 80 | 25 |
| P4 | 42 | 43 | 14 |

KEY HIGHLIGHTS:
- MTTR improved by 10% (14.2 hours vs 15.8 hours)
- Backlog reduced by 13% (48 vs 55)
- P1 incidents: 3 created, all resolved or in progress

ITEMS REQUIRING ATTENTION:
- None - all metrics within target
```

### Example 2: Monthly KPI Dashboard Data

**Objective:** Generate all KPIs for monthly dashboard

**Execute All Queries in Parallel:**
```
// Query 1: Total Incidents
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,priority,category,state,reassignment_count,reopen_count,sys_created_on,resolved_at
  limit: 2000

// Query 2: Changes
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: sys_created_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,type,close_code,state
  limit: 500

// Query 3: Problems
Tool: SN-Query-Table
Parameters:
  table_name: problem
  query: sys_created_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,state,known_error
  limit: 200
```

**Calculated Dashboard Data:**
```json
{
  "period": "2024-01-01 to 2024-01-31",
  "incident_management": {
    "total_created": 612,
    "total_resolved": 598,
    "mttr_hours": 14.5,
    "mttr_by_priority": {
      "P1": 3.2,
      "P2": 7.8,
      "P3": 18.4,
      "P4": 48.2
    },
    "fcr_rate": 72.5,
    "reopen_rate": 3.2,
    "backlog": 52
  },
  "change_management": {
    "total_changes": 89,
    "success_rate": 97.8,
    "by_type": {
      "standard": 45,
      "normal": 38,
      "emergency": 6
    }
  },
  "problem_management": {
    "problems_created": 12,
    "problems_resolved": 8,
    "known_errors_added": 5
  },
  "trends": {
    "incident_volume_change": "+5%",
    "mttr_change": "-8%",
    "backlog_change": "-12%"
  }
}
```

### Example 3: Board-Level Summary

**Objective:** High-level summary for board presentation

```
=== IT SERVICE MANAGEMENT - BOARD SUMMARY ===
Period: Q4 2024

EXECUTIVE SUMMARY:
IT Service Management delivered 97% SLA compliance in Q4,
exceeding the 95% target. Major incident count reduced by
25% compared to Q3.

KEY PERFORMANCE INDICATORS:
                          Q4 2024   Q3 2024   Target   Status
Service Availability       99.8%     99.5%    99.5%    PASS
SLA Compliance             97.0%     94.2%    95.0%    PASS
MTTR (hours)               12.4      15.2     16.0     PASS
Change Success Rate        98.2%     96.8%    95.0%    PASS
Customer Satisfaction      4.2/5     4.0/5    4.0/5    PASS
Major Incidents            3         4        <5       PASS

YEAR-OVER-YEAR COMPARISON:
| Metric | 2024 | 2023 | Improvement |
|--------|------|------|-------------|
| Total Incidents | 7,245 | 8,102 | -11% |
| MTTR | 13.2 hrs | 18.4 hrs | -28% |
| SLA Compliance | 96.5% | 92.1% | +4.4% |

INVESTMENTS & OUTCOMES:
- AI-powered triage: 15% reduction in assignment time
- Self-service portal: 22% ticket deflection
- Automation: 400+ hours saved monthly

RISKS & MITIGATIONS:
- Aging infrastructure causing 30% of P1 incidents
  Mitigation: Data center refresh approved for Q2 2025
```

## Related Skills

- `reporting/sla-analysis` - Detailed SLA performance tracking
- `reporting/trend-analysis` - Incident trends and patterns
- `itsm/incident-lifecycle` - Full incident management
- `itsm/problem-analysis` - Problem management metrics

## References

- [ServiceNow Performance Analytics](https://docs.servicenow.com/bundle/utah-performance-analytics-and-reporting/page/use/performance-analytics/concept/c_PerformanceAnalytics.html)
- [ITIL KPIs and Metrics](https://www.itil.org)
- [IT Service Management Benchmarks](https://www.hdibenchmark.com)
