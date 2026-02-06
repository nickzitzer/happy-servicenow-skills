---
name: scheduled-jobs
version: 1.0.0
description: Comprehensive guide to creating and managing ServiceNow scheduled jobs - run frequencies, conditional execution, performance optimization, error handling, and debugging
author: Happy Technologies LLC
tags: [development, scheduled-jobs, automation, sys_trigger, batch-processing, sysauto_script, performance]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Create-Record
    - SN-Update-Record
    - SN-Query-Table
    - SN-Execute-Background-Script
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sysauto_script
    - /api/now/table/sys_trigger
    - /api/now/table/syslog
    - /api/now/table/sys_script
  native:
    - Bash
    - Read
complexity: intermediate
estimated_time: 15-45 minutes
---

# Scheduled Job Development

## Overview

This skill covers creating and managing ServiceNow scheduled jobs for automated background processing:

- **Scheduled Script Executions** (`sysauto_script`) - Recurring jobs with cron-like scheduling
- **System Triggers** (`sys_trigger`) - One-time or conditional job executions
- **Run frequency patterns** - Daily, weekly, monthly, and cron expressions
- **Conditional execution** - Run only when specific conditions are met
- **Performance optimization** - Filter to records needing processing (critical!)
- **Error handling** - Robust error management and notifications
- **Monitoring and debugging** - Track execution history and troubleshoot issues

**When to use:** When you need to automate recurring tasks, batch processing, data cleanup, notifications, or any background operations that run on a schedule.

**Who should use this:** Developers and administrators who need to automate ServiceNow operations without user intervention.

## Prerequisites

- **Roles:** `admin` (required for scheduled job creation and management)
- **Access:** `sysauto_script`, `sys_trigger`, `syslog` tables
- **Knowledge:** GlideRecord API, ServiceNow server-side JavaScript
- **Related Skills:**
  - `admin/script-execution` - Background script patterns
  - `admin/batch-operations` - Bulk record operations

## Table Architecture

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sysauto_script` | Scheduled script executions (recurring) | name, script, run_type, run_time, conditional |
| `sys_trigger` | System triggers (one-time/system events) | name, script, next_action, trigger_type, state |
| `syslog` | Execution logs | message, level, source, sys_created_on |
| `sys_script` | Script includes (reusable logic) | name, script, active, api_name |

### Run Types for sysauto_script

| Run Type | Value | Description |
|----------|-------|-------------|
| Run Once | `on_demand` | Manual execution only |
| Daily | `daily` | Runs every day at specified time |
| Weekly | `weekly` | Runs on specified day(s) of week |
| Monthly | `monthly` | Runs on specified day of month |
| Periodically | `periodically` | Runs at fixed intervals |
| On Demand | `on_demand` | Manual trigger only |

## Procedure

### Phase 1: Create Scheduled Script Execution

#### Step 1.1: Basic Daily Job

Create a scheduled job that runs daily.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: "Daily Incident Cleanup"
    script: |
      // Daily cleanup of resolved incidents older than 90 days
      var cutoffDate = gs.daysAgo(90);
      var gr = new GlideRecord('incident');
      gr.addQuery('state', 'IN', '6,7,8');  // Resolved, Closed, Cancelled
      gr.addQuery('sys_updated_on', '<', cutoffDate);
      gr.setLimit(1000);  // Process in batches
      gr.query();

      var archived = 0;
      while (gr.next()) {
        // Archive logic here
        archived++;
      }
      gs.info('[Daily Incident Cleanup] Processed ' + archived + ' incidents');
    active: true
    run_type: daily
    run_time: "02:00:00"
    run_dayofweek: 1
```

**Key Fields Explained:**
- `run_type: daily` - Runs every day
- `run_time: "02:00:00"` - 2:00 AM (use 24-hour format)
- `run_dayofweek: 1` - Monday (1=Mon, 2=Tue, ..., 7=Sun) - used for weekly

#### Step 1.2: Weekly Job

Create a job that runs every Monday at 6 AM.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: "Weekly SLA Report"
    script: |
      // Generate weekly SLA compliance report
      gs.info('[Weekly SLA Report] Starting report generation');

      var report = {
        totalIncidents: 0,
        slaBreaches: 0,
        slaCompliance: 0
      };

      var gr = new GlideRecord('task_sla');
      gr.addQuery('stage', 'IN', 'completed,cancelled');
      gr.addQuery('sys_created_on', '>=', gs.daysAgo(7));
      gr.query();

      while (gr.next()) {
        report.totalIncidents++;
        if (gr.has_breached) {
          report.slaBreaches++;
        }
      }

      report.slaCompliance = report.totalIncidents > 0
        ? Math.round((1 - report.slaBreaches / report.totalIncidents) * 100)
        : 100;

      gs.info('[Weekly SLA Report] Results: ' + JSON.stringify(report));
    active: true
    run_type: weekly
    run_time: "06:00:00"
    run_dayofweek: 1
