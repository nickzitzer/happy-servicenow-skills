---
name: batch-operations
version: 1.0.0
description: Efficient bulk operations for mass record creation, updates with relationships, performance optimization, and error handling in batch processing
author: Happy Technologies LLC
tags: [admin, batch, bulk, performance, optimization, mass-update, data-migration]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Batch-Create
    - SN-Batch-Update
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/{table_name}
    - /api/now/import/{table_name}
  native:
    - Bash
    - Read
complexity: advanced
estimated_time: 20-60 minutes
---

# Batch Operations

## Overview

This skill covers efficient techniques for bulk operations in ServiceNow:

- Mass record creation with proper relationships
- Bulk updates with validation and error handling
- Performance considerations for large datasets
- Transaction management and rollback strategies
- Parallel processing patterns

**When to use:** When creating or updating many records at once, data migrations, bulk imports, or mass data corrections.

**Who should use this:** Administrators, developers, and data migration specialists.

## Prerequisites

- **Roles:** `admin` or table-specific write permissions
- **Access:** Target tables and related reference tables
- **Knowledge:** GlideRecord API, table relationships, ServiceNow data model
- **Environment:** Test in sub-production first for large operations

## Performance Guidelines

### Record Volume Recommendations

| Volume | Method | Estimated Time |
|--------|--------|----------------|
| 1-10 | Parallel MCP calls | < 5 seconds |
| 10-100 | SN-Batch-Create/Update | 5-30 seconds |
| 100-1,000 | Background script batches | 1-5 minutes |
| 1,000-10,000 | Scheduled job with batching | 10-60 minutes |
| 10,000+ | Import sets or data pump | Hours |

### MCP Parallel Processing

**Tested and Verified:** 43+ parallel MCP calls successful in single message.

```
Parallel MCP calls are preferred for:
- Independent record operations
- Different tables
- No interdependencies
- Maximum throughput
```

## Procedure

### Phase 1: Mass Record Creation

#### Step 1.1: Simple Batch Create

Create multiple records in a single operation.

**Using MCP:**
```
Tool: SN-Batch-Create
Parameters:
  records:
    - table_name: incident
      data:
        short_description: "Server down - Web01"
        caller_id: [user_sys_id]
        category: hardware
        priority: 1
    - table_name: incident
      data:
        short_description: "Server down - Web02"
        caller_id: [user_sys_id]
        category: hardware
        priority: 1
    - table_name: incident
      data:
        short_description: "Server down - Web03"
        caller_id: [user_sys_id]
        category: hardware
        priority: 1
```

**Response:**
```json
{
  "success": true,
  "created": [
    { "table": "incident", "sys_id": "abc123...", "number": "INC0010001" },
    { "table": "incident", "sys_id": "def456...", "number": "INC0010002" },
    { "table": "incident", "sys_id": "ghi789...", "number": "INC0010003" }
  ],
  "errors": []
}
```

#### Step 1.2: Parallel MCP Calls

For maximum throughput, use parallel MCP calls in a single message.

**Parallel Incident Creation (10 records):**
```
# Call 1:
Tool: SN-Create-Record
Parameters:
  table_name: incident
  data:
    short_description: "Batch test 1"
    category: inquiry

# Call 2:
Tool: SN-Create-Record
Parameters:
  table_name: incident
  data:
    short_description: "Batch test 2"
    category: inquiry

# Call 3-10: Continue pattern...
```

All calls execute simultaneously - no waiting between operations.

#### Step 1.3: Create with Relationships

Create parent and child records maintaining relationships.

**Using MCP (Sequential for Dependencies):**
```
# Step 1: Create parent record
Tool: SN-Create-Record
Parameters:
  table_name: change_request
  data:
    short_description: "Server Infrastructure Upgrade"
    category: hardware
    type: standard

# Step 2: Create child tasks (use parent sys_id from step 1)
Tool: SN-Batch-Create
Parameters:
  records:
    - table_name: change_task
      data:
        parent: [change_request_sys_id]
        short_description: "Backup existing configuration"
        change_task_type: planning
        order: 100
    - table_name: change_task
      data:
        parent: [change_request_sys_id]
        short_description: "Install new hardware"
        change_task_type: implementation
        order: 200
    - table_name: change_task
      data:
        parent: [change_request_sys_id]
        short_description: "Verify functionality"
        change_task_type: testing
        order: 300
```

