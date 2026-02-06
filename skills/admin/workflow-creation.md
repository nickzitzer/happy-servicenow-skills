---
name: workflow-creation
version: 1.0.0
description: Programmatic workflow creation via API/MCP - build complete workflows without the UI editor
author: Happy Technologies LLC
tags: [admin, workflow, automation, approval, scripting, advanced]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Create-Workflow
    - SN-Create-Activity
    - SN-Create-Transition
    - SN-Publish-Workflow
    - SN-Create-Record
    - SN-Update-Record
    - SN-Query-Table
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/wf_workflow
    - /api/now/table/wf_workflow_version
    - /api/now/table/wf_activity
    - /api/now/table/wf_transition
    - /api/now/table/wf_condition
    - /api/now/table/wf_element_definition
  native:
    - Bash
    - Read
complexity: advanced
estimated_time: 30-90 minutes
---

# Programmatic Workflow Creation

## Overview

This skill enables you to create complete ServiceNow workflows entirely via API/MCP without using the visual Workflow Editor. This is essential for:

- **Automation pipelines** - Create workflows as part of CI/CD deployments
- **Templated solutions** - Generate standardized workflows from templates
- **Mass creation** - Build multiple similar workflows programmatically
- **Version control** - Store workflow definitions as code in Git
- **Environment migration** - Recreate workflows across instances

**Key Discovery:** Activities store their logic in the `input` field as JavaScript code. This enables full programmatic workflow creation by:
1. Creating the workflow structure (wf_workflow, wf_workflow_version)
2. Creating activities with embedded scripts (wf_activity)
3. Linking activities with transitions (wf_transition, wf_condition)
4. Publishing the workflow version

## Prerequisites

- **Roles:** `admin` or `workflow_admin`
- **Permissions:** Write access to workflow tables (wf_*)
- **Knowledge:** Basic understanding of workflow concepts
- **Environment:** Development or test instance (never create workflows in production first)
- **Related Skills:** `admin/update-set-management` - Capture workflows in update sets

## Table Architecture

Understanding the workflow tables is critical for programmatic creation.

### Core Tables

```
wf_workflow (base definition)
    |
    +-- wf_workflow_version (published versions)
            |
            +-- wf_activity (activities with scripts)
            |       |
            |       +-- wf_element_definition (activity types)
            |       +-- wf_stage (optional stages)
            |
            +-- wf_transition (connects activities)
            |       |
            |       +-- wf_condition (transition logic)
            |
            +-- wf_condition (workflow-level conditions)
```

### Key Relationships

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `wf_workflow` | Base workflow definition | name, table, description |
| `wf_workflow_version` | Versioned workflow | workflow, table, start, published |
| `wf_activity` | Individual activities | workflow_version, input, x, y |
| `wf_transition` | Activity connections | from, to, condition |
| `wf_condition` | Transition conditions | activity, condition, else_flag |
| `wf_element_definition` | Activity type definitions | name, default_input |

## Procedure

### Step 1: Discover Activity Types

First, identify available activity types (wf_element_definition).

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wf_element_definition
  query: active=true
  fields: sys_id,name,category,description
  limit: 50
```

**Common Activity Types:**

| sys_id | Name | Use Case |
|--------|------|----------|
| 0a6c97790a0a0b2756919eb960284334 | Notification | Send email/SMS |
| 1ca8d7cf0a0a0b265e9a000c2c08248c | Set Values | Set field values |
| 35433da80a0a029a0028c639a1e51eb4 | Approval - User | User approval |
| 354e911f0a0a029a00e6a0e6ad74206f | Approval - Group | Group approval |
| 283e8bb80a2581021d036a052ffc3433 | Approval Coordinator | Multi-approval container |
| 38891b6f0a0a0b1e00efdfdd77602027 | Catalog Task | Create catalog task |
| 3961a1da0a0a0b5c00ecd84822f70d85 | Timer | Wait/delay |
| 396807940a0a0b5c00afd9f67d9fd7a2 | Log Message | Debug logging |
| 5994b389c0a80011000e64de81b1864c | Subflow | Call another workflow |
| 7c9a2ba9c0a801650021ada408de0ebd | Join | Wait for multiple paths |
| 7a8ea386c0a80066179bc1f5186e1d2b | Rollback | Go back to earlier activity |

**Note:** Custom script activities can omit `activity_definition` entirely.

### Step 2: Create Base Workflow

Create the workflow container record.

**Using MCP (Preferred):**
```
Tool: SN-Create-Workflow
Parameters:
  name: "P1 Incident Auto-Assignment"
  table: "incident"
  description: "Auto-assign P1 incidents to on-call engineer"
  condition: "priority=1^state=1"
