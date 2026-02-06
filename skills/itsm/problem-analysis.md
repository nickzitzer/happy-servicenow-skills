---
name: problem-analysis
version: 1.0.0
description: Root cause analysis and problem management including known error documentation, workaround management, and permanent fix tracking
author: Happy Technologies LLC
tags: [itsm, problem, rca, root-cause, known-error, workaround, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-List-Problems
    - SN-Add-Problem-Comment
    - SN-Close-Problem
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/problem
    - /api/now/table/problem_task
    - /api/now/table/incident
    - /api/now/table/known_error
    - /api/now/table/sys_journal_field
  native:
    - Bash
complexity: advanced
estimated_time: 30-90 minutes
---

# Problem Analysis and Root Cause Investigation

## Overview

This skill provides a comprehensive framework for Problem Management in ServiceNow, focusing on identifying root causes, documenting known errors, and implementing permanent solutions.

**Problem Management Goals:**
- Identify and remove root causes of incidents
- Minimize the impact of incidents that cannot be prevented
- Proactively identify potential issues before they cause incidents
- Document known errors and workarounds

**When to use this skill:**
- Multiple incidents with same root cause
- Post major incident review
- Recurring service degradation
- Proactive trend analysis

## Prerequisites

- **Roles:** `problem_manager`, `problem_admin`, or `itil`
- **Access:** Read/write to problem, incident, known_error tables
- **Knowledge:** Root cause analysis techniques (5 Whys, Fishbone)
- **Related Skills:** `itsm/incident-lifecycle`, `itsm/major-incident`

## Procedure

### Phase 1: Problem Identification

#### Step 1.1: Identify Problem Candidates from Incidents

**Find incidents with similar patterns:**

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=false^stateIN6,7^sys_created_on>=javascript:gs.daysAgoStart(30)
  fields: sys_id,number,short_description,category,cmdb_ci,resolution_notes,close_code
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=active=false^stateIN6,7^sys_created_on>=javascript:gs.daysAgoStart(30)&sysparm_fields=sys_id,number,short_description,category,cmdb_ci,resolution_notes,close_code&sysparm_limit=100
```

**Find repeat incidents by CI:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: cmdb_ci=[ci_sys_id]^sys_created_on>=javascript:gs.daysAgoStart(90)
  fields: sys_id,number,short_description,resolution_notes,close_code
  order_by: sys_created_on
```

#### Step 1.2: Analyze Incident Patterns

**Grouping Criteria:**
- Same Configuration Item (CI)
- Same Category/Subcategory
- Similar short descriptions (keyword match)
- Same assignment group
- Same resolution type

**Pattern Analysis Work Notes:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [analysis_task_sys_id]
  work_notes: |
    === INCIDENT PATTERN ANALYSIS ===
    Analysis Period: [date range]

    PATTERN IDENTIFIED:
    - Total Related Incidents: [count]
    - Affected CI: [CI name]
    - Common Category: [category]
    - Keyword Pattern: [keywords]

    INCIDENT LIST:
    - INC001234 - [date] - [short description]
    - INC001235 - [date] - [short description]
    - INC001240 - [date] - [short description]

    FREQUENCY:
    - First occurrence: [date]
    - Last occurrence: [date]
    - Average frequency: [X per week/month]

    RECOMMENDATION:
    Create problem record for root cause investigation.
```

#### Step 1.3: Create Problem Record

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: problem
  data:
    short_description: "[CI/Service] - [Brief description of recurring issue]"
    description: |
      PROBLEM STATEMENT:
      [Clear description of the problem being investigated]

      RELATED INCIDENTS:
      - INC001234 - [date] - [description]
      - INC001235 - [date] - [description]
      - INC001240 - [date] - [description]

      BUSINESS IMPACT:
      - Number of incidents: [count]
      - Total downtime: [hours]
      - Users affected: [count]
      - Business cost: [estimate]

      INITIAL HYPOTHESIS:
      [Initial theory about root cause]
    priority: 2
    impact: 2
    urgency: 2
    category: [category]
    cmdb_ci: [ci_sys_id]
    assignment_group: [team_sys_id]
```

**Using REST API:**
```bash
POST /api/now/table/problem
Content-Type: application/json

{
  "short_description": "Email Server - Intermittent connection failures",
  "description": "PROBLEM STATEMENT:\nUsers experiencing intermittent email connectivity...",
  "priority": "2",
  "impact": "2",
  "urgency": "2",
  "category": "software",
  "cmdb_ci": "ci_sys_id",
  "assignment_group": "group_sys_id"
}
```

### Phase 2: Root Cause Investigation

#### Step 2.1: Investigation Task Creation

**Create investigation tasks for different areas:**
```
Tool: SN-Create-Record
Parameters:
  table_name: problem_task
  data:
    parent: [problem_sys_id]
    short_description: "RCA - [Area] Investigation"
    description: |
      Investigate [specific area] as potential root cause.

      INVESTIGATION SCOPE:
      - [Item 1 to investigate]
      - [Item 2 to investigate]
      - [Item 3 to investigate]

      EXPECTED DELIVERABLES:
      - Findings documented in work notes
      - Evidence collected (logs, screenshots)
      - Recommendation for next steps
    assignment_group: [specialist_team]
    priority: 2
```

#### Step 2.2: 5-Whys Analysis

**Document in problem work notes:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [problem_sys_id]
  work_notes: |
    === 5-WHYS ROOT CAUSE ANALYSIS ===
    Analyst: [name]
    Date: [date]

    PROBLEM STATEMENT:
    Email service experiencing intermittent connection failures

    WHY 1: Why are connection failures occurring?
    Answer: The email server is running out of available connections.

    WHY 2: Why is the server running out of connections?
    Answer: Connection pool is exhausted due to connections not being released.

    WHY 3: Why are connections not being released?
    Answer: A memory leak in the email client integration is holding connections.

    WHY 4: Why is there a memory leak?
    Answer: The integration code doesn't properly handle error conditions.

    WHY 5: Why doesn't the code handle error conditions?
    Answer: Code review process didn't catch the missing error handling.

    ROOT CAUSE:
    Missing error handling in email client integration code, combined with
    insufficient code review process for integration components.

    CONTRIBUTING FACTORS:
    - No connection timeout configured
    - Monitoring didn't alert on connection pool
    - Documentation gap on error handling standards
```

#### Step 2.3: Fishbone (Ishikawa) Analysis

```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [problem_sys_id]
  work_notes: |
    === FISHBONE ANALYSIS ===
    Problem: [Problem statement]

    PEOPLE:
    - [Factor 1]
    - [Factor 2]

    PROCESS:
    - [Factor 1]
    - [Factor 2]

    TECHNOLOGY:
    - [Factor 1]
    - [Factor 2]

    ENVIRONMENT:
    - [Factor 1]
    - [Factor 2]

    DATA:
    - [Factor 1]
    - [Factor 2]

    EXTERNAL:
    - [Factor 1]
    - [Factor 2]

    PRIMARY ROOT CAUSES:
    1. [Root cause from analysis]
    2. [Contributing root cause]
```

#### Step 2.4: Update Problem with Root Cause

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: problem
  sys_id: [problem_sys_id]
  data:
    state: 103  # Root Cause Analysis
    root_cause: |
      ROOT CAUSE IDENTIFIED:

      Primary Root Cause:
      [Detailed description of the root cause]

      Contributing Factors:
      1. [Factor 1]
      2. [Factor 2]
      3. [Factor 3]

      Evidence:
      - [Log entry/data supporting conclusion]
      - [Test result]
      - [Other evidence]

      Analysis Method: [5-Whys/Fishbone/Fault Tree/Other]
      Analysis Date: [date]
      Analyst: [name]
```

### Phase 3: Known Error Documentation

#### Step 3.1: Create Known Error Record

Once root cause is confirmed, document as known error:

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: known_error
  data:
    short_description: "[CI] - [Error description]"
    description: |
      KNOWN ERROR DESCRIPTION:
      [Clear description of the error condition]

      SYMPTOMS:
      - [Symptom 1]
      - [Symptom 2]
      - [Symptom 3]

      ROOT CAUSE:
      [Root cause description]

      AFFECTED SERVICES/CIS:
      - [Service/CI 1]
      - [Service/CI 2]
    workaround: |
      WORKAROUND INSTRUCTIONS:

      When to use: [Condition when workaround applies]

      Steps:
      1. [Step 1]
      2. [Step 2]
      3. [Step 3]

      Expected Result: [What user should see]

      Limitations:
      - [Limitation 1]
      - [Limitation 2]

      Contact [team] if workaround does not resolve the issue.
    problem: [problem_sys_id]
    cmdb_ci: [ci_sys_id]
    u_permanent_fix_planned: true
    u_fix_date: [target date]
```

**Using REST API:**
```bash
POST /api/now/table/known_error
Content-Type: application/json

{
  "short_description": "Email Server - Connection timeout during peak hours",
  "description": "KNOWN ERROR DESCRIPTION:\nEmail connections may timeout...",
  "workaround": "WORKAROUND INSTRUCTIONS:\n1. Close and reopen email client...",
  "problem": "problem_sys_id",
  "cmdb_ci": "ci_sys_id"
}
```

#### Step 3.2: Link Known Error to Incidents

**Update related incidents:**
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  data:
    problem_id: [problem_sys_id]
    work_notes: "Linked to Known Error [KERR#] - Workaround available. See KB article [KB#]."
```

**Batch update multiple incidents:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: cmdb_ci=[ci_sys_id]^problem_idISEMPTY^stateIN1,2,3
  fields: sys_id,number
  limit: 50
```

Then for each:
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: [each_incident_sys_id]
  data:
    problem_id: [problem_sys_id]
```

### Phase 4: Workaround Management

#### Step 4.1: Document Workaround

**Detailed workaround documentation:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [problem_sys_id]
  work_notes: |
    === WORKAROUND DOCUMENTED ===

    WORKAROUND ID: WA-[number]
    Effective Date: [date]
    Author: [name]

    APPLICABILITY:
    - Applies to: [specific conditions]
    - Does NOT apply to: [exclusions]

    PREREQUISITES:
    - [Prerequisite 1]
    - [Prerequisite 2]

    PROCEDURE:
    1. [Detailed step 1]
       Note: [Important note if applicable]

    2. [Detailed step 2]
       Expected Result: [What to expect]

    3. [Detailed step 3]

    VERIFICATION:
    - [How to verify workaround worked]

    KNOWN LIMITATIONS:
    - [Limitation 1]
    - [Limitation 2]

    ROLLBACK PROCEDURE:
    If workaround causes issues:
    1. [Rollback step 1]
    2. [Rollback step 2]

    SUPPORT CONTACT:
    If workaround fails, contact [team/person] at [contact info]
```

#### Step 4.2: Communicate Workaround to Service Desk

```
Tool: SN-Add-Problem-Comment
Parameters:
  sys_id: [problem_sys_id]
  comment: |
    === WORKAROUND AVAILABLE FOR SERVICE DESK ===

    Problem: [PRB#]
    Known Error: [KERR#]

    QUICK REFERENCE FOR AGENTS:

    Customer Reports: "[Common customer description]"

    Solution: [Brief description of workaround]

    Steps for Customer:
    1. [Simple step 1]
    2. [Simple step 2]
    3. [Simple step 3]

    Escalate if: [Condition for escalation]

    Related KB: [KB article link]
```

### Phase 5: Permanent Fix

#### Step 5.1: Plan Permanent Fix

**Create change request for fix:**
```
Tool: SN-Create-Record
Parameters:
  table_name: change_request
  data:
    short_description: "Fix: [Problem description]"
    description: |
      CHANGE PURPOSE:
      Implement permanent fix for problem [PRB#]

      ROOT CAUSE ADDRESSED:
      [Root cause from problem record]

      PROPOSED SOLUTION:
      [Technical description of fix]

      EXPECTED OUTCOME:
      - [Outcome 1]
      - [Outcome 2]

      TESTING PLAN:
      - [Test 1]
      - [Test 2]

      ROLLBACK PLAN:
      - [Rollback step 1]
      - [Rollback step 2]
    type: normal
    priority: 2
    assignment_group: [development_team]
    u_related_problem: [problem_sys_id]
```

#### Step 5.2: Track Fix Progress

```
Tool: SN-Update-Record
Parameters:
  table_name: problem
  sys_id: [problem_sys_id]
  data:
    state: 104  # Fix in Progress
    fix: |
      PERMANENT FIX PLAN:

      Solution: [Description of permanent fix]

      Implementation Method:
      - Change Request: [CHG#]
      - Target Date: [date]
      - Implementation Team: [team]

      Technical Details:
      [Detailed technical fix description]

      Validation Criteria:
      - [ ] [Criterion 1]
      - [ ] [Criterion 2]
      - [ ] [Criterion 3]
```

### Phase 6: Problem Closure

#### Step 6.1: Verify Fix Effectiveness

**Post-fix monitoring:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: cmdb_ci=[ci_sys_id]^sys_created_on>=javascript:gs.daysAgoStart(14)^problem_id=[problem_sys_id]
  fields: sys_id,number,short_description,sys_created_on
  limit: 50
```

**Document verification:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [problem_sys_id]
  work_notes: |
    === FIX VERIFICATION ===

    Verification Period: [date range]

    METRICS:
    - Incidents before fix: [count] per [period]
    - Incidents after fix: [count] per [period]
    - Reduction: [percentage]

    MONITORING DATA:
    - [Metric 1]: [before] → [after]
    - [Metric 2]: [before] → [after]

    USER FEEDBACK:
    - [Feedback item 1]
    - [Feedback item 2]

    VERIFICATION STATUS: [Pass/Fail/Partial]

    RECOMMENDATION: [Close problem/Continue monitoring/Additional action]
```

#### Step 6.2: Close Problem Record

**Using MCP:**
```
Tool: SN-Close-Problem
Parameters:
  sys_id: [problem_sys_id]
  close_code: Fix Applied
  close_notes: |
    PROBLEM CLOSURE SUMMARY:

    Root Cause: [Summary]

    Resolution: [What was done]

    Implementation:
    - Change: [CHG#]
    - Date: [implementation date]

    Effectiveness:
    - Incident reduction: [percentage]
    - Monitoring period: [dates]
    - No recurrence confirmed

    Documentation:
    - Known Error: [KERR#]
    - Knowledge Article: [KB#]

    Lessons Learned:
    - [Lesson 1]
    - [Lesson 2]
```

**Using REST API:**
```bash
PATCH /api/now/table/problem/{sys_id}
Content-Type: application/json

{
  "state": "107",
  "close_code": "Fix Applied",
  "close_notes": "PROBLEM CLOSURE SUMMARY:\n\nRoot Cause: Memory leak in email integration...",
  "resolved_at": "2024-01-15 14:30:00",
  "resolved_by": "admin"
}
```

## Problem States Reference

```
┌────────────┐     ┌────────────────┐     ┌─────────────┐
│    New     │────►│ Root Cause     │────►│ Fix in      │
│   (101)    │     │ Analysis (103) │     │ Progress    │
└────────────┘     └────────────────┘     │   (104)     │
                           │               └──────┬──────┘
                           ▼                      │
                   ┌───────────────┐              │
                   │ Known Error   │              │
                   │   (102)       │◄─────────────┘
                   └───────┬───────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │          Resolved             │
           │           (106)               │
           └───────────────┬───────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │           Closed              │
           │           (107)               │
           └───────────────────────────────┘
```

## Tool Usage Summary

### MCP Tools

| Tool | Purpose | Phase |
|------|---------|-------|
| `SN-List-Problems` | List existing problems | 1 |
| `SN-Query-Table` | Find incident patterns, verify fix | 1, 6 |
| `SN-Create-Record` | Create problem, known error, tasks | 1, 2, 3 |
| `SN-Update-Record` | Update problem status, root cause, fix | 2, 5 |
| `SN-Add-Work-Notes` | Document analysis and findings | All |
| `SN-Add-Problem-Comment` | Customer/Service Desk communication | 4 |
| `SN-Close-Problem` | Close resolved problem | 6 |

### REST API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/problem` | GET | List problems |
| `/api/now/table/problem` | POST | Create problem |
| `/api/now/table/problem/{sys_id}` | PATCH | Update problem |
| `/api/now/table/problem_task` | POST | Create investigation task |
| `/api/now/table/known_error` | POST | Create known error |
| `/api/now/table/incident` | GET | Query related incidents |

## Best Practices

- **Data-Driven:** Use incident data to identify problems, not assumptions
- **Structured Analysis:** Always use formal RCA techniques (5-Whys, Fishbone)
- **Document Everything:** Future investigators benefit from detailed notes
- **Workaround First:** Get temporary relief while working on permanent fix
- **Verify Effectiveness:** Don't close problems without confirming fix works
- **Knowledge Management:** Convert findings into KB articles
- **ITIL Alignment:** Problem Management aims to reduce incident volume and impact

## Troubleshooting

### "No related incidents found"

**Cause:** Query criteria too restrictive or wrong CI
**Solution:** Broaden date range; verify CI sys_id; try keyword search

### "Root cause unclear after analysis"

**Cause:** Insufficient data or multiple contributing factors
**Solution:** Gather more data; involve additional SMEs; consider environmental factors

### "Workaround not effective"

**Cause:** Workaround doesn't address all scenarios
**Solution:** Refine workaround; document limitations; create separate workaround for other scenarios

### "Problem keeps reopening"

**Cause:** Root cause not fully addressed; new variation of same issue
**Solution:** Review if truly same problem; may need new problem record for variation

## RCA Templates

### 5-Whys Template
```
Problem: [Statement]

Why 1: [Question]
Because: [Answer]

Why 2: [Question based on Why 1 answer]
Because: [Answer]

Why 3: [Question based on Why 2 answer]
Because: [Answer]

Why 4: [Question based on Why 3 answer]
Because: [Answer]

Why 5: [Question based on Why 4 answer]
Because: [Answer - typically root cause]

Root Cause: [Summary]
```

### Fishbone Template
```
Problem: _________________________________

Categories:
PEOPLE    PROCESS    TECHNOLOGY    ENVIRONMENT
  |          |           |              |
  +-- [cause] +-- [cause] +-- [cause]   +-- [cause]
  +-- [cause] +-- [cause] +-- [cause]   +-- [cause]

Root Causes Identified:
1. [Primary root cause]
2. [Secondary root cause]
```

## Related Skills

- `itsm/incident-lifecycle` - Incident management
- `itsm/incident-triage` - Incident triage
- `itsm/major-incident` - Major incident handling
- `itsm/change-management` - Change for permanent fixes
- `admin/knowledge-management` - Converting to KB articles

## References

- [ServiceNow Problem Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/problem-management/concept/c_ProblemManagement.html)
- [ITIL 4 Problem Management Practice](https://www.itil.org)
- [Kepner-Tregoe Problem Analysis](https://kepner-tregoe.com/)
- [Root Cause Analysis Techniques](https://asq.org/quality-resources/root-cause-analysis)