#### Step 1.4: Background Script for Complex Creation

For complex logic or very large batches:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Batch creation with relationships
    var projectData = [
      {
        name: 'Project Alpha',
        tasks: [
          { name: 'Task A1', order: 1 },
          { name: 'Task A2', order: 2 },
          { name: 'Task A3', order: 3 }
        ]
      },
      {
        name: 'Project Beta',
        tasks: [
          { name: 'Task B1', order: 1 },
          { name: 'Task B2', order: 2 }
        ]
      }
    ];

    var created = { projects: 0, tasks: 0 };

    projectData.forEach(function(project) {
      // Create project
      var prj = new GlideRecord('pm_project');
      prj.initialize();
      prj.short_description = project.name;
      var prjId = prj.insert();
      created.projects++;

      // Create tasks
      project.tasks.forEach(function(task) {
        var tsk = new GlideRecord('pm_project_task');
        tsk.initialize();
        tsk.parent = prjId;
        tsk.short_description = task.name;
        tsk.order = task.order;
        tsk.insert();
        created.tasks++;
      });

      gs.info('Created project: ' + project.name + ' with ' + project.tasks.length + ' tasks');
    });

    gs.info('Summary: ' + JSON.stringify(created));
  description: Batch create projects with tasks
```

### Phase 2: Bulk Updates

#### Step 2.1: Simple Batch Update

Update multiple records by sys_id.

**Using MCP:**
```
Tool: SN-Batch-Update
Parameters:
  updates:
    - table_name: incident
      sys_id: [incident1_sys_id]
      data:
        priority: 2
        state: 2
        work_notes: "Escalated per management request"
    - table_name: incident
      sys_id: [incident2_sys_id]
      data:
        priority: 2
        state: 2
        work_notes: "Escalated per management request"
    - table_name: incident
      sys_id: [incident3_sys_id]
      data:
        priority: 2
        state: 2
        work_notes: "Escalated per management request"
```

#### Step 2.2: Query-Based Bulk Update

Update all records matching a query.

**Using Background Script:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Query-based bulk update
    var TABLE = 'incident';
    var QUERY = 'active=true^category=inquiry^priority=5';
    var UPDATES = {
      priority: 4,
      work_notes: 'Priority adjusted per SLA review'
    };
    var MAX_UPDATES = 1000;
    var DRY_RUN = true;

    var gr = new GlideRecord(TABLE);
    gr.addEncodedQuery(QUERY);
    gr.setLimit(MAX_UPDATES);
    gr.query();

    gs.info('Found ' + gr.getRowCount() + ' records matching query');

    var updated = 0;
    var errors = 0;

    while (gr.next()) {
      try {
        if (DRY_RUN) {
          gs.info('[DRY RUN] Would update: ' + gr.number);
        } else {
          for (var field in UPDATES) {
            gr[field] = UPDATES[field];
          }
          gr.update();
          updated++;
        }
      } catch (e) {
        errors++;
        gs.error('Error updating ' + gr.number + ': ' + e.message);
      }
    }

    gs.info('Complete: Updated=' + updated + ', Errors=' + errors + ', DryRun=' + DRY_RUN);
  description: Bulk update incidents by query
```

#### Step 2.3: Conditional Updates

Apply different updates based on record conditions.

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Conditional bulk updates
    var gr = new GlideRecord('incident');
    gr.addQuery('active', true);
    gr.addQuery('priority', 'IN', '1,2');
    gr.setLimit(500);
    gr.query();

    var stats = { p1_updates: 0, p2_updates: 0 };

    while (gr.next()) {
      if (gr.priority == 1) {
        // P1 gets immediate attention
        if (gr.assigned_to.nil()) {
          gr.assignment_group = 'Critical Response Team';
          gr.work_notes = 'Auto-assigned to Critical Response Team';
          gr.update();
          stats.p1_updates++;
        }
      } else if (gr.priority == 2) {
        // P2 gets SLA check
        var age = GlideDateTime.subtract(new GlideDateTime(gr.sys_created_on), new GlideDateTime()).getDayPart();
        if (age > 2 && gr.state == 1) {
          gr.escalation = 1;
          gr.work_notes = 'Auto-escalated: P2 older than 2 days without progress';
          gr.update();
          stats.p2_updates++;
        }
      }
    }

    gs.info('Conditional updates complete: ' + JSON.stringify(stats));
  description: Apply conditional updates based on priority
