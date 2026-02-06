---
name: data-import
version: 1.0.0
description: Master ServiceNow data import using Import Sets, Transform Maps, and various data sources with robust error handling and performance optimization
author: Happy Technologies LLC
tags: [development, data-import, transform-maps, integration, etl, import-sets]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Create-Record
    - SN-Update-Record
    - SN-Query-Table
    - SN-Batch-Create
    - SN-Get-Table-Schema
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/sys_import_set
    - /api/now/table/sys_import_set_row
    - /api/now/table/sys_transform_map
    - /api/now/table/sys_transform_entry
    - /api/now/import/{table_name}
  native:
    - Bash
    - Read
    - Write
complexity: advanced
estimated_time: 30-90 minutes
---

# Data Import

## Overview

This skill covers the complete data import lifecycle in ServiceNow using Import Sets and Transform Maps:

- Understanding the Import Set architecture
- Configuring data sources (file, JDBC, LDAP, REST)
- Creating and configuring Transform Maps
- Field mapping strategies and transformations
- Transform scripts (onBefore, onAfter, onStart, onComplete)
- Coalesce fields for matching and deduplication
- Error handling and rollback strategies
- Scheduled imports and automation
- Performance optimization for large datasets

**When to use:** When importing external data into ServiceNow, performing ETL operations, migrating data between systems, or setting up recurring data synchronization.

**Who should use this:** Developers, administrators, integration specialists, and data migration teams.

## Prerequisites

- **Roles:** `import_admin`, `import_transformer`, or `admin`
- **Access:** Target tables, import set tables, and data source configuration
- **Knowledge:** ServiceNow data model, GlideRecord API, table relationships
- **Related Skills:**
  - `admin/generic-crud-operations` - Basic CRUD operations
  - `admin/batch-operations` - Bulk data handling

## Import Set Architecture

### Key Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Source   │───>│   Import Set     │───>│  Transform Map  │
│  (File/JDBC/    │    │    (Staging)     │    │   (Mapping)     │
│   LDAP/REST)    │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                       │
                                                       v
                                               ┌─────────────────┐
                                               │  Target Table   │
                                               │   (Production)  │
                                               └─────────────────┘
```

### Core Tables

| Table | Purpose |
|-------|---------|
| `sys_import_set` | Import set header records |
| `sys_import_set_row` | Staging table for imported data |
| `sys_transform_map` | Transform map definitions |
| `sys_transform_entry` | Field mapping entries |
| `sys_transform_script` | Transform scripts (onBefore, etc.) |
| `sys_data_source` | Data source configurations |

### Import States

| State | Value | Description |
|-------|-------|-------------|
| Loaded | loaded | Data loaded into staging |
| Transformed | transformed | Successfully transformed |
| Error | error | Transform failed |
| Ignored | ignored | Skipped by transform logic |

## Procedure

### Phase 1: Data Source Configuration

#### Step 1.1: Create File Data Source

For CSV, Excel, or XML file imports.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_data_source
  data:
    name: Employee Import - CSV
    type: File
    format: CSV
    header_row: 1
    sheet_number: 1
    import_set_table_name: u_employee_import
    active: true
```

**Response:**
```json
{
  "sys_id": "abc123...",
  "name": "Employee Import - CSV",
  "type": "File",
  "import_set_table_name": "u_employee_import"
}
```

#### Step 1.2: Create JDBC Data Source

For database connections (Oracle, MySQL, SQL Server).

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_data_source
  data:
    name: HR Database - JDBC
    type: JDBC
    connection_url: jdbc:mysql://hr-db.company.com:3306/hrms
    user: servicenow_reader
    password: [encrypted_password]
    import_set_table_name: u_hr_import
    query: |
      SELECT employee_id, first_name, last_name, email, department, hire_date
      FROM employees
      WHERE modified_date > ?
    active: true
```

**JDBC Connection URL Patterns:**

| Database | Connection URL |
|----------|----------------|
| MySQL | `jdbc:mysql://host:3306/database` |
| Oracle | `jdbc:oracle:thin:@host:1521:sid` |
| SQL Server | `jdbc:sqlserver://host:1433;databaseName=db` |
| PostgreSQL | `jdbc:postgresql://host:5432/database` |

#### Step 1.3: Create LDAP Data Source

For Active Directory or LDAP directory imports.

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_data_source
  data:
    name: Active Directory Users
    type: LDAP
    server_url: ldap://ad.company.com:389
    user: CN=ServiceNow,OU=Service Accounts,DC=company,DC=com
    password: [encrypted_password]
    import_set_table_name: u_ldap_user_import
    ldap_target: OU=Users,DC=company,DC=com
    ldap_filter: (&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))
    active: true
```

#### Step 1.4: Create REST Data Source

For REST API integrations.

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_data_source
  data:
    name: External API - REST
    type: REST (IntegrationHub)
    connection_url: https://api.external-system.com/v1/records
    http_method: GET
    authentication_type: basic
    user: api_user
    password: [encrypted_password]
    import_set_table_name: u_api_import
    format: JSON
    active: true
```