```

**Using SN-Create-Record:**
```
Tool: SN-Create-Record
Parameters:
  table_name: wf_workflow
  data:
    name: "P1 Incident Auto-Assignment"
    description: "Auto-assign P1 incidents to on-call engineer"
    template: false
    access: "public"
```

**Important:** The `name` and `table` fields become **read-only after creation**. Choose carefully.

**Save the sys_id:** `workflow_sys_id`

### Step 3: Create Workflow Version

Create a version that holds the actual workflow logic.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: wf_workflow_version
  data:
    name: "P1 Incident Auto-Assignment"
    workflow: [workflow_sys_id]
    table: "incident"
    condition: "priority=1^state=1"
    active: true
    published: false
    order: 100
    run_multiple: false
    after_business_rules: true
```

**Key Fields:**

| Field | Purpose | Notes |
|-------|---------|-------|
| `table` | Target table | REQUIRED - what records trigger this |
| `condition` | Trigger condition | Encoded query format |
| `active` | Is active | Set true for workflow to run |
| `published` | Is published | Set false initially, publish after testing |
| `run_multiple` | Allow concurrent instances | Usually false |
| `after_business_rules` | When to run | Usually true |

**Save the sys_id:** `version_sys_id`

### Step 4: Create Activities

Create each activity with its embedded script.

**Activity 1: Start Activity**

**Using MCP (Preferred):**
```
Tool: SN-Create-Activity
Parameters:
  workflow_version_id: [version_sys_id]
  name: "Check On-Call Engineer"
  x: 100
  y: 100
  script: |
    // Find on-call engineer
    var oncall = new GlideRecord('on_call_rotation');
    oncall.addQuery('active', true);
    oncall.addQuery('group', current.assignment_group);
    oncall.query();
    if (oncall.next()) {
      workflow.scratchpad.oncall_engineer = oncall.user.toString();
      gs.info('Found on-call: ' + oncall.user.name);
    } else {
      workflow.scratchpad.oncall_engineer = '';
      gs.warn('No on-call engineer found');
    }
```

**Using SN-Create-Record:**
```
Tool: SN-Create-Record
Parameters:
  table_name: wf_activity
  data:
    name: "Check On-Call Engineer"
    workflow_version: [version_sys_id]
    x: 100
    y: 100
    width: 150
    height: 80
    input: |
      // Script content here...
```

**Save the sys_id:** `activity_start_id`

**Activity 2: Decision/Branch Activity**
```
Tool: SN-Create-Activity
Parameters:
  workflow_version_id: [version_sys_id]
  name: "Assign to On-Call"
  x: 250
  y: 100
  script: |
    // Assign incident based on on-call lookup
    if (workflow.scratchpad.oncall_engineer) {
      current.assigned_to = workflow.scratchpad.oncall_engineer;
      current.state = 2;  // In Progress
      current.work_notes = 'Auto-assigned to on-call engineer by workflow';
      current.update();
      answer = 'assigned';
      gs.info('Assigned to: ' + current.assigned_to.name);
    } else {
      answer = 'no_oncall';
      gs.warn('Could not assign - no on-call engineer');
    }
```

**Save the sys_id:** `activity_assign_id`

**Activity 3: Notification Activity**
```
Tool: SN-Create-Activity
Parameters:
  workflow_version_id: [version_sys_id]
  name: "Send Notification"
  x: 400
  y: 100
  type: "notification"
  script: |
    // Send email notification
    var email = new GlideEmailOutbound();
    email.setSubject('P1 Incident Assigned: ' + current.number);
    email.setFrom('noreply@company.com');
    email.addAddress(current.assigned_to.email);
    email.setBody('You have been assigned P1 incident: ' + current.number + '\n' +
                  'Priority: 1\n' +
                  'Short Description: ' + current.short_description);
    email.send();
    gs.info('Notification sent to: ' + current.assigned_to.email);
```