```

### Phase 3: Performance Optimization

#### Step 3.1: Batch Processing Pattern

Process large datasets in manageable batches.

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Optimized batch processing
    var CONFIG = {
      table: 'incident',
      query: 'active=true',
      batchSize: 200,
      maxBatches: 50,
      pauseBetweenBatches: false  // true adds 100ms delay
    };

    var totalProcessed = 0;
    var batchNum = 0;
    var startTime = new GlideDateTime();

    while (batchNum < CONFIG.maxBatches) {
      var gr = new GlideRecord(CONFIG.table);
      gr.addEncodedQuery(CONFIG.query);
      gr.orderBy('sys_created_on');
      gr.chooseWindow(batchNum * CONFIG.batchSize, (batchNum + 1) * CONFIG.batchSize);
      gr.query();

      if (!gr.hasNext()) {
        break;
      }

      var batchProcessed = 0;
      while (gr.next()) {
        // Process record (minimal operations for speed)
        batchProcessed++;
      }

      totalProcessed += batchProcessed;
      batchNum++;

      // Progress logging every 10 batches
      if (batchNum % 10 === 0) {
        gs.info('Progress: Batch ' + batchNum + ', Total processed: ' + totalProcessed);
      }

      // Optional pause to reduce system load
      if (CONFIG.pauseBetweenBatches) {
        gs.sleep(100);
      }
    }

    var endTime = new GlideDateTime();
    var duration = GlideDateTime.subtract(startTime, endTime).getNumericValue() / 1000;
    var rate = totalProcessed / duration;

    gs.info('Complete: ' + totalProcessed + ' records in ' + duration.toFixed(2) + ' seconds (' + rate.toFixed(0) + ' records/sec)');
  description: Optimized batch processing with metrics
```

#### Step 3.2: Optimize Queries

Use efficient query patterns for bulk operations.

**Use GlideAggregate for Counts:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Efficient counting with GlideAggregate
    var ga = new GlideAggregate('incident');
    ga.addQuery('active', true);
    ga.addAggregate('COUNT');
    ga.groupBy('priority');
    ga.query();

    var results = [];
    while (ga.next()) {
      results.push({
        priority: ga.priority.getDisplayValue(),
        count: parseInt(ga.getAggregate('COUNT'))
      });
    }

    gs.info('Priority Distribution:\n' + JSON.stringify(results, null, 2));
  description: Count incidents by priority efficiently
```

**Use setWorkflow(false) for Bulk Updates:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Disable business rules for bulk operations
    var gr = new GlideRecord('incident');
    gr.addQuery('state', 7);  // Closed
    gr.addQuery('sys_updated_on', '<', gs.daysAgo(365));
    gr.setLimit(1000);
    gr.query();

    // Disable workflows/business rules
    gr.setWorkflow(false);

    var count = 0;
    while (gr.next()) {
      gr.archived = true;
      gr.update();
      count++;
    }

    gs.info('Archived ' + count + ' old closed incidents (business rules disabled)');
  description: Bulk archive with business rules disabled
```

**Warning:** Only disable workflows when you fully understand the implications.

#### Step 3.3: Memory Optimization

