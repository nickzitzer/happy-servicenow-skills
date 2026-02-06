---
name: script-execution
version: 1.0.0
description: Safe background script execution patterns including automated execution via sys_trigger, fix script generation, error handling, and logging best practices
author: Happy Technologies LLC
tags: [admin, scripts, automation, sys_trigger, fix-scripts, debugging, development]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Execute-Background-Script
    - SN-Create-Fix-Script
    - SN-Query-Table
    - SN-Create-Record
  rest:
    - /api/now/table/sys_trigger
    - /api/now/table/syslog
    - /api/now/table/sys_script_fix
  native:
    - Bash
    - Read
complexity: advanced
estimated_time: 10-30 minutes
---

# Script Execution

## Overview

This skill covers safe and effective execution of background scripts in ServiceNow:

- Automated script execution via sys_trigger (the breakthrough method)
- Safe script patterns and templates
- Fix script generation for manual execution
- Error handling and logging best practices
- Debugging and troubleshooting techniques

**When to use:** When MCP tools don't support the required operation, or when complex data manipulation is needed.

**Who should use this:** Administrators and developers who need to execute server-side JavaScript in ServiceNow.

## Prerequisites

- **Roles:** `admin` (background script execution requires full admin)
- **Access:** sys_trigger, syslog, sys_script_fix tables
- **Knowledge:** GlideRecord API, ServiceNow server-side JavaScript
- **Caution:** Background scripts run with elevated privileges - test carefully

## Execution Methods

### Method Comparison

| Method | Automation | Speed | Use Case |
|--------|------------|-------|----------|
| sys_trigger | Full | ~1-2 sec | Preferred for all automated tasks |
| UI endpoint | Full | ~1-2 sec | Fallback if trigger fails |
| Fix Script | Manual | Variable | Audit trail, scheduled execution |
| Scripts - Background | Manual | Immediate | One-time interactive testing |

## Procedure

### Phase 1: Automated Execution (Recommended)

#### Step 1.1: Basic Script Execution

The sys_trigger method creates a scheduled job that executes immediately and self-deletes.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    gs.info('Hello from automated script execution!');

    // Your logic here
    var count = 0;
    var gr = new GlideRecord('incident');
    gr.addQuery('active', true);
    gr.addQuery('priority', 1);
    gr.setLimit(10);
    gr.query();

    while (gr.next()) {
      count++;
      gs.info('Found P1 incident: ' + gr.number);
    }

    gs.info('Total P1 incidents found: ' + count);
  description: Count active P1 incidents
  execution_method: trigger
```

**How It Works:**
1. Creates a scheduled job in `sys_trigger` table
2. Sets next_action to run immediately
3. Trigger executes the script
4. Script logs output to system logs
5. Trigger auto-deletes after execution

#### Step 1.2: Verify Execution

**Check System Logs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: message=*automated script*^sys_created_on>javascript:gs.minutesAgo(5)
  fields: message,level,sys_created_on,source
  limit: 20
```

**Log Levels:**
| Level | Method | Purpose |
|-------|--------|---------|
| 0 | gs.info() | Informational messages |
| 1 | gs.warn() | Warning messages |
| 2 | gs.error() | Error messages |
| 3 | gs.debug() | Debug messages (if enabled) |

### Phase 2: Safe Script Patterns

#### Step 2.1: Query Pattern (Read-Only)

Safe pattern for reading data:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Safe read-only pattern
    var results = [];

    var gr = new GlideRecord('incident');
    gr.addQuery('active', true);
    gr.addQuery('priority', 1);
    gr.setLimit(100);  // Always set a limit
    gr.query();

    while (gr.next()) {
      results.push({
        number: gr.number.toString(),
        short_description: gr.short_description.toString(),
        assigned_to: gr.assigned_to.getDisplayValue(),
        created: gr.sys_created_on.toString()
      });
    }

    gs.info('Query Results: ' + JSON.stringify(results, null, 2));
  description: Query active P1 incidents (read-only)