### Phase 2: Import Set Table Creation

#### Step 2.1: Create Custom Import Set Table

Create a staging table to receive imported data.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_db_object
  data:
    name: u_employee_import
    label: Employee Import
    extends: sys_import_set_row
    create_access: true
    read_access: true
    update_access: true
    delete_access: true
```

#### Step 2.2: Add Columns to Import Set Table

Define columns matching your source data structure.

**Batch Create Columns:**
```
Tool: SN-Batch-Create
Parameters:
  records:
    - table_name: sys_dictionary
      data:
        name: u_employee_import
        element: u_employee_id
        column_label: Employee ID
        internal_type: string
        max_length: 40
    - table_name: sys_dictionary
      data:
        name: u_employee_import
        element: u_first_name
        column_label: First Name
        internal_type: string
        max_length: 100
    - table_name: sys_dictionary
      data:
        name: u_employee_import
        element: u_last_name
        column_label: Last Name
        internal_type: string
        max_length: 100
    - table_name: sys_dictionary
      data:
        name: u_employee_import
        element: u_email
        column_label: Email
        internal_type: string
        max_length: 255
    - table_name: sys_dictionary
      data:
        name: u_employee_import
        element: u_department
        column_label: Department
        internal_type: string
        max_length: 100
    - table_name: sys_dictionary
      data:
        name: u_employee_import
        element: u_hire_date
        column_label: Hire Date
        internal_type: string
        max_length: 40
```

### Phase 3: Transform Map Configuration

#### Step 3.1: Create Transform Map

Define how staging data transforms to target table.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_transform_map
  data:
    name: Employee Import Transform
    source_table: u_employee_import
    target_table: sys_user
    active: true
    enforce_mandatory_fields: true
    run_business_rules: true
    run_script: true
    order: 100
```

**Transform Map Options:**

| Option | Description |
|--------|-------------|
| `enforce_mandatory_fields` | Fail if mandatory fields missing |
| `run_business_rules` | Execute business rules on target |
| `run_script` | Run transform scripts |
| `copy_empty_fields` | Overwrite with empty values |
| `order` | Execution order (lower = earlier) |

#### Step 3.2: Create Field Mappings

Map source columns to target fields.

**Batch Create Field Mappings:**
```
Tool: SN-Batch-Create
Parameters:
  records:
    - table_name: sys_transform_entry
      data:
        map: [transform_map_sys_id]
        source_field: u_employee_id
        target_field: employee_number
        coalesce: true
        order: 100
    - table_name: sys_transform_entry
      data:
        map: [transform_map_sys_id]
        source_field: u_first_name
        target_field: first_name
        order: 200
    - table_name: sys_transform_entry
      data:
        map: [transform_map_sys_id]
        source_field: u_last_name
        target_field: last_name
        order: 300
    - table_name: sys_transform_entry
      data:
        map: [transform_map_sys_id]
        source_field: u_email
        target_field: email
        coalesce: true
        order: 400
    - table_name: sys_transform_entry
      data:
        map: [transform_map_sys_id]
        source_field: u_department
        target_field: department
        reference_qual_mapping: true
        order: 500
```

#### Step 3.3: Field Mapping Types

| Type | Use Case | Configuration |
|------|----------|---------------|
| **Direct** | Simple copy | Source to target, no transformation |
| **Mapping** | Value translation | Use choice map or script |
| **Reference** | Lookup relation | Set `reference_qual_mapping: true` |
| **Script** | Complex logic | Use `source_script` field |
| **Derived** | Calculated | No source, only script |

**Script Mapping Example:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_transform_entry
  data:
    map: [transform_map_sys_id]
    source_field: u_status
    target_field: active
    use_source_script: true
    source_script: |
      // Convert status to boolean active flag
      answer = (source.u_status == 'Active' || source.u_status == 'A') ? 'true' : 'false';
    order: 600
```

**Reference Mapping with Lookup:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_transform_entry
  data:
    map: [transform_map_sys_id]
    source_field: u_manager_email
    target_field: manager
    reference_qual_mapping: true
    reference_qual: email=[u_manager_email]
    order: 700
```

### Phase 4: Coalesce Fields (Matching)

#### Step 4.1: Understanding Coalesce

Coalesce fields determine if the transform should INSERT or UPDATE:

- **No Match:** INSERT new record
- **Single Match:** UPDATE existing record
- **Multiple Matches:** Error (unless configured otherwise)

#### Step 4.2: Configure Coalesce Fields

**Single Coalesce Field:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_transform_entry
  sys_id: [entry_sys_id]
  data:
    coalesce: true