```

#### Step 1.3: Monthly Job

Create a job that runs on the 1st of each month.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: "Monthly User Audit"
    script: |
      // Monthly audit of inactive users
      gs.info('[Monthly User Audit] Starting audit');

      var cutoffDate = gs.daysAgo(90);
      var inactiveUsers = [];

      var gr = new GlideRecord('sys_user');
      gr.addQuery('active', true);
      gr.addQuery('last_login_time', '<', cutoffDate);
      gr.addQuery('last_login_time', '!=', '');
      gr.query();

      while (gr.next()) {
        inactiveUsers.push({
          user_id: gr.user_name.toString(),
          name: gr.name.toString(),
          last_login: gr.last_login_time.toString()
        });
      }

      gs.info('[Monthly User Audit] Found ' + inactiveUsers.length + ' inactive users');

      // Optional: Send report email
      if (inactiveUsers.length > 0) {
        var email = new GlideEmailOutbound();
        email.setSubject('Monthly Inactive User Report');
        email.setFrom('servicenow@company.com');
        email.addAddress('it-security@company.com');
        email.setBody('Found ' + inactiveUsers.length + ' users inactive for 90+ days.\n\n' +
                      JSON.stringify(inactiveUsers, null, 2));
        email.send();
      }
    active: true
    run_type: monthly
    run_time: "03:00:00"
    run_dayofmonth: 1
```

#### Step 1.4: Periodic Job (Every N Minutes/Hours)

Create a job that runs every 15 minutes.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: "Integration Queue Processor"
    script: |
      // Process integration queue every 15 minutes
      gs.info('[Queue Processor] Starting processing');

      var gr = new GlideRecord('x_custom_integration_queue');
      gr.addQuery('state', 'pending');
      gr.addQuery('retry_count', '<', 3);
      gr.orderBy('priority');
      gr.orderBy('sys_created_on');
      gr.setLimit(100);  // Batch size
      gr.query();

      var processed = 0;
      var failed = 0;

      while (gr.next()) {
        try {
          // Process queue item
          processQueueItem(gr);
          gr.state = 'completed';
          gr.update();
          processed++;
        } catch (e) {
          gr.retry_count = gr.retry_count + 1;
          gr.error_message = e.message;
          gr.state = gr.retry_count >= 3 ? 'failed' : 'pending';
          gr.update();
          failed++;
          gs.error('[Queue Processor] Error: ' + e.message);
        }
      }

      gs.info('[Queue Processor] Completed. Processed=' + processed + ', Failed=' + failed);

      function processQueueItem(record) {
        // Your processing logic here
      }
    active: true
    run_type: periodically
    run_period: 900000
```

**Note:** `run_period` is in milliseconds (900000 = 15 minutes)

| Interval | Milliseconds |
|----------|--------------|
| 1 minute | 60000 |
| 5 minutes | 300000 |
| 15 minutes | 900000 |
| 30 minutes | 1800000 |
| 1 hour | 3600000 |
| 4 hours | 14400000 |
| 12 hours | 43200000 |

### Phase 2: Conditional Execution

#### Step 2.1: Conditional Job (Run Only When Condition Met)

Create a job that only runs if there are records to process.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: "Process Pending Approvals"
    script: |
      // Process stale approval requests
      gs.info('[Approval Processor] Starting');

      var staleThreshold = gs.hoursAgo(24);
      var gr = new GlideRecord('sysapproval_approver');
      gr.addQuery('state', 'requested');
      gr.addQuery('sys_created_on', '<', staleThreshold);
      gr.query();

      var escalated = 0;
      while (gr.next()) {
        // Escalate stale approvals
        escalateApproval(gr);
        escalated++;
      }

      gs.info('[Approval Processor] Escalated ' + escalated + ' approvals');

      function escalateApproval(approval) {
        // Send reminder notification
        var email = new GlideEmailOutbound();
        email.setSubject('Reminder: Approval Pending - ' + approval.document_id.getDisplayValue());
        email.addAddress(approval.approver.email);
        email.setBody('You have a pending approval request that requires your attention.\n\n' +
                      'Document: ' + approval.document_id.getDisplayValue() + '\n' +
                      'Requested: ' + approval.sys_created_on.getDisplayValue());
        email.send();
      }
    active: true
    run_type: daily
    run_time: "09:00:00"
    conditional: true
    condition: |
      // Only run if there are stale approvals
      var staleThreshold = gs.hoursAgo(24);
      var gr = new GlideRecord('sysapproval_approver');
      gr.addQuery('state', 'requested');
      gr.addQuery('sys_created_on', '<', staleThreshold);
      gr.setLimit(1);
      gr.query();
      answer = gr.hasNext();
```