**Save the sys_id:** `activity_notify_id`

**Activity 4: Escalation Activity (Branch Path)**
```
Tool: SN-Create-Activity
Parameters:
  workflow_version_id: [version_sys_id]
  name: "Escalate to Manager"
  x: 250
  y: 250
  script: |
    // Escalate to manager
    var manager = current.assignment_group.manager;
    if (manager) {
      current.assigned_to = manager;
      current.escalation = 1;
      current.work_notes = 'Escalated to manager - no on-call engineer available';
      current.update();
      gs.info('Escalated to manager: ' + manager.name);
    }
```

**Save the sys_id:** `activity_escalate_id`

### Step 5: Create Transition Conditions

Define conditions for branching paths.

**Condition 1: "Assigned" Path**
```
Tool: SN-Create-Record
Parameters:
  table_name: wf_condition
  data:
    activity: [activity_assign_id]
    name: "Assigned Successfully"
    short_description: "On-call engineer found and assigned"
    condition: "answer=assigned"
    order: 1
```

**Save the sys_id:** `condition_assigned_id`

**Condition 2: "No On-Call" Path**
```
Tool: SN-Create-Record
Parameters:
  table_name: wf_condition
  data:
    activity: [activity_assign_id]
    name: "No On-Call"
    short_description: "No on-call engineer found"
    condition: "answer=no_oncall"
    order: 2
```

**Save the sys_id:** `condition_no_oncall_id`

**Else Condition (Default Path):**
```
Tool: SN-Create-Record
Parameters:
  table_name: wf_condition
  data:
    activity: [activity_assign_id]
    name: "Default"
    short_description: "Default path"
    else_flag: true
    order: 99
```

### Step 6: Create Transitions

Link activities together with transitions.

**Using MCP (Preferred):**
```
Tool: SN-Create-Transition
Parameters:
  from_activity_id: [activity_start_id]
  to_activity_id: [activity_assign_id]
```

**Transition 1: Start to Assign**
```
Tool: SN-Create-Record
Parameters:
  table_name: wf_transition
  data:
    from: [activity_start_id]
    to: [activity_assign_id]
    order: 1
```

**Transition 2: Assign to Notify (Conditional)**
```
Tool: SN-Create-Record
Parameters:
  table_name: wf_transition
  data:
    from: [activity_assign_id]
    to: [activity_notify_id]
    condition: [condition_assigned_id]
    order: 1
```

**Transition 3: Assign to Escalate (Conditional)**
```
Tool: SN-Create-Record
Parameters:
  table_name: wf_transition
  data:
    from: [activity_assign_id]
    to: [activity_escalate_id]
    condition: [condition_no_oncall_id]
    order: 2
```

**Transition 4: Escalate to Notify (After Escalation)**
```
Tool: SN-Create-Record
Parameters:
  table_name: wf_transition
  data:
    from: [activity_escalate_id]
    to: [activity_notify_id]
    order: 1
```

### Step 7: Set Start Activity and Publish

Update the workflow version with the start activity and publish.

**Using MCP (Preferred):**
```
Tool: SN-Publish-Workflow
Parameters:
  workflow_version_id: [version_sys_id]
  start_activity_id: [activity_start_id]
```

**Using SN-Update-Record:**
```
Tool: SN-Update-Record
Parameters:
  table_name: wf_workflow_version
  sys_id: [version_sys_id]
  data:
    start: [activity_start_id]
    published: true
```

### Step 8: Verify the Workflow

Query to verify workflow structure.

**Check Activities:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wf_activity
  query: workflow_version=[version_sys_id]
  fields: sys_id,name,x,y
```

**Check Transitions:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wf_transition
  query: from.workflow_version=[version_sys_id]
  fields: sys_id,from.name,to.name,condition.name
```

