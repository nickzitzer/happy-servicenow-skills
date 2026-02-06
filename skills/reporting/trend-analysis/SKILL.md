---
name: trend-analysis
version: 1.0.0
description: Incident volume trends, category distribution, seasonal patterns, and predictive indicators
author: Happy Technologies LLC
tags: [reporting, trends, analytics, forecasting, patterns, capacity, planning]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-NL-Search
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/incident
    - /api/now/table/problem
    - /api/now/stats/incident
  native:
    - Bash
complexity: advanced
estimated_time: 20-30 minutes
---

# Trend Analysis

## Overview

This skill provides comprehensive trend analysis for ServiceNow ITSM data. It enables you to:

- Analyze incident volume trends over time (daily, weekly, monthly, quarterly)
- Identify category and priority distribution changes
- Detect seasonal and cyclical patterns
- Recognize predictive indicators for capacity planning
- Generate actionable insights for resource allocation

**When to use:** For capacity planning, resource forecasting, identifying systemic issues, preparing trend reports, or detecting anomalies requiring investigation.

## Prerequisites

- **Roles:** `report_admin`, `itil`, or `analytics_admin`
- **Access:** Read access to incident, problem, and related tables
- **Knowledge:** Basic statistics and understanding of organizational patterns
- **Data:** Minimum 90 days of historical data recommended; 12 months ideal for seasonal analysis

## Procedure

### Step 1: Establish Baseline Metrics

Query historical data to establish baselines for comparison.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onONLast 90 days@javascript:gs.daysAgoStart(90)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,sys_created_on,priority,category,state,assignment_group
  limit: 5000
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=sys_created_onONLast 90 days@javascript:gs.daysAgoStart(90)@javascript:gs.daysAgoEnd(0)&sysparm_fields=sys_id,number,sys_created_on,priority,category,state,assignment_group&sysparm_limit=5000
```

### Step 2: Daily Volume Trend Analysis

Track incident creation patterns by day.

**Query for Daily Breakdown (Using GlideAggregate):**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var ga = new GlideAggregate('incident');
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(30));
    ga.addAggregate('COUNT');
    ga.groupBy('sys_created_on');
    ga.orderBy('sys_created_on');
    ga.query();

    var dailyCounts = [];
    while (ga.next()) {
      var dateStr = ga.getValue('sys_created_on').substring(0, 10);
      dailyCounts.push({
        date: dateStr,
        count: parseInt(ga.getAggregate('COUNT'))
      });
    }
    gs.info('Daily Volume: ' + JSON.stringify(dailyCounts));
  description: Aggregate daily incident counts
```

**Manual Calculation (Without GlideAggregate):**
Query incidents for specific date ranges:
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onON2024-01-15@javascript:gs.dateGenerate('2024-01-15','00:00:00')@javascript:gs.dateGenerate('2024-01-15','23:59:59')
  fields: sys_id
  limit: 500
```

### Step 3: Weekly Volume Comparison

Compare week-over-week to identify trends.

**Current Week:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onONLast 7 days@javascript:gs.daysAgoStart(7)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,priority,category
  limit: 1000
```

**Previous Week:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onONLast 7 days@javascript:gs.daysAgoStart(14)@javascript:gs.daysAgoEnd(7)
  fields: sys_id,priority,category
  limit: 1000
```

**Week-over-Week Analysis:**
| Week | Volume | Change | % Change |
|------|--------|--------|----------|
| Current | 145 | +12 | +9.0% |
| Previous | 133 | -5 | -3.6% |
| 2 Weeks Ago | 138 | +8 | +6.2% |
| 3 Weeks Ago | 130 | - | Baseline |

### Step 4: Category Distribution Analysis

Track how incident categories change over time.

**Query Category Distribution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,category
  limit: 2000
```

**Process results to create distribution:**
```
Category Distribution (Last 30 Days):
| Category | Count | % of Total | Prev Month % | Change |
|----------|-------|------------|--------------|--------|
| Software | 245 | 32% | 28% | +4% |
| Network | 189 | 25% | 30% | -5% |
| Hardware | 152 | 20% | 18% | +2% |
| Email | 98 | 13% | 12% | +1% |
| Security | 76 | 10% | 12% | -2% |
```

### Step 5: Priority Trend Analysis

Monitor priority distribution changes.

**Query Priority Distribution Over Time:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,priority,sys_created_on
  limit: 2000