**Key Fields:**
- `conditional: true` - Enables condition checking
- `condition` - Script that sets `answer = true/false`

#### Step 2.2: Business Hours Only

Create a job that only runs during business hours.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: "Business Hours Queue Monitor"
    script: |
      // Monitor queue during business hours
      gs.info('[Queue Monitor] Checking queue status');

      var gr = new GlideRecord('x_custom_queue');
      gr.addQuery('state', 'pending');
      gr.addQuery('priority', 1);
      gr.query();

      if (gr.getRowCount() > 10) {
        // Alert on high queue depth
        gs.eventQueue('queue.high_depth', gr, gr.getRowCount());
      }
    active: true
    run_type: periodically
    run_period: 600000
    conditional: true
    condition: |
      // Only run between 8 AM and 6 PM, Monday-Friday
      var now = new GlideDateTime();
      var hour = parseInt(now.getLocalTime().getHourOfDayLocalTime());
      var dayOfWeek = now.getDayOfWeekLocalTime();

      // Monday=2, Friday=6 in GlideDateTime
      var isWeekday = dayOfWeek >= 2 && dayOfWeek <= 6;
      var isBusinessHours = hour >= 8 && hour < 18;

      answer = isWeekday && isBusinessHours;
```

### Phase 3: Performance Optimization

**CRITICAL:** Scheduled jobs must be optimized to avoid performance issues. The most common mistake is processing ALL records instead of filtering to only those needing work.

#### Step 3.1: Efficient Query Pattern

**BAD Pattern (Full Table Scan):**
```javascript
// DON'T DO THIS - Scans entire table every time
var gr = new GlideRecord('incident');
gr.query();
while (gr.next()) {
  if (gr.state == 1 && gr.priority == 1) {
    // Process
  }
}
```

**GOOD Pattern (Filtered Query):**
```javascript
// DO THIS - Only retrieves records needing processing
var gr = new GlideRecord('incident');
gr.addQuery('state', 1);           // New
gr.addQuery('priority', 1);         // P1
gr.addQuery('processed', false);    // Not yet processed
gr.setLimit(100);                   // Batch limit
gr.query();
while (gr.next()) {
  // Process
}
```

#### Step 3.2: Batch Processing Pattern

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: "Batch Data Processor"
    script: |
      // Efficient batch processing pattern
      var BATCH_SIZE = 100;
      var MAX_BATCHES = 10;
      var TABLE = 'incident';
      var QUERY = 'state=1^priority=1^u_needs_processing=true';

      gs.info('[Batch Processor] Starting');

      var totalProcessed = 0;
      var batchNum = 0;

      while (batchNum < MAX_BATCHES) {
        var gr = new GlideRecord(TABLE);
        gr.addEncodedQuery(QUERY);
        gr.setLimit(BATCH_SIZE);
        gr.query();

        if (!gr.hasNext()) {
          gs.info('[Batch Processor] No more records to process');
          break;
        }

        var batchProcessed = 0;
        while (gr.next()) {
          try {
            processRecord(gr);
            gr.u_needs_processing = false;
            gr.update();
            batchProcessed++;
            totalProcessed++;
          } catch (e) {
            gs.error('[Batch Processor] Error processing ' + gr.number + ': ' + e.message);
          }
        }

        gs.info('[Batch Processor] Batch ' + (batchNum + 1) + ' complete: ' + batchProcessed + ' records');
        batchNum++;
      }

      gs.info('[Batch Processor] Total processed: ' + totalProcessed);

      function processRecord(record) {
        // Your processing logic
      }
    active: true
    run_type: periodically
    run_period: 300000
```

#### Step 3.3: Use Aggregates for Counting

**BAD Pattern (Loads All Records):**
```javascript
var gr = new GlideRecord('incident');
gr.addQuery('active', true);
gr.query();
var count = gr.getRowCount();  // Loads all records first!
```

**GOOD Pattern (Uses Aggregate):**
```javascript
var ga = new GlideAggregate('incident');
ga.addQuery('active', true);
ga.addAggregate('COUNT');
ga.query();
var count = 0;
if (ga.next()) {
  count = parseInt(ga.getAggregate('COUNT'));
}
```

#### Step 3.4: Index-Aware Queries

Ensure your queries use indexed fields. Common indexed fields:

| Table | Indexed Fields |
|-------|---------------|
| `incident` | number, sys_id, active, state, priority, assigned_to, assignment_group |
| `task` | number, sys_id, active, state, assigned_to, assignment_group |
| `sys_user` | sys_id, user_name, email, active |
| `sys_user_group` | sys_id, name, active |

**Verify Indexes:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_index
  query: table=incident
  fields: name,columns,active
```

### Phase 4: Error Handling and Notifications

#### Step 4.1: Comprehensive Error Handling

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: "Robust Data Sync"
    script: |
      // Robust scheduled job with comprehensive error handling
      var JOB_NAME = 'Data Sync';
      var startTime = new GlideDateTime();
      var stats = {
        processed: 0,
        errors: 0,
        skipped: 0,
        errorDetails: []
      };

      gs.info('[' + JOB_NAME + '] Starting execution');

      try {
        // Main processing logic
        var gr = new GlideRecord('x_custom_sync_queue');
        gr.addQuery('state', 'pending');
        gr.setLimit(100);
        gr.query();

        while (gr.next()) {
          try {
            if (!validateRecord(gr)) {
              stats.skipped++;
              continue;
            }

            syncRecord(gr);
            gr.state = 'completed';
            gr.update();
            stats.processed++;

          } catch (recordError) {
            stats.errors++;
            stats.errorDetails.push({
              sys_id: gr.sys_id.toString(),
              error: recordError.message
            });

            gr.state = 'error';
            gr.error_message = recordError.message;
            gr.update();

            gs.error('[' + JOB_NAME + '] Record error: ' + gr.sys_id + ' - ' + recordError.message);
          }
        }

        // Success summary
        gs.info('[' + JOB_NAME + '] Summary: Processed=' + stats.processed +
                ', Errors=' + stats.errors + ', Skipped=' + stats.skipped);

      } catch (fatalError) {
        // Fatal error - entire job failed
        gs.error('[' + JOB_NAME + '] FATAL ERROR: ' + fatalError.message);
        gs.error('[' + JOB_NAME + '] Stack: ' + fatalError.stack);

        // Send alert notification
        sendAlertEmail(JOB_NAME, fatalError, stats);

      } finally {
        // Always log duration
        var endTime = new GlideDateTime();
        var duration = GlideDateTime.subtract(startTime, endTime).getNumericValue() / 1000;
        gs.info('[' + JOB_NAME + '] Duration: ' + duration + ' seconds');

        // Send error report if there were errors
        if (stats.errors > 0) {
          sendErrorReport(JOB_NAME, stats);
        }
      }

      function validateRecord(record) {
        return record.getValue('source_id') && record.getValue('target_table');
      }

      function syncRecord(record) {
        // Your sync logic here
      }

      function sendAlertEmail(jobName, error, stats) {
        var email = new GlideEmailOutbound();
        email.setSubject('[ALERT] Scheduled Job Failed: ' + jobName);
        email.setFrom('servicenow@company.com');
        email.addAddress('it-alerts@company.com');
        email.setBody('The scheduled job "' + jobName + '" has failed.\n\n' +
                      'Error: ' + error.message + '\n\n' +
                      'Stats at failure:\n' + JSON.stringify(stats, null, 2));
        email.send();
      }

      function sendErrorReport(jobName, stats) {
        var email = new GlideEmailOutbound();
        email.setSubject('[WARN] Scheduled Job Errors: ' + jobName);
        email.setFrom('servicenow@company.com');
        email.addAddress('it-reports@company.com');
        email.setBody('The scheduled job "' + jobName + '" completed with errors.\n\n' +
                      'Summary:\n' +
                      '- Processed: ' + stats.processed + '\n' +
                      '- Errors: ' + stats.errors + '\n' +
                      '- Skipped: ' + stats.skipped + '\n\n' +
                      'Error Details:\n' + JSON.stringify(stats.errorDetails, null, 2));
        email.send();
      }
    active: true
    run_type: periodically
    run_period: 900000
```

#### Step 4.2: Event-Based Notifications

Use ServiceNow events for notifications instead of direct email.

**Create Event Registration:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysevent_register
  data:
    event_name: "scheduled.job.failed"
    suffix: "alert"
    script_action: true
    description: "Scheduled job failure alert"
```

**Use in Script:**
```javascript
// In your scheduled job script
try {
  // Processing logic
} catch (e) {
  gs.eventQueue('scheduled.job.failed', null, JOB_NAME, e.message);
}
```

### Phase 5: Monitoring and Debugging

#### Step 5.1: Query Job Execution History

**Find Recent Executions:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: source=Scheduled Job^sys_created_on>javascript:gs.hoursAgo(24)
  fields: message,level,sys_created_on
  limit: 100
  orderByDesc: sys_created_on
```

