---
name: ui-actions
version: 1.0.0
description: Complete guide to UI Action development including form buttons, list buttons, context menu actions, client-side and server-side scripts, conditions, security, and common patterns
author: Happy Technologies LLC
tags: [development, ui-actions, scripting, buttons, forms, lists, context-menu, automation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Create-Record
    - SN-Update-Record
    - SN-Query-Table
    - SN-Get-Table-Schema
    - SN-Sync-Script-To-Local
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/sys_ui_action
    - /api/now/table/sys_security_acl
  native:
    - Bash
    - Read
complexity: intermediate
estimated_time: 20-45 minutes
---

# UI Actions

## Overview

This skill covers creating and configuring UI Actions in ServiceNow:

- Form buttons (header/footer) and form context menu items
- List buttons, list context menu, and list choice actions
- Client-side scripts, server-side scripts, and combined execution
- Visibility conditions and role-based security
- Common patterns: Approve, Reject, Clone, Escalate, etc.
- Testing and debugging UI Actions

**When to use:** When you need to add custom buttons or menu items to forms and lists that execute client-side or server-side logic.

**Who should use this:** Developers and administrators who need to extend ServiceNow forms and lists with custom functionality.

## Prerequisites

- **Roles:** `admin`, `personalize` (for basic UI actions), or specific application roles
- **Access:** sys_ui_action table, related tables for testing
- **Knowledge:** JavaScript, GlideRecord API, client-side g_form API
- **Related Skills:** `admin/script-execution` for server-side patterns

## Understanding UI Actions

### UI Action Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UI Action Locations                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────── FORM ────────────┐    ┌─────────── LIST ────────────┐        │
│  │                             │    │                             │        │
│  │  [Form Button] [Button]     │    │  [List Button] [Button]     │        │
│  │  ─────────────────────────  │    │  ─────────────────────────  │        │
│  │  ┌─────────────────────┐    │    │  ☐ Number    Description    │        │
│  │  │                     │    │    │  ☐ INC001   Server down     │        │
│  │  │   Form Content      │    │    │  ☐ INC002   Email issue     │        │
│  │  │                     │    │    │                             │        │
│  │  │   Right-click →     │    │    │   Right-click →             │        │
│  │  │   [Context Menu]    │    │    │   [Context Menu]            │        │
│  │  │                     │    │    │                             │        │
│  │  └─────────────────────┘    │    │  Actions Dropdown:          │        │
│  │                             │    │   ☐ List Choice Option      │        │
│  │  [Footer Button] [Button]   │    │                             │        │
│  └─────────────────────────────┘    └─────────────────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### UI Action Execution Flow

```
User Clicks UI Action
        │
        ▼
┌───────────────────┐
│ Check Conditions  │
│ (if defined)      │
└────────┬──────────┘
         │
    Condition
      True?
    ┌───┴───┐
   Yes     No
    │       │
    ▼       ▼
┌───────┐ [Action
│Client │  Hidden]
│Script?│
└───┬───┘
    │
   Yes ──► Run Client Script (onclick)
    │           │
    │       gsftSubmit()?
    │       ┌───┴───┐
    │      Yes     No
    │       │       │
    │       ▼       ▼
    │   ┌───────┐ [Client
    │   │Submit │  Only]
    │   │ Form  │
    │   └───┬───┘
    │       │
    ▼       ▼
┌───────────────────┐
│ Run Server Script │◄── No Client Script (direct server)
└───────────────────┘
         │
         ▼
    ┌─────────┐
    │Redirect?│
    └────┬────┘
     ┌───┴───┐
    Yes     No
     │       │
     ▼       ▼
[Custom   [Form
 URL]     Reload]
```

## Procedure

### Phase 1: Understanding UI Action Fields

#### Step 1.1: Get Table Schema

**Query the sys_ui_action schema:**
```
Tool: SN-Get-Table-Schema
Parameters:
  table_name: sys_ui_action
```

#### Step 1.2: Key Fields Reference

| Field | Type | Description |
|-------|------|-------------|
| name | String | Button/menu item label |
| table | String | Target table (e.g., incident) |
| action_name | String | Internal name (no spaces, used in URLs) |
| order | Integer | Display order (lower = first) |
| active | Boolean | Enable/disable the action |
| client | Boolean | Run client-side script (onclick) |
| script | Script | Server-side GlideRecord script |
| onclick | Script | Client-side JavaScript (g_form) |
| condition | Script | Server-side visibility condition |
| comments | String | Description/documentation |

#### Step 1.3: Location Fields

| Field | Type | Description |
|-------|------|-------------|
| form_button | Boolean | Show as form header button |
| form_button_v2 | Boolean | Show as form footer button (v2 forms) |
| form_link | Boolean | Show in form context menu |
| list_banner_button | Boolean | Show as list header button |
| list_button | Boolean | Show in list actions (legacy) |
| list_choice | Boolean | Show in list Actions dropdown |
| list_context_menu | Boolean | Show in list right-click menu |
| list_link | Boolean | Show in list Related Links |

### Phase 2: Create Form Button UI Actions

#### Step 2.1: Basic Form Button

**Create a simple form button that runs server-side:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Escalate to Management"
    table: incident
    action_name: escalate_to_management
    order: 100
    active: true
    form_button: true
    client: false
    script: |
      // Server-side script
      current.escalation = 1;
      current.priority = 1;
      current.work_notes = "Escalated to management by " + gs.getUserDisplayName();
      current.update();
      action.setRedirectURL(current);
    comments: "Escalates incident to management with P1 priority"
```

**Result:** Returns sys_id of created UI action.

#### Step 2.2: Form Button with Client Script

**Create a button with client-side confirmation:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Close Incident"
    table: incident
    action_name: close_incident
    order: 200
    active: true
    form_button: true
    client: true
    onclick: |
      // Client-side script
      var closeCode = g_form.getValue('close_code');
      var closeNotes = g_form.getValue('close_notes');

      // Validate required fields
      if (!closeCode) {
        g_form.showFieldMsg('close_code', 'Close code is required', 'error');
        return false;  // Prevent submission
      }

      if (!closeNotes) {
        g_form.showFieldMsg('close_notes', 'Close notes are required', 'error');
        return false;
      }

      // Confirm with user
      if (!confirm('Are you sure you want to close this incident?')) {
        return false;
      }

      // Submit the form
      gsftSubmit(null, g_form.getFormElement(), 'close_incident');
    script: |
      // Server-side script (runs after form submit)
      current.state = 7;  // Closed
      current.closed_at = new GlideDateTime();
      current.closed_by = gs.getUserID();
      current.update();
      action.setRedirectURL(current);
    comments: "Closes incident with validation and confirmation"
```

#### Step 2.3: Form Header vs Footer Button

**Form Header Button (form_button):**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Quick Assign"
    table: incident
    action_name: quick_assign
    order: 50
    active: true
    form_button: true
    form_button_v2: false
    # ... rest of configuration
```

**Form Footer Button (form_button_v2):**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Save and Return"
    table: incident
    action_name: save_and_return
    order: 300
    active: true
    form_button: false
    form_button_v2: true
    # ... rest of configuration
```

### Phase 3: Create List UI Actions

#### Step 3.1: List Banner Button

**Button that appears at the top of lists:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Export Selected"
    table: incident
    action_name: export_selected
    order: 100
    active: true
    list_banner_button: true
    client: true
    onclick: |
      // Get selected records
      var list = GlideList2.get(g_form.getTableName());
      var checked = list.getChecked();

      if (!checked) {
        alert('Please select at least one record');
        return false;
      }

      // Redirect to export with selected sys_ids
      var url = 'export_selected.do?sysparm_sys_ids=' + checked;
      window.location = url;
    comments: "Exports selected incidents to CSV"
```

#### Step 3.2: List Context Menu

**Right-click menu item for list rows:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Assign to Me"
    table: incident
    action_name: assign_to_me_list
    order: 100
    active: true
    list_context_menu: true
    client: false
    script: |
      // Server-side script
      // current is the right-clicked record
      current.assigned_to = gs.getUserID();
      current.assignment_group = gs.getUser().getMyGroups()[0];
      current.work_notes = "Self-assigned via list context menu";
      current.update();
    comments: "Assigns the right-clicked incident to current user"
```

#### Step 3.3: List Choice (Actions Dropdown)

**Bulk action in the Actions dropdown:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Bulk Close"
    table: incident
    action_name: bulk_close
    order: 200
    active: true
    list_choice: true
    client: true
    onclick: |
      // Get checked records
      var list = GlideList2.get(g_form.getTableName());
      var checked = list.getChecked();

      if (!checked) {
        alert('Please select at least one incident to close');
        return false;
      }

      var count = checked.split(',').length;
      if (!confirm('Close ' + count + ' selected incident(s)?')) {
        return false;
      }

      // Submit to server
      gsftSubmit(null, g_form.getFormElement(), 'bulk_close');
    script: |
      // Server-side - process all checked records
      var sysIds = RP.getParameterValue('sysparm_checked_items');
      if (sysIds) {
        var ids = sysIds.split(',');
        for (var i = 0; i < ids.length; i++) {
          var gr = new GlideRecord('incident');
          if (gr.get(ids[i])) {
            gr.state = 7;  // Closed
            gr.close_code = 'Solved (Permanently)';
            gr.close_notes = 'Bulk closed by ' + gs.getUserDisplayName();
            gr.update();
          }
        }
      }
    comments: "Closes all selected incidents in bulk"
```

### Phase 4: Context Menu (Form Right-Click)

#### Step 4.1: Form Context Menu Item

**Add item to form right-click menu:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "View Audit History"
    table: incident
    action_name: view_audit_history
    order: 500
    active: true
    form_link: true
    client: true
    onclick: |
      // Open audit history in new window
      var sysId = g_form.getUniqueValue();
      var tableName = g_form.getTableName();
      var url = 'sys_audit_list.do?sysparm_query=tablename=' + tableName +
                '^documentkey=' + sysId + '&sysparm_view=';
      window.open(url, '_blank');
    comments: "Opens audit history for current record in new tab"
```

#### Step 4.2: Form Link with Server Script

**Context menu that runs server-side:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Create Child Incident"
    table: incident
    action_name: create_child_incident
    order: 600
    active: true
    form_link: true
    client: false
    script: |
      // Create child incident
      var child = new GlideRecord('incident');
      child.initialize();
      child.parent_incident = current.sys_id;
      child.short_description = 'Child of: ' + current.short_description;
      child.description = 'Child incident created from ' + current.number;
      child.caller_id = current.caller_id;
      child.category = current.category;
      child.subcategory = current.subcategory;
      child.priority = current.priority;
      var childId = child.insert();

      // Redirect to new child incident
      action.setRedirectURL(child);
    comments: "Creates a child incident linked to current record"
```

### Phase 5: Conditions for Visibility

#### Step 5.1: Simple Field Conditions

**Show button only for specific states:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Reopen Incident"
    table: incident
    action_name: reopen_incident
    order: 100
    active: true
    form_button: true
    condition: "current.state == 7"
    script: |
      // Reopen logic
      current.state = 2;  // In Progress
      current.work_notes = "Reopened by " + gs.getUserDisplayName();
      current.update();
      action.setRedirectURL(current);
    comments: "Visible only when incident is Closed (state=7)"
```

**Common Condition Patterns:**

| Condition | Meaning |
|-----------|---------|
| `current.state == 1` | State equals New |
| `current.active == true` | Record is active |
| `current.assigned_to == gs.getUserID()` | Assigned to current user |
| `current.assignment_group.manager == gs.getUserID()` | Current user is group manager |
| `current.isNewRecord()` | New record (not saved yet) |
| `!current.isNewRecord()` | Existing record only |
| `current.priority <= 2` | Priority is 1 or 2 |
| `current.caller_id.vip == true` | Caller is VIP |

#### Step 5.2: Role-Based Conditions

**Show button only for specific roles:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Override SLA"
    table: incident
    action_name: override_sla
    order: 100
    active: true
    form_button: true
    condition: "gs.hasRole('incident_manager') || gs.hasRole('admin')"
    script: |
      // SLA override logic
      current.sla_due = '';
      current.work_notes = "SLA overridden by manager";
      current.update();
    comments: "Visible only to incident managers and admins"
```

#### Step 5.3: Complex Conditions

**Multiple conditions combined:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Emergency Escalation"
    table: incident
    action_name: emergency_escalation
    order: 50
    active: true
    form_button: true
    condition: |
      // Only show for P1/P2 active incidents assigned to current user's group
      current.state != 6 && current.state != 7 &&
      current.priority <= 2 &&
      current.assignment_group.getDisplayValue() != '' &&
      gs.getUser().isMemberOf(current.assignment_group)
    script: |
      // Emergency escalation logic
      current.escalation = 3;
      current.work_notes = "[EMERGENCY ESCALATION] " + gs.getUserDisplayName();
      current.update();
    comments: "Emergency escalation for P1/P2 incidents in user's group"
```

#### Step 5.4: UI Action Visibility Best Practices

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Approve Request"
    table: sc_req_item
    action_name: approve_request
    order: 100
    active: true
    form_button: true
    condition: |
      // Best practice: Check multiple conditions
      var canApprove = false;

      // 1. Check record state
      if (current.approval == 'requested') {
        // 2. Check if user is an approver
        var approver = new GlideRecord('sysapproval_approver');
        approver.addQuery('sysapproval', current.sys_id);
        approver.addQuery('approver', gs.getUserID());
        approver.addQuery('state', 'requested');
        approver.query();

        if (approver.next()) {
          canApprove = true;
        }

        // 3. Or check if user has override role
        if (gs.hasRole('approval_admin')) {
          canApprove = true;
        }
      }

      canApprove;
    script: |
      // Approval logic
    comments: "Visible only when user can approve this request"
```

### Phase 6: Client-Side vs Server-Side Scripts

#### Step 6.1: Client-Side Only (No Submit)

**Action that only runs client-side:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Copy to Clipboard"
    table: incident
    action_name: copy_to_clipboard
    order: 100
    active: true
    form_button: true
    client: true
    onclick: |
      // Pure client-side - no server round trip
      var number = g_form.getValue('number');
      var shortDesc = g_form.getValue('short_description');
      var text = number + ': ' + shortDesc;

      // Copy to clipboard (modern browsers)
      navigator.clipboard.writeText(text).then(function() {
        g_form.addInfoMessage('Copied to clipboard: ' + text);
      }).catch(function(err) {
        alert('Failed to copy: ' + err);
      });

      // Return false to prevent form submission
      return false;
    script: ""
    comments: "Copies incident number and description to clipboard"
```

#### Step 6.2: Server-Side Only

**Action that only runs server-side:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Recalculate Priority"
    table: incident
    action_name: recalculate_priority
    order: 100
    active: true
    form_button: true
    client: false
    script: |
      // Server-side only
      var calculator = new PriorityCalculator();
      var newPriority = calculator.calculate(current.impact, current.urgency);

      current.priority = newPriority;
      current.work_notes = "Priority recalculated to " + newPriority;
      current.update();

      action.setRedirectURL(current);
    comments: "Recalculates priority based on impact and urgency matrix"
```

#### Step 6.3: Combined Client and Server

**Client validates/confirms, then server executes:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Transfer to Team"
    table: incident
    action_name: transfer_to_team
    order: 100
    active: true
    form_button: true
    client: true
    onclick: |
      // Client-side validation and data collection
      var group = g_form.getValue('assignment_group');
      if (!group) {
        g_form.showFieldMsg('assignment_group', 'Please select a group first', 'error');
        return false;
      }

      var reason = prompt('Enter transfer reason (required):');
      if (!reason || reason.trim() === '') {
        alert('Transfer reason is required');
        return false;
      }

      // Store reason in a hidden field or use sysparm
      g_form.setValue('work_notes', 'Transfer Reason: ' + reason);

      // Submit to server
      gsftSubmit(null, g_form.getFormElement(), 'transfer_to_team');
    script: |
      // Server-side execution
      var targetGroup = current.assignment_group.getDisplayValue();

      // Clear individual assignee
      current.assigned_to = '';

      // Add transfer audit trail
      current.work_notes = 'Transferred to ' + targetGroup + '\n' +
                           'Transferred by: ' + gs.getUserDisplayName();
      current.update();

      gs.addInfoMessage('Incident transferred to ' + targetGroup);
      action.setRedirectURL(current);
    comments: "Transfers incident with reason capture"
```

### Phase 7: Using g_form in UI Actions

#### Step 7.1: Common g_form Methods

**Reading Field Values:**
```javascript
// In onclick script
var value = g_form.getValue('field_name');
var display = g_form.getDisplayBox('field_name').value;
var reference = g_form.getReference('caller_id', function(ref) {
  // Async callback for reference fields
  alert('Caller name: ' + ref.name);
});
```

**Setting Field Values:**
```javascript
// In onclick script
g_form.setValue('priority', '1');
g_form.setValue('work_notes', 'Updated via UI Action');
g_form.setDisplay('field_name', true);  // Show field
g_form.setMandatory('field_name', true);  // Make mandatory
g_form.setReadOnly('field_name', true);  // Make read-only
```

**User Feedback:**
```javascript
// Messages
g_form.addInfoMessage('Operation completed successfully');
g_form.addWarningMessage('Please review the changes');
g_form.addErrorMessage('An error occurred');
g_form.showFieldMsg('field_name', 'Message text', 'info|warning|error');

// Clear messages
g_form.clearMessages();
g_form.hideFieldMsg('field_name');
```

#### Step 7.2: Complete Client Script Example

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Validate and Submit"
    table: incident
    action_name: validate_submit
    order: 100
    active: true
    form_button: true
    client: true
    onclick: |
      function validateAndSubmit() {
        // Clear previous messages
        g_form.clearMessages();

        var valid = true;
        var errors = [];

        // Validate short description
        var shortDesc = g_form.getValue('short_description');
        if (!shortDesc || shortDesc.length < 10) {
          g_form.showFieldMsg('short_description', 'Must be at least 10 characters', 'error');
          valid = false;
          errors.push('Short description');
        }

        // Validate caller
        var caller = g_form.getValue('caller_id');
        if (!caller) {
          g_form.showFieldMsg('caller_id', 'Caller is required', 'error');
          valid = false;
          errors.push('Caller');
        }

        // Validate category
        var category = g_form.getValue('category');
        if (!category) {
          g_form.showFieldMsg('category', 'Category is required', 'error');
          valid = false;
          errors.push('Category');
        }

        // Check P1 requirements
        var priority = g_form.getValue('priority');
        if (priority == '1') {
          var businessImpact = g_form.getValue('business_impact');
          if (!businessImpact) {
            g_form.showFieldMsg('business_impact', 'Required for P1 incidents', 'error');
            valid = false;
            errors.push('Business Impact');
          }
        }

        if (!valid) {
          g_form.addErrorMessage('Please fix validation errors: ' + errors.join(', '));
          return false;
        }

        // Confirmation
        if (confirm('Submit this incident?')) {
          gsftSubmit(null, g_form.getFormElement(), 'validate_submit');
          return true;
        }

        return false;
      }

      validateAndSubmit();
    script: |
      current.update();
      gs.addInfoMessage('Incident saved successfully');
      action.setRedirectURL(current);
    comments: "Validates required fields before submission"
```

### Phase 8: Redirecting After Action

#### Step 8.1: Redirect Methods

**Redirect to Same Record:**
```javascript
// Server-side script
action.setRedirectURL(current);
```

**Redirect to Different Record:**
```javascript
// Server-side script
var newRecord = new GlideRecord('incident');
newRecord.get('some_sys_id');
action.setRedirectURL(newRecord);
```

**Redirect to List:**
```javascript
// Server-side script
action.setRedirectURL('incident_list.do?sysparm_query=active=true');
```

**Redirect to Specific URL:**
```javascript
// Server-side script
action.setRedirectURL('/nav_to.do?uri=incident.do?sys_id=' + current.sys_id);
```

**Prevent Redirect (Stay on Form):**
```javascript
// Server-side script
current.update();
action.setRedirectURL(current);  // Refresh current record
```

**Redirect to Previous Page:**
```javascript
// Client-side onclick
// After server processing, redirect back
history.back();
return false;
```

#### Step 8.2: Common Redirect Patterns

**Clone and Redirect to New:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Clone Incident"
    table: incident
    action_name: clone_incident
    order: 100
    active: true
    form_button: true
    condition: "!current.isNewRecord()"
    client: false
    script: |
      // Clone the incident
      var clone = new GlideRecord('incident');
      clone.initialize();

      // Copy fields
      clone.short_description = 'CLONE: ' + current.short_description;
      clone.description = current.description;
      clone.caller_id = current.caller_id;
      clone.category = current.category;
      clone.subcategory = current.subcategory;
      clone.priority = current.priority;
      clone.impact = current.impact;
      clone.urgency = current.urgency;

      // Reference original
      clone.work_notes = 'Cloned from ' + current.number;

      var cloneId = clone.insert();

      // Redirect to new cloned record
      action.setRedirectURL(clone);
    comments: "Creates a copy of the current incident"
```

**Save and Return to List:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Save and Return to List"
    table: incident
    action_name: save_return_list
    order: 100
    active: true
    form_button: true
    client: false
    script: |
      current.update();
      action.setRedirectURL('incident_list.do');
    comments: "Saves current record and returns to incident list"
```

### Phase 9: Action Security

#### Step 9.1: Role-Based Access

**Restrict to Specific Roles (Using Condition):**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Delete Incident"
    table: incident
    action_name: delete_incident
    order: 900
    active: true
    form_button: true
    condition: "gs.hasRole('incident_admin')"
    client: true
    onclick: |
      if (!confirm('Are you sure you want to DELETE this incident? This cannot be undone.')) {
        return false;
      }

      if (!confirm('FINAL WARNING: This will permanently delete ' + g_form.getValue('number'))) {
        return false;
      }

      gsftSubmit(null, g_form.getFormElement(), 'delete_incident');
    script: |
      var number = current.number;
      current.deleteRecord();
      gs.addInfoMessage('Incident ' + number + ' has been deleted');
      action.setRedirectURL('incident_list.do');
    comments: "Permanently deletes incident - restricted to incident_admin"
```

#### Step 9.2: Create ACL for UI Action

**Create explicit ACL protection:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl
  data:
    name: "incident.delete_incident"
    type: ui_action
    operation: execute
    active: true
    admin_overrides: false
    advanced: false
    script: "gs.hasRole('incident_admin')"
    description: "ACL for delete incident UI action"
```

#### Step 9.3: Security Best Practices

1. **Always validate on server-side:** Client-side checks can be bypassed
2. **Use conditions AND ACLs:** Defense in depth
3. **Log sensitive actions:** Create audit trail
4. **Limit destructive actions:** Require confirmation and restrict roles

**Complete Secure Action Example:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Override Approval"
    table: sc_req_item
    action_name: override_approval
    order: 100
    active: true
    form_button: true
    condition: |
      // Check role and record state
      gs.hasRole('approval_admin') &&
      current.approval == 'requested' &&
      !current.isNewRecord()
    client: true
    onclick: |
      // Client-side confirmation
      var reason = prompt('Enter override reason (required for audit):');
      if (!reason || reason.trim().length < 10) {
        alert('A detailed reason (min 10 chars) is required for approval override');
        return false;
      }

      if (!confirm('Override approval for ' + g_form.getValue('number') + '?')) {
        return false;
      }

      // Store reason
      g_form.setValue('work_notes', 'APPROVAL OVERRIDE REASON: ' + reason);
      gsftSubmit(null, g_form.getFormElement(), 'override_approval');
    script: |
      // Server-side validation (defense in depth)
      if (!gs.hasRole('approval_admin')) {
        gs.addErrorMessage('Unauthorized: approval_admin role required');
        action.setRedirectURL(current);
        return;
      }

      // Process override
      current.approval = 'approved';
      current.work_notes = 'APPROVAL OVERRIDE\n' +
                           'Overridden by: ' + gs.getUserDisplayName() + '\n' +
                           'Date: ' + new GlideDateTime().getDisplayValue();
      current.update();

      // Audit log
      gs.log('Approval override on ' + current.number + ' by ' + gs.getUserName(), 'ApprovalOverride');

      gs.addInfoMessage('Approval overridden successfully');
      action.setRedirectURL(current);
    comments: "Override approval with audit trail - approval_admin only"
```

### Phase 10: Common Use Cases

#### Step 10.1: Approve/Reject Pattern

**Approve Button:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Approve"
    table: sc_req_item
    action_name: approve_item
    order: 100
    active: true
    form_button: true
    condition: |
      current.approval == 'requested' &&
      new ApprovalHelper().isUserApprover(gs.getUserID(), current.sys_id)
    client: true
    onclick: |
      if (!confirm('Approve this request?')) {
        return false;
      }
      gsftSubmit(null, g_form.getFormElement(), 'approve_item');
    script: |
      var approver = new GlideRecord('sysapproval_approver');
      approver.addQuery('sysapproval', current.sys_id);
      approver.addQuery('approver', gs.getUserID());
      approver.addQuery('state', 'requested');
      approver.query();

      if (approver.next()) {
        approver.state = 'approved';
        approver.update();

        current.work_notes = 'Approved by ' + gs.getUserDisplayName();
        current.update();

        gs.addInfoMessage('Request approved');
      }
      action.setRedirectURL(current);
    comments: "Approve request item"
```

**Reject Button:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Reject"
    table: sc_req_item
    action_name: reject_item
    order: 110
    active: true
    form_button: true
    condition: |
      current.approval == 'requested' &&
      new ApprovalHelper().isUserApprover(gs.getUserID(), current.sys_id)
    client: true
    onclick: |
      var reason = prompt('Enter rejection reason (required):');
      if (!reason || reason.trim() === '') {
        alert('Rejection reason is required');
        return false;
      }

      g_form.setValue('work_notes', 'REJECTION REASON: ' + reason);

      if (!confirm('Reject this request?')) {
        return false;
      }
      gsftSubmit(null, g_form.getFormElement(), 'reject_item');
    script: |
      var approver = new GlideRecord('sysapproval_approver');
      approver.addQuery('sysapproval', current.sys_id);
      approver.addQuery('approver', gs.getUserID());
      approver.addQuery('state', 'requested');
      approver.query();

      if (approver.next()) {
        approver.state = 'rejected';
        approver.update();

        current.work_notes = 'Rejected by ' + gs.getUserDisplayName();
        current.update();

        gs.addInfoMessage('Request rejected');
      }
      action.setRedirectURL(current);
    comments: "Reject request item with reason"
```

#### Step 10.2: Escalation Pattern

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Escalate"
    table: incident
    action_name: escalate_incident
    order: 100
    active: true
    form_button: true
    condition: "current.escalation < 3 && current.state != 6 && current.state != 7"
    client: true
    onclick: |
      var currentLevel = parseInt(g_form.getValue('escalation')) || 0;
      var levels = ['Normal', 'Moderate', 'High', 'Overdue'];
      var nextLevel = levels[currentLevel + 1] || 'Maximum';

      if (!confirm('Escalate to ' + nextLevel + ' level?')) {
        return false;
      }
      gsftSubmit(null, g_form.getFormElement(), 'escalate_incident');
    script: |
      var oldLevel = current.escalation;
      current.escalation = parseInt(current.escalation) + 1;
      current.work_notes = 'Escalated from level ' + oldLevel + ' to ' + current.escalation +
                           ' by ' + gs.getUserDisplayName();
      current.update();

      gs.addInfoMessage('Incident escalated to level ' + current.escalation);
      action.setRedirectURL(current);
    comments: "Escalates incident to next level"
```

#### Step 10.3: Clone Pattern

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_action
  data:
    name: "Clone Record"
    table: incident
    action_name: clone_record
    order: 200
    active: true
    form_link: true
    condition: "!current.isNewRecord()"
    client: false
    script: |
      // Fields to copy
      var copyFields = [
        'short_description', 'description', 'caller_id',
        'category', 'subcategory', 'priority', 'impact',
        'urgency', 'assignment_group', 'contact_type'
      ];

      // Fields to exclude (system fields, unique identifiers)
      var excludeFields = [
        'sys_id', 'number', 'opened_at', 'opened_by',
        'closed_at', 'closed_by', 'resolved_at', 'resolved_by',
        'sys_created_on', 'sys_created_by', 'sys_updated_on', 'sys_updated_by'
      ];

      var clone = new GlideRecord('incident');
      clone.initialize();

      // Copy specified fields
      for (var i = 0; i < copyFields.length; i++) {
        var field = copyFields[i];
        if (current.getValue(field)) {
          clone.setValue(field, current.getValue(field));
        }
      }

      // Modify for clone
      clone.short_description = '[CLONE] ' + clone.short_description;
      clone.work_notes = 'Cloned from ' + current.number + ' by ' + gs.getUserDisplayName();

      var sysId = clone.insert();

      gs.addInfoMessage('Cloned incident ' + current.number + ' successfully');
      action.setRedirectURL(clone);
    comments: "Creates a copy of the incident"
```

### Phase 11: Testing UI Actions

#### Step 11.1: Query Existing UI Actions

**Find all UI actions for a table:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_ui_action
  query: table=incident^active=true
  fields: sys_id,name,action_name,order,form_button,list_banner_button,condition
  limit: 50
```

**Find UI actions by name:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_ui_action
  query: nameLIKEapprove^active=true
  fields: sys_id,name,table,condition,client
  limit: 20
```

#### Step 11.2: Testing Checklist

**Pre-Testing:**
- [ ] UI Action is active
- [ ] Table is correct
- [ ] Location is set (form_button, list_banner_button, etc.)
- [ ] Condition returns true for test scenario
- [ ] Scripts have no syntax errors

**Functional Testing:**
1. **Visibility Test:**
   - Does button appear when condition is true?
   - Does button hide when condition is false?
   - Is button visible to correct roles only?

2. **Client Script Test:**
   - Does onclick validation work?
   - Are error messages displayed?
   - Does confirmation dialog appear?
   - Does form submit correctly?

3. **Server Script Test:**
   - Is record updated correctly?
   - Is redirect working?
   - Are work notes added?
   - Is audit trail created?

4. **Security Test:**
   - Can unauthorized users access the action?
   - Can users bypass client validation?
   - Are server-side role checks in place?

#### Step 11.3: Debug Server Script

**Add Debug Logging:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_ui_action
  sys_id: [action_sys_id]
  data:
    script: |
      // Debug logging
      gs.info('[DEBUG] UI Action: escalate_incident started');
      gs.info('[DEBUG] Current user: ' + gs.getUserName());
      gs.info('[DEBUG] Current record: ' + current.number);

      try {
        // Your logic here
        current.escalation = parseInt(current.escalation) + 1;
        current.update();

        gs.info('[DEBUG] Escalation updated to: ' + current.escalation);

      } catch (e) {
        gs.error('[DEBUG] Error: ' + e.message);
      }

      action.setRedirectURL(current);
```

**Check Logs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: messageLIKE[DEBUG] UI Action^sys_created_on>javascript:gs.minutesAgo(10)
  fields: message,level,sys_created_on
  limit: 50
```

### Phase 12: Local Script Development

#### Step 12.1: Sync UI Action Script Locally

**Download script for local editing:**
```
Tool: SN-Sync-Script-To-Local
Parameters:
  script_sys_id: [ui_action_sys_id]
  script_field: script
  local_path: /Users/developer/servicenow/ui_actions/escalate_incident_server.js
  instance: dev
```

**Download onclick script:**
```
Tool: SN-Sync-Script-To-Local
Parameters:
  script_sys_id: [ui_action_sys_id]
  script_field: onclick
  local_path: /Users/developer/servicenow/ui_actions/escalate_incident_client.js
  instance: dev
```

#### Step 12.2: Directory Structure

```
servicenow/
└── ui_actions/
    ├── incident/
    │   ├── escalate_incident_server.js
    │   ├── escalate_incident_client.js
    │   ├── close_incident_server.js
    │   └── close_incident_client.js
    ├── sc_req_item/
    │   ├── approve_item_server.js
    │   └── reject_item_server.js
    └── README.md
```

## Tool Usage Summary

| Operation | MCP Tool | Notes |
|-----------|----------|-------|
| Create UI Action | SN-Create-Record | sys_ui_action table |
| Update UI Action | SN-Update-Record | Modify script, condition |
| Query UI Actions | SN-Query-Table | Find by table, name |
| Get Schema | SN-Get-Table-Schema | Understand available fields |
| Download Script | SN-Sync-Script-To-Local | Local development |
| Execute Test Script | SN-Execute-Background-Script | Debug server logic |

## Best Practices

- **Descriptive Names:** Use clear, action-oriented names (e.g., "Escalate to Management")
- **Consistent Order:** Use standardized order numbers (100, 200, 300)
- **Always Validate:** Both client-side (user experience) and server-side (security)
- **Use Conditions:** Hide irrelevant buttons instead of showing disabled ones
- **Add Comments:** Document the purpose and any dependencies
- **Role-Based Access:** Always restrict sensitive actions
- **Audit Trail:** Add work notes for all significant actions
- **Error Handling:** Wrap server scripts in try-catch blocks
- **Test Thoroughly:** Test all conditions, roles, and edge cases
- **Version Control:** Sync scripts locally for version control

## Troubleshooting

### Button Not Appearing

**Symptom:** UI Action button not visible on form/list
**Causes:**
1. UI Action is inactive
2. Condition evaluates to false
3. Wrong location flag set
4. User lacks required role

**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_ui_action
  query: action_name=my_action
  fields: active,condition,form_button,table
```

Check active=true and verify condition logic.

### Client Script Not Executing

**Symptom:** Nothing happens when clicking button
**Causes:**
1. JavaScript syntax error
2. client field not set to true
3. onclick is empty

**Solution:**
1. Check browser console (F12) for errors
2. Verify `client: true`
3. Test onclick script in browser console

### Server Script Failing

**Symptom:** Form submits but no action occurs
**Causes:**
1. Server script syntax error
2. Permission error
3. Missing current.update()

**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: levelINerror,warn^sys_created_on>javascript:gs.minutesAgo(5)
  fields: message,source,sys_created_on
  limit: 20
```

### Redirect Not Working

**Symptom:** Stays on form or goes to wrong page
**Causes:**
1. Missing action.setRedirectURL()
2. Invalid redirect target
3. Client returning false before submit

**Solution:**
- Verify `action.setRedirectURL(current)` at end of server script
- For custom URLs, ensure valid format
- Check client onclick returns true or submits form

### Condition Errors

**Symptom:** Button appears/disappears unexpectedly
**Causes:**
1. Condition syntax error (fails silently)
2. Reference field not loaded
3. Type mismatch (string vs number)

**Solution:**
Test condition in background script:
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var current = new GlideRecord('incident');
    current.get('[sys_id]');

    // Test your condition
    var result = current.state == 7;  // Your condition
    gs.info('Condition result: ' + result);
  description: Test UI action condition
```

## Related Skills

- `admin/script-execution` - Background script patterns
- `catalog/ui-policies` - Catalog form behavior
- `admin/workflow-creation` - Workflow integration
- `security/acl-management` - Access control lists
- `admin/script-sync` - Local script development

## References

- [ServiceNow UI Actions](https://docs.servicenow.com/bundle/utah-application-development/page/script/server-scripting/concept/c_UIActions.html)
- [Client Scripts and g_form](https://docs.servicenow.com/bundle/utah-application-development/page/script/client-scripts/reference/r_GlideFormAPI.html)
- [Action Security](https://docs.servicenow.com/bundle/utah-platform-security/page/administer/access-control/concept/c_UIActionSecurity.html)
- [GlideRecord API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideRecordScopedAPI)
