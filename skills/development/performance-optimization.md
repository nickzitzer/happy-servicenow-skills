---
name: performance-optimization
version: 1.0.0
description: Comprehensive guide to identifying and resolving ServiceNow performance bottlenecks including GlideRecord optimization, query tuning, index management, caching strategies, and profiling techniques
author: Happy Technologies LLC
tags: [development, performance, optimization, scripting, best-practices, gliderecord, indexing, caching]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Execute-Background-Script
    - SN-Get-Table-Schema
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/sys_slow_transaction
    - /api/now/table/syslog_transaction
    - /api/now/table/sys_db_index
    - /api/now/stats.do
  native:
    - Bash
    - Read
complexity: advanced
estimated_time: 30-60 minutes
---

# ServiceNow Performance Optimization

## Overview

This skill provides a comprehensive approach to identifying and resolving performance issues in ServiceNow:

- **Bottleneck Identification:** Using transaction logs, slow queries, and session debugging
- **GlideRecord Optimization:** Best practices for efficient database operations
- **Query Tuning:** Avoiding N+1 queries, proper filtering, and result limiting
- **Index Management:** Creating and maintaining effective database indexes
- **Caching Strategies:** Leveraging ServiceNow caching mechanisms
- **Client-Side Performance:** Optimizing UI scripts and form loading
- **Profiling Tools:** Session debug, transaction quotas, and monitoring

**When to use:** When experiencing slow form loads, list view delays, business rule timeouts, or general system sluggishness.

**Who should use this:** Developers, administrators, and performance engineers responsible for ServiceNow optimization.

**Expected outcomes:** Faster form loads, reduced transaction times, improved user experience, and lower system resource consumption.

## Prerequisites

- **Roles:** `admin` (for index creation), `itil` or `developer` (for script analysis)
- **Access:** sys_slow_transaction, syslog_transaction, sys_db_index tables
- **Knowledge:** GlideRecord API, JavaScript, ServiceNow architecture
- **Tools:** Session Debug capability, access to Stats.do page
- **Environment:** Sub-production instance for testing optimizations

## Performance Metrics Baseline

### Key Performance Indicators (KPIs)

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Form Load Time | < 2 sec | 2-5 sec | > 5 sec |
| List View Load | < 3 sec | 3-7 sec | > 7 sec |
| Business Rule Execution | < 100 ms | 100-500 ms | > 500 ms |
| Client Script Execution | < 200 ms | 200-500 ms | > 500 ms |
| Query Response Time | < 50 ms | 50-200 ms | > 200 ms |
| API Response Time | < 1 sec | 1-3 sec | > 3 sec |

## Procedure

### Phase 1: Performance Analysis and Bottleneck Identification

#### Step 1.1: Query Slow Transactions

Identify the slowest transactions in your instance:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_slow_transaction
  query: sys_created_on>javascript:gs.daysAgo(7)
  fields: url,response_time,user,client_transaction,sys_created_on
  limit: 50
  orderBy: response_time
  orderByDesc: true
```

**Analyze Results:**
- Response times > 10,000 ms indicate severe issues
- Look for patterns: same URL, same user, same time of day
- High client_transaction values suggest client-side issues

#### Step 1.2: Identify Slow Queries

Find database queries consuming excessive time:

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Query slow database operations
    var slowQueries = [];

    var gr = new GlideRecord('syslog_transaction');
    gr.addQuery('sys_created_on', '>', gs.daysAgo(1));
    gr.addQuery('type', 'sql');
    gr.orderByDesc('response_time');
    gr.setLimit(50);
    gr.query();

    while (gr.next()) {
      slowQueries.push({
        table: gr.url.toString().split(' ')[0],
        response_time: gr.response_time.toString(),
        query: gr.url.toString().substring(0, 200),
        created: gr.sys_created_on.toString()
      });
    }

    gs.info('Slow Queries Report:\n' + JSON.stringify(slowQueries, null, 2));
  description: Identify slow database queries
```

#### Step 1.3: Enable Session Debug

For detailed transaction analysis:

**Manual Steps (UI Required):**
1. Navigate to **System Diagnostics > Session Debug > Debug Business Rule**
2. Enable relevant debuggers:
   - Debug Business Rule (SQL)
   - Debug Log
   - Debug SQL (Detailed)
3. Reproduce the slow operation
4. Review output in **Debug Log** section

**Query Debug Output:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: sourceLIKEDebug^sys_created_on>javascript:gs.minutesAgo(15)
  fields: message,source,sys_created_on
  limit: 100
```

#### Step 1.4: Transaction Quota Monitoring

Check for quota violations:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: messageLIKEquota^sys_created_on>javascript:gs.daysAgo(1)
  fields: message,source,sys_created_on
  limit: 50
```

**Common Quota Violations:**
| Quota | Default Limit | Symptom |
|-------|---------------|---------|
| SQL statements | 1,000 per transaction | N+1 query pattern |
| Script execution | 180 seconds | Long-running scripts |
| Memory | 100 MB | Large data processing |
| Outbound HTTP | 10 per transaction | Integration loops |

### Phase 2: GlideRecord Optimization

#### Step 2.1: Essential setLimit() Usage

**Always limit results** to prevent full table scans:

```javascript
// BAD: No limit - scans entire table
var gr = new GlideRecord('incident');
gr.addQuery('active', true);
gr.query();

// GOOD: Explicit limit
var gr = new GlideRecord('incident');
gr.addQuery('active', true);
gr.setLimit(100);  // Only get what you need
gr.query();
```

**When to use different limits:**
| Use Case | Recommended Limit |
|----------|-------------------|
| Display in UI list | 20-50 |
| Batch processing | 100-500 |
| Aggregation input | 1000 max |
| Existence check | 1 |

#### Step 2.2: Field Selection with setFields()

**Only retrieve fields you need:**

```javascript
// BAD: Gets all 100+ fields
var gr = new GlideRecord('incident');
gr.addQuery('priority', 1);
gr.query();

// GOOD: Gets only needed fields (70%+ faster)
var gr = new GlideRecord('incident');
gr.addQuery('priority', 1);
gr.setFields('sys_id,number,short_description,assigned_to');
gr.query();
```

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^priority=1
  fields: sys_id,number,short_description,assigned_to
  limit: 50
```

#### Step 2.3: Existence Checks with getRowCount()

**For simple existence checks, avoid iteration:**

```javascript
// BAD: Loads record just to check existence
var gr = new GlideRecord('incident');
gr.addQuery('number', 'INC0012345');
gr.query();
if (gr.next()) {
  // Exists
}

// GOOD: Use getRowCount() for existence
var gr = new GlideRecord('incident');
gr.addQuery('number', 'INC0012345');
gr.setLimit(1);
gr.query();
if (gr.getRowCount() > 0) {
  // Exists
}

// BEST: Use get() for single record by unique field
var gr = new GlideRecord('incident');
if (gr.get('number', 'INC0012345')) {
  // Exists and loaded
}
```

#### Step 2.4: GlideAggregate for Counts

**Never iterate to count records:**

```javascript
// BAD: Loads all records just to count (can be 1000x slower)
var count = 0;
var gr = new GlideRecord('incident');
gr.addQuery('active', true);
gr.query();
while (gr.next()) {
  count++;
}

// GOOD: Use GlideAggregate
var ga = new GlideAggregate('incident');
ga.addQuery('active', true);
ga.addAggregate('COUNT');
ga.query();
var count = 0;
if (ga.next()) {
  count = parseInt(ga.getAggregate('COUNT'));
}
```

**Advanced Aggregation Example:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Get incident counts grouped by priority
    var stats = {};

    var ga = new GlideAggregate('incident');
    ga.addQuery('active', true);
    ga.addAggregate('COUNT');
    ga.groupBy('priority');
    ga.query();

    while (ga.next()) {
      var priority = ga.priority.getDisplayValue() || 'Unset';
      var count = parseInt(ga.getAggregate('COUNT'));
      stats[priority] = count;
    }

    gs.info('Incident Stats by Priority:\n' + JSON.stringify(stats, null, 2));
  description: Count incidents by priority using GlideAggregate
```