Prevent memory issues with large datasets.

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Memory-efficient processing
    var BATCH_SIZE = 100;
    var offset = 0;
    var totalProcessed = 0;
    var hasMore = true;

    while (hasMore) {
      // Use GlideRecord with window to avoid loading all records
      var gr = new GlideRecord('cmdb_ci');
      gr.addQuery('operational_status', 1);
      gr.orderBy('sys_id');  // Consistent ordering
      gr.chooseWindow(offset, offset + BATCH_SIZE);
      gr.query();

      if (gr.getRowCount() === 0) {
        hasMore = false;
        break;
      }

      while (gr.next()) {
        // Process record - avoid storing in arrays
        // Direct operations only
        totalProcessed++;
      }

      offset += BATCH_SIZE;

      // Check if we got fewer than batch size (last batch)
      if (gr.getRowCount() < BATCH_SIZE) {
        hasMore = false;
      }
    }

    gs.info('Processed ' + totalProcessed + ' CI records');
  description: Memory-efficient CI processing
```

### Phase 4: Error Handling

#### Step 4.1: Individual Record Error Handling

Track successes and failures separately.

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Comprehensive error tracking
    var results = {
      success: [],
      errors: [],
      skipped: []
    };

    var gr = new GlideRecord('incident');
    gr.addQuery('active', true);
    gr.setLimit(100);
    gr.query();

    while (gr.next()) {
      try {
        // Validation
        if (gr.short_description.nil()) {
          results.skipped.push({
            number: gr.number.toString(),
            reason: 'Missing short description'
          });
          continue;
        }

        // Attempt update
        gr.work_notes = 'Batch processed on ' + new GlideDateTime().getDisplayValue();
        gr.update();

        results.success.push({
          number: gr.number.toString(),
          sys_id: gr.sys_id.toString()
        });

      } catch (e) {
        results.errors.push({
          number: gr.number.toString(),
          error: e.message
        });
      }
    }

    gs.info('Results Summary:');
    gs.info('  Success: ' + results.success.length);
    gs.info('  Errors: ' + results.errors.length);
    gs.info('  Skipped: ' + results.skipped.length);

    if (results.errors.length > 0) {
      gs.error('Errors:\n' + JSON.stringify(results.errors, null, 2));
    }

    if (results.skipped.length > 0) {
      gs.warn('Skipped:\n' + JSON.stringify(results.skipped, null, 2));
    }
  description: Batch update with comprehensive error tracking
```

#### Step 4.2: Retry Pattern

Implement retry logic for transient failures.

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Retry pattern for batch operations
    var MAX_RETRIES = 3;
    var RETRY_DELAY = 1000;  // milliseconds

    function updateWithRetry(tableName, sysId, data) {
      var attempts = 0;
      var lastError = null;

      while (attempts < MAX_RETRIES) {
        attempts++;
        try {
          var gr = new GlideRecord(tableName);
          if (gr.get(sysId)) {
            for (var field in data) {
              gr[field] = data[field];
            }
            gr.update();
            return { success: true, attempts: attempts };
          } else {
            return { success: false, error: 'Record not found', attempts: attempts };
          }
        } catch (e) {
          lastError = e.message;
          gs.warn('Attempt ' + attempts + ' failed: ' + e.message);
          if (attempts < MAX_RETRIES) {
            gs.sleep(RETRY_DELAY * attempts);  // Exponential backoff
          }
        }
      }

      return { success: false, error: lastError, attempts: attempts };
    }

    // Example usage
    var recordsToUpdate = [
      { sys_id: '[sys_id_1]', data: { state: 2 } },
      { sys_id: '[sys_id_2]', data: { state: 2 } }
    ];

    var results = [];
    recordsToUpdate.forEach(function(record) {
      var result = updateWithRetry('incident', record.sys_id, record.data);
      result.sys_id = record.sys_id;
      results.push(result);
    });

    gs.info('Update Results:\n' + JSON.stringify(results, null, 2));
  description: Batch update with retry logic