```

**Multiple Coalesce Fields (Compound Key):**
```
Tool: SN-Batch-Update
Parameters:
  updates:
    - table_name: sys_transform_entry
      sys_id: [employee_id_entry_sys_id]
      data:
        coalesce: true
    - table_name: sys_transform_entry
      sys_id: [company_entry_sys_id]
      data:
        coalesce: true
```

**Coalesce Behavior Matrix:**

| Scenario | Behavior |
|----------|----------|
| No coalesce fields | Always INSERT new record |
| Coalesce, no match | INSERT new record |
| Coalesce, one match | UPDATE existing record |
| Coalesce, multiple matches | ERROR (configurable) |

#### Step 4.3: Handle Multiple Matches

Configure transform map to handle multiple matches.

```
Tool: SN-Update-Record
Parameters:
  table_name: sys_transform_map
  sys_id: [transform_map_sys_id]
  data:
    multi_coalesce_action: ignore
```

**Multi-Coalesce Actions:**

| Action | Behavior |
|--------|----------|
| `create` | Create new record anyway |
| `ignore` | Skip row, mark as ignored |
| `update_first` | Update first match |
| `reject` | Mark row as error |

### Phase 5: Transform Scripts

#### Step 5.1: Script Types Overview

| Script Type | Execution Point | Use Case |
|-------------|-----------------|----------|
| `onStart` | Before transform begins | Initialize counters, validation |
| `onBefore` | Before each row | Row-level preprocessing |
| `onAfter` | After each row | Post-processing, related records |
| `onComplete` | After transform ends | Summary, notifications |
| `onChoiceCreate` | When creating choice | Custom choice creation |
| `onForeignInsert` | On reference insert | Handle missing references |

#### Step 5.2: Create onStart Script

Runs once at the beginning of the transform.

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_transform_script
  data:
    map: [transform_map_sys_id]
    script_type: onStart
    script: |
      // onStart: Initialize transform
      // Available: log, source (first row), map, import_set

      log.info('Starting employee import transform');
      log.info('Import Set: ' + import_set.number);
      log.info('Source table: ' + map.source_table);

      // Initialize counters in scratchpad
      var scratchpad = {};
      scratchpad.processed = 0;
      scratchpad.created = 0;
      scratchpad.updated = 0;
      scratchpad.errors = 0;
      scratchpad.startTime = new GlideDateTime();
    order: 100
    active: true
```

#### Step 5.3: Create onBefore Script

Runs before each row is transformed.

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_transform_script
  data:
    map: [transform_map_sys_id]
    script_type: onBefore
    script: |
      // onBefore: Row-level preprocessing
      // Available: source, target, map, log, action, error, ignore
      // Set ignore=true to skip row, error=true to mark as error

      // Validate required fields
      if (!source.u_employee_id || source.u_employee_id.nil()) {
        error = true;
        error_message = 'Missing employee ID';
        return;
      }

      if (!source.u_email || source.u_email.nil()) {
        error = true;
        error_message = 'Missing email address';
        return;
      }

      // Validate email format
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(source.u_email.toString())) {
        error = true;
        error_message = 'Invalid email format: ' + source.u_email;
        return;
      }

      // Normalize data
      source.u_first_name = source.u_first_name.toString().trim();
      source.u_last_name = source.u_last_name.toString().trim();
      source.u_email = source.u_email.toString().toLowerCase().trim();

      // Generate username if not provided
      if (!source.u_user_name || source.u_user_name.nil()) {
        source.u_user_name = source.u_email.toString().split('@')[0];
      }

      // Conditional skip
      if (source.u_status == 'Terminated') {
        ignore = true;
        return;
      }

      scratchpad.processed++;
    order: 100
    active: true
```

#### Step 5.4: Create onAfter Script

Runs after each row is transformed.

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_transform_script
  data:
    map: [transform_map_sys_id]
    script_type: onAfter
    script: |
      // onAfter: Post-processing
      // Available: source, target, map, log, action, error, scratchpad
      // action = 'insert', 'update', or 'ignore'

      if (action == 'insert') {
        scratchpad.created++;

        // Add user to default groups
        if (target.sys_id) {
          addUserToGroups(target.sys_id, source.u_department);
        }

        log.info('Created user: ' + target.user_name);

      } else if (action == 'update') {
        scratchpad.updated++;
        log.info('Updated user: ' + target.user_name);
      }

      // Create related records
      if (source.u_manager_email && !source.u_manager_email.nil()) {
        // Store for later processing
        scratchpad.managersToProcess = scratchpad.managersToProcess || [];
        scratchpad.managersToProcess.push({
          userId: target.sys_id.toString(),
          managerEmail: source.u_manager_email.toString()
        });
      }

      function addUserToGroups(userId, department) {
        var deptGroups = {
          'IT': ['IT Support', 'Service Desk'],
          'HR': ['HR Team'],
          'Finance': ['Finance Team']
        };

        var groups = deptGroups[department] || [];

        groups.forEach(function(groupName) {
          var group = new GlideRecord('sys_user_group');
          group.addQuery('name', groupName);
          group.query();

          if (group.next()) {
            var member = new GlideRecord('sys_user_grmember');
            member.addQuery('user', userId);
            member.addQuery('group', group.sys_id);
            member.query();

            if (!member.hasNext()) {
              member.initialize();
              member.user = userId;
              member.group = group.sys_id;
              member.insert();
            }
          }
        });
      }
    order: 100
    active: true
```