### Phase 3: Avoiding N+1 Queries

#### Step 3.1: Understanding N+1 Problem

**The N+1 anti-pattern:**
```javascript
// BAD: N+1 query pattern (1 + N database calls)
var incidents = new GlideRecord('incident');
incidents.addQuery('active', true);
incidents.setLimit(100);
incidents.query();

while (incidents.next()) {
  // This causes a separate query for EACH incident
  var user = new GlideRecord('sys_user');
  user.get(incidents.assigned_to);  // +1 query per iteration
  gs.info(incidents.number + ' - ' + user.name);
}
// Total queries: 1 + 100 = 101 queries!
```

#### Step 3.2: Solution - Dot-Walking

**Use dot-walking for reference fields:**
```javascript
// GOOD: Single query with dot-walking
var incidents = new GlideRecord('incident');
incidents.addQuery('active', true);
incidents.setLimit(100);
incidents.query();

while (incidents.next()) {
  // Dot-walking retrieves reference data without extra queries
  var userName = incidents.assigned_to.name;
  var userEmail = incidents.assigned_to.email;
  gs.info(incidents.number + ' - ' + userName);
}
// Total queries: 1 query!
```

#### Step 3.3: Solution - Batch Loading

**For complex scenarios, load all references first:**
```javascript
// GOOD: Batch loading pattern
// Step 1: Collect all unique sys_ids
var userIds = [];
var incidents = new GlideRecord('incident');
incidents.addQuery('active', true);
incidents.addQuery('assigned_to', '!=', '');
incidents.setLimit(100);
incidents.query();

while (incidents.next()) {
  var userId = incidents.assigned_to.toString();
  if (userIds.indexOf(userId) === -1) {
    userIds.push(userId);
  }
}

// Step 2: Load all users in single query
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
// Total queries: 2 queries regardless of record count!
```

#### Step 3.4: Detection Script

**Detect N+1 patterns in your code:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Analyze business rules for potential N+1 patterns
    var suspects = [];

    var gr = new GlideRecord('sys_script');
    gr.addQuery('active', true);
    gr.addEncodedQuery('scriptLIKEwhile*next*^scriptLIKEnew GlideRecord');
    gr.setLimit(50);
    gr.query();

    while (gr.next()) {
      // Check for GlideRecord inside while loops
      var script = gr.script.toString();
      var lines = script.split('\n');
      var inWhileLoop = false;
      var hasInnerGR = false;

      for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('while') > -1 && lines[i].indexOf('.next()') > -1) {
          inWhileLoop = true;
        }
        if (inWhileLoop && lines[i].indexOf('new GlideRecord') > -1) {
          hasInnerGR = true;
          break;
        }
        if (inWhileLoop && lines[i].indexOf('}') > -1) {
          inWhileLoop = false;
        }
      }

      if (hasInnerGR) {
        suspects.push({
          name: gr.name.toString(),
          table: gr.collection.toString(),
          sys_id: gr.sys_id.toString()
        });
      }
    }

    gs.info('Potential N+1 Patterns Found: ' + suspects.length);
    gs.info(JSON.stringify(suspects, null, 2));
  description: Detect potential N+1 query patterns in business rules
```

### Phase 4: Index Optimization

#### Step 4.1: Identify Missing Indexes

**Find frequently queried fields without indexes:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Analyze slow queries for missing indexes
    var fieldUsage = {};

    var gr = new GlideRecord('syslog_transaction');
    gr.addQuery('type', 'sql');
    gr.addQuery('sys_created_on', '>', gs.daysAgo(1));
    gr.addQuery('response_time', '>', 100);  // > 100ms
    gr.setLimit(500);
    gr.query();

    while (gr.next()) {
      var url = gr.url.toString();
      // Extract WHERE clause fields
      var whereMatch = url.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|$)/i);
      if (whereMatch) {
        var conditions = whereMatch[1].split(/\s+AND\s+/i);
        conditions.forEach(function(cond) {
          var fieldMatch = cond.match(/^(\w+)/);
          if (fieldMatch) {
            var field = fieldMatch[1];
            fieldUsage[field] = (fieldUsage[field] || 0) + 1;
          }
        });
      }
    }

    // Sort by usage
    var sorted = Object.keys(fieldUsage).sort(function(a,b) {
      return fieldUsage[b] - fieldUsage[a];
    });

    gs.info('Most queried fields (potential index candidates):');
    sorted.slice(0, 20).forEach(function(field) {
      gs.info('  ' + field + ': ' + fieldUsage[field] + ' queries');
    });
  description: Identify index candidates from slow queries
```