**Find Specific Job Logs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: messageLIKE[Daily Incident Cleanup]^sys_created_on>javascript:gs.hoursAgo(24)
  fields: message,level,sys_created_on
  limit: 50
```

**Find Error Logs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: level=2^source=Scheduled Job^sys_created_on>javascript:gs.hoursAgo(24)
  fields: message,sys_created_on,source
  limit: 50
```

#### Step 5.2: Check Job Status

**List All Active Scheduled Jobs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysauto_script
  query: active=true
  fields: name,run_type,run_time,run_period,next_action,sys_updated_on
  limit: 100
```

**Check Specific Job:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysauto_script
  query: name=Daily Incident Cleanup
  fields: name,active,run_type,run_time,next_action,script
```

#### Step 5.3: Debug Running Jobs

**Check System Triggers:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_trigger
  query: next_action>javascript:gs.nowDateTime()^state=0
  fields: name,next_action,trigger_type,state
  limit: 50
```

**Check for Stuck Jobs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_trigger
  query: state=1^sys_updated_on<javascript:gs.hoursAgo(1)
  fields: name,state,started_at,sys_updated_on
```

### Phase 6: On-Demand Execution

#### Step 6.1: Execute Job Immediately

**Using SN-Execute-Background-Script:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Execute scheduled job on demand
    var job = new GlideRecord('sysauto_script');
    job.addQuery('name', 'Daily Incident Cleanup');
    job.query();
    if (job.next()) {
      var sched = new ScheduleOnce();
      sched.script = job.script;
      sched.setName('Manual Run: ' + job.name);
      sched.schedule();
      gs.info('Job scheduled for immediate execution: ' + job.name);
    }
  description: Trigger scheduled job manually
```

#### Step 6.2: Create One-Time Trigger

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_trigger
  data:
    name: "One-Time Data Migration"
    script: |
      gs.info('[Migration] Starting one-time migration');
      // Your migration logic here
      gs.info('[Migration] Complete');
    next_action: 2026-02-06 14:00:00
    trigger_type: 0
    state: 0
```

**Trigger Type Values:**
| Value | Description |
|-------|-------------|
| 0 | Run once |
| 1 | Run periodically |
| 2 | On event |

### Phase 7: Advanced Patterns

#### Step 7.1: Self-Scheduling Pattern

For very long-running operations, chain multiple executions.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: "Large Data Migration"
    script: |
      // Self-scheduling pattern for large operations
      var RECORDS_PER_RUN = 1000;
      var PROPERTY_NAME = 'x_custom.migration.last_id';

      var lastId = gs.getProperty(PROPERTY_NAME, '');

      gs.info('[Migration] Starting from: ' + (lastId || 'beginning'));

      var gr = new GlideRecord('x_custom_source');
      if (lastId) {
        gr.addQuery('sys_id', '>', lastId);
      }
      gr.orderBy('sys_id');
      gr.setLimit(RECORDS_PER_RUN);
      gr.query();

      var processed = 0;
      var newLastId = '';

      while (gr.next()) {
        migrateRecord(gr);
        processed++;
        newLastId = gr.sys_id.toString();
      }

      if (processed > 0) {
        gs.setProperty(PROPERTY_NAME, newLastId);
        gs.info('[Migration] Processed ' + processed + ' records. Last ID: ' + newLastId);

        // Check if more records exist
        var remaining = new GlideAggregate('x_custom_source');
        remaining.addQuery('sys_id', '>', newLastId);
        remaining.addAggregate('COUNT');
        remaining.query();
        if (remaining.next()) {
          var count = parseInt(remaining.getAggregate('COUNT'));
          gs.info('[Migration] ' + count + ' records remaining');

          if (count > 0) {
            // Schedule next run immediately
            scheduleNextRun();
          }
        }
      } else {
        gs.info('[Migration] Complete! No more records to process.');
        gs.setProperty(PROPERTY_NAME, '');  // Reset for future runs
      }

      function migrateRecord(record) {
        // Migration logic
      }

      function scheduleNextRun() {
        var trigger = new GlideRecord('sys_trigger');
        trigger.initialize();
        trigger.name = 'Migration Continuation - ' + gs.nowDateTime();
        trigger.script = 'gs.include("MigrationScheduler");';
        trigger.trigger_type = 0;
        trigger.state = 0;
        var nextAction = new GlideDateTime();
        nextAction.addSeconds(10);
        trigger.next_action = nextAction;
        trigger.insert();
        gs.info('[Migration] Scheduled next run in 10 seconds');
      }
    active: false
    run_type: on_demand