```

#### Step 2.2: Update Pattern (With Safety Checks)

Pattern for updating records with safety measures:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Safe update pattern with validation
    var TABLE = 'incident';
    var QUERY = 'active=true^priority=1^assigned_toISEMPTY';
    var MAX_UPDATES = 10;  // Limit updates per execution

    // DRY RUN flag - set to false to actually update
    var DRY_RUN = true;

    var updated = 0;
    var skipped = 0;

    var gr = new GlideRecord(TABLE);
    gr.addEncodedQuery(QUERY);
    gr.setLimit(MAX_UPDATES);
    gr.query();

    gs.info('Found ' + gr.getRowCount() + ' records to process');

    while (gr.next()) {
      // Validate before update
      if (!gr.canWrite()) {
        gs.warn('Cannot write to: ' + gr.number);
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        gs.info('[DRY RUN] Would update: ' + gr.number);
      } else {
        gr.work_notes = 'Automated: Escalating unassigned P1';
        gr.assignment_group = 'Critical Incidents Team';
        gr.update();
        gs.info('Updated: ' + gr.number);
        updated++;
      }
    }

    gs.info('Summary: Updated=' + updated + ', Skipped=' + skipped + ', DryRun=' + DRY_RUN);
  description: Escalate unassigned P1 incidents (with dry run)
```

#### Step 2.3: Insert Pattern (With Duplicate Check)

Pattern for creating records safely:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Safe insert pattern with duplicate check
    var TABLE = 'sys_properties';
    var PROPERTY_NAME = 'custom.automation.enabled';
    var PROPERTY_VALUE = 'true';

    // Check for existing
    var existing = new GlideRecord(TABLE);
    existing.addQuery('name', PROPERTY_NAME);
    existing.query();

    if (existing.next()) {
      gs.warn('Property already exists: ' + PROPERTY_NAME + ' = ' + existing.value);

      // Update if different
      if (existing.value != PROPERTY_VALUE) {
        existing.value = PROPERTY_VALUE;
        existing.update();
        gs.info('Updated property value to: ' + PROPERTY_VALUE);
      }
    } else {
      // Create new
      var gr = new GlideRecord(TABLE);
      gr.initialize();
      gr.name = PROPERTY_NAME;
      gr.value = PROPERTY_VALUE;
      gr.description = 'Created by automated script';
      var sysId = gr.insert();
      gs.info('Created property: ' + PROPERTY_NAME + ' (sys_id: ' + sysId + ')');
    }
  description: Create or update system property
```

#### Step 2.4: Delete Pattern (With Confirmation)

Pattern for deleting records with extreme caution:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // DANGEROUS: Delete pattern - use with extreme caution
    var TABLE = 'sys_user_preference';
    var QUERY = 'user.active=false^sys_created_on<javascript:gs.daysAgo(365)';
    var MAX_DELETES = 10;

    // SAFETY: Always start with dry run
    var DRY_RUN = true;
    var CONFIRMATION_CODE = 'DELETE_CONFIRMED_2026';
    var PROVIDED_CODE = 'INTENTIONALLY_WRONG';  // Must match to delete

    if (!DRY_RUN && PROVIDED_CODE !== CONFIRMATION_CODE) {
      gs.error('SAFETY: Confirmation code mismatch. Aborting delete.');
      return;
    }

    var gr = new GlideRecord(TABLE);
    gr.addEncodedQuery(QUERY);
    gr.setLimit(MAX_DELETES);
    gr.query();

    var count = 0;
    var deleted = [];

    while (gr.next()) {
      count++;
      if (DRY_RUN) {
        gs.info('[DRY RUN] Would delete: ' + gr.sys_id + ' - ' + gr.name);
      } else {
        deleted.push(gr.sys_id.toString());
        gr.deleteRecord();
      }
    }

    if (DRY_RUN) {
      gs.info('[DRY RUN] Would delete ' + count + ' records');
    } else {
      gs.info('Deleted ' + deleted.length + ' records: ' + JSON.stringify(deleted));
    }
  description: Delete old user preferences (dry run mode)
```

### Phase 3: Fix Script Generation

#### Step 3.1: Create Fix Script for Audit Trail

When you need an audit trail or scheduled execution:

**Using MCP:**
```
Tool: SN-Create-Fix-Script
Parameters:
  name: FIX_IncidentDataCleanup_20260206
  script: |
    // Fix Script: Clean up old resolved incidents
    // Author: Admin
    // Date: 2026-02-06
    // JIRA: PROJ-123

    var cutoffDays = 90;
    var cutoffDate = gs.daysAgo(cutoffDays);

    gs.info('=== Starting Incident Cleanup ===');
    gs.info('Cutoff date: ' + cutoffDate);

    var gr = new GlideRecord('incident');
    gr.addQuery('state', 'IN', '6,7,8');  // Resolved, Closed, Cancelled
    gr.addQuery('sys_updated_on', '<', cutoffDate);
    gr.query();

    gs.info('Found ' + gr.getRowCount() + ' incidents to archive');

    // Archive logic here

    gs.info('=== Cleanup Complete ===');
  description: Clean up old resolved incidents for data hygiene
```