#### Step 4.2: Review Existing Indexes

**Check current indexes on a table:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_db_index
  query: table=incident
  fields: name,column_name,unique_index,active
  limit: 50
```

#### Step 4.3: Index Best Practices

**Fields that should be indexed:**
| Field Type | Index Priority | Example |
|------------|----------------|---------|
| Foreign keys | High | assigned_to, caller_id |
| Status fields | High | state, active |
| Date filters | Medium | opened_at, resolved_at |
| Category fields | Medium | category, subcategory |
| Number fields | Low | number (usually auto-indexed) |

**Index Creation Guidelines:**
- Maximum 5-7 indexes per table (beyond this, write performance degrades)
- Composite indexes for commonly combined queries
- Avoid indexing frequently updated fields
- Consider partial indexes for large tables

**Create Index (Admin Required):**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_db_index
  data:
    table: incident
    column_name: assignment_group
    active: true
```

### Phase 5: Async Business Rules

#### Step 5.1: Identify Synchronous Bottlenecks

**Find slow synchronous business rules:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: active=true^when!=async^collection=incident
  fields: name,when,order,sys_id
  limit: 50
```

#### Step 5.2: Convert to Async

**Criteria for async conversion:**
| Can Be Async | Must Stay Sync |
|--------------|----------------|
| Notifications | Field calculations |
| Logging/auditing | Data validation |
| External integrations | Workflow triggers |
| Non-critical updates | Security checks |
| Report generation | Display business rules |

**Async Business Rule Pattern:**
```javascript
// Async business rule example
// When: async
// Order: 100

(function executeRule(current, previous /*null when async*/) {

  // Safe for async - doesn't affect transaction
  var event = new GlideRecord('sysevent');
  event.initialize();
  event.name = 'incident.updated';
  event.parm1 = current.sys_id.toString();
  event.parm2 = current.number.toString();
  event.insert();

  // External notification
  var restMessage = new sn_ws.RESTMessageV2('External System', 'notify');
  restMessage.setStringParameter('incident_id', current.sys_id.toString());
  restMessage.executeAsync();  // Non-blocking

})(current, previous);
```

#### Step 5.3: Business Rule Optimization Checklist

```javascript
// OPTIMIZED Business Rule Template
(function executeRule(current, previous) {

  // 1. Exit early if field hasn't changed
  if (previous && !current.state.changes()) {
    return;  // No work needed
  }

  // 2. Exit early for bulk operations
  if (current.operation() == 'update' && !gs.isInteractive()) {
    // Consider if this should run for imports/scripts
  }

  // 3. Use efficient existence checks
  if (!current.assigned_to.nil()) {
    // Only process if assigned
  }

  // 4. Cache repeated calculations
  var state = current.state.toString();  // Store once

  // 5. Avoid GlideRecord in loops
  // Use dot-walking or batch loading instead

  // 6. Set fields directly when possible
  current.work_notes = 'State changed to: ' + current.state.getDisplayValue();
  // Don't update() - let the transaction handle it

})(current, previous);
```

### Phase 6: Script Performance Patterns

#### Step 6.1: Avoid Loops in Loops

**Anti-pattern:**
```javascript
// BAD: O(n*m) complexity
var incidents = new GlideRecord('incident');
incidents.query();
while (incidents.next()) {
  var tasks = new GlideRecord('sc_task');
  tasks.query();
  while (tasks.next()) {
    // Extremely slow: checks every task for every incident
    if (tasks.request_item == incidents.sys_id) {
      // process
    }
  }
}
```

**Optimized Pattern:**
```javascript
// GOOD: O(n+m) complexity
// Build lookup map first
var tasksByRequest = {};
var tasks = new GlideRecord('sc_task');
tasks.query();
while (tasks.next()) {
  var reqId = tasks.request_item.toString();
  if (!tasksByRequest[reqId]) {
    tasksByRequest[reqId] = [];
  }
  tasksByRequest[reqId].push(tasks.sys_id.toString());
}