#### Step 5.5: Create onComplete Script

Runs once after all rows are transformed.

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_transform_script
  data:
    map: [transform_map_sys_id]
    script_type: onComplete
    script: |
      // onComplete: Finalize transform
      // Available: log, import_set, map, scratchpad

      var endTime = new GlideDateTime();
      var duration = GlideDateTime.subtract(scratchpad.startTime, endTime);
      var durationSec = duration.getNumericValue() / 1000;

      var summary = {
        processed: scratchpad.processed || 0,
        created: scratchpad.created || 0,
        updated: scratchpad.updated || 0,
        errors: scratchpad.errors || 0,
        duration: durationSec.toFixed(2) + ' seconds'
      };

      log.info('Transform Complete: ' + JSON.stringify(summary));

      // Process manager relationships (deferred to avoid reference issues)
      if (scratchpad.managersToProcess && scratchpad.managersToProcess.length > 0) {
        scratchpad.managersToProcess.forEach(function(item) {
          var manager = new GlideRecord('sys_user');
          manager.addQuery('email', item.managerEmail);
          manager.query();

          if (manager.next()) {
            var user = new GlideRecord('sys_user');
            if (user.get(item.userId)) {
              user.manager = manager.sys_id;
              user.update();
            }
          }
        });
        log.info('Processed ' + scratchpad.managersToProcess.length + ' manager relationships');
      }

      // Send notification if errors occurred
      if (summary.errors > 0) {
        gs.eventQueue('import.transform.errors', import_set, summary.errors, JSON.stringify(summary));
      }

      // Update import set with summary
      import_set.description = 'Summary: ' + JSON.stringify(summary);
      import_set.update();
    order: 100
    active: true
```

#### Step 5.6: onForeignInsert Script

Handle missing reference values.

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_transform_script
  data:
    map: [transform_map_sys_id]
    script_type: onForeignInsert
    script: |
      // onForeignInsert: Handle missing references
      // Available: source, target_table, target_field, source_field, source_value, log
      // Return: sys_id of existing/created record, or ignore to skip

      // Handle department lookup - create if not exists
      if (target_table == 'cmn_department' && target_field == 'department') {
        var dept = new GlideRecord('cmn_department');
        dept.addQuery('name', source_value);
        dept.query();

        if (dept.next()) {
          return dept.sys_id;
        } else {
          // Create new department
          dept.initialize();
          dept.name = source_value;
          dept.primary_contact = ''; // Set to admin later
          var newId = dept.insert();
          log.info('Created department: ' + source_value);
          return newId;
        }
      }

      // Handle company lookup - ignore if not found
      if (target_table == 'core_company' && target_field == 'company') {
        log.warn('Company not found: ' + source_value);
        ignore = true;
        return;
      }

      // Default: skip the field
      ignore = true;
    order: 100
    active: true
```

### Phase 6: Error Handling

#### Step 6.1: Transform-Level Error Handling

Configure transform map error behavior.

```
Tool: SN-Update-Record
Parameters:
  table_name: sys_transform_map
  sys_id: [transform_map_sys_id]
  data:
    abort_on_error: false
    log_transform_messages: true
```

**Error Configuration Options:**

| Option | Description |
|--------|-------------|
| `abort_on_error` | Stop transform on first error |
| `log_transform_messages` | Write detailed logs |
| `copy_empty_fields` | Include empty values |

#### Step 6.2: Query Error Rows

Find and analyze failed rows.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_import_set_row
  query: sys_import_set=[import_set_sys_id]^sys_import_state=error
  fields: sys_id,sys_row_error,sys_import_state,sys_transform_map
  limit: 100
```

#### Step 6.3: Retry Failed Rows

Reprocess error rows after fixing issues.

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Retry failed import set rows
    var importSetId = '[import_set_sys_id]';
    var transformMapId = '[transform_map_sys_id]';

    var gr = new GlideRecord('sys_import_set_row');
    gr.addQuery('sys_import_set', importSetId);
    gr.addQuery('sys_import_state', 'error');
    gr.query();

    var retried = 0;
    var transformer = new GlideImportSetTransformer();

    while (gr.next()) {
      // Reset state
      gr.sys_import_state = 'pending';
      gr.sys_row_error = '';
      gr.update();

      // Retransform single row
      transformer.transformRow(gr, transformMapId);
      retried++;
    }

    gs.info('Retried ' + retried + ' rows');
  description: Retry failed import rows
```

#### Step 6.4: Comprehensive Error Logging