**Check Workflow Version:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wf_workflow_version
  query: sys_id=[version_sys_id]
  fields: name,table,start.name,published,active
```

## Workflow Context and Scripting

### Available Variables in Activity Scripts

```javascript
// The current record being processed
current

// Workflow scratchpad - share data between activities
workflow.scratchpad.your_variable = 'value';

// Activity result - determines which transition to follow
answer = 'approved';  // String that matches condition

// Current activity object
activity

// Workflow context
workflow.name
workflow.context.sys_id
```

### Common Script Patterns

**Pass Data Between Activities:**
```javascript
// Activity 1: Store data
workflow.scratchpad.user_tier = current.u_tier;
workflow.scratchpad.requires_approval = true;
workflow.scratchpad.approval_reasons = [];

// Activity 2: Use stored data
if (workflow.scratchpad.requires_approval) {
  var reasons = workflow.scratchpad.approval_reasons;
  // Process reasons...
}
```

**Branch Logic with Answer Variable:**
```javascript
// Set answer to determine which transition fires
if (current.priority == 1) {
  answer = 'high_priority';
} else if (current.priority == 2) {
  answer = 'medium_priority';
} else {
  answer = 'low_priority';
}
// Create transitions with conditions: answer=high_priority, etc.
```

**Error Handling:**
```javascript
try {
  var gr = new GlideRecord('incident');
  gr.get(current.sys_id);
  // Processing...
  answer = 'success';
} catch(e) {
  gs.error('Workflow error in ' + activity.name + ': ' + e.message);
  workflow.scratchpad.error_message = e.message;
  answer = 'error';
}
```

**Logging for Debugging:**
```javascript
gs.info('[Workflow: ' + workflow.name + '] Activity: ' + activity.name);
gs.info('[Workflow] Processing incident: ' + current.number);
gs.info('[Workflow] Scratchpad data: ' + JSON.stringify(workflow.scratchpad));
```

## Activity Type Examples

### Approval - User

```
Tool: SN-Create-Activity
Parameters:
  workflow_version_id: [version_sys_id]
  name: "Manager Approval"
  x: 300
  y: 150
  type: "35433da80a0a029a0028c639a1e51eb4"
  script: |
    // Create approval request for manager
    var approval = new GlideRecord('sysapproval_approver');
    approval.initialize();
    approval.document_id = current.sys_id;
    approval.source_table = current.getTableName();
    approval.approver = current.opened_by.manager;
    approval.state = 'requested';
    approval.insert();
    gs.info('Approval created for: ' + current.opened_by.manager.name);
```

### Approval - Group

```
Tool: SN-Create-Activity
Parameters:
  workflow_version_id: [version_sys_id]
  name: "CAB Approval"
  x: 300
  y: 150
  type: "354e911f0a0a029a00e6a0e6ad74206f"
  script: |
    // Create group approval request
    var approval = new GlideRecord('sysapproval_group');
    approval.initialize();
    approval.document_id = current.sys_id;
    approval.source_table = current.getTableName();
    approval.assignment_group = 'CAB';  // sys_id or name
    approval.state = 'requested';
    approval.insert();
```

### Catalog Task

```
Tool: SN-Create-Activity
Parameters:
  workflow_version_id: [version_sys_id]
  name: "Create Fulfillment Task"
  x: 350
  y: 150
  type: "38891b6f0a0a0b1e00efdfdd77602027"
  script: |
    // Create catalog task
    var task = new GlideRecord('sc_task');
    task.initialize();
    task.request_item = current.sys_id;
    task.short_description = 'Fulfill: ' + current.short_description;
    task.assignment_group = current.assignment_group;
    task.state = 1;  // Open
    var taskId = task.insert();
    workflow.scratchpad.task_sys_id = taskId;
    gs.info('Created task: ' + task.number);
```

### Timer/Wait

```
Tool: SN-Create-Activity
Parameters:
  workflow_version_id: [version_sys_id]
  name: "Wait 24 Hours"
  x: 400
  y: 150
  type: "3961a1da0a0a0b5c00ecd84822f70d85"
  script: |
    // Timer configuration is typically in vars field
    // This activity waits before proceeding
    gs.info('Timer started - will continue in 24 hours');