// Now iterate incidents with O(1) lookups
var incidents = new GlideRecord('incident');
incidents.query();
while (incidents.next()) {
  var relatedTasks = tasksByRequest[incidents.sys_id.toString()] || [];
  // process related tasks
}
```

#### Step 6.2: String Concatenation

**Avoid repeated string concatenation:**
```javascript
// BAD: Creates new string object each iteration
var result = '';
var gr = new GlideRecord('incident');
gr.setLimit(1000);
gr.query();
while (gr.next()) {
  result += gr.number + ', ';  // Memory inefficient
}

// GOOD: Use array join
var results = [];
var gr = new GlideRecord('incident');
gr.setLimit(1000);
gr.query();
while (gr.next()) {
  results.push(gr.number.toString());
}
var result = results.join(', ');
```

#### Step 6.3: Efficient JSON Processing

**Handle large JSON efficiently:**
```javascript
// BAD: Parse entire JSON into memory
var bigJson = gr.large_json_field.toString();
var data = JSON.parse(bigJson);  // Entire object in memory

// GOOD: Stream processing for large data
// Use GlideStringUtil for validation
var jsonField = gr.large_json_field.toString();
if (GlideStringUtil.isJSON(jsonField)) {
  // Process in chunks if possible
  // Or use GlideElement methods
}

// BEST: Store structured data in related records
// instead of large JSON blobs
```

### Phase 7: Client-Side Performance

#### Step 7.1: Client Script Optimization

**Efficient Client Scripts:**
```javascript
// GOOD: Client script with performance optimizations
function onChange(control, oldValue, newValue, isLoading) {
  // 1. Skip during form load
  if (isLoading) {
    return;
  }

  // 2. Skip if value unchanged
  if (oldValue == newValue) {
    return;
  }

  // 3. Use g_form caching
  var priority = g_form.getValue('priority');  // Cached locally

  // 4. Batch field updates
  g_form.setReadOnly('resolution_code', true);
  g_form.setMandatory('resolution_notes', true);
  // Multiple setX calls are batched automatically

  // 5. Avoid synchronous GlideAjax
  var ga = new GlideAjax('IncidentUtils');
  ga.addParam('sysparm_name', 'getDefaultAssignee');
  ga.addParam('sysparm_priority', priority);
  ga.getXMLAnswer(function(answer) {
    // Async callback - doesn't block UI
    if (answer) {
      g_form.setValue('assigned_to', answer);
    }
  });
}
```

#### Step 7.2: UI Policy vs Client Script

**Choose the right tool:**
| Use Case | Recommended | Reason |
|----------|-------------|--------|
| Show/Hide fields | UI Policy | Declarative, faster |
| Set mandatory | UI Policy | No JavaScript overhead |
| Simple conditions | UI Policy | Cached, no network |
| Complex logic | Client Script | More flexibility |
| GlideAjax calls | Client Script | Required for server data |
| Field calculations | Client Script | Dynamic computation |

#### Step 7.3: Reduce Form Load Time

**Form Performance Checklist:**
- Limit related lists to 5 records by default
- Use display business rules sparingly
- Avoid onLoad scripts when possible
- Remove unused form sections
- Lazy-load embedded lists

**Query Slow Forms:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_slow_transaction
  query: urlLIKEform^sys_created_on>javascript:gs.daysAgo(7)
  fields: url,response_time,user
  limit: 50
  orderByDesc: response_time
```

### Phase 8: Caching Strategies

#### Step 8.1: System Properties Cache