```

#### Step 4.3: Transaction Rollback

Implement rollback for failed batch operations.

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Batch operation with rollback capability
    var operations = [];  // Track for potential rollback
    var allSuccess = true;

    try {
      // Operation 1
      var inc1 = new GlideRecord('incident');
      inc1.get('[incident_1_sys_id]');
      var oldState1 = inc1.state.toString();
      inc1.state = 6;
      inc1.update();
      operations.push({ table: 'incident', sys_id: inc1.sys_id.toString(), field: 'state', oldValue: oldState1 });

      // Operation 2
      var inc2 = new GlideRecord('incident');
      inc2.get('[incident_2_sys_id]');
      var oldState2 = inc2.state.toString();
      inc2.state = 6;
      inc2.update();
      operations.push({ table: 'incident', sys_id: inc2.sys_id.toString(), field: 'state', oldValue: oldState2 });

      // Operation 3 (simulated failure)
      // throw new Error('Simulated failure for testing rollback');

      gs.info('All ' + operations.length + ' operations completed successfully');

    } catch (e) {
      allSuccess = false;
      gs.error('Error occurred: ' + e.message);
      gs.info('Rolling back ' + operations.length + ' operations...');

      // Rollback in reverse order
      for (var i = operations.length - 1; i >= 0; i--) {
        var op = operations[i];
        try {
          var rollback = new GlideRecord(op.table);
          if (rollback.get(op.sys_id)) {
            rollback[op.field] = op.oldValue;
            rollback.setWorkflow(false);  // Avoid triggering additional logic
            rollback.update();
            gs.info('Rolled back: ' + op.table + ' ' + op.sys_id);
          }
        } catch (rollbackError) {
          gs.error('Rollback failed for ' + op.sys_id + ': ' + rollbackError.message);
        }
      }

      gs.info('Rollback complete');
    }
  description: Batch operation with transaction-like rollback
```

### Phase 5: Data Migration Patterns

#### Step 5.1: Table-to-Table Migration

Migrate data between tables with transformation.

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Table-to-table migration
    var SOURCE_TABLE = 'x_old_app_requests';
    var TARGET_TABLE = 'sc_request';
    var BATCH_SIZE = 100;

    var fieldMapping = {
      'old_number': 'number',
      'old_description': 'description',
      'requestor': 'requested_for',
      'submit_date': 'opened_at'
    };

    var migrated = 0;
    var errors = 0;

    var source = new GlideRecord(SOURCE_TABLE);
    source.addQuery('migrated', false);
    source.setLimit(BATCH_SIZE);
    source.query();

    while (source.next()) {
      try {
        var target = new GlideRecord(TARGET_TABLE);
        target.initialize();

        // Apply field mapping
        for (var oldField in fieldMapping) {
          var newField = fieldMapping[oldField];
          target[newField] = source[oldField];
        }

        // Transform values
        target.state = mapState(source.old_state);
        target.priority = mapPriority(source.old_priority);

        var newSysId = target.insert();

        // Mark source as migrated
        source.migrated = true;
        source.migrated_to = newSysId;
        source.update();

        migrated++;

      } catch (e) {
        errors++;
        gs.error('Error migrating ' + source.old_number + ': ' + e.message);
      }
    }

    gs.info('Migration complete: ' + migrated + ' migrated, ' + errors + ' errors');

    function mapState(oldState) {
      var stateMap = { 'open': 1, 'in_progress': 2, 'closed': 3 };
      return stateMap[oldState] || 1;
    }

    function mapPriority(oldPriority) {
      var priorityMap = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4 };
      return priorityMap[oldPriority] || 4;
    }
  description: Table-to-table data migration with transformation
```

#### Step 5.2: External Data Import

Import data from external source (JSON array).

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // External data import pattern
    var importData = [
      { email: 'user1@company.com', first_name: 'John', last_name: 'Doe', department: 'IT' },
      { email: 'user2@company.com', first_name: 'Jane', last_name: 'Smith', department: 'HR' },
      { email: 'user3@company.com', first_name: 'Bob', last_name: 'Wilson', department: 'Finance' }
    ];

    var results = { created: 0, updated: 0, errors: 0 };

    importData.forEach(function(data) {
      try {
        // Check for existing record
        var existing = new GlideRecord('sys_user');
        existing.addQuery('email', data.email);
        existing.query();

        if (existing.next()) {
          // Update existing
          existing.first_name = data.first_name;
          existing.last_name = data.last_name;
          existing.department = lookupDepartment(data.department);
          existing.update();
          results.updated++;
          gs.info('Updated user: ' + data.email);
        } else {
          // Create new
          var newUser = new GlideRecord('sys_user');
          newUser.initialize();
          newUser.email = data.email;
          newUser.user_name = data.email.split('@')[0];
          newUser.first_name = data.first_name;
          newUser.last_name = data.last_name;
          newUser.department = lookupDepartment(data.department);
          newUser.active = true;
          newUser.insert();
          results.created++;
          gs.info('Created user: ' + data.email);
        }

      } catch (e) {
        results.errors++;
        gs.error('Error importing ' + data.email + ': ' + e.message);
      }
    });

    gs.info('Import complete: ' + JSON.stringify(results));

    function lookupDepartment(name) {
      var dept = new GlideRecord('cmn_department');
      dept.addQuery('name', name);
      dept.query();
      if (dept.next()) {
        return dept.sys_id.toString();
      }
      return '';
    }
  description: Import external user data with upsert logic
```