Create error tracking table and logging.

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Enhanced error tracking for imports
    function logImportError(source, target, errorMsg, context) {
      var log = new GlideRecord('u_import_error_log');
      log.initialize();
      log.u_import_set = context.importSetId;
      log.u_transform_map = context.transformMapId;
      log.u_source_row = source.sys_id;
      log.u_source_data = JSON.stringify({
        employee_id: source.u_employee_id.toString(),
        email: source.u_email.toString(),
        name: source.u_first_name + ' ' + source.u_last_name
      });
      log.u_error_message = errorMsg;
      log.u_timestamp = new GlideDateTime();
      log.insert();

      return log.sys_id;
    }

    // Usage in onBefore script:
    // if (validationFailed) {
    //   logImportError(source, target, 'Validation failed: missing email', {
    //     importSetId: import_set.sys_id,
    //     transformMapId: map.sys_id
    //   });
    //   error = true;
    // }

    gs.info('Error logging function defined');
  description: Define import error logging function
```

### Phase 7: Scheduled Imports

#### Step 7.1: Create Scheduled Import

Set up recurring data imports.

```
Tool: SN-Create-Record
Parameters:
  table_name: scheduled_import_set
  data:
    name: Daily Employee Sync
    data_source: [data_source_sys_id]
    transform_map: [transform_map_sys_id]
    run_type: daily
    run_time: "02:00:00"
    run_dayofweek: "*"
    active: true
    delete_on_success: true
    email_on_error: admin@company.com
```

**Run Type Options:**

| Type | Description | Additional Fields |
|------|-------------|-------------------|
| `on_demand` | Manual execution | None |
| `daily` | Once per day | `run_time` |
| `weekly` | Once per week | `run_time`, `run_dayofweek` |
| `monthly` | Once per month | `run_time`, `run_dayofmonth` |
| `periodically` | Fixed interval | `run_period` (minutes) |

#### Step 7.2: Create Import Set Run Script

For custom scheduling or complex workflows.

```
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: Employee Import - Custom Schedule
    script: |
      // Custom scheduled import with pre/post processing
      var startTime = new GlideDateTime();
      gs.info('Starting scheduled employee import');

      try {
        // Pre-import validation
        if (!validateSourceConnection()) {
          gs.error('Source connection validation failed - aborting import');
          return;
        }

        // Run import
        var dataSourceId = '[data_source_sys_id]';
        var transformMapId = '[transform_map_sys_id]';

        // Load data into import set
        var loader = new GlideImportSetLoader();
        var importSetId = loader.loadAttachment(dataSourceId);

        if (!importSetId) {
          gs.error('Failed to load import set');
          return;
        }

        // Transform data
        var transformer = new GlideImportSetTransformer();
        transformer.setImportSetID(importSetId);
        transformer.setTransformMapID(transformMapId);
        transformer.transform();

        // Post-import processing
        var stats = getImportStats(importSetId);
        gs.info('Import complete: ' + JSON.stringify(stats));

        // Send summary notification
        if (stats.errors > 0) {
          sendErrorNotification(stats);
        }

        // Cleanup old import sets (keep last 7 days)
        cleanupOldImportSets(7);

      } catch (e) {
        gs.error('Scheduled import failed: ' + e.message);
      }

      function validateSourceConnection() {
        // Add connection validation logic
        return true;
      }

      function getImportStats(importSetId) {
        var stats = { total: 0, inserted: 0, updated: 0, errors: 0, ignored: 0 };

        var ga = new GlideAggregate('sys_import_set_row');
        ga.addQuery('sys_import_set', importSetId);
        ga.addAggregate('COUNT');
        ga.groupBy('sys_import_state');
        ga.query();

        while (ga.next()) {
          var state = ga.sys_import_state.toString();
          var count = parseInt(ga.getAggregate('COUNT'));
          stats.total += count;

          if (state == 'inserted') stats.inserted = count;
          else if (state == 'updated') stats.updated = count;
          else if (state == 'error') stats.errors = count;
          else if (state == 'ignored') stats.ignored = count;
        }

        return stats;
      }

      function sendErrorNotification(stats) {
        gs.eventQueue('import.scheduled.errors', null, stats.errors, JSON.stringify(stats));
      }

      function cleanupOldImportSets(daysToKeep) {
        var gr = new GlideRecord('sys_import_set');
        gr.addQuery('sys_created_on', '<', gs.daysAgo(daysToKeep));
        gr.addQuery('state', 'processed');
        gr.query();

        var deleted = 0;
        while (gr.next()) {
          gr.deleteRecord();
          deleted++;
        }

        gs.info('Cleaned up ' + deleted + ' old import sets');
      }
    run_type: daily
    run_time: "02:00:00"
    active: true