**Use gs.getProperty with caching:**
```javascript
// Properties are cached automatically
var maxRecords = gs.getProperty('custom.max_records', '100');

// For frequently accessed properties, consider Script Include caching
var CachedConfig = Class.create();
CachedConfig.prototype = {
  initialize: function() {
    this.cache = {};
  },

  get: function(name, defaultValue) {
    if (!this.cache[name]) {
      this.cache[name] = gs.getProperty(name, defaultValue);
    }
    return this.cache[name];
  },

  type: 'CachedConfig'
};
```

#### Step 8.2: GlideSystem Cache

**Leverage built-in caching:**
```javascript
// Cache expensive calculations
var cacheKey = 'user_permissions_' + gs.getUserID();
var cached = gs.getSession().getClientData(cacheKey);

if (!cached) {
  // Calculate permissions (expensive)
  var permissions = calculateUserPermissions();
  gs.getSession().putClientData(cacheKey, JSON.stringify(permissions));
  cached = JSON.stringify(permissions);
}

var userPermissions = JSON.parse(cached);
```

#### Step 8.3: Reference Qualifier Caching

**Optimize reference qualifiers:**
```javascript
// BAD: Expensive query runs every time
javascript:new MyUtil().getValidAssignees()

// GOOD: Use encoded query directly
active=true^roles=itil

// BEST: Cache complex qualifiers
javascript:gs.getProperty('incident.assignee_qualifier', 'active=true')
```

### Phase 9: Performance Monitoring

#### Step 9.1: Create Performance Dashboard Query

**Monitor key metrics:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Performance Health Check
    var report = {
      timestamp: new GlideDateTime().getDisplayValue(),
      metrics: {}
    };

    // 1. Slow transactions today
    var slowTx = new GlideAggregate('sys_slow_transaction');
    slowTx.addQuery('sys_created_on', '>', gs.beginningOfToday());
    slowTx.addAggregate('COUNT');
    slowTx.addAggregate('AVG', 'response_time');
    slowTx.query();
    if (slowTx.next()) {
      report.metrics.slow_transactions = {
        count: parseInt(slowTx.getAggregate('COUNT')),
        avg_response_time: Math.round(parseFloat(slowTx.getAggregate('AVG', 'response_time')))
      };
    }

    // 2. Business rule execution times
    var brLogs = new GlideAggregate('syslog_transaction');
    brLogs.addQuery('type', 'business rule');
    brLogs.addQuery('sys_created_on', '>', gs.beginningOfToday());
    brLogs.addAggregate('COUNT');
    brLogs.addAggregate('AVG', 'response_time');
    brLogs.query();
    if (brLogs.next()) {
      report.metrics.business_rules = {
        count: parseInt(brLogs.getAggregate('COUNT')),
        avg_execution_time: Math.round(parseFloat(brLogs.getAggregate('AVG', 'response_time')))
      };
    }

    // 3. Error rate
    var errors = new GlideAggregate('syslog');
    errors.addQuery('level', '2');  // Error level
    errors.addQuery('sys_created_on', '>', gs.beginningOfToday());
    errors.addAggregate('COUNT');
    errors.query();
    if (errors.next()) {
      report.metrics.errors_today = parseInt(errors.getAggregate('COUNT'));
    }

    // 4. Active scheduled jobs
    var jobs = new GlideAggregate('sys_trigger');
    jobs.addQuery('state', '0');  // Ready
    jobs.addAggregate('COUNT');
    jobs.query();
    if (jobs.next()) {
      report.metrics.pending_jobs = parseInt(jobs.getAggregate('COUNT'));
    }

    gs.info('Performance Report:\n' + JSON.stringify(report, null, 2));
  description: Generate performance health report
```

#### Step 9.2: Set Up Alerts

**Create quota violation alerts:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysevent_script_action
  data:
    name: Performance Quota Alert
    event_name: performance.quota.exceeded
    script: |
      // Send alert on quota violations
      var quota_type = event.parm1;
      var details = event.parm2;

      gs.eventQueue('custom.performance.alert', null, quota_type, details);
```

## Tool Usage Summary

| Operation | MCP Tool | Purpose |
|-----------|----------|---------|
| Query Slow Transactions | SN-Query-Table | Find performance bottlenecks |
| Analyze Queries | SN-Execute-Background-Script | Deep analysis scripts |
| Check Schema | SN-Get-Table-Schema | Verify field types |
| Discover Indexes | SN-Discover-Table-Schema | Find existing indexes |
| Create Index | SN-Create-Record | Add missing indexes |

