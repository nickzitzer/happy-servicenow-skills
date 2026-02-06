---
name: major-incident
version: 1.0.0
description: P1/Major incident coordination including bridge calls, stakeholder communication, incident commander responsibilities, and post-incident review
author: Happy Technologies LLC
tags: [itsm, incident, major-incident, p1, crisis, bridge-call, pir, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Create-Incident
    - SN-Update-Record
    - SN-Add-Work-Notes
    - SN-Add-Comment
    - SN-Query-Table
    - SN-Assign-Incident
    - SN-NL-Search
  rest:
    - /api/now/table/incident
    - /api/now/table/sys_journal_field
    - /api/now/table/sys_user_group
    - /api/now/table/task_ci
    - /api/now/table/problem
  native:
    - Bash
complexity: expert
estimated_time: 30-120 minutes
---

# Major Incident Management

## Overview

This skill provides a comprehensive framework for managing Priority 1 (P1) and Major Incidents in ServiceNow. Major incidents require immediate, coordinated response due to their significant business impact.

**What qualifies as a Major Incident:**
- Complete service outage affecting large user population
- Critical business function unavailable
- Significant security breach
- Revenue-impacting system failure
- Executive-declared emergency

**Key outcomes:**
- Rapid service restoration
- Clear stakeholder communication
- Coordinated technical response
- Documented timeline for post-incident review

## Prerequisites

- **Roles:** `incident_manager`, `major_incident_manager`, or `itil`
- **Access:** Read/write to incident, problem, task tables
- **Authority:** Ability to convene technical teams
- **Communication:** Access to communication channels (email, Teams, Slack)
- **Related Skills:** `itsm/incident-lifecycle`, `itsm/incident-triage`

## Procedure

### Phase 1: Major Incident Declaration

#### Step 1.1: Validate Major Incident Criteria

Before declaring a major incident, verify it meets criteria:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: sys_id=[incident_sys_id]
  fields: number,short_description,priority,impact,urgency,state,business_service,cmdb_ci,assignment_group
```

**Major Incident Checklist:**
- [ ] Impact: 1-High (widespread, many users affected)
- [ ] Urgency: 1-High (business critical, time sensitive)
- [ ] Business service tier: Tier 1 or 2 (critical/high)
- [ ] No workaround available or workaround insufficient

#### Step 1.2: Declare Major Incident

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  data:
    priority: 1
    major_incident_state: accepted
    u_major_incident: true
    business_impact: |
      - Affected Users: [number]
      - Affected Services: [list]
      - Revenue Impact: [estimated]
      - Customer Impact: [description]
```

**Using REST API:**
```bash
PATCH /api/now/table/incident/{sys_id}
Content-Type: application/json

{
  "priority": "1",
  "major_incident_state": "accepted",
  "u_major_incident": "true",
  "business_impact": "Affected Users: 500+\nAffected Services: CRM, Email\nRevenue Impact: $10K/hour"
}
```

#### Step 1.3: Assign Incident Commander

The Incident Commander (IC) owns the major incident process:

```
Tool: SN-Assign-Incident
Parameters:
  sys_id: [incident_sys_id]
  assigned_to: [incident_commander_username]
  assignment_group: Major Incident Management
  work_notes: |
    === MAJOR INCIDENT DECLARED ===
    Incident Commander: [Name]
    Declaration Time: [timestamp]
    Initial Assessment: [brief description]

    IC Responsibilities:
    - Own overall incident coordination
    - Manage bridge call
    - Ensure stakeholder communication
    - Drive to resolution
```

### Phase 2: Bridge Call Setup

#### Step 2.1: Create Bridge Call Task

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: task
  data:
    parent: [incident_sys_id]
    short_description: "Major Incident Bridge Call - [INC#]"
    description: |
      Bridge Call Details:
      - Conference Number: [number]
      - Meeting ID: [id]
      - Passcode: [code]
      - Teams/Zoom Link: [link]

      Required Participants:
      - Incident Commander
      - Technical Lead(s)
      - Service Owner
      - Communications Lead
    assignment_group: Major Incident Management
    priority: 1
```

#### Step 2.2: Document Bridge Call Schedule

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [incident_sys_id]
  work_notes: |
    === BRIDGE CALL SCHEDULE ===
    Initial Call: [time] - Situation Assessment

    Ongoing Calls:
    - Every 30 minutes during active troubleshooting
    - Every 60 minutes during monitoring phase

    Participants Required:
    - [ ] Incident Commander: [name]
    - [ ] Technical Lead: [name]
    - [ ] Service Owner: [name]
    - [ ] Communications: [name]
    - [ ] [Application] SME: [name]
    - [ ] Network Team: [name]
    - [ ] Database Team: [name]

    Bridge Info: [conference details]
```

### Phase 3: Stakeholder Communication

#### Step 3.1: Initial Notification

**Customer-Visible Communication:**
```
Tool: SN-Add-Comment
Parameters:
  sys_id: [incident_sys_id]
  comment: |
    === MAJOR INCIDENT NOTIFICATION ===

    Status: Investigating

    IMPACT:
    [Service Name] is currently experiencing [brief description].
    Affected users: [scope]

    CURRENT ACTIONS:
    Our technical teams are actively investigating this issue.

    NEXT UPDATE:
    We will provide an update within 30 minutes or sooner if we have new information.

    WORKAROUND:
    [If available, otherwise "No workaround currently available"]

    For urgent assistance, contact: [support contact]

    Reference: [INC#]
```

#### Step 3.2: Executive Notification Template

**Internal Work Notes:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [incident_sys_id]
  work_notes: |
    === EXECUTIVE NOTIFICATION SENT ===
    Time: [timestamp]
    Recipients: [list of executives]

    Subject: [MAJOR INCIDENT] [Service] - [Brief Issue]

    Summary:
    A major incident affecting [service/system] was declared at [time].

    Business Impact:
    - Users Affected: [number]
    - Revenue Impact: [estimate]
    - Customer Impact: [description]

    Current Status: [Investigating/Identified/Implementing Fix]

    ETA to Resolution: [estimate or "Under assessment"]

    Incident Commander: [name] ([contact])
    Next Update: [time]
```

#### Step 3.3: Regular Status Updates

**30-Minute Update Template:**
```
Tool: SN-Add-Comment
Parameters:
  sys_id: [incident_sys_id]
  comment: |
    === STATUS UPDATE - [TIME] ===

    CURRENT STATUS: [Investigating/Identified/Implementing/Monitoring]

    PROGRESS SINCE LAST UPDATE:
    - [Action taken 1]
    - [Action taken 2]
    - [Finding or result]

    CURRENT FOCUS:
    [What the team is working on now]

    ETA: [Updated estimate]

    NEXT UPDATE: [time]
```

### Phase 4: Timeline Documentation

#### Step 4.1: Maintain Incident Timeline

**Critical: Document EVERYTHING with timestamps**

```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [incident_sys_id]
  work_notes: |
    === TIMELINE UPDATE ===

    [HH:MM] - [Event description]

    Examples:
    08:15 - First reports of service degradation received
    08:22 - Monitoring alert triggered: Database connection pool exhausted
    08:25 - Incident created and escalated to P2
    08:32 - Impact confirmed widespread - Major Incident declared
    08:35 - Bridge call initiated
    08:40 - Root cause identified: Memory leak in application server
    08:45 - Decision: Rolling restart of application cluster
    09:00 - Restart of node 1 complete
    09:15 - Restart of node 2 complete
    09:30 - Service restored - monitoring
    10:00 - Major incident closed - stable
```

#### Step 4.2: Query Timeline Entries

**Retrieve all journal entries for timeline:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[incident_sys_id]^element=work_notes
  fields: value,sys_created_on,sys_created_by
  order_by: sys_created_on
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id={sys_id}^element=work_notes&sysparm_fields=value,sys_created_on,sys_created_by&sysparm_order_by=sys_created_on
```

### Phase 5: Resolution and Service Restoration

#### Step 5.1: Confirm Service Restoration

```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [incident_sys_id]
  work_notes: |
    === SERVICE RESTORATION CONFIRMED ===
    Time: [timestamp]

    Verification Completed:
    - [ ] Core functionality verified
    - [ ] User access confirmed
    - [ ] Monitoring shows normal metrics
    - [ ] Sample transactions successful
    - [ ] Performance within acceptable range

    Verified By: [name]

    Remaining Actions:
    - Continue monitoring for [time period]
    - Schedule PIR
    - Update knowledge base
```

#### Step 5.2: Final Customer Communication

```
Tool: SN-Add-Comment
Parameters:
  sys_id: [incident_sys_id]
  comment: |
    === SERVICE RESTORED ===

    We are pleased to confirm that [Service Name] has been restored to normal operation.

    RESOLUTION SUMMARY:
    The issue was caused by [brief, non-technical explanation].
    Our team [brief description of fix].

    DURATION:
    Impact Start: [time]
    Service Restored: [time]
    Total Duration: [duration]

    NEXT STEPS:
    - We will conduct a Post-Incident Review
    - Improvements will be implemented to prevent recurrence

    We apologize for any inconvenience this may have caused.

    Thank you for your patience.
```

#### Step 5.3: Close Major Incident

```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  data:
    state: 6
    close_code: Solved (Permanently)
    resolution_code: Solved (Permanently)
    major_incident_state: closed
    close_notes: |
      RESOLUTION SUMMARY:
      Root Cause: [description]
      Resolution: [what was done]

      TIMELINE:
      Incident Start: [time]
      Major Incident Declared: [time]
      Root Cause Identified: [time]
      Service Restored: [time]

      IMPACT:
      Duration: [total time]
      Users Affected: [number]
      Business Impact: [description]

      FOLLOW-UP:
      - PIR scheduled for [date]
      - Problem ticket: [PRB#]
```

### Phase 6: Post-Incident Review (PIR)

#### Step 6.1: Create Problem Record

**Link to Problem Management:**
```
Tool: SN-Create-Record
Parameters:
  table_name: problem
  data:
    short_description: "PIR: [Original incident short description]"
    description: |
      Post-Incident Review for Major Incident [INC#]

      INCIDENT SUMMARY:
      [Brief description of what happened]

      IMPACT:
      - Duration: [time]
      - Users Affected: [number]
      - Services Affected: [list]
      - Business Impact: [description]

      TIMELINE:
      [Copy timeline from incident]

      INITIAL ROOT CAUSE:
      [Description]
    priority: 2
    assignment_group: [owning team]
    u_related_incident: [incident_sys_id]
```

#### Step 6.2: PIR Meeting Agenda

**Document in work notes:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [problem_sys_id]
  work_notes: |
    === POST-INCIDENT REVIEW AGENDA ===

    Meeting Scheduled: [date/time]
    Attendees: [list]

    AGENDA:

    1. TIMELINE REVIEW (10 min)
       - Walk through event sequence
       - Identify detection gaps

    2. ROOT CAUSE ANALYSIS (20 min)
       - Technical root cause
       - Contributing factors
       - 5-Whys analysis

    3. RESPONSE EVALUATION (15 min)
       - What went well?
       - What could be improved?
       - Communication effectiveness

    4. ACTION ITEMS (15 min)
       - Prevention measures
       - Detection improvements
       - Process improvements
       - Assign owners and due dates

    5. FOLLOW-UP (5 min)
       - Schedule follow-up if needed
       - Documentation requirements
```

#### Step 6.3: Document PIR Findings

```
Tool: SN-Update-Record
Parameters:
  table_name: problem
  sys_id: [problem_sys_id]
  data:
    root_cause: |
      ROOT CAUSE:
      [Technical description of what caused the incident]

      5-WHYS ANALYSIS:
      1. Why did the service fail?
         [Answer]
      2. Why did [answer 1] happen?
         [Answer]
      3. Why did [answer 2] happen?
         [Answer]
      4. Why did [answer 3] happen?
         [Answer]
      5. Why did [answer 4] happen?
         [Answer - usually organizational or process issue]

      CONTRIBUTING FACTORS:
      - [Factor 1]
      - [Factor 2]

    fix: |
      IMMEDIATE FIX:
      [What was done to restore service]

      PERMANENT FIX:
      [What changes will prevent recurrence]

      ACTION ITEMS:
      1. [Action] - Owner: [name] - Due: [date]
      2. [Action] - Owner: [name] - Due: [date]
      3. [Action] - Owner: [name] - Due: [date]
```

## Incident Commander Responsibilities

### Role Definition

The Incident Commander is the single point of accountability during a major incident:

| Responsibility | Description |
|----------------|-------------|
| Coordination | Own the overall response process |
| Communication | Ensure stakeholders receive timely updates |
| Decisions | Make or escalate key decisions quickly |
| Documentation | Ensure timeline is being maintained |
| Resource Allocation | Request and assign technical resources |
| Escalation | Escalate blockers to management |

### IC Checklist

```
MAJOR INCIDENT IC CHECKLIST

IMMEDIATE (First 15 minutes):
- [ ] Confirm major incident declaration
- [ ] Establish bridge call
- [ ] Identify technical lead
- [ ] Send initial stakeholder notification
- [ ] Assign scribe for timeline

ONGOING (Every 30 minutes):
- [ ] Status update to bridge call
- [ ] Customer communication posted
- [ ] Executive update (if needed)
- [ ] Timeline reviewed and updated
- [ ] Resource needs assessed

RESOLUTION:
- [ ] Service restoration verified
- [ ] Final customer communication
- [ ] Close major incident record
- [ ] Schedule PIR
- [ ] Create problem record

POST-INCIDENT:
- [ ] Conduct PIR meeting
- [ ] Document findings
- [ ] Track action items
- [ ] Share lessons learned
```

## Tool Usage Summary

### MCP Tools

| Tool | Purpose | Phase |
|------|---------|-------|
| `SN-Create-Incident` | Create major incident if not exists | 1 |
| `SN-Update-Record` | Update incident status, priority, resolution | 1, 5, 6 |
| `SN-Add-Work-Notes` | Internal timeline and documentation | All |
| `SN-Add-Comment` | Customer-facing communications | 3, 5 |
| `SN-Query-Table` | Retrieve incident details, timeline | All |
| `SN-Assign-Incident` | Assign incident commander | 1 |
| `SN-NL-Search` | Find related incidents | 1 |

### REST API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/incident` | POST | Create incident |
| `/api/now/table/incident/{sys_id}` | PATCH | Update incident |
| `/api/now/table/incident/{sys_id}` | GET | Get incident details |
| `/api/now/table/sys_journal_field` | GET | Retrieve timeline entries |
| `/api/now/table/problem` | POST | Create problem for PIR |
| `/api/now/table/task` | POST | Create bridge call task |

## Best Practices

- **Speed Over Perfection:** In a major incident, fast action beats perfect action
- **Communicate Early, Communicate Often:** Stakeholders prefer frequent updates even if "still investigating"
- **Single Throat to Choke:** One Incident Commander, clear accountability
- **Blameless Culture:** Focus on fixing, not blaming - save analysis for PIR
- **Document Everything:** Every action and decision in work notes with timestamps
- **Separate Technical and Communication:** Let technical team focus on fixing, IC handles communication
- **Pre-defined Escalation Paths:** Know who to call before you need them
- **ITIL Alignment:** Major Incident Management is a key ITIL 4 practice

## Troubleshooting

### Bridge call not starting

**Symptom:** Technical teams not joining bridge
**Cause:** Unclear communication or wrong conference details
**Solution:** Re-send notification with correct details; use multiple channels (email, Teams, SMS)

### Stakeholders demanding updates too frequently

**Symptom:** IC spending more time on updates than coordination
**Cause:** Stakeholder anxiety, unclear update schedule
**Solution:** Set clear update cadence upfront; delegate communication to dedicated role

### Timeline gaps

**Symptom:** PIR reveals missing information about what happened
**Cause:** No dedicated scribe, too busy fighting fire
**Solution:** Always assign dedicated scribe; use automated timeline capture where possible

### Resolution disputed

**Symptom:** Users report service still impacted after "restoration"
**Cause:** Incomplete verification, different user experience
**Solution:** Define clear restoration criteria; test from user perspective; use monitoring data

## Communication Templates

### Status Page Update Template

```
[SERVICE NAME] - [STATUS]

Current Status: [Investigating/Identified/Monitoring/Resolved]

[timestamp] - [Brief update]

Affected Components:
- [Component 1]
- [Component 2]

More information will be provided as it becomes available.
```

### Email Templates

**Initial Notification:**
```
Subject: [MAJOR INCIDENT] [Service] - Service Disruption

A major incident affecting [Service] has been declared.

Impact: [Brief description]
Status: Investigating
Incident Commander: [Name]

Updates will be provided every 30 minutes.

Bridge Call: [details]
```

**Resolution Notification:**
```
Subject: [RESOLVED] [Service] - Service Restored

The major incident affecting [Service] has been resolved.

Duration: [start time] - [end time]
Root Cause: [Brief, non-technical explanation]
Resolution: [What was done]

A Post-Incident Review will be conducted and findings shared.

We apologize for any inconvenience.
```

## Related Skills

- `itsm/incident-lifecycle` - Standard incident management
- `itsm/incident-triage` - Incident triage process
- `itsm/problem-analysis` - Root cause analysis
- `itsm/change-management` - Emergency changes during major incidents
- `admin/notification-management` - Automated notifications

## References

- [ServiceNow Major Incident Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/incident-management/concept/c_MajorIncidentManagement.html)
- [ITIL 4 Incident Management Practice](https://www.itil.org)
- [Google SRE Book - Incident Management](https://sre.google/sre-book/managing-incidents/)
- [PagerDuty Incident Response Guide](https://response.pagerduty.com/)