```

### Notification

```
Tool: SN-Create-Activity
Parameters:
  workflow_version_id: [version_sys_id]
  name: "Send Email"
  x: 450
  y: 150
  type: "0a6c97790a0a0b2756919eb960284334"
  script: |
    // Send notification
    var email = new GlideEmailOutbound();
    email.setSubject('Request Update: ' + current.number);
    email.setFrom('noreply@company.com');
    email.addAddress(current.opened_by.email);
    email.setBody('Your request ' + current.number + ' has been processed.\n\n' +
                  'Status: ' + current.state.getDisplayValue());
    email.send();
```

### Set Values

```
Tool: SN-Create-Activity
Parameters:
  workflow_version_id: [version_sys_id]
  name: "Update Record Status"
  x: 500
  y: 150
  type: "1ca8d7cf0a0a0b265e9a000c2c08248c"
  script: |
    // Set field values
    current.state = 3;  // Closed
    current.close_code = 'Resolved';
    current.close_notes = 'Completed via workflow';
    current.closed_at = gs.nowDateTime();
    current.update();
```

### Join (Wait for Multiple Paths)

```
Tool: SN-Create-Activity
Parameters:
  workflow_version_id: [version_sys_id]
  name: "Wait for All Approvals"
  x: 400
  y: 200
  type: "7c9a2ba9c0a801650021ada408de0ebd"
  script: |
    // Join waits for all incoming transitions to complete
    gs.info('All paths completed - continuing workflow');
```

## Canvas Layout Best Practices

### Coordinate System

```
Origin (0,0)
    +-----------------------------------------> X (horizontal)
    |
    |   [Start]       [Process]      [End]
    |   (100,100)     (250,100)      (400,100)
    |
    |                 [Branch A]
    |                 (250,200)
    |
    |                 [Branch B]
    |                 (250,300)
    |
    v
    Y (vertical)
```

### Recommended Spacing

- **Start position:** x=100, y=100
- **Horizontal spacing:** 150-200 pixels between sequential activities
- **Vertical spacing:** 100-150 pixels for branching paths
- **Standard dimensions:** width=150, height=80

### Layout Patterns

**Linear Flow:**
```
[Start] ---> [Process] ---> [End]
(100,100)    (250,100)      (400,100)
```

**Decision Branch:**
```
                +---> [Yes Path] --+
               /     (250,100)      \
[Decision] ---+                      +---> [Join]
(100,150)      \                    /     (400,150)
                +---> [No Path] ---+
                     (250,200)
```

**Parallel Paths:**
```
           +---> [Task 1] ---+
          /     (200,100)     \
[Start] -+                     +---> [Join] ---> [End]
(100,150) \                   /     (400,150)    (550,150)
           +---> [Task 2] ---+
                (200,200)
```

## Testing Workflows

### Pre-Publication Testing

1. **Verify Structure:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wf_activity
  query: workflow_version=[version_sys_id]
  fields: name,x,y
```

2. **Verify Transitions:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wf_transition
  query: from.workflow_version=[version_sys_id]
  fields: from.name,to.name,condition.name
```

3. **Test with Unpublished Version:**
Keep `published: false` during testing. The workflow will still run for manual testing.

### Runtime Debugging

**Enable Workflow Logging:**
```javascript
// Add to activities for debugging
gs.info('[WF-DEBUG] Activity: ' + activity.name);
gs.info('[WF-DEBUG] Current: ' + current.number);
gs.info('[WF-DEBUG] Scratchpad: ' + JSON.stringify(workflow.scratchpad));
```

**View Workflow Context:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wf_context
  query: workflow_version=[version_sys_id]^state=executing
  fields: sys_id,state,started,scratchpad
```

**View Activity History:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wf_history
  query: context.workflow_version=[version_sys_id]
  fields: activity.name,state,started,ended,output
  orderBy: started
```

### Common Debug Queries

**Find Failed Contexts:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wf_context
  query: workflow_version=[version_sys_id]^state=cancelled
  fields: sys_id,state,result,scratchpad
```