**Manual Fix Script Creation:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_fix
  data:
    name: FIX_IncidentDataCleanup_20260206
    script: |
      // Script content here
    description: Clean up old resolved incidents
    active: true
```

#### Step 3.2: Query Fix Scripts

**Find Existing Fix Scripts:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_fix
  query: active=true
  fields: name,description,sys_created_on,run_count
  limit: 50
```

### Phase 4: Error Handling

#### Step 4.1: Try-Catch Pattern

Always wrap scripts in try-catch for error handling:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Comprehensive error handling pattern
    var scriptName = 'UpdateIncidentPriorities';
    var startTime = new GlideDateTime();

    try {
      gs.info('[' + scriptName + '] Starting execution');

      // Main logic
      var gr = new GlideRecord('incident');
      gr.addQuery('active', true);
      gr.setLimit(100);
      gr.query();

      var processed = 0;
      var errors = 0;

      while (gr.next()) {
        try {
          // Process each record
          processed++;
          // ... logic here
        } catch (recordError) {
          errors++;
          gs.error('[' + scriptName + '] Error processing ' + gr.number + ': ' + recordError.message);
        }
      }

      gs.info('[' + scriptName + '] Completed. Processed=' + processed + ', Errors=' + errors);

    } catch (e) {
      gs.error('[' + scriptName + '] Fatal error: ' + e.message);
      gs.error('[' + scriptName + '] Stack: ' + e.stack);
    } finally {
      var endTime = new GlideDateTime();
      var duration = GlideDateTime.subtract(startTime, endTime).getNumericValue() / 1000;
      gs.info('[' + scriptName + '] Duration: ' + duration + ' seconds');
    }
  description: Update incident priorities with full error handling
```

#### Step 4.2: Transaction Rollback Pattern

For complex updates that should succeed or fail together:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Transaction-like pattern with rollback capability
    var changes = [];
    var success = true;

    try {
      // Step 1: Update incident
      var incident = new GlideRecord('incident');
      incident.get('[incident_sys_id]');
      var oldState = incident.state.toString();
      incident.state = 6;  // Resolved
      incident.update();
      changes.push({ table: 'incident', sys_id: incident.sys_id.toString(), field: 'state', old: oldState, new: '6' });
      gs.info('Step 1 complete: Incident updated');

      // Step 2: Update related task
      var task = new GlideRecord('sc_task');
      task.get('[task_sys_id]');
      var oldTaskState = task.state.toString();
      task.state = 3;  // Closed Complete
      task.update();
      changes.push({ table: 'sc_task', sys_id: task.sys_id.toString(), field: 'state', old: oldTaskState, new: '3' });
      gs.info('Step 2 complete: Task updated');

      // Step 3: Something that might fail
      // Simulating failure for demo
      // throw new Error('Simulated failure');

      gs.info('All steps completed successfully');

    } catch (e) {
      gs.error('Error occurred: ' + e.message);
      gs.info('Rolling back ' + changes.length + ' changes...');

      // Rollback in reverse order
      for (var i = changes.length - 1; i >= 0; i--) {
        var change = changes[i];
        var rollback = new GlideRecord(change.table);
        rollback.get(change.sys_id);
        rollback[change.field] = change.old;
        rollback.update();
        gs.info('Rolled back: ' + change.table + '.' + change.sys_id);
      }

      gs.info('Rollback complete');
    }
  description: Multi-step update with rollback capability
```

### Phase 5: Logging Best Practices

#### Step 5.1: Structured Logging

Use consistent log formatting:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Structured logging pattern
    var Logger = {
      scriptName: 'DataMigration',

      info: function(message, data) {
        var logMessage = '[' + this.scriptName + '] [INFO] ' + message;
        if (data) logMessage += ' | Data: ' + JSON.stringify(data);
        gs.info(logMessage);
      },

      warn: function(message, data) {
        var logMessage = '[' + this.scriptName + '] [WARN] ' + message;
        if (data) logMessage += ' | Data: ' + JSON.stringify(data);
        gs.warn(logMessage);
      },

      error: function(message, error) {
        var logMessage = '[' + this.scriptName + '] [ERROR] ' + message;
        if (error) logMessage += ' | Error: ' + error.message;
        gs.error(logMessage);
      },

      metric: function(name, value) {
        gs.info('[' + this.scriptName + '] [METRIC] ' + name + '=' + value);
      }
    };

    // Usage
    Logger.info('Starting migration', { source: 'incident', target: 'x_custom_incident' });
    Logger.metric('records_processed', 150);
    Logger.warn('Skipped record due to missing field', { number: 'INC0012345' });
    Logger.error('Failed to process record', new Error('Invalid reference'));
  description: Demonstrate structured logging pattern