```

### Phase 8: Performance Optimization

#### Step 8.1: Large Import Best Practices

**Import Set Chunking:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Process large imports in chunks
    var CONFIG = {
      dataSourceId: '[data_source_sys_id]',
      transformMapId: '[transform_map_sys_id]',
      chunkSize: 5000,
      pauseBetweenChunks: 5000  // milliseconds
    };

    var totalProcessed = 0;
    var chunkNumber = 0;

    while (true) {
      chunkNumber++;
      gs.info('Processing chunk ' + chunkNumber);

      // Load chunk
      var loader = new GlideImportSetLoader();
      loader.setLimit(CONFIG.chunkSize);
      loader.setOffset((chunkNumber - 1) * CONFIG.chunkSize);

      var importSetId = loader.loadAttachment(CONFIG.dataSourceId);

      if (!importSetId) {
        gs.info('No more data to process');
        break;
      }

      // Count rows loaded
      var ga = new GlideAggregate('sys_import_set_row');
      ga.addQuery('sys_import_set', importSetId);
      ga.addAggregate('COUNT');
      ga.query();

      var rowCount = 0;
      if (ga.next()) {
        rowCount = parseInt(ga.getAggregate('COUNT'));
      }

      if (rowCount == 0) {
        gs.info('Empty chunk - import complete');
        break;
      }

      // Transform chunk
      var transformer = new GlideImportSetTransformer();
      transformer.setImportSetID(importSetId);
      transformer.setTransformMapID(CONFIG.transformMapId);
      transformer.transform();

      totalProcessed += rowCount;
      gs.info('Chunk ' + chunkNumber + ' complete: ' + rowCount + ' rows (Total: ' + totalProcessed + ')');

      // Pause between chunks
      gs.sleep(CONFIG.pauseBetweenChunks);
    }

    gs.info('Import complete: ' + totalProcessed + ' total rows processed');
  description: Chunked large import processing
```

#### Step 8.2: Disable Business Rules During Import

For maximum performance on large imports.

```
Tool: SN-Update-Record
Parameters:
  table_name: sys_transform_map
  sys_id: [transform_map_sys_id]
  data:
    run_business_rules: false
```

**Warning:** Only disable when you understand the implications. Re-enable after import if needed.

#### Step 8.3: Index Coalesce Fields

Ensure coalesce fields are indexed for performance.

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_index
  data:
    table: sys_user
    field_list: employee_number,email
    unique: true
    active: true
```

#### Step 8.4: Performance Monitoring Script

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Monitor import performance
    var importSetId = '[import_set_sys_id]';

    var importSet = new GlideRecord('sys_import_set');
    if (importSet.get(importSetId)) {
      var stats = {
        number: importSet.number.toString(),
        state: importSet.state.toString(),
        created: importSet.sys_created_on.toString(),
        updated: importSet.sys_updated_on.toString()
      };

      // Calculate duration
      var created = new GlideDateTime(importSet.sys_created_on);
      var updated = new GlideDateTime(importSet.sys_updated_on);
      var duration = GlideDateTime.subtract(created, updated);
      stats.duration_seconds = duration.getNumericValue() / 1000;

      // Get row counts by state
      var ga = new GlideAggregate('sys_import_set_row');
      ga.addQuery('sys_import_set', importSetId);
      ga.addAggregate('COUNT');
      ga.groupBy('sys_import_state');
      ga.query();

      stats.rows = {};
      while (ga.next()) {
        stats.rows[ga.sys_import_state.toString()] = parseInt(ga.getAggregate('COUNT'));
      }

      // Calculate throughput
      var totalRows = 0;
      for (var state in stats.rows) {
        totalRows += stats.rows[state];
      }
      stats.total_rows = totalRows;
      stats.rows_per_second = (totalRows / stats.duration_seconds).toFixed(2);

      gs.info('Import Performance:\n' + JSON.stringify(stats, null, 2));
    }
  description: Monitor import set performance
```

### Phase 9: Rollback and Cleanup

#### Step 9.1: Rollback Inserted Records

Undo records created by a transform.

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Rollback inserted records from import
    var importSetId = '[import_set_sys_id]';
    var targetTable = 'sys_user';
    var DRY_RUN = true;  // Set to false to actually delete

    // Get inserted records
    var gr = new GlideRecord('sys_import_set_row');
    gr.addQuery('sys_import_set', importSetId);
    gr.addQuery('sys_import_state', 'inserted');
    gr.query();

    var toDelete = [];
    while (gr.next()) {
      toDelete.push(gr.sys_target_sys_id.toString());
    }

    gs.info('Found ' + toDelete.length + ' records to rollback');

    if (DRY_RUN) {
      gs.info('[DRY RUN] Would delete: ' + toDelete.join(', '));
    } else {
      var deleted = 0;
      toDelete.forEach(function(sysId) {
        var target = new GlideRecord(targetTable);
        if (target.get(sysId)) {
          target.deleteRecord();
          deleted++;
        }
      });
      gs.info('Deleted ' + deleted + ' records');

      // Update import set rows
      var updateGr = new GlideRecord('sys_import_set_row');
      updateGr.addQuery('sys_import_set', importSetId);
      updateGr.addQuery('sys_import_state', 'inserted');
      updateGr.query();

      while (updateGr.next()) {
        updateGr.sys_import_state = 'rolled_back';
        updateGr.update();
      }
    }
  description: Rollback imported records