**Find Stuck Activities:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wf_executing
  query: context.workflow_version=[version_sys_id]
  fields: activity.name,state,started
```

## Versioning and Publishing

### Version Workflow

**Create New Version:**
```
Tool: SN-Create-Record
Parameters:
  table_name: wf_workflow_version
  data:
    name: "P1 Incident Auto-Assignment v2"
    workflow: [workflow_sys_id]
    table: "incident"
    condition: "priority=1^state=1"
    active: true
    published: false
```

Then recreate activities and transitions for the new version.

### Deactivate Old Version

```
Tool: SN-Update-Record
Parameters:
  table_name: wf_workflow_version
  sys_id: [old_version_sys_id]
  data:
    active: false
```

### Publish New Version

```
Tool: SN-Update-Record
Parameters:
  table_name: wf_workflow_version
  sys_id: [new_version_sys_id]
  data:
    published: true
```

## Tool Usage Summary

### MCP Tools (Preferred)

| Tool | Purpose |
|------|---------|
| `SN-Create-Workflow` | Create workflow with activities in one call |
| `SN-Create-Activity` | Add individual activity |
| `SN-Create-Transition` | Link activities together |
| `SN-Publish-Workflow` | Set start activity and publish |
| `SN-Create-Record` | Generic record creation |
| `SN-Update-Record` | Update existing records |
| `SN-Query-Table` | Query workflow tables |

### REST API (Alternative)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/wf_workflow` | POST | Create workflow |
| `/api/now/table/wf_workflow_version` | POST | Create version |
| `/api/now/table/wf_activity` | POST | Create activity |
| `/api/now/table/wf_transition` | POST | Create transition |
| `/api/now/table/wf_condition` | POST | Create condition |
| `/api/now/table/wf_workflow_version/{id}` | PATCH | Update/publish |

## Best Practices

- **Naming Convention:** Use `[Process] - [Trigger]` format (e.g., "Approval - High Priority Change")
- **Activity Names:** Use Verb + Noun format (e.g., "Check Approval Status", "Send Notification")
- **Start Simple:** Create with 2-3 activities first, then add complexity
- **Test Early:** Test with `published: false` before publishing
- **Add Logging:** Include `gs.info()` statements for debugging
- **Error Handling:** Wrap scripts in try-catch blocks
- **Use Scratchpad:** Pass data via `workflow.scratchpad`, not global variables
- **Document Conditions:** Use descriptive names for transition conditions
- **Version Control:** Store workflow definitions as JSON/code in Git
- **Capture in Update Set:** Always create workflows with an active update set

## Troubleshooting

### Workflow Not Triggering

**Symptom:** Workflow created but not executing
**Cause:** Missing or incorrect trigger condition, or workflow not active/published
**Solution:**
1. Verify `active: true` on workflow version
2. Verify `published: true` on workflow version
3. Check trigger condition matches record criteria
4. Verify `after_business_rules` setting
5. Check workflow is assigned to correct table

### Activity Not Executing

**Symptom:** Workflow starts but specific activity skipped
**Cause:** Missing transition or incorrect condition
**Solution:**
1. Query transitions: `from=[activity_sys_id]`
2. Verify condition matches `answer` value from previous activity
3. Check activity has valid script in `input` field

### Workflow Stuck

**Symptom:** Workflow context remains in "executing" state
**Cause:** Activity script error or infinite loop
**Solution:**
1. Check System Logs for script errors
2. Query wf_history for activity execution details
3. Review activity scripts for errors
4. Cancel stuck context if needed:
```
Tool: SN-Update-Record
Parameters:
  table_name: wf_context
  sys_id: [context_sys_id]
  data:
    state: cancelled
```

### Transition Condition Not Matching

**Symptom:** Workflow takes wrong path
**Cause:** Condition syntax or answer value mismatch
**Solution:**
1. Verify condition format: `answer=value` (no quotes)
2. Check `answer` variable is set correctly in activity script
3. Check condition order (lower order = higher priority)
4. Use `else_flag: true` for default/fallback path

### Script Errors in Activities