```

#### Step 5.2: Query Script Logs

**Find Script Execution Logs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: source=Script execution^sys_created_on>javascript:gs.hoursAgo(1)
  fields: message,level,sys_created_on
  limit: 100
```

**Filter by Script Name:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: messageLIKE[DataMigration]^sys_created_on>javascript:gs.hoursAgo(1)
  fields: message,level,sys_created_on
  limit: 100
```

### Phase 6: Advanced Patterns

#### Step 6.1: Batch Processing with Progress

For long-running operations:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Batch processing with progress tracking
    var BATCH_SIZE = 100;
    var MAX_BATCHES = 10;
    var TABLE = 'incident';
    var QUERY = 'active=true';

    var totalProcessed = 0;
    var totalRecords = 0;
    var batchNum = 0;

    // Get total count
    var countGR = new GlideAggregate(TABLE);
    countGR.addEncodedQuery(QUERY);
    countGR.addAggregate('COUNT');
    countGR.query();
    if (countGR.next()) {
      totalRecords = parseInt(countGR.getAggregate('COUNT'));
    }
    gs.info('Total records to process: ' + totalRecords);

    // Process in batches
    while (batchNum < MAX_BATCHES) {
      var gr = new GlideRecord(TABLE);
      gr.addEncodedQuery(QUERY);
      gr.orderBy('sys_created_on');
      gr.chooseWindow(batchNum * BATCH_SIZE, (batchNum + 1) * BATCH_SIZE);
      gr.query();

      if (!gr.hasNext()) {
        gs.info('No more records to process');
        break;
      }

      var batchProcessed = 0;
      while (gr.next()) {
        // Process record
        batchProcessed++;
        totalProcessed++;
      }

      var progress = Math.round((totalProcessed / totalRecords) * 100);
      gs.info('Batch ' + (batchNum + 1) + ' complete: ' + batchProcessed + ' records | Progress: ' + progress + '%');

      batchNum++;
    }

    gs.info('Processing complete. Total processed: ' + totalProcessed + '/' + totalRecords);
  description: Batch processing with progress tracking
```

#### Step 6.2: Asynchronous Execution

For very long-running scripts, chain multiple executions:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Self-scheduling pattern for long operations
    var RECORDS_PER_EXECUTION = 1000;
    var DELAY_SECONDS = 10;

    // Get or create tracking property
    var tracker = gs.getProperty('x_custom.migration.last_processed', '');

    var gr = new GlideRecord('incident');
    if (tracker) {
      gr.addQuery('sys_created_on', '>', tracker);
    }
    gr.orderBy('sys_created_on');
    gr.setLimit(RECORDS_PER_EXECUTION);
    gr.query();

    var lastProcessed = '';
    var count = 0;

    while (gr.next()) {
      // Process record
      count++;
      lastProcessed = gr.sys_created_on.toString();
    }

    if (count > 0) {
      // Update tracker
      gs.setProperty('x_custom.migration.last_processed', lastProcessed);
      gs.info('Processed ' + count + ' records. Last: ' + lastProcessed);

      // Schedule next execution
      if (count == RECORDS_PER_EXECUTION) {
        var trigger = new GlideRecord('sys_trigger');
        trigger.initialize();
        trigger.name = 'Continue Migration ' + new GlideDateTime().getDisplayValue();
        trigger.next_action = new GlideDateTime();
        trigger.next_action.addSeconds(DELAY_SECONDS);
        trigger.script = 'gs.include("MigrationScript");';  // Call script include
        trigger.trigger_type = 0;  // Run once
        trigger.insert();
        gs.info('Scheduled next execution in ' + DELAY_SECONDS + ' seconds');
      } else {
        gs.info('Migration complete!');
        gs.setProperty('x_custom.migration.last_processed', '');  // Reset
      }
    } else {
      gs.info('No more records to process');
    }
  description: Self-scheduling migration script