## Performance Optimization Checklist

### GlideRecord
- [ ] Always use setLimit()
- [ ] Select only needed fields with setFields() or fields parameter
- [ ] Use GlideAggregate for counts
- [ ] Use get() for single record lookups
- [ ] Avoid GlideRecord inside loops (N+1)

### Business Rules
- [ ] Use .changes() for conditional execution
- [ ] Convert non-critical rules to async
- [ ] Order rules appropriately (validation first)
- [ ] Exit early when possible

### Queries
- [ ] Index frequently filtered fields
- [ ] Use encoded queries for complex conditions
- [ ] Avoid LIKE queries on large text fields
- [ ] Limit date range queries

### Client-Side
- [ ] Use UI Policies over Client Scripts when possible
- [ ] Make GlideAjax calls asynchronous
- [ ] Skip onChange during form load
- [ ] Minimize related list records

### Caching
- [ ] Use system properties for configuration
- [ ] Cache expensive calculations
- [ ] Leverage session storage appropriately

## Troubleshooting

### High Form Load Times

**Symptom:** Form takes > 5 seconds to load
**Causes:**
- Too many related lists
- Expensive display business rules
- Complex UI policies with scripts
- Large attachment previews

**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_ui_related_list
  query: table=incident
  fields: related_list,order,view
  limit: 50
```

Review and reduce related lists, set lower default counts.

### Business Rule Timeouts

**Symptom:** Transaction times out after 180 seconds
**Causes:**
- Unbounded GlideRecord queries
- N+1 query patterns
- External API calls in sync rules

**Solution:**
1. Add setLimit() to all queries
2. Use batch loading pattern
3. Convert to async business rules
4. Move integrations to scheduled jobs

### Memory Quota Exceeded

**Symptom:** "Memory quota exceeded" errors
**Causes:**
- Loading too many records
- Large string concatenation
- Parsing large JSON/XML

**Solution:**
```javascript
// Process in batches
var BATCH_SIZE = 200;
var offset = 0;
var hasMore = true;

while (hasMore) {
  var gr = new GlideRecord('incident');
  gr.addQuery('active', true);
  gr.orderBy('sys_created_on');
  gr.chooseWindow(offset, offset + BATCH_SIZE);
  gr.query();

  var count = 0;
  while (gr.next()) {
    // Process record
    count++;
  }

  hasMore = (count == BATCH_SIZE);
  offset += BATCH_SIZE;

  // Force garbage collection hint
  gs.nil();
}
```

### Slow List Views

**Symptom:** List views take > 7 seconds to load
**Causes:**
- Missing indexes on filter fields
- Complex ACLs with script conditions
- Display value resolution on many references

**Solution:**
1. Add indexes on frequently filtered columns
2. Simplify ACL conditions
3. Reduce visible columns
4. Use list v3 for better performance

## Best Practices Summary

| Practice | Impact | Difficulty |
|----------|--------|------------|
| Add setLimit() | High | Easy |
| Use setFields() | High | Easy |
| Fix N+1 queries | Critical | Medium |
| Add indexes | High | Medium |
| Convert to async | Medium | Medium |
| Optimize loops | High | Medium |
| Enable caching | Medium | Medium |
| Client script async | Medium | Easy |

## Related Skills

- `admin/script-execution` - Background script execution patterns
- `admin/batch-operations` - Efficient bulk record operations
- `admin/schema-discovery` - Understanding table structures
- `development/debugging-techniques` - Troubleshooting scripts

## References

- [ServiceNow Performance Best Practices](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/general/reference/r_PerformanceBestPractices.html)
- [GlideRecord API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideRecordScopedAPI)
- [GlideAggregate API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideAggregateScopedAPI)
- [Session Debug](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/system-diagnostics/task/t_ActivateSessionDebugModule.html)
- [Transaction Quotas](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/reference-pages/concept/c_TransactionQuotas.html)