```

#### Step 7.2: Dependency Chain Pattern

Create jobs that depend on other jobs completing.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: "Job Chain - Step 1: Extract"
    script: |
      // Step 1: Extract data
      gs.info('[Extract] Starting data extraction');

      // Your extraction logic
      var extractedData = [];
      // ... populate extractedData

      // Store in temp table for next step
      var temp = new GlideRecord('x_custom_job_data');
      temp.initialize();
      temp.job_name = 'DataSync';
      temp.step = 'extract';
      temp.data = JSON.stringify(extractedData);
      temp.status = 'completed';
      temp.insert();

      // Trigger next step
      var trigger = new GlideRecord('sys_trigger');
      trigger.initialize();
      trigger.name = 'Job Chain - Step 2: Transform';
      trigger.script = 'new x_custom.JobChain().runStep2();';
      trigger.trigger_type = 0;
      trigger.state = 0;
      var nextAction = new GlideDateTime();
      nextAction.addSeconds(5);
      trigger.next_action = nextAction;
      trigger.insert();

      gs.info('[Extract] Complete. Triggered Step 2.');
    active: true
    run_type: daily
    run_time: "01:00:00"
```

#### Step 7.3: Distributed Processing Pattern

Split large workloads across multiple scheduled triggers.

```javascript
// Main job that distributes work
var WORKERS = 5;
var TABLE = 'incident';
var QUERY = 'active=true^needs_processing=true';

// Count total records
var ga = new GlideAggregate(TABLE);
ga.addEncodedQuery(QUERY);
ga.addAggregate('COUNT');
ga.query();
var totalRecords = 0;
if (ga.next()) {
  totalRecords = parseInt(ga.getAggregate('COUNT'));
}

if (totalRecords == 0) {
  gs.info('[Distributor] No records to process');
  return;
}

var batchSize = Math.ceil(totalRecords / WORKERS);
gs.info('[Distributor] Distributing ' + totalRecords + ' records across ' + WORKERS + ' workers');

// Create worker triggers
for (var i = 0; i < WORKERS; i++) {
  var trigger = new GlideRecord('sys_trigger');
  trigger.initialize();
  trigger.name = 'Worker ' + (i + 1) + ' of ' + WORKERS;
  trigger.script = 'processWorkerBatch(' + i + ', ' + batchSize + ');';
  trigger.trigger_type = 0;
  trigger.state = 0;
  trigger.next_action = gs.nowDateTime();
  trigger.insert();
}
```

## Script Templates

### Template 1: Standard Cleanup Job

```javascript
// Standard cleanup job template
var JOB_NAME = 'Data Cleanup';
var TABLE = 'your_table';
var QUERY = 'active=false^sys_updated_on<javascript:gs.daysAgo(90)';
var BATCH_SIZE = 500;
var DRY_RUN = true;  // Set to false to actually delete

gs.info('[' + JOB_NAME + '] Starting');

var deleted = 0;
var gr = new GlideRecord(TABLE);
gr.addEncodedQuery(QUERY);
gr.setLimit(BATCH_SIZE);
gr.query();

while (gr.next()) {
  if (DRY_RUN) {
    gs.info('[' + JOB_NAME + '] [DRY RUN] Would delete: ' + gr.sys_id);
  } else {
    gr.deleteRecord();
  }
  deleted++;
}

gs.info('[' + JOB_NAME + '] ' + (DRY_RUN ? '[DRY RUN] ' : '') + 'Deleted ' + deleted + ' records');
```

### Template 2: Notification Job

```javascript
// Notification job template
var JOB_NAME = 'Overdue Task Reminder';
var TABLE = 'task';
var QUERY = 'active=true^due_date<javascript:gs.nowDateTime()^state!=3';

gs.info('[' + JOB_NAME + '] Starting');

var notified = 0;
var gr = new GlideRecord(TABLE);
gr.addEncodedQuery(QUERY);
gr.query();

while (gr.next()) {
  if (gr.assigned_to.email) {
    var email = new GlideEmailOutbound();
    email.setSubject('Overdue Task: ' + gr.number);
    email.setFrom('servicenow@company.com');
    email.addAddress(gr.assigned_to.email);
    email.setBody('Your task ' + gr.number + ' is overdue.\n\n' +
                  'Description: ' + gr.short_description + '\n' +
                  'Due Date: ' + gr.due_date.getDisplayValue());
    email.send();
    notified++;
  }
}

gs.info('[' + JOB_NAME + '] Sent ' + notified + ' notifications');
```

### Template 3: Data Sync Job