```

**Priority Shift Indicators:**
| Indicator | Meaning | Action |
|-----------|---------|--------|
| P1/P2 increasing | Critical issues rising | Investigate root cause |
| P3/P4 increasing | Normal growth or triage issues | Review triage process |
| P1 stable, P2 rising | Escalation threshold changing | Review urgency criteria |

### Step 6: Day-of-Week Patterns

Identify which days see highest incident volume.

**Query Incidents by Day:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onONLast 90 days@javascript:gs.daysAgoStart(90)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,sys_created_on
  limit: 5000
```

**Process to extract day of week:**
```
Day of Week Analysis (90-Day Average):
| Day | Avg Volume | vs Overall Avg | Staffing Recommendation |
|-----|------------|----------------|------------------------|
| Monday | 32 | +23% | Full staff + OT |
| Tuesday | 28 | +8% | Full staff |
| Wednesday | 26 | 0% | Normal |
| Thursday | 25 | -4% | Normal |
| Friday | 24 | -8% | Normal, early close OK |
| Saturday | 8 | -69% | Weekend skeleton |
| Sunday | 7 | -73% | Weekend skeleton |
```

### Step 7: Hour-of-Day Patterns

Identify peak hours for staffing optimization.

**Query with Time Breakdown:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var ga = new GlideAggregate('incident');
    ga.addQuery('sys_created_on', '>=', gs.daysAgo(30));
    ga.addAggregate('COUNT');
    ga.query();

    // Note: For hourly analysis, use sys_created_on timestamp
    // and extract hour component in processing
    var total = ga.getAggregate('COUNT');
    gs.info('Total incidents: ' + total);
  description: Count incidents for hourly analysis
```

**Typical Hour Distribution:**
```
Hourly Volume Pattern (30-Day Analysis):
Peak Hours: 8am-11am (35% of daily volume)
Secondary Peak: 1pm-3pm (25% of daily volume)
Low Period: 6pm-6am (15% of daily volume)

Staffing Recommendation:
- Core Hours (8am-5pm): 80% of staff
- Extended Hours (5pm-8pm): 15% of staff
- Night/Weekend: 5% of staff
```

### Step 8: Seasonal and Cyclical Patterns

Identify recurring patterns based on calendar events.

**Query Monthly Volumes (Year-over-Year):**
For each month, query:
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onON2024-01-01@javascript:gs.dateGenerate('2024-01-01','00:00:00')@javascript:gs.dateGenerate('2024-01-31','23:59:59')
  fields: sys_id
  limit: 2000
```

**Common Seasonal Patterns:**
| Period | Pattern | Likely Cause |
|--------|---------|--------------|
| January | +15-20% | Holiday backlog, new year issues |
| March/April | +10% | Fiscal year-end, system changes |
| June-August | -10-15% | Vacation period, reduced activity |
| September | +20% | Back-to-school/work, new hires |
| November | +5% | Pre-holiday changes |
| December | -20% | Holiday shutdown |

### Step 9: Predictive Indicators

Identify leading indicators for future incident volume.

**Change Volume Correlation:**
High change volume often precedes incident spikes.
```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: sys_created_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,type,cmdb_ci
  limit: 500
```

**Problem Creation as Leading Indicator:**
```
Tool: SN-Query-Table
Parameters:
  table_name: problem
  query: sys_created_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,category,first_reported_by_task
  limit: 100
```

**Leading Indicators to Monitor:**
| Indicator | Correlation | Lag Time |
|-----------|-------------|----------|
| Change volume | +0.65 | 1-3 days |
| New employee count | +0.45 | 1-2 weeks |
| Software deployments | +0.72 | 1-7 days |
| Infrastructure alerts | +0.80 | 0-24 hours |
| Problem records created | +0.55 | 1-4 weeks |

### Step 10: Anomaly Detection

Identify unusual patterns requiring investigation.

**Calculate Statistical Boundaries:**
```
Rolling 30-Day Average: 26 incidents/day
Standard Deviation: 6 incidents
Upper Threshold (2σ): 38 incidents/day
Lower Threshold (2σ): 14 incidents/day

Any day outside 14-38 range = Anomaly requiring investigation
```

**Query Recent Anomalies:**
If daily count exceeds threshold, investigate:
```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: "incidents created today grouped by category"
  fields: sys_id,category,short_description,cmdb_ci
  limit: 100
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Primary tool for querying historical data |
| `SN-NL-Search` | Natural language queries for quick exploration |
| `SN-Execute-Background-Script` | Complex aggregations using GlideAggregate |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/incident` | GET | Query incident history |
| `/api/now/stats/incident` | GET | Statistical aggregations |
| `/api/now/table/change_request` | GET | Change correlation data |