**Symptom:** Activity fails with script error
**Cause:** Invalid JavaScript or API usage
**Solution:**
1. Test script in background script first
2. Check variable scope (`current`, `workflow` available)
3. Verify GlideRecord queries return results
4. Add error handling:
```javascript
try {
  // Script logic
} catch(e) {
  gs.error('Activity error: ' + e.message);
  answer = 'error';
}
```

## Examples

### Example 1: Simple Approval Workflow

```
Tool: SN-Create-Workflow
Parameters:
  name: "Simple Approval"
  table: "change_request"
  description: "Basic change approval workflow"
  condition: "type=normal"
  activities:
    - name: "Request Approval"
      x: 100
      y: 100
      script: |
        var approval = new GlideRecord('sysapproval_approver');
        approval.initialize();
        approval.document_id = current.sys_id;
        approval.source_table = 'change_request';
        approval.approver = current.assignment_group.manager;
        approval.state = 'requested';
        approval.insert();
        workflow.scratchpad.approval_id = approval.sys_id;
    - name: "Check Approval Status"
      x: 250
      y: 100
      script: |
        var approval = new GlideRecord('sysapproval_approver');
        approval.get(workflow.scratchpad.approval_id);
        answer = approval.state.toString();
    - name: "Approved Actions"
      x: 400
      y: 50
      script: |
        current.state = 'authorize';
        current.work_notes = 'Change approved by workflow';
        current.update();
    - name: "Rejected Actions"
      x: 400
      y: 150
      script: |
        current.state = 'cancelled';
        current.work_notes = 'Change rejected by workflow';
        current.update();
  transitions:
    - from: 0
      to: 1
    - from: 1
      to: 2
      condition: "answer=approved"
    - from: 1
      to: 3
      condition: "answer=rejected"
```

### Example 2: Multi-Level Approval

Creating a workflow with parallel approvals that join before completion.

**Step 1: Create Base Structure**
```
Tool: SN-Create-Record
Parameters:
  table_name: wf_workflow
  data:
    name: "Multi-Level Approval"
    description: "Requires both manager and director approval"
```

**Step 2: Create Activities**
(Create 6 activities: Start, Manager Approval, Director Approval, Join, Approved, Rejected)

**Step 3: Create Parallel Transitions**
```
// Start -> Manager Approval
// Start -> Director Approval (parallel path)
// Manager Approval -> Join
// Director Approval -> Join
// Join -> Approved (if all approved)
// Join -> Rejected (if any rejected)
```

### Example 3: Incident Auto-Routing

```javascript
// Complete workflow for routing incidents based on category

// 1. Create workflow
SN-Create-Record: wf_workflow
  name: "Incident Auto-Router"
  description: "Route incidents to appropriate team"

// 2. Create version
SN-Create-Record: wf_workflow_version
  table: "incident"
  condition: "active=true^assignment_groupISEMPTY"

// 3. Create routing activity
SN-Create-Activity:
  name: "Route by Category"
  script: |
    var category = current.category.toString();
    var routing = {
      'network': 'Network Support',
      'hardware': 'Hardware Support',
      'software': 'Software Support',
      'database': 'Database Team'
    };
    var group = routing[category] || 'Service Desk';
    var gr = new GlideRecord('sys_user_group');
    gr.addQuery('name', group);
    gr.query();
    if (gr.next()) {
      current.assignment_group = gr.sys_id;
      current.work_notes = 'Auto-routed to ' + group;
      current.update();
      answer = 'routed';
    } else {
      answer = 'no_group';
    }
```

## Related Skills

- `admin/update-set-management` - Capture workflows in update sets
- `admin/scoped-app-development` - Workflows in scoped applications
- `itsm/change-management` - Change request workflows
- `itsm/incident-management` - Incident handling workflows

## References

- [ServiceNow Workflow Documentation](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/administer/workflow/concept/workflow.html)
- [Workflow Activities](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/administer/workflow/reference/r_WorkflowActivities.html)
- [Workflow Scripting](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/administer/workflow/concept/c_WorkflowScripting.html)
- [MCP ServiceNow Server Documentation](https://github.com/your-repo/mcp-servicenow-nodejs)