```javascript
// Data sync job template
var JOB_NAME = 'External System Sync';
var SOURCE_TABLE = 'x_custom_staging';
var TARGET_TABLE = 'cmdb_ci_server';
var BATCH_SIZE = 100;

var stats = { created: 0, updated: 0, errors: 0 };

gs.info('[' + JOB_NAME + '] Starting sync');

var gr = new GlideRecord(SOURCE_TABLE);
gr.addQuery('sync_status', 'pending');
gr.setLimit(BATCH_SIZE);
gr.query();

while (gr.next()) {
  try {
    var target = new GlideRecord(TARGET_TABLE);
    target.addQuery('serial_number', gr.serial_number);
    target.query();

    if (target.next()) {
      // Update existing
      updateRecord(target, gr);
      target.update();
      stats.updated++;
    } else {
      // Create new
      target.initialize();
      updateRecord(target, gr);
      target.insert();
      stats.created++;
    }

    gr.sync_status = 'completed';
    gr.sync_date = gs.nowDateTime();
    gr.update();

  } catch (e) {
    gr.sync_status = 'error';
    gr.sync_error = e.message;
    gr.update();
    stats.errors++;
    gs.error('[' + JOB_NAME + '] Error: ' + e.message);
  }
}

gs.info('[' + JOB_NAME + '] Summary: Created=' + stats.created +
        ', Updated=' + stats.updated + ', Errors=' + stats.errors);

function updateRecord(target, source) {
  target.name = source.hostname;
  target.serial_number = source.serial_number;
  target.ip_address = source.ip_address;
  // Add more field mappings
}
```

### Template 4: Audit Job

```javascript
// Audit job template
var JOB_NAME = 'Security Audit';
var AUDIT_RESULTS = [];

gs.info('[' + JOB_NAME + '] Starting audit');

// Audit 1: Users with admin role but no MFA
var gr = new GlideRecord('sys_user_has_role');
gr.addQuery('role.name', 'admin');
gr.addQuery('user.active', true);
gr.addQuery('user.two_factor_auth', false);
gr.query();

while (gr.next()) {
  AUDIT_RESULTS.push({
    type: 'admin_no_mfa',
    user: gr.user.user_name.toString(),
    severity: 'high'
  });
}

// Audit 2: Service accounts with interactive login
var serviceAccounts = new GlideRecord('sys_user');
serviceAccounts.addQuery('user_name', 'CONTAINS', 'svc_');
serviceAccounts.addQuery('locked_out', false);
serviceAccounts.addQuery('web_service_access_only', false);
serviceAccounts.query();

while (serviceAccounts.next()) {
  AUDIT_RESULTS.push({
    type: 'svc_interactive_login',
    user: serviceAccounts.user_name.toString(),
    severity: 'medium'
  });
}

// Log results
gs.info('[' + JOB_NAME + '] Found ' + AUDIT_RESULTS.length + ' findings');

// Store audit results
if (AUDIT_RESULTS.length > 0) {
  var auditRecord = new GlideRecord('x_custom_audit_log');
  auditRecord.initialize();
  auditRecord.audit_type = JOB_NAME;
  auditRecord.findings = JSON.stringify(AUDIT_RESULTS);
  auditRecord.finding_count = AUDIT_RESULTS.length;
  auditRecord.insert();
}
```

## Tool Usage Summary

| Operation | MCP Tool | Purpose |
|-----------|----------|---------|
| Create job | SN-Create-Record | Create sysauto_script record |
| Update job | SN-Update-Record | Modify job settings |
| Query jobs | SN-Query-Table | List and check job status |
| View logs | SN-Query-Table | Query syslog for execution history |
| Execute now | SN-Execute-Background-Script | Run job logic immediately |
| Get schema | SN-Get-Table-Schema | Understand table structure |

## Best Practices

- **Filter First:** Always filter to records needing processing - never scan entire tables
- **Set Limits:** Use setLimit() to process in batches and prevent timeout
- **Index Awareness:** Query on indexed fields for performance
- **Error Handling:** Wrap all logic in try-catch with proper logging
- **Dry Run Mode:** Test with DRY_RUN = true before production execution
- **Log Extensively:** Use structured logging with job name prefix
- **Monitor Duration:** Log execution time to identify slow jobs
- **Off-Peak Scheduling:** Run intensive jobs during off-peak hours (2-5 AM)
- **Conditional Execution:** Use conditions to skip unnecessary runs
- **Notification on Failure:** Always send alerts when jobs fail

## Troubleshooting

### Job Not Running

**Symptom:** Scheduled job doesn't execute at expected time
**Causes:**
- `active: false` on job
- Invalid run_time format
- Condition script returns false
- ServiceNow scheduler service stopped