### Key Fields for Trend Analysis

| Field | Purpose |
|-------|---------|
| sys_created_on | Incident creation timestamp |
| category | Category classification |
| priority | Priority level |
| assignment_group | Team assignment |
| cmdb_ci | Configuration item |
| state | Current state |

## Best Practices

- **Consistent Time Zones:** Ensure all queries use the same timezone
- **Statistical Significance:** Use 90+ days for reliable patterns
- **Seasonal Adjustment:** Compare same periods year-over-year
- **Correlation Analysis:** Link incidents to changes, problems, and CIs
- **Visualization:** Use charts for pattern recognition
- **Automate Alerts:** Set up alerts for statistical anomalies
- **Document Exceptions:** Note one-time events that skew data

## Troubleshooting

### "Data shows unexpected spikes"

**Cause:** Major incident, system outage, or bulk ticket creation
**Solution:** Filter out known major incidents; document the event as an exception

### "Year-over-year comparison not matching"

**Cause:** Business changes, mergers, or organizational restructuring
**Solution:** Normalize for headcount or scope changes; note structural differences

### "Seasonal patterns not appearing"

**Cause:** Insufficient historical data (less than 12 months)
**Solution:** Wait for more data; use industry benchmarks as proxy

### "Day-of-week patterns inconsistent"

**Cause:** Holidays, company events, or remote work changes
**Solution:** Exclude holiday weeks; separate analysis for remote vs. office periods

## Examples

### Example 1: Weekly Trend Report

**Objective:** Generate weekly trend summary for management

**Queries:**
```
// This Week
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onONLast 7 days@javascript:gs.daysAgoStart(7)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,priority,category,sys_created_on
  limit: 500

// Previous Week
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onONLast 7 days@javascript:gs.daysAgoStart(14)@javascript:gs.daysAgoEnd(7)
  fields: sys_id,priority,category,sys_created_on
  limit: 500

// Same Week Last Year (if available)
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onON2023-01-15@javascript:gs.dateGenerate('2023-01-15','00:00:00')@javascript:gs.dateGenerate('2023-01-21','23:59:59')
  fields: sys_id,priority,category
  limit: 500
```

**Output Report:**
```
=== WEEKLY TREND REPORT ===
Week: Jan 15-21, 2024

VOLUME COMPARISON:
| Period | Volume | Change |
|--------|--------|--------|
| This Week | 152 | - |
| Last Week | 138 | +10.1% |
| Same Week Last Year | 165 | -7.9% |
| 4-Week Average | 142 | +7.0% |

TREND ASSESSMENT: Moderate Increase (within normal range)

DAILY BREAKDOWN:
| Day | Volume | vs Avg |
|-----|--------|--------|
| Mon | 35 | +17% |
| Tue | 28 | -7% |
| Wed | 25 | -17% |
| Thu | 22 | -27% |
| Fri | 24 | -20% |
| Sat | 10 | -67% |
| Sun | 8 | -73% |

Monday spike correlates with 3 changes deployed over weekend.

CATEGORY SHIFTS:
| Category | This Week | Last Week | Change |
|----------|-----------|-----------|--------|
| Software | 52 (34%) | 42 (30%) | +4% |
| Network | 38 (25%) | 42 (30%) | -5% |
| Hardware | 30 (20%) | 28 (20%) | 0% |
| Email | 18 (12%) | 14 (10%) | +2% |
| Security | 14 (9%) | 12 (9%) | 0% |

SOFTWARE TREND: +4% increase requires investigation
- 15 incidents related to new CRM deployment
- Recommend knowledge article for common CRM issues

FORECAST (Next Week):
Based on 8-week trend and scheduled changes:
Expected Volume: 145-160 incidents
Confidence: Medium (upcoming holiday may reduce volume)
```

### Example 2: Capacity Planning Report

**Objective:** Forecast staffing needs for next quarter

**Analysis Process:**

1. **Historical Volume (Last 12 Months):**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_created_onONLast 365 days@javascript:gs.daysAgoStart(365)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,sys_created_on,priority
  limit: 10000
```

2. **Calculate Monthly Averages:**
```
Monthly Volume Summary:
Jan: 720 | Feb: 680 | Mar: 750
Apr: 710 | May: 695 | Jun: 620
Jul: 580 | Aug: 590 | Sep: 780
Oct: 740 | Nov: 700 | Dec: 550