```

#### Step 9.2: Cleanup Import Set Data

Remove old import sets and staging data.

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Cleanup old import sets
    var DAYS_TO_KEEP = 30;
    var DRY_RUN = true;

    var cutoffDate = gs.daysAgo(DAYS_TO_KEEP);

    // Find old import sets
    var gr = new GlideRecord('sys_import_set');
    gr.addQuery('sys_created_on', '<', cutoffDate);
    gr.addQuery('state', 'processed');
    gr.query();

    var stats = { sets: 0, rows: 0 };

    while (gr.next()) {
      // Count rows
      var ga = new GlideAggregate('sys_import_set_row');
      ga.addQuery('sys_import_set', gr.sys_id);
      ga.addAggregate('COUNT');
      ga.query();

      var rowCount = 0;
      if (ga.next()) {
        rowCount = parseInt(ga.getAggregate('COUNT'));
      }

      if (DRY_RUN) {
        gs.info('[DRY RUN] Would delete: ' + gr.number + ' (' + rowCount + ' rows)');
      } else {
        // Delete rows first
        var rowGr = new GlideRecord('sys_import_set_row');
        rowGr.addQuery('sys_import_set', gr.sys_id);
        rowGr.deleteMultiple();

        // Delete import set
        gr.deleteRecord();
        stats.rows += rowCount;
      }

      stats.sets++;
    }

    gs.info('Cleanup complete: ' + stats.sets + ' import sets, ' + stats.rows + ' rows');
  description: Cleanup old import sets
```

#### Step 9.3: Archive Import History

Preserve import history before cleanup.

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Archive import history before cleanup
    var importSetId = '[import_set_sys_id]';

    var importSet = new GlideRecord('sys_import_set');
    if (importSet.get(importSetId)) {

      // Get statistics
      var stats = {
        number: importSet.number.toString(),
        table_name: importSet.table_name.toString(),
        state: importSet.state.toString(),
        sys_created_on: importSet.sys_created_on.toString(),
        sys_created_by: importSet.sys_created_by.toString()
      };

      // Count by state
      var ga = new GlideAggregate('sys_import_set_row');
      ga.addQuery('sys_import_set', importSetId);
      ga.addAggregate('COUNT');
      ga.groupBy('sys_import_state');
      ga.query();

      stats.results = {};
      while (ga.next()) {
        stats.results[ga.sys_import_state.toString()] = parseInt(ga.getAggregate('COUNT'));
      }

      // Create archive record
      var archive = new GlideRecord('u_import_archive');
      archive.initialize();
      archive.u_import_set_number = stats.number;
      archive.u_source_table = stats.table_name;
      archive.u_import_date = stats.sys_created_on;
      archive.u_imported_by = stats.sys_created_by;
      archive.u_statistics = JSON.stringify(stats);
      archive.insert();

      gs.info('Archived import set: ' + stats.number);
    }
  description: Archive import set history
```

## Tool Usage Summary

| Operation | MCP Tool | Purpose |
|-----------|----------|---------|
| Create Data Source | SN-Create-Record | Configure import source |
| Create Transform Map | SN-Create-Record | Define field mappings |
| Create Field Mappings | SN-Batch-Create | Map source to target |
| Create Scripts | SN-Create-Record | Add transform logic |
| Query Import Rows | SN-Query-Table | Monitor import progress |
| Retry Errors | SN-Execute-Background-Script | Reprocess failed rows |
| Performance Check | SN-Execute-Background-Script | Monitor throughput |
| Rollback | SN-Execute-Background-Script | Undo imports |

## Performance Guidelines

| Data Volume | Recommended Approach | Expected Time |
|-------------|---------------------|---------------|
| < 1,000 | Standard import | < 1 minute |
| 1,000 - 10,000 | Standard import | 1-10 minutes |
| 10,000 - 100,000 | Chunked import | 10-60 minutes |
| 100,000+ | Background job + chunking | Hours |

**Performance Tips:**

- Index coalesce fields
- Disable business rules for bulk imports
- Use chunked processing for large datasets
- Schedule imports during off-peak hours
- Monitor system performance during imports

## Best Practices

- **Always Test First:** Run imports in sub-production with sample data
- **Use Coalesce Fields:** Prevent duplicate records with proper matching
- **Validate Data:** Use onBefore scripts to validate before transform
- **Handle Errors Gracefully:** Don't abort on first error, log and continue
- **Monitor Progress:** Track row counts and processing time
- **Clean Up:** Remove old import sets to maintain performance
- **Document Mappings:** Keep records of field mappings and transformations
- **Version Control:** Store transform scripts in source control
- **Audit Trail:** Log all import operations for compliance

## Troubleshooting

### Transform Fails with "No Coalesce"

**Symptom:** All rows marked as error, "Multiple records found"
**Cause:** Coalesce field matches multiple records
**Solution:**
- Add more coalesce fields for unique matching
- Set `multi_coalesce_action` to handle duplicates
- Clean target table duplicates before import

### Import Timeout

**Symptom:** Import stops mid-process
**Cause:** Too many records in single import
**Solution:**
- Use chunked processing
- Increase transaction timeout (system property)
- Disable business rules temporarily

### Reference Field Not Mapping

**Symptom:** Reference fields show empty after transform
**Cause:** Referenced record not found
**Solution:**
- Use onForeignInsert script to create missing references
- Verify reference field query matches source data
- Check reference table for matching records

### Performance Degradation

**Symptom:** Import slows significantly over time
**Cause:** Table fragmentation, missing indexes
**Solution:**
- Add indexes to coalesce fields
- Run table maintenance
- Archive old import sets

### Data Truncation

**Symptom:** Field values cut off
**Cause:** Source data exceeds field length
**Solution:**
- Check field max_length in schema
- Truncate or transform data in onBefore script
- Increase field length if appropriate

## Examples

### Example 1: Basic User Import

```
# 1. Create transform map
Tool: SN-Create-Record
Parameters:
  table_name: sys_transform_map
  data:
    name: Basic User Import
    source_table: u_user_import
    target_table: sys_user
    active: true