**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysauto_script
  query: name=Your Job Name
  fields: active,run_type,run_time,next_action,conditional,condition
```

### Job Timeout

**Symptom:** Job fails with timeout error
**Causes:**
- Processing too many records
- Inefficient queries
- No batch limiting

**Solution:**
- Add setLimit() to queries
- Use batch processing pattern
- Filter queries to indexed fields
- Break into multiple smaller jobs

### No Logs Appearing

**Symptom:** Job runs but no gs.info() output visible
**Causes:**
- Log level filtering
- Looking in wrong time range
- Script error before logging

**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: sys_created_on>javascript:gs.minutesAgo(30)^sourceLIKEScheduled
  fields: message,level,source,sys_created_on
  limit: 100
```

### Job Runs Too Frequently

**Symptom:** Periodic job runs more often than expected
**Causes:**
- run_period in wrong units (milliseconds, not seconds!)
- Multiple active versions of same job

**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysauto_script
  query: nameLIKEYour Job
  fields: name,active,run_period
```

### Conditional Job Never Runs

**Symptom:** Conditional job skipped every time
**Causes:**
- Condition script error
- Condition always evaluates to false
- `answer` variable not set

**Solution:**
Test condition script directly:
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Test your condition
    var gr = new GlideRecord('your_table');
    gr.addQuery('your_query');
    gr.setLimit(1);
    gr.query();
    var answer = gr.hasNext();
    gs.info('Condition result: ' + answer);
```

## Examples

### Example 1: Complete Cleanup Job

```
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: "Cleanup Old Attachments"
    script: |
      var JOB_NAME = 'Attachment Cleanup';
      var DAYS_OLD = 365;
      var BATCH_SIZE = 100;

      gs.info('[' + JOB_NAME + '] Starting');

      var cutoff = gs.daysAgo(DAYS_OLD);
      var deleted = 0;

      var gr = new GlideRecord('sys_attachment');
      gr.addQuery('sys_created_on', '<', cutoff);
      gr.addQuery('table_name', 'NOT IN', 'kb_knowledge,sys_user');
      gr.setLimit(BATCH_SIZE);
      gr.query();

      while (gr.next()) {
        gr.deleteRecord();
        deleted++;
      }

      gs.info('[' + JOB_NAME + '] Deleted ' + deleted + ' attachments');
    active: true
    run_type: weekly
    run_time: "03:00:00"
    run_dayofweek: 7
```

### Example 2: Integration Job with Retry

```
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: "External API Sync"
    script: |
      var JOB_NAME = 'API Sync';
      var MAX_RETRIES = 3;
      var BATCH_SIZE = 50;

      gs.info('[' + JOB_NAME + '] Starting');

      var gr = new GlideRecord('x_custom_api_queue');
      gr.addQuery('status', 'pending');
      gr.addQuery('retry_count', '<', MAX_RETRIES);
      gr.orderBy('priority');
      gr.setLimit(BATCH_SIZE);
      gr.query();

      var stats = { success: 0, retry: 0, failed: 0 };

      while (gr.next()) {
        try {
          var result = callExternalAPI(gr);
          gr.status = 'completed';
          gr.response_data = result;
          stats.success++;
        } catch (e) {
          gr.retry_count++;
          gr.last_error = e.message;

          if (gr.retry_count >= MAX_RETRIES) {
            gr.status = 'failed';
            stats.failed++;
          } else {
            gr.status = 'pending';
            stats.retry++;
          }
        }
        gr.update();
      }

      gs.info('[' + JOB_NAME + '] Results: ' + JSON.stringify(stats));

      function callExternalAPI(record) {
        var rest = new sn_ws.RESTMessageV2();
        rest.setEndpoint('https://api.example.com/sync');
        rest.setHttpMethod('POST');
        rest.setRequestBody(JSON.stringify({
          id: record.external_id.toString(),
          data: record.payload.toString()
        }));
        var response = rest.execute();
        if (response.getStatusCode() != 200) {
          throw new Error('API error: ' + response.getStatusCode());
        }
        return response.getBody();
      }
    active: true
    run_type: periodically
    run_period: 300000
```

## Related Skills

- `admin/script-execution` - Background script patterns
- `admin/batch-operations` - Bulk record operations
- `admin/update-set-management` - Capture jobs in update sets
- `itsm/incident-lifecycle` - Incident automation

## References

- [ServiceNow Scheduled Jobs](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/platform-administration/concept/c_ScheduledJobs.html)
- [GlideRecord API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideRecordScopedAPI)
- [GlideAggregate API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideAggregateScopedAPI)
- [System Logs](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/reference-pages/concept/c_SystemLogs.html)