```

## Script Templates

### Template 1: Data Audit

```javascript
// Data Audit Template
var TABLE = 'incident';
var AUDIT_FIELDS = ['state', 'priority', 'assigned_to'];

var audit = {};
AUDIT_FIELDS.forEach(function(field) {
  audit[field] = {};
});

var gr = new GlideRecord(TABLE);
gr.addQuery('active', true);
gr.query();

while (gr.next()) {
  AUDIT_FIELDS.forEach(function(field) {
    var value = gr.getDisplayValue(field) || '(empty)';
    audit[field][value] = (audit[field][value] || 0) + 1;
  });
}

gs.info('Audit Results:\n' + JSON.stringify(audit, null, 2));
```

### Template 2: Reference Data Validation

```javascript
// Reference Validation Template
var TABLE = 'incident';
var REF_FIELD = 'assigned_to';
var REF_TABLE = 'sys_user';

var invalid = [];
var gr = new GlideRecord(TABLE);
gr.addQuery('active', true);
gr.addQuery(REF_FIELD + '.active', false);  // Reference to inactive record
gr.query();

while (gr.next()) {
  invalid.push({
    number: gr.number.toString(),
    invalid_ref: gr.getDisplayValue(REF_FIELD)
  });
}

gs.info('Found ' + invalid.length + ' records with invalid references');
gs.info(JSON.stringify(invalid, null, 2));
```

### Template 3: Bulk Field Update

```javascript
// Bulk Field Update Template
var TABLE = 'incident';
var QUERY = 'active=true^category=inquiry';
var UPDATES = {
  subcategory: 'general',
  contact_type: 'email'
};
var DRY_RUN = true;

var gr = new GlideRecord(TABLE);
gr.addEncodedQuery(QUERY);
gr.query();

var updated = 0;
while (gr.next()) {
  if (DRY_RUN) {
    gs.info('[DRY RUN] Would update ' + gr.number);
  } else {
    for (var field in UPDATES) {
      gr[field] = UPDATES[field];
    }
    gr.update();
    updated++;
  }
}

gs.info((DRY_RUN ? '[DRY RUN] ' : '') + 'Updated ' + updated + ' records');
```

## Tool Usage Summary

| Operation | MCP Tool | Purpose |
|-----------|----------|---------|
| Execute | SN-Execute-Background-Script | Run server-side JavaScript |
| Fix Script | SN-Create-Fix-Script | Create auditable script |
| Query Logs | SN-Query-Table | Check execution results |
| Create Record | SN-Create-Record | Manual fix script creation |

## Best Practices

- **Always Use Dry Run First:** Test with DRY_RUN = true before real execution
- **Set Limits:** Always use setLimit() to prevent runaway scripts
- **Log Extensively:** Use structured logging for debugging
- **Handle Errors:** Wrap all scripts in try-catch
- **Document Scripts:** Include author, date, ticket reference in comments
- **Avoid Hardcoding:** Use variables for sys_ids and queries
- **Test in Sub-Production:** Never run untested scripts in production
- **Use Transactions:** Consider rollback patterns for multi-step operations

## Troubleshooting

### Script Doesn't Execute

**Symptom:** No output in system logs
**Causes:**
- sys_trigger permissions
- Script syntax error before any logging
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_trigger
  query: nameLIKEMCP^sys_created_on>javascript:gs.minutesAgo(5)
  fields: name,state,next_action,script
```

### Script Times Out

**Symptom:** Partial execution, timeout error
**Causes:**
- Too many records processed
- Inefficient queries
**Solution:**
- Add setLimit()
- Use batch processing pattern
- Optimize queries with proper indexes

### No Logs Appearing

**Symptom:** Script runs but no gs.info() output visible
**Causes:**
- Log level filtering
- Looking in wrong time range
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: sys_created_on>javascript:gs.minutesAgo(10)
  fields: message,level,source,sys_created_on
  limit: 50
```

## Related Skills

- `admin/batch-operations` - Bulk record operations
- `admin/update-set-management` - Track script changes
- `admin/deployment-workflow` - Deploy scripts between instances

## References

- [ServiceNow Script Execution](https://docs.servicenow.com/bundle/utah-platform-administration/page/script/scripts-background/concept/c_ScriptsBackground.html)
- [GlideRecord API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideRecordScopedAPI)
- [System Logs](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/reference-pages/concept/c_SystemLogs.html)