# 2. Create field mappings
Tool: SN-Batch-Create
Parameters:
  records:
    - table_name: sys_transform_entry
      data:
        map: [transform_map_sys_id]
        source_field: u_email
        target_field: email
        coalesce: true
    - table_name: sys_transform_entry
      data:
        map: [transform_map_sys_id]
        source_field: u_first_name
        target_field: first_name
    - table_name: sys_transform_entry
      data:
        map: [transform_map_sys_id]
        source_field: u_last_name
        target_field: last_name
```

### Example 2: CI Import with Relationships

```
# Transform map for CI import with relationship creation
Tool: SN-Create-Record
Parameters:
  table_name: sys_transform_script
  data:
    map: [ci_transform_map_sys_id]
    script_type: onAfter
    script: |
      // Create CI relationships after import
      if (action == 'insert' && source.u_parent_ci) {
        var rel = new GlideRecord('cmdb_rel_ci');
        rel.initialize();
        rel.parent = lookupCI(source.u_parent_ci);
        rel.child = target.sys_id;
        rel.type = getRelationType('Depends on::Used by');
        rel.insert();
      }

      function lookupCI(name) {
        var ci = new GlideRecord('cmdb_ci');
        ci.addQuery('name', name);
        ci.query();
        return ci.next() ? ci.sys_id : '';
      }

      function getRelationType(name) {
        var type = new GlideRecord('cmdb_rel_type');
        type.addQuery('name', name);
        type.query();
        return type.next() ? type.sys_id : '';
      }
```

### Example 3: Incremental Data Sync

```
# Scheduled import for incremental sync
Tool: SN-Create-Record
Parameters:
  table_name: sysauto_script
  data:
    name: Incremental User Sync
    script: |
      // Get last sync timestamp
      var prop = gs.getProperty('user.import.last_sync', '1970-01-01 00:00:00');
      var lastSync = new GlideDateTime();
      lastSync.setDisplayValue(prop);

      // Update data source query with timestamp
      var ds = new GlideRecord('sys_data_source');
      ds.get('[data_source_sys_id]');
      ds.query = "SELECT * FROM employees WHERE modified_date > '" + lastSync.getValue() + "'";
      ds.update();

      // Run import
      var loader = new GlideImportSetLoader();
      var importSetId = loader.loadAttachment('[data_source_sys_id]');

      var transformer = new GlideImportSetTransformer();
      transformer.setImportSetID(importSetId);
      transformer.setTransformMapID('[transform_map_sys_id]');
      transformer.transform();

      // Update last sync timestamp
      gs.setProperty('user.import.last_sync', new GlideDateTime().getDisplayValue());
    run_type: periodically
    run_period: 60
    active: true
```

## Related Skills

- `admin/batch-operations` - Bulk data operations
- `admin/generic-crud-operations` - Basic table operations
- `admin/script-execution` - Background script execution
- `admin/schema-discovery` - Table structure discovery
- `cmdb/data-quality` - Data quality validation

## References

- [ServiceNow Import Sets](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/import-sets/concept/c_ImportSets.html)
- [Transform Maps](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/import-sets/concept/c_TransformMaps.html)
- [Data Sources](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/import-sets/concept/c_DataSources.html)
- [Transform Scripts](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/import-sets/concept/c_TransformScripts.html)
- [Import Set Best Practices](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/import-sets/concept/c_ImportSetBestPractices.html)