Average: 676/month
Peak: September (780) - Back to school/work
Low: December (550) - Holiday period
```

3. **Forecast Next Quarter:**
```
=== Q2 2024 CAPACITY FORECAST ===

VOLUME PROJECTION:
| Month | Projected | Confidence | Factors |
|-------|-----------|------------|---------|
| April | 720-750 | High | Fiscal year end |
| May | 700-730 | High | Normal |
| June | 630-660 | Medium | Summer start |

STAFFING REQUIREMENTS:
Current Capacity: 750 incidents/month (5 FTEs)
Incidents per FTE: 150/month

| Month | Volume | FTEs Needed | Current | Gap |
|-------|--------|-------------|---------|-----|
| April | 735 | 5.0 | 5 | 0 |
| May | 715 | 4.8 | 5 | +0.2 |
| June | 645 | 4.3 | 5 | +0.7 |

RECOMMENDATIONS:
1. April: Full staffing required, no vacations
2. May: Normal operations, 1 vacation slot OK
3. June: Good time for training, 2 vacation slots OK

RISK FACTORS:
- ERP upgrade scheduled for April 15: +20% volume risk
- New office opening in May: +50 incidents/month expected

ADJUSTED FORECAST WITH RISKS:
| Month | Base | Risk Adjusted | FTEs Needed |
|-------|------|---------------|-------------|
| April | 735 | 880 | 6.0 |
| May | 715 | 815 | 5.5 |
| June | 645 | 695 | 4.7 |

Recommendation: Hire 1 contractor for April-May to cover ERP risk
```

### Example 3: Root Cause Trend Investigation

**Objective:** Investigate why Software incidents increased 15% this month

**Step 1: Identify the increase**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: category=Software^sys_created_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,short_description,cmdb_ci,subcategory,assignment_group,sys_created_on
  limit: 500
```

**Step 2: Drill down by subcategory**
```
Software Incident Breakdown:
| Subcategory | This Month | Last Month | Change |
|-------------|------------|------------|--------|
| CRM | 85 | 45 | +89% |
| Email | 42 | 48 | -12% |
| ERP | 38 | 35 | +9% |
| Office Suite | 35 | 40 | -12% |
| Other | 45 | 42 | +7% |

CRM subcategory driving entire increase!
```

**Step 3: Analyze CRM incidents**
```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: "software incidents for CRM created this month"
  fields: sys_id,short_description,sys_created_on
  limit: 100
```

**Step 4: Identify patterns**
```
=== CRM INCIDENT TREND ANALYSIS ===

TIMELINE:
- Month start (Day 1-10): 15 incidents (normal)
- Mid-month (Day 11-20): 45 incidents (+200%)
- Month end (Day 21-30): 25 incidents (+67%)

CORRELATION:
- CRM v4.2 deployed on Day 10
- 70% of incidents reference "login" or "sync" issues
- All incidents assigned to Application Support

TOP ISSUES:
1. "Unable to sync contacts" - 32 incidents
2. "Login timeout errors" - 28 incidents
3. "Report generation failing" - 15 incidents
4. Other - 10 incidents

ROOT CAUSE:
CRM v4.2 deployment introduced authentication bug
affecting mobile sync and session timeout.

RECOMMENDATIONS:
1. IMMEDIATE: Deploy hotfix for authentication issue
2. SHORT-TERM: Create knowledge article for workaround
3. LONG-TERM: Improve deployment testing for auth changes

PREDICTED IMPACT:
After hotfix deployment, expect:
- Week 1: 50% reduction in CRM incidents
- Week 2: Return to baseline (45/month)
```

## Related Skills

- `reporting/sla-analysis` - SLA performance tracking
- `reporting/executive-dashboard` - Executive KPI generation
- `itsm/incident-lifecycle` - Full incident management
- `itsm/problem-analysis` - Root cause investigation

## References

- [ServiceNow Performance Analytics](https://docs.servicenow.com/bundle/utah-performance-analytics-and-reporting/page/use/performance-analytics/concept/c_PerformanceAnalytics.html)
- [ServiceNow Reporting](https://docs.servicenow.com/bundle/utah-performance-analytics-and-reporting/page/use/reporting/concept/c_Reporting.html)
- [ITIL Continual Service Improvement](https://www.itil.org)
- [Statistical Process Control](https://en.wikipedia.org/wiki/Statistical_process_control)
