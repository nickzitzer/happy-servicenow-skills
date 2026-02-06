---
name: change-management
version: 1.0.0
description: Complete change lifecycle management including RFC creation, CAB preparation, approval workflows, implementation coordination, and post-implementation review
author: Happy Technologies LLC
tags: [itsm, change, rfc, cab, approval, implementation, pir, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-List-ChangeRequests
    - SN-Add-Change-Comment
    - SN-Assign-Change
    - SN-Approve-Change
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/change_request
    - /api/now/table/change_task
    - /api/now/table/sysapproval_approver
    - /api/now/table/std_change_catalog
    - /api/now/table/sys_journal_field
  native:
    - Bash
complexity: advanced
estimated_time: 30-120 minutes
---

# Change Management Lifecycle

## Overview

This skill provides end-to-end guidance for managing changes in ServiceNow following ITIL best practices. It covers the complete lifecycle from Request for Change (RFC) creation through Post-Implementation Review (PIR).

**Change Management Goals:**
- Minimize risk of service disruption
- Ensure proper authorization and documentation
- Enable controlled implementation of changes
- Facilitate continuous improvement through PIR

**Change Types Covered:**
- **Normal:** Standard approval workflow, CAB review
- **Standard:** Pre-approved, low-risk, repeatable changes
- **Emergency:** Expedited process for urgent fixes

## Prerequisites

- **Roles:** `itil`, `change_manager`, or `cab_member`
- **Access:** Read/write to change_request, change_task tables
- **Knowledge:** Change management process, CAB procedures
- **Related Skills:** `itsm/problem-analysis` (for fix implementation)

## Procedure

### Phase 1: RFC Creation

#### Step 1.1: Create Normal Change Request

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: change_request
  data:
    short_description: "[Action] [CI/Service] - [Brief purpose]"
    description: |
      CHANGE OVERVIEW:
      [Detailed description of what will be changed]

      BUSINESS JUSTIFICATION:
      [Why this change is needed]

      SCOPE:
      - In Scope: [What is included]
      - Out of Scope: [What is explicitly excluded]

      AFFECTED SERVICES/CIS:
      - [Service/CI 1]
      - [Service/CI 2]

      DEPENDENCIES:
      - [Dependency 1]
      - [Dependency 2]
    type: normal
    category: [Hardware/Software/Network/Other]
    priority: 3
    risk: moderate
    impact: 2
    assignment_group: [implementation_team_sys_id]
    cmdb_ci: [affected_ci_sys_id]
    requested_by: [requester_sys_id]
    start_date: [planned_start]
    end_date: [planned_end]
```

**Using REST API:**
```bash
POST /api/now/table/change_request
Content-Type: application/json

{
  "short_description": "Upgrade Database Server - Production CRM",
  "description": "CHANGE OVERVIEW:\nUpgrade Oracle database from 19c to 21c...",
  "type": "normal",
  "category": "Software",
  "priority": "3",
  "risk": "moderate",
  "impact": "2",
  "assignment_group": "group_sys_id",
  "cmdb_ci": "ci_sys_id",
  "start_date": "2024-02-15 22:00:00",
  "end_date": "2024-02-16 02:00:00"
}
```

#### Step 1.2: Create Standard Change Request

**First, find approved standard change template:**
```
Tool: SN-Query-Table
Parameters:
  table_name: std_change_catalog
  query: active=true^namLIKE[keyword]
  fields: sys_id,name,short_description,template
  limit: 10
```

**Create from template:**
```
Tool: SN-Create-Record
Parameters:
  table_name: change_request
  data:
    short_description: "[Standard change description]"
    description: |
      STANDARD CHANGE EXECUTION:
      Template: [Template name]

      SPECIFIC DETAILS FOR THIS INSTANCE:
      - Target System: [system]
      - Scheduled Date: [date]
      - Requestor: [name]
    type: standard
    std_change_producer_version: [template_sys_id]
    category: [from template]
    assignment_group: [implementation_team]
    cmdb_ci: [target_ci]
    start_date: [planned_start]
    end_date: [planned_end]
```

#### Step 1.3: Create Emergency Change Request

**Emergency changes bypass normal CAB but still require documentation:**
```
Tool: SN-Create-Record
Parameters:
  table_name: change_request
  data:
    short_description: "[EMERGENCY] [Brief description of urgent fix]"
    description: |
      === EMERGENCY CHANGE REQUEST ===

      EMERGENCY JUSTIFICATION:
      [Why this cannot wait for normal change process]

      INCIDENT REFERENCE:
      [Related incident number if applicable]

      IMMEDIATE RISK IF NOT IMPLEMENTED:
      - [Risk 1]
      - [Risk 2]

      PROPOSED CHANGE:
      [What will be done]

      MINIMAL TESTING PERFORMED:
      [Testing done given time constraints]

      VERBAL APPROVAL:
      - Approved by: [name]
      - Time: [timestamp]
      - Method: [phone/in-person]
    type: emergency
    category: [category]
    priority: 1
    risk: high
    impact: 1
    assignment_group: [implementation_team]
    cmdb_ci: [affected_ci]
    reason: |
      EMERGENCY REASON:
      [Detailed reason for emergency classification]
    start_date: [immediate]
    end_date: [expected_completion]
```

### Phase 2: Change Documentation

#### Step 2.1: Implementation Plan

**Add detailed implementation plan:**
```
Tool: SN-Update-Record
Parameters:
  table_name: change_request
  sys_id: [change_sys_id]
  data:
    implementation_plan: |
      === IMPLEMENTATION PLAN ===

      PRE-IMPLEMENTATION:
      Time: [start] - [time]

      1. [ ] Notify stakeholders of maintenance window
         Responsible: [name]

      2. [ ] Verify backup completion
         Responsible: [name]

      3. [ ] Confirm rollback resources available
         Responsible: [name]

      4. [ ] Place system in maintenance mode
         Responsible: [name]

      IMPLEMENTATION:
      Time: [time] - [time]

      5. [ ] [Step 5 description]
         Command/Action: [specific command or action]
         Expected Duration: [X minutes]
         Success Criteria: [how to verify]

      6. [ ] [Step 6 description]
         Command/Action: [specific command or action]
         Expected Duration: [X minutes]
         Success Criteria: [how to verify]

      7. [ ] [Step 7 description]
         Command/Action: [specific command or action]
         Expected Duration: [X minutes]
         Success Criteria: [how to verify]

      VERIFICATION:
      Time: [time] - [time]

      8. [ ] Run verification tests
         Test Script: [location]
         Expected Results: [description]

      9. [ ] Confirm user access
         Test Users: [list]

      10. [ ] Monitor system for 30 minutes
          Metrics to watch: [list]

      POST-IMPLEMENTATION:
      Time: [time] - [end]

      11. [ ] Remove maintenance mode

      12. [ ] Send completion notification

      13. [ ] Update documentation
```

#### Step 2.2: Backout/Rollback Plan

```
Tool: SN-Update-Record
Parameters:
  table_name: change_request
  sys_id: [change_sys_id]
  data:
    backout_plan: |
      === BACKOUT/ROLLBACK PLAN ===

      ROLLBACK DECISION CRITERIA:
      Initiate rollback if ANY of the following occur:
      - [ ] Implementation step fails and cannot be resolved in [X] minutes
      - [ ] Verification tests fail
      - [ ] Service degradation exceeds [threshold]
      - [ ] Unexpected errors in logs
      - [ ] [Other criteria]

      ROLLBACK POINT OF NO RETURN:
      After step [X], rollback becomes significantly more complex.
      Decision to proceed or rollback must be made by: [time]

      ROLLBACK PROCEDURE:
      Estimated Duration: [X minutes]

      1. [ ] Stop current implementation
         Action: [specific action]

      2. [ ] Restore from backup
         Backup Location: [location]
         Restore Command: [command]
         Expected Duration: [X minutes]

      3. [ ] Verify service restoration
         Test: [test procedure]

      4. [ ] Remove maintenance mode

      5. [ ] Notify stakeholders of rollback
         Communication: [template/channel]

      ROLLBACK VERIFICATION:
      - [ ] Service accessible
      - [ ] User authentication working
      - [ ] Core functions verified
      - [ ] No data loss confirmed

      POST-ROLLBACK:
      - Document reason for rollback
      - Create problem ticket if root cause unknown
      - Schedule re-attempt after analysis
```

#### Step 2.3: Test Plan

```
Tool: SN-Update-Record
Parameters:
  table_name: change_request
  sys_id: [change_sys_id]
  data:
    test_plan: |
      === TEST PLAN ===

      PRE-CHANGE BASELINE:
      Capture current state for comparison
      - [ ] System performance metrics: [specific metrics]
      - [ ] Current version info: [how to capture]
      - [ ] User count/active sessions: [query/tool]

      SMOKE TESTS:
      Quick tests to verify basic functionality

      | Test | Action | Expected Result | Pass/Fail |
      |------|--------|-----------------|-----------|
      | Login | Admin login | Dashboard loads | |
      | Core Function | [action] | [expected] | |
      | API | [endpoint] | 200 OK | |
      | Database | [query] | [expected] | |

      FUNCTIONAL TESTS:
      Detailed functionality verification

      | Test ID | Test Case | Steps | Expected | Actual | Pass/Fail |
      |---------|-----------|-------|----------|--------|-----------|
      | FT-001 | [name] | [steps] | [expected] | | |
      | FT-002 | [name] | [steps] | [expected] | | |
      | FT-003 | [name] | [steps] | [expected] | | |

      PERFORMANCE TESTS:
      Compare against baseline

      | Metric | Baseline | Post-Change | Threshold | Pass/Fail |
      |--------|----------|-------------|-----------|-----------|
      | Response Time | [X]ms | | <[Y]ms | |
      | CPU Usage | [X]% | | <[Y]% | |
      | Memory | [X]GB | | <[Y]GB | |

      USER ACCEPTANCE:
      - Test User: [name]
      - Test Scenario: [description]
      - Sign-off Required: Yes/No
```

### Phase 3: CAB Preparation and Scheduling

#### Step 3.1: Schedule for CAB Review

**Update change for CAB:**
```
Tool: SN-Update-Record
Parameters:
  table_name: change_request
  sys_id: [change_sys_id]
  data:
    state: -4  # Assess
    cab_required: true
    cab_date: [cab_meeting_date]
    work_notes: |
      === CAB SUBMISSION ===

      Submitted for CAB Review: [date]
      Target CAB Meeting: [date/time]

      CAB Preparation Checklist:
      - [x] Implementation plan complete
      - [x] Backout plan complete
      - [x] Test plan complete
      - [x] Risk assessment complete
      - [x] Stakeholders identified
      - [x] Communication plan ready

      Additional Materials:
      - [Link to supporting documentation]
      - [Architecture diagram reference]
```

#### Step 3.2: Create CAB Presentation Summary

```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [change_sys_id]
  work_notes: |
    === CAB PRESENTATION SUMMARY ===

    CHANGE: [CHG#]
    TITLE: [Short description]
    REQUESTOR: [Name/Team]

    WHAT:
    [One paragraph summary of the change]

    WHY:
    [Business justification in 2-3 sentences]

    WHEN:
    - Proposed Start: [date/time]
    - Proposed End: [date/time]
    - Duration: [X hours]
    - Maintenance Window: [Yes/No - description]

    WHO IS AFFECTED:
    - Users: [groups/count]
    - Services: [list]
    - Regions: [if applicable]

    RISK ASSESSMENT:
    - Risk Level: [Low/Moderate/High]
    - Impact if Fails: [description]
    - Likelihood of Failure: [Low/Medium/High]

    MITIGATION:
    - [Key mitigation 1]
    - [Key mitigation 2]

    ROLLBACK:
    - Rollback possible: [Yes/No]
    - Rollback time: [X minutes/hours]
    - Point of no return: [time/step]

    DEPENDENCIES:
    - [Other changes/freezes/events]

    APPROVAL REQUESTED:
    [Standard/Expedited approval request]
```

#### Step 3.3: Query Scheduled CAB Changes

**Find all changes scheduled for CAB:**
```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: cab_required=true^cab_date>=javascript:gs.beginningOfToday()^cab_dateONThis week@javascript:gs.beginningOfThisWeek()@javascript:gs.endOfThisWeek()^state=-4
  fields: number,short_description,cab_date,requested_by,assignment_group,risk,priority
  order_by: cab_date
```

### Phase 4: Change Approval

#### Step 4.1: Check Approval Status

```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: document_id=[change_sys_id]
  fields: sys_id,approver,state,comments,sys_updated_on
```

#### Step 4.2: Approve Change (as Approver)

**Using MCP:**
```
Tool: SN-Approve-Change
Parameters:
  sys_id: [change_sys_id]
  approval_state: approved
  comments: |
    Approved based on:
    - Risk assessment reviewed and acceptable
    - Implementation plan verified complete
    - Rollback plan adequate
    - Testing plan comprehensive
    - Change window appropriate

    Conditions:
    - [Any conditions for approval]
```

**Using REST API:**
```bash
PATCH /api/now/table/sysapproval_approver/{approver_sys_id}
Content-Type: application/json

{
  "state": "approved",
  "comments": "Approved based on:\n- Risk assessment reviewed..."
}
```

**Reject Change:**
```
Tool: SN-Approve-Change
Parameters:
  sys_id: [change_sys_id]
  approval_state: rejected
  comments: |
    Change rejected for the following reasons:

    1. [Reason 1]
    2. [Reason 2]

    Required remediation before resubmission:
    - [Action 1]
    - [Action 2]

    Please address these concerns and resubmit.
```

#### Step 4.3: Move to Scheduled State

**After approval:**
```
Tool: SN-Update-Record
Parameters:
  table_name: change_request
  sys_id: [change_sys_id]
  data:
    state: -1  # Scheduled
    work_notes: |
      === CHANGE APPROVED AND SCHEDULED ===

      Approval Received: [date]
      Approved By: [names]

      Implementation Window:
      Start: [date/time]
      End: [date/time]

      Pre-Implementation Meeting: [date/time if scheduled]

      Go/No-Go Decision Time: [time before start]
```

### Phase 5: Implementation

#### Step 5.1: Create Implementation Tasks

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: change_task
  data:
    parent: [change_sys_id]
    change_task_type: planning
    short_description: "Pre-Implementation: [Task description]"
    description: |
      PRE-IMPLEMENTATION TASK

      Objective: [What needs to be done]

      Steps:
      1. [Step 1]
      2. [Step 2]

      Deliverables:
      - [Deliverable 1]

      Completion Criteria:
      - [How to know it's done]
    assignment_group: [team]
    assigned_to: [person]
    planned_start_date: [start]
    planned_end_date: [end]
```

**Standard task types:**
- `planning` - Pre-implementation preparation
- `implementation` - Actual change execution
- `testing` - Verification and testing
- `review` - Post-implementation review

#### Step 5.2: Begin Implementation

**Update change to Implementation state:**
```
Tool: SN-Update-Record
Parameters:
  table_name: change_request
  sys_id: [change_sys_id]
  data:
    state: -2  # Implement
    work_notes: |
      === IMPLEMENTATION STARTED ===

      Time: [timestamp]
      Implementation Lead: [name]

      Go Decision Made By: [name]
      Go Criteria Met:
      - [x] Backup verified
      - [x] Rollback team on standby
      - [x] Stakeholders notified
      - [x] Maintenance mode active

      Starting implementation step 1...
```

#### Step 5.3: Document Implementation Progress

```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [change_sys_id]
  work_notes: |
    === IMPLEMENTATION LOG ===

    [HH:MM] - Step [X]: [Description]
    Status: COMPLETE
    Notes: [Any observations]

    [HH:MM] - Step [X+1]: [Description]
    Status: IN PROGRESS

    Current Overall Status: ON TRACK / DELAYED / AT RISK

    Issues Encountered:
    - [Issue if any, or "None"]

    Next Milestone: [Description] at [time]
```

#### Step 5.4: Complete Implementation

```
Tool: SN-Update-Record
Parameters:
  table_name: change_request
  sys_id: [change_sys_id]
  data:
    state: 0  # Review
    work_notes: |
      === IMPLEMENTATION COMPLETE ===

      Completion Time: [timestamp]

      IMPLEMENTATION SUMMARY:
      - All steps executed successfully: [Yes/No]
      - Deviations from plan: [None/Description]
      - Issues encountered: [None/Description]

      VERIFICATION RESULTS:
      - Smoke tests: PASS/FAIL
      - Functional tests: PASS/FAIL
      - Performance tests: PASS/FAIL

      POST-IMPLEMENTATION STATUS:
      - Service operational: Yes
      - Users notified: Yes
      - Monitoring active: Yes

      Ready for PIR: Yes
```

### Phase 6: Post-Implementation Review (PIR)

#### Step 6.1: Schedule PIR

```
Tool: SN-Create-Record
Parameters:
  table_name: change_task
  data:
    parent: [change_sys_id]
    change_task_type: review
    short_description: "Post-Implementation Review - [CHG#]"
    description: |
      POST-IMPLEMENTATION REVIEW

      Meeting Details:
      Date: [date]
      Time: [time]
      Location/Call: [details]

      Required Attendees:
      - Change Owner
      - Implementation Team
      - Technical Approvers
      - Service Owner (optional)

      Agenda:
      1. Change summary (5 min)
      2. Implementation review (10 min)
      3. What went well (10 min)
      4. What could improve (10 min)
      5. Action items (10 min)
      6. Lessons learned (5 min)
    assigned_to: [change_owner]
    planned_start_date: [pir_date]
```

#### Step 6.2: Document PIR Results

```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [change_sys_id]
  work_notes: |
    === POST-IMPLEMENTATION REVIEW ===

    PIR Date: [date]
    Attendees: [list]

    CHANGE OUTCOME: [Successful/Successful with Issues/Partial/Failed/Rolled Back]

    METRICS:
    - Planned Duration: [X hours]
    - Actual Duration: [Y hours]
    - Variance: [+/- Z hours]
    - User Impact: [None/Minimal/Moderate/Significant]

    WHAT WENT WELL:
    1. [Positive outcome 1]
    2. [Positive outcome 2]
    3. [Positive outcome 3]

    WHAT COULD BE IMPROVED:
    1. [Improvement area 1]
    2. [Improvement area 2]
    3. [Improvement area 3]

    DEVIATIONS FROM PLAN:
    - [Deviation 1 and why]
    - [Deviation 2 and why]

    ACTION ITEMS:
    1. [Action] - Owner: [name] - Due: [date]
    2. [Action] - Owner: [name] - Due: [date]

    LESSONS LEARNED:
    - [Lesson that should be shared]
    - [Process improvement suggestion]

    PIR STATUS: Complete
```

#### Step 6.3: Close Change Request

```
Tool: SN-Update-Record
Parameters:
  table_name: change_request
  sys_id: [change_sys_id]
  data:
    state: 3  # Closed
    close_code: successful
    close_notes: |
      CHANGE CLOSURE SUMMARY

      Change: [CHG#]
      Title: [Short description]

      Result: SUCCESSFUL

      Implementation Date: [date]
      Implementation Duration: [X hours]

      Benefits Realized:
      - [Benefit 1]
      - [Benefit 2]

      Documentation Updated:
      - [ ] CMDB updated
      - [ ] Knowledge base updated
      - [ ] Runbooks updated

      PIR Complete: Yes
      PIR Date: [date]

      No outstanding issues.
```

**Close Code Options:**
- `successful` - Change implemented as planned
- `successful_issues` - Implemented with minor issues
- `unsuccessful` - Change failed or was rolled back

## Change State Flow

```
┌────────────┐    ┌──────────┐    ┌───────────┐    ┌───────────┐
│    New     │───►│  Assess  │───►│ Authorize │───►│ Scheduled │
│   (-5)     │    │   (-4)   │    │   (-3)    │    │   (-1)    │
└────────────┘    └──────────┘    └───────────┘    └─────┬─────┘
                                                         │
┌────────────┐    ┌──────────┐    ┌───────────┐         │
│   Closed   │◄───│  Review  │◄───│ Implement │◄────────┘
│    (3)     │    │   (0)    │    │   (-2)    │
└────────────┘    └──────────┘    └───────────┘
                        │
                        └───────► Canceled (4)
```

## Risk Assessment Matrix

| Risk Level | Impact | Probability | Approval | Testing |
|------------|--------|-------------|----------|---------|
| Low | Minor | Unlikely | Auto/Manager | Minimal |
| Moderate | Significant | Possible | CAB | Standard |
| High | Major | Likely | CAB + Executive | Extensive |
| Critical | Severe | Probable | Board Level | Full regression |

## Tool Usage Summary

### MCP Tools

| Tool | Purpose | Phase |
|------|---------|-------|
| `SN-List-ChangeRequests` | List changes by criteria | All |
| `SN-Create-Record` | Create change, tasks | 1, 5, 6 |
| `SN-Update-Record` | Update change status, plans | 2-6 |
| `SN-Add-Work-Notes` | Document all activities | All |
| `SN-Add-Change-Comment` | Stakeholder communication | 3, 5 |
| `SN-Assign-Change` | Assign to teams/individuals | 1, 5 |
| `SN-Approve-Change` | Approve/reject changes | 4 |
| `SN-Query-Table` | Query approvals, tasks | All |

### REST API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/change_request` | GET | List changes |
| `/api/now/table/change_request` | POST | Create change |
| `/api/now/table/change_request/{sys_id}` | PATCH | Update change |
| `/api/now/table/change_task` | POST | Create tasks |
| `/api/now/table/sysapproval_approver` | GET | Check approvals |
| `/api/now/table/sysapproval_approver/{sys_id}` | PATCH | Approve/reject |
| `/api/now/table/std_change_catalog` | GET | List standard changes |

## Best Practices

- **Plan Thoroughly:** Complete implementation and rollback plans before CAB
- **Right-Size the Change:** Don't combine unrelated changes
- **Test in Lower Environments:** Always test before production
- **Communication is Key:** Over-communicate to stakeholders
- **Document Everything:** Future you will thank current you
- **Learn from PIR:** Actually implement PIR action items
- **Use Standard Changes:** Pre-approve repeatable low-risk changes
- **Emergency != Undocumented:** Emergency changes still need documentation
- **ITIL Alignment:** Follow the Change Enablement practice

## Troubleshooting

### "Change stuck in Assess"

**Cause:** Missing required fields or documentation
**Solution:** Verify all mandatory fields completed; check for validation rules

### "Approval taking too long"

**Cause:** Approver unavailable or notification not received
**Solution:** Contact approver directly; check notification logs; use delegation

### "CAB rejected change"

**Cause:** Insufficient documentation, risk concerns, or timing conflict
**Solution:** Address CAB feedback; resubmit with improvements

### "Implementation failed"

**Cause:** Various - insufficient testing, unexpected conditions
**Solution:** Execute rollback plan; document failure; create problem ticket; reschedule

### "Cannot close change"

**Cause:** Open tasks, missing PIR, or missing closure fields
**Solution:** Complete all tasks; document PIR; fill required closure fields

## Change Templates

### Normal Change Quick Reference
```
Type: Normal
CAB Required: Yes (typically)
Lead Time: 5-10 business days
Approval: CAB + Manager
Testing: Full cycle
```

### Standard Change Quick Reference
```
Type: Standard
CAB Required: No (pre-approved)
Lead Time: 1-3 business days
Approval: Automatic
Testing: As per template
```

### Emergency Change Quick Reference
```
Type: Emergency
CAB Required: Yes (post-implementation ECAB)
Lead Time: Immediate
Approval: Emergency approver (verbal OK, documented later)
Testing: Minimal (risk accepted)
```

## Related Skills

- `itsm/incident-lifecycle` - For related incidents
- `itsm/major-incident` - Emergency changes during major incidents
- `itsm/problem-analysis` - Changes for permanent fixes
- `admin/release-management` - Release coordination
- `admin/configuration-management` - CMDB updates

## References

- [ServiceNow Change Management](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/change-management/concept/c_ITILChangeManagement.html)
- [ITIL 4 Change Enablement](https://www.itil.org)
- [Change Advisory Board Best Practices](https://www.bmc.com/blogs/change-advisory-board-cab-best-practices/)
- [DevOps and Change Management](https://www.atlassian.com/itsm/change-management)