## Tool Usage Summary

| Operation | MCP Tool | Purpose |
|-----------|----------|---------|
| Batch Create | SN-Batch-Create | Create multiple records |
| Batch Update | SN-Batch-Update | Update multiple records by sys_id |
| Parallel Create | SN-Create-Record (multiple) | Maximum throughput |
| Parallel Update | SN-Update-Record (multiple) | Maximum throughput |
| Complex Batch | SN-Execute-Background-Script | Advanced logic |
| Query | SN-Query-Table | Find records for batch operations |

## Performance Comparison

| Method | 100 Records | 1,000 Records | 10,000 Records |
|--------|-------------|---------------|-----------------|
| Serial MCP calls | ~50 sec | ~500 sec | Not practical |
| Parallel MCP (10) | ~5 sec | ~50 sec | ~500 sec |
| SN-Batch-Create | ~3 sec | ~30 sec | ~300 sec |
| Background script | ~2 sec | ~20 sec | ~200 sec |
| setWorkflow(false) | ~1 sec | ~10 sec | ~100 sec |

## Best Practices

- **Always Test First:** Run with DRY_RUN=true or on small subset
- **Use Limits:** Never process unlimited records
- **Batch Appropriately:** 100-500 records per batch for optimal performance
- **Log Progress:** Report progress every 10-100 operations
- **Handle Errors:** Implement try-catch for each record
- **Track Changes:** Store old values for potential rollback
- **Consider Business Rules:** Use setWorkflow(false) only when appropriate
- **Monitor Performance:** Track processing rate (records/second)
- **Use Transactions:** Group related changes for atomic operations
- **Document Operations:** Log what was changed for audit purposes

## Troubleshooting

### Operation Timeouts

**Symptom:** Script execution stops mid-process
**Causes:**
- Too many records in single execution
- Complex business rules triggered
**Solution:**
- Reduce batch size
- Use self-scheduling pattern
- Disable workflows if appropriate

### Memory Errors

**Symptom:** "Out of memory" or slow performance
**Causes:**
- Loading too many records at once
- Storing results in arrays
**Solution:**
- Use chooseWindow() for pagination
- Process and discard immediately
- Avoid accumulating results in memory

### Duplicate Records Created

**Symptom:** Multiple copies of same record
**Causes:**
- Missing unique constraint check
- Script ran multiple times
**Solution:**
- Always check for existing before insert
- Use unique keys for deduplication
- Add idempotency checks

### Business Rules Not Firing

**Symptom:** Expected side effects not occurring
**Causes:**
- setWorkflow(false) in use
- Record updated incorrectly
**Solution:**
- Remove setWorkflow(false) if rules are needed
- Verify field updates are valid
- Check business rule conditions

## Related Skills

- `admin/script-execution` - Background script execution
- `admin/update-set-management` - Track batch operation changes
- `admin/user-provisioning` - Bulk user operations
- `admin/deployment-workflow` - Deploy batch scripts between instances

## References

- [ServiceNow GlideRecord](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideRecordScopedAPI)
- [GlideAggregate](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideAggregateScopedAPI)
- [Import Sets](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/import-sets/concept/c_ImportSets.html)
- [Performance Best Practices](https://developer.servicenow.com/dev.do#!/guides/utah/now-platform/tpb-guide/scripting_technical_best_practices)
