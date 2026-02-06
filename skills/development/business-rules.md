---
name: business-rules
version: 1.0.0
description: Complete guide to business rule development including when/how/trigger timing, script patterns, current/previous objects, condition optimization, Glide API usage, error handling, and performance best practices
author: Happy Technologies LLC
tags: [development, business-rules, scripting, server-side, glide, automation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Create-Record
    - SN-Update-Record
    - SN-Query-Table
    - SN-Get-Table-Schema
    - SN-Execute-Background-Script
    - SN-Sync-Script-To-Local
  rest:
    - /api/now/table/sys_script
    - /api/now/table/sys_dictionary
    - /api/now/table/syslog
  native:
    - Bash
    - Read
    - Write
complexity: intermediate
estimated_time: 15-45 minutes
---

# Business Rules Development

## Overview

Business rules are server-side scripts that execute when records are displayed, inserted, updated, deleted, or queried. They are the backbone of ServiceNow automation.

- **What problem does it solve?** Automates record-level logic, enforces data integrity, and triggers workflows based on record changes
- **Who should use this skill?** ServiceNow developers building custom automation logic
- **Expected outcomes:** Well-structured, performant business rules that follow ServiceNow best practices

## Prerequisites

- **Roles:** `admin` or scoped app developer role
- **Knowledge:** JavaScript fundamentals, GlideRecord API basics
- **Access:** sys_script table, target table for business rule
- **Related skills:** `admin/script-execution`, `admin/update-set-management`

## When to Use Business Rules

### Timing Matrix

| When | Trigger | Use Case | current/previous |
|------|---------|----------|------------------|
| **before** | Insert/Update/Delete | Validate data, set field values, abort operations | Both available |
| **after** | Insert/Update/Delete | Create related records, send notifications, external integrations | Both available |
| **async** | Insert/Update/Delete | Long-running operations, external API calls | Only current |
| **display** | Query/Display | Calculate runtime values, populate scratchpad | Only current |

### Decision Guide

**Use BEFORE when:**
- Setting default values based on other fields
- Validating data before save
- Modifying field values before commit
- Aborting invalid operations with `current.setAbortAction(true)`

**Use AFTER when:**
- Creating child/related records
- Sending notifications (after record is committed)
- Updating other tables
- Triggering workflows

**Use ASYNC when:**
- Making external REST/SOAP calls
- Processing large data sets
- Operations that can fail without blocking the user
- Long-running calculations

**Use DISPLAY when:**
- Calculating values for form display only
- Populating g_scratchpad for client scripts
- Runtime-only field values (not stored)

## Procedure

### Phase 1: Create a Business Rule

#### Step 1.1: Query Table Schema

First, understand the target table structure.

**Using MCP:**
```
Tool: SN-Get-Table-Schema
Parameters:
  table_name: incident
```

#### Step 1.2: Create Basic Business Rule

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: Set Priority Based on Impact and Urgency
    collection: incident
    active: true
    when: before
    order: 100
    filter_condition: impactCHANGES^ORurgencyCHANGES
    script: |
      (function executeRule(current, previous /*null when async*/) {

        // Calculate priority from impact and urgency matrix
        var impact = parseInt(current.impact);
        var urgency = parseInt(current.urgency);

        // Priority matrix: 1=Critical, 2=High, 3=Moderate, 4=Low, 5=Planning
        var matrix = {
          '1-1': 1, '1-2': 2, '1-3': 3,
          '2-1': 2, '2-2': 3, '2-3': 4,
          '3-1': 3, '3-2': 4, '3-3': 5
        };

        var key = impact + '-' + urgency;
        var newPriority = matrix[key] || 4;

        if (current.priority != newPriority) {
          current.priority = newPriority;
          gs.info('Priority calculated: ' + newPriority + ' for ' + current.number);
        }

      })(current, previous);
```

#### Step 1.3: Create After Business Rule

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: Create Related Task on P1 Incident
    collection: incident
    active: true
    when: after
    order: 200
    filter_condition: priority=1^stateVALCHANGES1
    script: |
      (function executeRule(current, previous /*null when async*/) {

        // Only on insert or when becoming P1
        if (current.operation() == 'insert' ||
            (previous && previous.priority != 1)) {

          var task = new GlideRecord('sc_task');
          task.initialize();
          task.short_description = 'P1 Response: ' + current.short_description;
          task.description = 'Critical incident requires immediate response.\n\nIncident: ' + current.number;
          task.assignment_group = current.assignment_group;
          task.assigned_to = current.assigned_to;
          task.priority = 1;
          task.parent = current.sys_id;
          var taskId = task.insert();

          gs.info('Created P1 response task: ' + taskId + ' for ' + current.number);
        }

      })(current, previous);
```

#### Step 1.4: Create Async Business Rule

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: Notify External System on Incident Create
    collection: incident
    active: true
    when: async
    order: 500
    action_insert: true
    script: |
      (function executeRule(current, previous /*null when async*/) {

        try {
          var request = new sn_ws.RESTMessageV2('External Notification', 'POST');
          request.setStringParameterNoEscape('incident_number', current.number.toString());
          request.setStringParameterNoEscape('short_description', current.short_description.toString());
          request.setStringParameterNoEscape('priority', current.priority.toString());

          var response = request.execute();
          var httpStatus = response.getStatusCode();

          if (httpStatus == 200 || httpStatus == 201) {
            gs.info('External notification sent for: ' + current.number);
          } else {
            gs.error('External notification failed: ' + httpStatus + ' - ' + response.getBody());
          }
        } catch (e) {
          gs.error('External notification error: ' + e.message);
        }

      })(current, previous);
```

### Phase 2: Using current and previous Objects

#### Step 2.1: Understanding current vs previous

The `current` object represents the record being processed. The `previous` object contains field values before the current transaction.

**Key Differences:**
| Aspect | current | previous |
|--------|---------|----------|
| Availability | All business rules | before/after only (null in async) |
| Modifiable | Yes (before rules) | No (read-only) |
| Insert operations | Has values | null |
| Values | New/modified | Original before change |

#### Step 2.2: Detecting Field Changes

**Using .changes() Method (Recommended):**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: Log State Changes
    collection: incident
    active: true
    when: after
    order: 100
    script: |
      (function executeRule(current, previous /*null when async*/) {

        // EFFICIENT: Exit early if field hasn't changed
        if (!current.state.changes()) {
          return;  // No work to do
        }

        // Get old and new values
        var oldState = previous ? previous.state.getDisplayValue() : '(new)';
        var newState = current.state.getDisplayValue();

        gs.info('Incident ' + current.number + ' state changed: ' + oldState + ' -> ' + newState);

        // Add work note
        current.work_notes = 'State changed from ' + oldState + ' to ' + newState;

      })(current, previous);
```

**Manual Change Detection (When .changes() Not Suitable):**
```javascript
// For complex comparisons or calculated changes
if (previous && current.priority != previous.priority) {
  // Priority changed
}

// For reference fields, compare sys_id
if (previous && current.assigned_to.toString() != previous.assigned_to.toString()) {
  // Assignment changed
}

// For multiple fields
var fieldsToCheck = ['state', 'priority', 'assigned_to'];
var changedFields = [];
for (var i = 0; i < fieldsToCheck.length; i++) {
  var field = fieldsToCheck[i];
  if (current[field].changes()) {
    changedFields.push(field);
  }
}
if (changedFields.length > 0) {
  gs.info('Changed fields: ' + changedFields.join(', '));
}
```

#### Step 2.3: Checking Operation Type

```javascript
// Determine what triggered the business rule
var operation = current.operation();

switch (operation) {
  case 'insert':
    // Record is being created
    gs.info('New record: ' + current.getTableName());
    break;
  case 'update':
    // Record is being updated
    gs.info('Update to: ' + current.getUniqueValue());
    break;
  case 'delete':
    // Record is being deleted
    gs.info('Deleting: ' + current.getUniqueValue());
    break;
}
```

### Phase 3: Condition Field vs Script Conditions

#### Step 3.1: Condition Field (Preferred for Simple Conditions)

The condition field uses encoded queries and is evaluated BEFORE the script runs. This is more efficient because:
- Evaluated at the database level
- Script never executes if condition fails
- No JavaScript overhead

**Best Practices for Condition Field:**
```
# Only run on active P1 incidents
active=true^priority=1

# Only when state changes to Resolved
stateVALCHANGES6

# Only when assigned_to changes
assigned_toCHANGES

# Multiple conditions (AND)
active=true^priority=1^stateVALCHANGES6

# Only on insert (no previous value for state)
stateISEMPTYfalse^ORstateISEMPTY
```

**Common Condition Operators:**
| Operator | Meaning | Example |
|----------|---------|---------|
| CHANGES | Field value changed | `stateCHANGES` |
| VALCHANGES | Changed TO specific value | `stateVALCHANGES6` |
| CHANGESFROM | Changed FROM specific value | `stateCHANGESFROM1` |
| = | Equals | `priority=1` |
| != | Not equals | `state!=7` |
| ISEMPTY | Field is empty | `assigned_toISEMPTY` |
| ISNOTEMPTY | Field has value | `assigned_toISNOTEMPTY` |

#### Step 3.2: Script Conditions (For Complex Logic)

Use script conditions only when the condition field cannot express the logic.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: Complex Condition Example
    collection: incident
    active: true
    when: before
    order: 100
    condition: |
      // Script condition - returns true/false
      // Available: current, previous

      // Check if escalating (priority going from higher number to lower)
      if (current.priority.changes()) {
        var oldPri = previous ? parseInt(previous.priority) : 5;
        var newPri = parseInt(current.priority);
        return newPri < oldPri;  // True if escalating
      }
      return false;
    script: |
      (function executeRule(current, previous /*null when async*/) {

        // This only runs if condition returned true
        current.work_notes = 'Incident escalated from P' + previous.priority + ' to P' + current.priority;
        gs.info('Escalation detected: ' + current.number);

      })(current, previous);
```

**When to Use Script Conditions:**
- Complex date calculations
- Cross-table validations
- Dynamic conditions based on user roles
- Calculations involving multiple fields
- Conditions requiring GlideRecord queries

### Phase 4: Common Glide API Methods

#### Step 4.1: GlideRecord Essentials

```javascript
// Query records
var gr = new GlideRecord('incident');
gr.addQuery('active', true);
gr.addQuery('priority', 1);
gr.orderByDesc('sys_created_on');
gr.setLimit(10);
gr.query();

while (gr.next()) {
  gs.info('Found: ' + gr.number + ' - ' + gr.short_description);
}

// Get single record by sys_id
var incident = new GlideRecord('incident');
if (incident.get('sys_id_value')) {
  gs.info('Found: ' + incident.number);
}

// Get by field value
var user = new GlideRecord('sys_user');
if (user.get('user_name', 'admin')) {
  gs.info('Admin sys_id: ' + user.sys_id);
}

// Insert new record
var newTask = new GlideRecord('task');
newTask.initialize();
newTask.short_description = 'New task from business rule';
newTask.assignment_group = current.assignment_group;
var sysId = newTask.insert();

// Update record
var toUpdate = new GlideRecord('incident');
if (toUpdate.get('sys_id_value')) {
  toUpdate.work_notes = 'Updated via business rule';
  toUpdate.update();
}

// Delete record (use with caution)
var toDelete = new GlideRecord('task');
if (toDelete.get('sys_id_value')) {
  toDelete.deleteRecord();
}
```

#### Step 4.2: GlideSystem (gs) Methods

```javascript
// Logging
gs.info('Information message');
gs.warn('Warning message');
gs.error('Error message');
gs.debug('Debug message');  // Requires debug enabled

// User context
var userId = gs.getUserID();
var userName = gs.getUserName();
var userDisplayName = gs.getUserDisplayName();

// Check roles
if (gs.hasRole('admin')) {
  // Admin-only logic
}
if (gs.hasRole('itil') || gs.hasRole('catalog_admin')) {
  // ITIL or catalog admin logic
}

// Date/Time
var now = gs.now();                    // Current date/time string
var nowDT = gs.nowDateTime();          // GlideDateTime
var today = gs.beginningOfToday();     // Start of today
var daysAgo = gs.daysAgo(7);           // 7 days ago

// Properties
var propValue = gs.getProperty('my.property.name', 'default');
gs.setProperty('my.property.name', 'new_value');

// Generate GUID
var guid = gs.generateGUID();

// Include script include
gs.include('MyScriptInclude');
var util = new MyScriptInclude();

// Nil check (empty string, null, undefined)
if (gs.nil(current.assigned_to)) {
  // Field is empty
}

// Event queue (trigger events)
gs.eventQueue('incident.created', current, current.number, current.priority);
```

#### Step 4.3: GlideDateTime Operations

```javascript
// Current time
var now = new GlideDateTime();

// Create from string
var dt = new GlideDateTime('2026-02-06 10:30:00');

// Add/subtract time
var future = new GlideDateTime();
future.addDays(5);
future.addHours(2);
future.addMinutes(30);

// Compare dates
var dt1 = new GlideDateTime();
var dt2 = new GlideDateTime(current.sys_created_on);
if (dt1.after(dt2)) {
  gs.info('dt1 is after dt2');
}

// Calculate duration
var duration = GlideDateTime.subtract(dt2, dt1);  // Returns GlideDuration
var seconds = duration.getNumericValue() / 1000;
var displayValue = duration.getDisplayValue();  // "2 Days 3 Hours"

// Business time calculations
var schedule = new GlideSchedule('sys_id_of_schedule');
var dur = schedule.duration(dt1, dt2);

// Format output
var formatted = now.getDisplayValue();  // User's timezone
var internal = now.getValue();          // Internal format (UTC)
var date = now.getLocalDate().getValue();  // Date only
```

#### Step 4.4: GlideAggregate for Counts and Sums

```javascript
// Count records
var ga = new GlideAggregate('incident');
ga.addQuery('active', true);
ga.addAggregate('COUNT');
ga.query();
if (ga.next()) {
  var count = ga.getAggregate('COUNT');
  gs.info('Active incidents: ' + count);
}

// Count by group
var ga = new GlideAggregate('incident');
ga.addQuery('active', true);
ga.addAggregate('COUNT');
ga.groupBy('priority');
ga.orderByAggregate('COUNT', false);  // Descending
ga.query();
while (ga.next()) {
  var priority = ga.priority.getDisplayValue();
  var count = ga.getAggregate('COUNT');
  gs.info(priority + ': ' + count + ' incidents');
}

// Sum values
var ga = new GlideAggregate('sc_task');
ga.addQuery('active', true);
ga.addAggregate('SUM', 'time_worked');
ga.query();
if (ga.next()) {
  var totalTime = ga.getAggregate('SUM', 'time_worked');
}

// Average
ga.addAggregate('AVG', 'priority');

// Min/Max
ga.addAggregate('MIN', 'sys_created_on');
ga.addAggregate('MAX', 'sys_created_on');
```

### Phase 5: Error Handling and Logging

#### Step 5.1: Comprehensive Error Handling Pattern

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: Robust Error Handling Example
    collection: incident
    active: true
    when: after
    order: 100
    script: |
      (function executeRule(current, previous /*null when async*/) {

        var BR_NAME = 'Robust Error Handling Example';

        try {
          // Validate inputs
          if (gs.nil(current.sys_id)) {
            throw new Error('Current record has no sys_id');
          }

          // Main logic
          var relatedCI = new GlideRecord('cmdb_ci');
          if (!relatedCI.get(current.cmdb_ci)) {
            gs.warn('[' + BR_NAME + '] No CI found for incident: ' + current.number);
            return;  // Exit gracefully
          }

          // Perform operations
          relatedCI.operational_status = 2;  // Under maintenance
          relatedCI.update();

          gs.info('[' + BR_NAME + '] Updated CI: ' + relatedCI.name);

        } catch (e) {
          // Log error with context
          gs.error('[' + BR_NAME + '] Error: ' + e.message);
          gs.error('[' + BR_NAME + '] Incident: ' + current.number);
          gs.error('[' + BR_NAME + '] Stack: ' + e.stack);

          // Optionally create incident for business rule error
          // createErrorIncident(BR_NAME, e, current);
        }

      })(current, previous);
```

#### Step 5.2: Abort Actions with User Feedback

```javascript
// Before business rule - prevent invalid save
(function executeRule(current, previous) {

  var errors = [];

  // Validation 1: Required field
  if (current.priority == 1 && gs.nil(current.assigned_to)) {
    errors.push('P1 incidents must have an assigned user');
  }

  // Validation 2: Business logic
  if (current.state == 6 && gs.nil(current.resolution_notes)) {
    errors.push('Resolution notes are required when resolving');
  }

  // Validation 3: Cross-field validation
  if (current.impact == 1 && current.urgency == 1 && current.priority != 1) {
    errors.push('Impact 1 + Urgency 1 must equal Priority 1');
  }

  // Abort if errors
  if (errors.length > 0) {
    var errorMsg = errors.join('\n');
    gs.addErrorMessage(errorMsg);
    current.setAbortAction(true);
    gs.info('[Validation BR] Aborted save: ' + errorMsg);
  }

})(current, previous);
```

### Phase 6: Performance Optimization

#### Step 6.1: Use .changes() for Efficiency

**WRONG - Always executes full script:**
```javascript
// Inefficient - script runs on every update
(function executeRule(current, previous) {
  if (previous && current.state != previous.state) {
    // State changed - do work
  }
})(current, previous);
```

**RIGHT - Use condition field + .changes():**
```
Filter Condition: stateCHANGES

Script:
(function executeRule(current, previous) {
  // Script only runs when state changes
  // Additional validation with .changes() for safety
  if (current.state.changes()) {
    // Do work
  }
})(current, previous);
```

#### Step 6.2: Minimize GlideRecord Queries

**WRONG - Query inside loop:**
```javascript
var incidents = new GlideRecord('incident');
incidents.query();
while (incidents.next()) {
  // BAD: Query for each incident
  var user = new GlideRecord('sys_user');
  user.get(incidents.assigned_to);
  // ...
}
```

**RIGHT - Use dot-walking or batch queries:**
```javascript
// Option 1: Dot-walking (single query)
var incidents = new GlideRecord('incident');
incidents.query();
while (incidents.next()) {
  var userName = incidents.assigned_to.name;  // Dot-walk
  var userEmail = incidents.assigned_to.email;
}

// Option 2: Batch query with lookup map
var userIds = [];
var incidents = new GlideRecord('incident');
incidents.query();
while (incidents.next()) {
  if (!gs.nil(incidents.assigned_to)) {
    userIds.push(incidents.assigned_to.toString());
  }
}

var userMap = {};
if (userIds.length > 0) {
  var users = new GlideRecord('sys_user');
  users.addQuery('sys_id', 'IN', userIds.join(','));
  users.query();
  while (users.next()) {
    userMap[users.sys_id.toString()] = {
      name: users.name.toString(),
      email: users.email.toString()
    };
  }
}
```

#### Step 6.3: Order and Active Flag Best Practices

| Practice | Recommendation |
|----------|----------------|
| Order | 100-199 for validation, 200-399 for field setting, 400+ for external/async |
| Active | Set to false during development, enable when tested |
| Condition | Use filter condition field, not script conditions |
| Inheritance | Set "Inherits" carefully - usually leave unchecked |

#### Step 6.4: Avoid Recursive Updates

**DANGEROUS - Can cause infinite loops:**
```javascript
// After business rule on incident
(function executeRule(current, previous) {
  current.work_notes = 'Updated at ' + gs.now();
  current.update();  // DANGER: Triggers business rules again!
})(current, previous);
```

**SAFE - Set workflow false or use before rules:**
```javascript
// Option 1: Disable workflow on update
var gr = new GlideRecord('incident');
if (gr.get(current.sys_id)) {
  gr.setWorkflow(false);  // Skip business rules
  gr.autoSysFields(false);  // Skip sys field updates
  gr.work_notes = 'Updated at ' + gs.now();
  gr.update();
}

// Option 2: Use before rule instead (preferred)
// Before business rule - modifies current directly
(function executeRule(current, previous) {
  current.work_notes = 'Updated at ' + gs.now();
  // No .update() needed - current is saved automatically
})(current, previous);
```

### Phase 7: Testing Business Rules

#### Step 7.1: Query Existing Business Rules

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: collection=incident^active=true
  fields: name,when,order,filter_condition,active
  limit: 50
```

#### Step 7.2: Test with Background Script

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Test business rule by simulating record operation
    var testIncident = new GlideRecord('incident');
    testIncident.initialize();
    testIncident.short_description = 'Test incident for BR testing';
    testIncident.caller_id = gs.getUserID();
    testIncident.impact = 1;
    testIncident.urgency = 1;

    // Insert will trigger before/after insert rules
    var sysId = testIncident.insert();
    gs.info('Created test incident: ' + sysId);

    // Verify priority was calculated
    testIncident.get(sysId);
    gs.info('Priority after BR: ' + testIncident.priority.getDisplayValue());

    // Clean up (optional)
    // testIncident.deleteRecord();
  description: Test priority calculation business rule
```

#### Step 7.3: Check System Logs

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: messageLIKEbusiness rule^ORmessageLIKE[BR]^sys_created_on>javascript:gs.minutesAgo(10)
  fields: message,level,sys_created_on,source
  limit: 50
```

#### Step 7.4: Local Development with Script Sync

**Using MCP:**
```
Tool: SN-Sync-Script-To-Local
Parameters:
  script_sys_id: [business_rule_sys_id]
  local_path: /scripts/business_rules/validate_incident.js
  instance: dev
```

Then edit locally with your IDE and sync back:

```
Tool: SN-Sync-Local-To-Script
Parameters:
  local_path: /scripts/business_rules/validate_incident.js
  script_sys_id: [business_rule_sys_id]
  instance: dev
```

## Tool Usage Summary

| Operation | MCP Tool | Purpose |
|-----------|----------|---------|
| Create BR | SN-Create-Record (sys_script) | Create new business rule |
| Update BR | SN-Update-Record | Modify existing business rule |
| Query BRs | SN-Query-Table | Find business rules on table |
| Test BR | SN-Execute-Background-Script | Simulate record operations |
| Debug | SN-Query-Table (syslog) | Check execution logs |
| Local Dev | SN-Sync-Script-To-Local | Edit scripts in IDE |
| Get Schema | SN-Get-Table-Schema | Understand table structure |

## Best Practices

### Code Quality
- **Use IIFE Pattern:** Wrap all scripts in `(function executeRule(current, previous) {...})(current, previous);`
- **Name Variables Clearly:** Use descriptive names like `existingTask` not `gr2`
- **Comment Complex Logic:** Explain why, not what
- **Avoid Magic Numbers:** Use constants or comments for values like `state=6`

### Performance
- **Use .changes() Method:** Always exit early if field hasn't changed
- **Prefer Condition Field:** Database-level filtering is faster than script
- **Limit Queries:** Use setLimit(), avoid queries in loops
- **Order Carefully:** Lower order = runs first. Put validations early (100-199)

### Reliability
- **Always Handle Errors:** Wrap in try-catch, especially for external calls
- **Log Meaningful Messages:** Include record identifiers, field values
- **Test with Multiple Roles:** Ensure ACLs don't break business rules
- **Avoid Recursion:** Use setWorkflow(false) when updating same table

### Maintainability
- **One Purpose Per Rule:** Split complex rules into focused components
- **Use Script Includes:** Move reusable logic to script includes
- **Document Dependencies:** Note what other rules/scripts this interacts with
- **Version Control:** Use SN-Sync-Script-To-Local for git versioning

## Troubleshooting

### Business Rule Not Firing

**Symptom:** Record saves but business rule script doesn't execute
**Causes:**
- Active = false
- Filter condition not matching
- Order conflict with abort action
- ACL blocking field access
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: collection=incident^name=*priority*
  fields: name,active,when,filter_condition,order
```

### Infinite Loop / Stack Overflow

**Symptom:** Error "Maximum call stack size exceeded" or timeout
**Cause:** Business rule calling .update() on same table, triggering itself
**Solution:**
```javascript
// Use setWorkflow(false) to prevent recursion
var gr = new GlideRecord('incident');
gr.get(current.sys_id);
gr.setWorkflow(false);
gr.update();
```

### Previous is Null

**Symptom:** Error accessing previous.fieldname
**Cause:** previous is null on insert operations or in async rules
**Solution:**
```javascript
// Always check for null
if (previous && current.state != previous.state) {
  // Safe to access previous
}

// Or use operation check
if (current.operation() != 'insert' && previous) {
  // previous is available
}
```

### Changes Not Detected

**Symptom:** .changes() returns false when field changed
**Cause:** Field set to same value, or changes made after query
**Solution:**
```javascript
// Log actual values for debugging
gs.info('Current state: ' + current.state + ', Previous: ' + (previous ? previous.state : 'null'));
gs.info('Changes: ' + current.state.changes());

// Use condition field for reliable change detection
// Filter: stateCHANGES
```

## Examples

### Example 1: Auto-Assignment Based on Category

```javascript
(function executeRule(current, previous) {

  // Exit early if category hasn't changed
  if (!current.category.changes()) {
    return;
  }

  // Assignment mapping
  var categoryAssignment = {
    'network': 'Network Team',
    'hardware': 'Desktop Support',
    'software': 'Application Support',
    'database': 'DBA Team'
  };

  var category = current.category.toString();
  var groupName = categoryAssignment[category];

  if (groupName) {
    var group = new GlideRecord('sys_user_group');
    if (group.get('name', groupName)) {
      current.assignment_group = group.sys_id;
      gs.info('Auto-assigned to ' + groupName + ' based on category');
    }
  }

})(current, previous);
```

### Example 2: SLA Escalation Warning

```javascript
(function executeRule(current, previous) {

  // Check SLA breach approaching (80% of response time)
  var sla = new GlideRecord('task_sla');
  sla.addQuery('task', current.sys_id);
  sla.addQuery('stage', 'in_progress');
  sla.query();

  while (sla.next()) {
    var percentComplete = sla.percentage.floatValue();

    if (percentComplete >= 80 && percentComplete < 100) {
      // Approaching breach - escalate
      if (current.priority > 1) {
        current.priority = parseInt(current.priority) - 1;
        current.work_notes = 'Auto-escalated: SLA at ' + Math.round(percentComplete) + '%';
        gs.info('SLA escalation for ' + current.number + ' - ' + percentComplete + '%');
      }
    }
  }

})(current, previous);
```

### Example 3: Audit Trail for Sensitive Field Changes

```javascript
(function executeRule(current, previous) {

  var sensitiveFields = ['priority', 'assignment_group', 'assigned_to', 'state'];
  var changes = [];

  for (var i = 0; i < sensitiveFields.length; i++) {
    var field = sensitiveFields[i];
    if (current[field].changes()) {
      changes.push({
        field: field,
        from: previous ? previous[field].getDisplayValue() : '(empty)',
        to: current[field].getDisplayValue()
      });
    }
  }

  if (changes.length > 0) {
    var auditNote = 'Field Changes:\n';
    for (var j = 0; j < changes.length; j++) {
      var c = changes[j];
      auditNote += '- ' + c.field + ': "' + c.from + '" -> "' + c.to + '"\n';
    }
    auditNote += '\nChanged by: ' + gs.getUserDisplayName();

    current.work_notes = auditNote;
    gs.info('Audit trail recorded for ' + current.number);
  }

})(current, previous);
```

## Related Skills

- `admin/script-execution` - Background script patterns and execution
- `admin/update-set-management` - Track business rule changes
- `development/script-includes` - Reusable server-side libraries
- `catalog/ui-policies` - Client-side field control (complement to BRs)
- `security/acl-management` - Access control that affects BR execution

## References

- [ServiceNow Business Rules](https://docs.servicenow.com/bundle/utah-application-development/page/script/business-rules/concept/c_BusinessRules.html)
- [GlideRecord API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideRecordScopedAPI)
- [GlideSystem API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideSystemScopedAPI)
- [Best Practices - Business Rules](https://docs.servicenow.com/bundle/utah-application-development/page/script/business-rules/reference/r_BusinessRulesBestPractices.html)
