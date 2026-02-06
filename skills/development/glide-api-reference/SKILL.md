---
name: glide-api-reference
version: 1.0.0
description: Essential Glide API reference covering GlideRecord, GlideAggregate, GlideDateTime, GlideSystem, and other core server-side APIs with practical patterns and examples
author: Happy Technologies LLC
tags: [development, glide, api, reference, scripting, gliderecord]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Execute-Background-Script
    - SN-Get-Table-Schema
    - SN-Create-Record
    - SN-Update-Record
  rest:
    - /api/now/table/{tableName}
    - /api/now/stats/{tableName}
  native:
    - Bash
    - Read
complexity: intermediate
estimated_time: 15-30 minutes
---

# Glide API Reference

## Overview

This skill provides a comprehensive reference for ServiceNow's server-side Glide APIs:

- **GlideRecord** - Query, insert, update, and delete records
- **GlideAggregate** - Perform aggregate operations (COUNT, SUM, AVG, etc.)
- **GlideDateTime/GlideDuration** - Date and time manipulation
- **GlideSystem (gs.*)** - System utilities and user context
- **GlideUser** - Current user information
- **GlideSession** - Session management
- **GlideElement** - Field-level methods
- **GlideEncrypter** - Encryption utilities
- **JSON/XML utilities** - Data transformation

**When to use:** When writing Business Rules, Script Includes, Scheduled Jobs, UI Actions, or any server-side script in ServiceNow.

**Who should use this:** ServiceNow developers at all levels who need a quick reference for Glide APIs.

## Prerequisites

- **Roles:** Varies by context (`admin` for background scripts, `itil` for record updates)
- **Knowledge:** Basic JavaScript, ServiceNow data model
- **Access:** Appropriate table ACLs for the records being accessed

## Procedure

The following sections provide comprehensive API reference and usage patterns.

### GlideRecord API

GlideRecord is the primary API for database operations in ServiceNow.

### Basic Query Pattern

```javascript
var gr = new GlideRecord('incident');
gr.addQuery('active', true);
gr.addQuery('priority', 1);
gr.query();

while (gr.next()) {
    gs.info('Incident: ' + gr.number + ' - ' + gr.short_description);
}
```

### Query Methods

| Method | Description | Example |
|--------|-------------|---------|
| `addQuery(field, value)` | Equals condition | `gr.addQuery('active', true)` |
| `addQuery(field, operator, value)` | Comparison condition | `gr.addQuery('priority', '<=', 2)` |
| `addEncodedQuery(query)` | Encoded query string | `gr.addEncodedQuery('active=true^priority=1')` |
| `addNotNullQuery(field)` | Field is not empty | `gr.addNotNullQuery('assigned_to')` |
| `addNullQuery(field)` | Field is empty | `gr.addNullQuery('resolution_notes')` |
| `addOrCondition(field, value)` | OR condition | See example below |
| `query()` | Execute the query | `gr.query()` |

### Query Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equals (default) | `addQuery('state', 1)` |
| `!=` | Not equals | `addQuery('state', '!=', 6)` |
| `>` | Greater than | `addQuery('priority', '>', 1)` |
| `>=` | Greater than or equal | `addQuery('sys_created_on', '>=', gs.daysAgo(7))` |
| `<` | Less than | `addQuery('priority', '<', 3)` |
| `<=` | Less than or equal | `addQuery('sys_updated_on', '<=', gs.daysAgo(30))` |
| `STARTSWITH` | Starts with string | `addQuery('number', 'STARTSWITH', 'INC')` |
| `ENDSWITH` | Ends with string | `addQuery('short_description', 'ENDSWITH', 'error')` |
| `CONTAINS` | Contains string | `addQuery('description', 'CONTAINS', 'network')` |
| `DOES NOT CONTAIN` | Does not contain | `addQuery('description', 'DOES NOT CONTAIN', 'test')` |
| `IN` | In list of values | `addQuery('state', 'IN', '1,2,3')` |
| `NOT IN` | Not in list | `addQuery('priority', 'NOT IN', '4,5')` |
| `INSTANCEOF` | Table hierarchy | `addQuery('sys_class_name', 'INSTANCEOF', 'cmdb_ci')` |

### OR Conditions

```javascript
var gr = new GlideRecord('incident');
var qc = gr.addQuery('priority', 1);
qc.addOrCondition('priority', 2);
gr.query();
// Equivalent to: priority=1^ORpriority=2
```

### Complex Query Example

```javascript
var gr = new GlideRecord('incident');
gr.addQuery('active', true);
gr.addQuery('priority', '<=', 2);
gr.addNotNullQuery('assigned_to');
gr.addQuery('sys_created_on', '>=', gs.daysAgo(30));

// OR condition group
var qc = gr.addQuery('category', 'network');
qc.addOrCondition('category', 'hardware');

gr.orderByDesc('priority');
gr.orderBy('sys_created_on');
gr.setLimit(100);
gr.query();
```

### Insert Operations

```javascript
// Basic insert
var gr = new GlideRecord('incident');
gr.initialize();
gr.short_description = 'New incident from script';
gr.description = 'Detailed description here';
gr.caller_id = gs.getUserID();
gr.priority = 3;
gr.category = 'inquiry';
var sysId = gr.insert();

gs.info('Created incident: ' + gr.number + ' (sys_id: ' + sysId + ')');
```

### Insert with Field Validation

```javascript
var gr = new GlideRecord('incident');
gr.initialize();

// Check if field is valid before setting
if (gr.isValidField('custom_field')) {
    gr.custom_field = 'value';
}

// Use setValue for reference fields (safer)
gr.setValue('assignment_group', 'a715cd759f2002002920bde8132e7018');
gr.setValue('assigned_to', gs.getUserID());

var sysId = gr.insert();
```

### Update Operations

```javascript
// Update single record by sys_id
var gr = new GlideRecord('incident');
if (gr.get('a1b2c3d4e5f6...')) {
    gr.state = 2;  // In Progress
    gr.work_notes = 'Automated update via script';
    gr.update();
    gs.info('Updated: ' + gr.number);
}
```

### Bulk Update Pattern

```javascript
// Update multiple records matching query
var gr = new GlideRecord('incident');
gr.addQuery('active', true);
gr.addQuery('priority', 1);
gr.addNullQuery('assigned_to');
gr.query();

var count = 0;
while (gr.next()) {
    gr.assignment_group = 'Critical Incidents Team';
    gr.work_notes = 'Auto-assigned to critical team';
    gr.update();
    count++;
}

gs.info('Updated ' + count + ' incidents');
```

### Delete Operations

```javascript
// Delete single record
var gr = new GlideRecord('sys_user_preference');
if (gr.get('sys_id_here')) {
    gr.deleteRecord();
}

// Delete multiple records (USE WITH CAUTION!)
var gr = new GlideRecord('temp_import_table');
gr.addQuery('sys_created_on', '<', gs.daysAgo(30));
gr.deleteMultiple();  // Deletes ALL matching records
```

### Navigation Methods

| Method | Description |
|--------|-------------|
| `next()` | Move to next record, returns true if exists |
| `hasNext()` | Check if more records exist (doesn't advance) |
| `get(sysId)` | Get record by sys_id |
| `get(field, value)` | Get record by field value |
| `getRowCount()` | Total records in query result |

### Limiting and Windowing

```javascript
// Limit results
gr.setLimit(10);

// Pagination with chooseWindow
gr.chooseWindow(0, 100);    // First 100 records
gr.chooseWindow(100, 200);  // Records 101-200

// Order results
gr.orderBy('priority');       // Ascending
gr.orderByDesc('sys_created_on');  // Descending
```

### Record State Methods

| Method | Description |
|--------|-------------|
| `isNewRecord()` | True if record hasn't been inserted yet |
| `isValidRecord()` | True if current record is valid |
| `isValidField(field)` | True if field exists on table |
| `canRead()` | True if user can read record |
| `canWrite()` | True if user can write to record |
| `canCreate()` | True if user can create records |
| `canDelete()` | True if user can delete record |
| `changes()` | True if any field has changed |

### Using MCP Tool

```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^priority=1
  fields: sys_id,number,short_description,state,priority
  limit: 10
```

---

## GlideAggregate API

GlideAggregate performs database aggregation operations efficiently at the database level.

### Basic COUNT

```javascript
var ga = new GlideAggregate('incident');
ga.addQuery('active', true);
ga.addAggregate('COUNT');
ga.query();

if (ga.next()) {
    var count = ga.getAggregate('COUNT');
    gs.info('Active incidents: ' + count);
}
```

### Aggregate Functions

| Function | Description | Example |
|----------|-------------|---------|
| `COUNT` | Count records | `ga.addAggregate('COUNT')` |
| `SUM` | Sum numeric field | `ga.addAggregate('SUM', 'actual_hours')` |
| `AVG` | Average of field | `ga.addAggregate('AVG', 'priority')` |
| `MIN` | Minimum value | `ga.addAggregate('MIN', 'sys_created_on')` |
| `MAX` | Maximum value | `ga.addAggregate('MAX', 'priority')` |

### GROUP BY Operations

```javascript
// Count incidents by priority
var ga = new GlideAggregate('incident');
ga.addQuery('active', true);
ga.addAggregate('COUNT');
ga.groupBy('priority');
ga.query();

while (ga.next()) {
    var priority = ga.priority;
    var count = ga.getAggregate('COUNT');
    gs.info('Priority ' + priority + ': ' + count + ' incidents');
}
```

### Multiple Aggregates

```javascript
// Get count and average time per category
var ga = new GlideAggregate('incident');
ga.addQuery('active', true);
ga.addAggregate('COUNT');
ga.addAggregate('AVG', 'reassignment_count');
ga.groupBy('category');
ga.orderByAggregate('COUNT');  // Order by count
ga.query();

while (ga.next()) {
    gs.info(ga.category + ': ' +
            ga.getAggregate('COUNT') + ' incidents, ' +
            'avg reassignments: ' + ga.getAggregate('AVG', 'reassignment_count'));
}
```

### Having Clause (Filter Aggregates)

```javascript
// Categories with more than 10 incidents
var ga = new GlideAggregate('incident');
ga.addQuery('active', true);
ga.addAggregate('COUNT');
ga.groupBy('category');
ga.addHaving('COUNT', '>', 10);
ga.query();
```

### Trend Analysis Pattern

```javascript
// Incidents created per day over last 7 days
var ga = new GlideAggregate('incident');
ga.addQuery('sys_created_on', '>=', gs.daysAgo(7));
ga.addAggregate('COUNT');
ga.addTrend('sys_created_on', 'Day');
ga.query();

while (ga.next()) {
    var date = ga.getValue('timeref');
    var count = ga.getAggregate('COUNT');
    gs.info(date + ': ' + count + ' incidents created');
}
```

---

## GlideDateTime API

GlideDateTime handles date and time operations with timezone awareness.

### Creating GlideDateTime Objects

```javascript
// Current date/time
var gdt = new GlideDateTime();

// From string (UTC format)
var gdt = new GlideDateTime('2026-02-06 12:00:00');

// Copy existing
var gdt2 = new GlideDateTime(gdt);
```

### Getting Values

| Method | Description | Example Output |
|--------|-------------|----------------|
| `getValue()` | Internal value (UTC) | `2026-02-06 12:00:00` |
| `getDisplayValue()` | User timezone | `2026-02-06 04:00:00` |
| `getDate()` | Date portion | `2026-02-06` |
| `getTime()` | Time portion | `12:00:00` |
| `getNumericValue()` | Milliseconds since epoch | `1770465600000` |
| `getDayOfWeek()` | Day number (1=Mon) | `5` (Friday) |
| `getDayOfMonth()` | Day of month | `6` |
| `getMonthUTC()` | Month (1-12) | `2` |
| `getYearUTC()` | Year | `2026` |

### Setting Values

```javascript
var gdt = new GlideDateTime();

// Set from string
gdt.setValue('2026-12-25 00:00:00');

// Set display value (user timezone)
gdt.setDisplayValue('2026-12-25 00:00:00');

// Set components
gdt.setYearUTC(2026);
gdt.setMonthUTC(12);
gdt.setDayOfMonthUTC(25);
```

### Date Arithmetic

```javascript
var gdt = new GlideDateTime();

// Add time
gdt.addSeconds(60);
gdt.addMinutes(30);
gdt.addHours(2);
gdt.addDays(7);
gdt.addMonths(1);
gdt.addYears(1);

// Add GlideDuration
var duration = new GlideDuration('1 12:30:00');  // 1 day, 12 hours, 30 minutes
gdt.add(duration);

// Subtract
gdt.addDays(-7);  // 7 days ago
```

### Date Comparison

```javascript
var gdt1 = new GlideDateTime('2026-02-06 12:00:00');
var gdt2 = new GlideDateTime('2026-02-07 12:00:00');

// Compare
if (gdt1.before(gdt2)) {
    gs.info('gdt1 is earlier');
}

if (gdt2.after(gdt1)) {
    gs.info('gdt2 is later');
}

if (gdt1.equals(gdt2)) {
    gs.info('Same date/time');
}

// Get difference
var diff = GlideDateTime.subtract(gdt1, gdt2);
gs.info('Difference: ' + diff.getDisplayValue());  // Duration
```

### Common Date Patterns

```javascript
// Start of today
var startOfDay = new GlideDateTime();
startOfDay.setDisplayValue(startOfDay.getDate() + ' 00:00:00');

// End of today
var endOfDay = new GlideDateTime();
endOfDay.setDisplayValue(endOfDay.getDate() + ' 23:59:59');

// Beginning of month
var startOfMonth = new GlideDateTime();
startOfMonth.setDayOfMonthUTC(1);
startOfMonth.setDisplayValue(startOfMonth.getDate() + ' 00:00:00');

// Check if date is in future
function isFuture(dateField) {
    var now = new GlideDateTime();
    var target = new GlideDateTime(dateField);
    return target.after(now);
}
```

---

## GlideDuration API

GlideDuration represents a length of time.

### Creating Durations

```javascript
// From string (days hours:minutes:seconds)
var dur = new GlideDuration('1 12:30:00');  // 1 day, 12 hours, 30 minutes

// From milliseconds
var dur = new GlideDuration(86400000);  // 1 day in ms

// From two GlideDateTimes
var start = new GlideDateTime('2026-02-06 00:00:00');
var end = new GlideDateTime('2026-02-07 12:00:00');
var dur = GlideDateTime.subtract(start, end);
```

### Duration Methods

| Method | Description |
|--------|-------------|
| `getValue()` | Internal value |
| `getDisplayValue()` | Human-readable |
| `getNumericValue()` | Milliseconds |
| `getDayPart()` | Days component |
| `getRoundedDayPart()` | Rounded days |
| `getDurationValue()` | Duration string |

### Duration Arithmetic

```javascript
var dur1 = new GlideDuration('1 00:00:00');  // 1 day
var dur2 = new GlideDuration('0 12:00:00');  // 12 hours

// Add
var total = dur1.add(dur2);  // 1 day 12 hours

// Subtract
var diff = dur1.subtract(dur2);  // 12 hours

// Compare
dur1.compareTo(dur2);  // -1, 0, or 1
```

### Calculate Business Duration

```javascript
// Calculate business hours between two dates using schedule
var schedule = new GlideSchedule('08fcd0830a0a0b2600079f56b1adb9ae');  // 8-5 M-F
var startDate = new GlideDateTime('2026-02-06 09:00:00');
var endDate = new GlideDateTime('2026-02-07 17:00:00');

var duration = schedule.duration(startDate, endDate);
gs.info('Business duration: ' + duration.getDisplayValue());
```

---

## GlideSystem (gs.*) Methods

GlideSystem provides utility functions and access to system context.

### User Context

| Method | Description |
|--------|-------------|
| `gs.getUserID()` | Current user's sys_id |
| `gs.getUserName()` | Username |
| `gs.getUserDisplayName()` | Full name |
| `gs.getUser()` | GlideUser object |
| `gs.hasRole(role)` | Check user role |
| `gs.hasRoleInGroup(role, group)` | Check role in group |

### Date/Time Shortcuts

```javascript
// Relative dates (return strings for queries)
gs.now();           // Current timestamp
gs.nowDateTime();   // Current date/time
gs.daysAgo(7);      // 7 days ago
gs.daysAgoStart(7); // Start of day 7 days ago
gs.daysAgoEnd(7);   // End of day 7 days ago
gs.hoursAgo(2);     // 2 hours ago
gs.minutesAgo(30);  // 30 minutes ago
gs.monthsAgo(1);    // 1 month ago
gs.yearsAgo(1);     // 1 year ago
gs.beginningOfLastMonth();
gs.endOfLastMonth();
gs.beginningOfThisMonth();
gs.beginningOfThisYear();
```

### Query Date Example

```javascript
// Incidents created in last 7 days
var gr = new GlideRecord('incident');
gr.addQuery('sys_created_on', '>=', gs.daysAgo(7));
gr.query();

// Using encoded query
gr.addEncodedQuery('sys_created_onONLast 7 days@javascript:gs.daysAgoStart(7)@javascript:gs.daysAgoEnd(0)');
```

### Logging

```javascript
gs.info('Informational message');
gs.warn('Warning message');
gs.error('Error message');
gs.debug('Debug message');  // Only logged if debug enabled

// Include data in logs
gs.info('Processing incident: ' + current.number + ', State: ' + current.state);

// Log to specific source
gs.log('Custom log entry', 'MyScriptName');
```

### System Properties

```javascript
// Get property
var value = gs.getProperty('glide.ui.session_timeout');
var valueWithDefault = gs.getProperty('custom.setting', 'default_value');

// Set property (requires admin)
gs.setProperty('custom.setting', 'new_value');
```

### Session and Request

```javascript
// Session data
gs.getSession().putClientData('key', 'value');
var data = gs.getSession().getClientData('key');

// URL parameters (in UI scripts)
gs.getUrlParameter('sysparm_record');

// Language
gs.getLanguage();  // e.g., 'en'
```

### Miscellaneous

```javascript
// Generate GUID
var guid = gs.generateGUID();

// Nil/empty check
gs.nil('');     // true
gs.nil(null);   // true
gs.nil(false);  // false (has value)

// Get table label
gs.getTableLabel('incident');  // 'Incident'

// Check table exists
gs.tableExists('incident');  // true

// Get current scope
gs.getCurrentScopeName();  // 'global' or scope name

// Print (deprecated, use gs.info)
gs.print('message');  // Logs to system log
```

---

## GlideUser API

GlideUser provides current user information.

```javascript
var user = gs.getUser();

// User identification
user.getID();               // sys_id
user.getName();             // username
user.getDisplayName();      // full name
user.getEmail();            // email address
user.getFirstName();        // first name
user.getLastName();         // last name
user.getLocation();         // location sys_id
user.getDepartmentID();     // department sys_id
user.getCompanyID();        // company sys_id
user.getManagerID();        // manager sys_id

// Role checking
user.hasRole('admin');                    // true/false
user.hasRoleInGroup('itil', groupId);     // true/false
user.hasRoleExactly('admin');             // exact match, not elevated
user.getRoles();                          // array of roles

// Preference
user.getPreference('timezone');
user.savePreference('custom.pref', 'value');

// Delegation (impersonation)
user.isMemberOf(groupId);                 // check group membership
```

---

## GlideSession API

GlideSession manages user session data.

```javascript
var session = gs.getSession();

// Session identification
session.getSessionToken();     // session token
session.getClientIP();         // client IP address
session.getCurrentApplicationId();  // current app scope

// Client data (persists during session)
session.putClientData('key', 'value');
var value = session.getClientData('key');

// Language
session.getLanguage();         // 'en', 'de', etc.

// Timezone
session.getTimeZoneName();     // e.g., 'America/Los_Angeles'

// Check if logged in
session.isLoggedIn();          // true/false

// Impersonation
session.isImpersonating();     // true if impersonating
session.getImpersonatingUserName();  // original user
```

---

## GlideElement Methods

GlideElement provides field-level access and methods on GlideRecord fields.

### Getting Values

```javascript
var gr = new GlideRecord('incident');
gr.get('sys_id_here');

// Different value methods
gr.short_description.toString();      // String value
gr.priority.getValue();               // Internal value
gr.priority.getDisplayValue();        // Display value
gr.assigned_to.getRefRecord();        // Get referenced record (GlideRecord)
gr.getDisplayValue();                 // Current record display value
gr.assigned_to.getReferenceTable();   // Referenced table name
```

### Reference Fields

```javascript
// Get reference value
var assignedTo = gr.assigned_to.getDisplayValue();  // User's name

// Get referenced record
var userGr = gr.assigned_to.getRefRecord();
if (userGr.isValidRecord()) {
    gs.info('Assigned to: ' + userGr.email);
}

// Check if reference is empty
if (gr.assigned_to.nil()) {
    gs.info('Not assigned');
}
```

### Field State Methods

```javascript
// Check if field changed (in business rules)
if (gr.state.changes()) {
    gs.info('State changed from ' + gr.state.getOldValue() + ' to ' + gr.state.getValue());
}

// Check for changes to specific value
if (gr.state.changesFrom('1')) {
    gs.info('State changed from New');
}

if (gr.state.changesTo('6')) {
    gs.info('State changed to Resolved');
}

// Get old value
var previousState = gr.state.getOldValue();
```

### Field Attributes

```javascript
// Get field metadata
var element = gr.getElement('short_description');
element.getLabel();           // Field label
element.getTableName();       // Table name
element.getED();              // Element descriptor

// Check field properties
element.canRead();            // User can read
element.canWrite();           // User can write
element.hasValue();           // Has non-null value
element.nil();                // Is null/empty
```

### Journal Fields

```javascript
// Work notes / comments
gr.work_notes = 'Adding a work note';
gr.comments = 'Adding a customer-visible comment';

// Get journal entries
var journal = gr.work_notes.getJournalEntry(1);  // Most recent
var allJournal = gr.work_notes.getJournalEntry(-1);  // All entries
```

---

## GlideEncrypter API

GlideEncrypter provides encryption and hashing utilities.

```javascript
var encrypter = new GlideEncrypter();

// One-way hash (MD5)
var hash = encrypter.encrypt('sensitive_data');

// Two-way encryption (for password fields)
var encrypted = new GlideEncrypter().encrypt('password123');

// Decrypt (if two-way)
var decrypted = new GlideEncrypter().decrypt(encrypted);
```

### Password Hashing

```javascript
// Hash password (one-way)
var hashedPassword = GlideStringUtil.getStringFromStream(
    new GlideDigest().md5(password)
);
```

---

## JSON and XML Utilities

### JSON Operations

```javascript
// Parse JSON
var jsonString = '{"name":"John","age":30}';
var obj = JSON.parse(jsonString);
gs.info(obj.name);  // 'John'

// Stringify object
var data = { name: 'John', age: 30 };
var jsonStr = JSON.stringify(data);
var prettyJson = JSON.stringify(data, null, 2);

// Global JSON utility
var parser = new global.JSON();
var obj = parser.decode(jsonString);
var str = parser.encode(obj);

// In scoped apps
var obj = global.JSON.parse(jsonString);
var str = global.JSON.stringify(data);
```

### JSON in GlideRecord

```javascript
// Store JSON in field
gr.u_json_data = JSON.stringify({ key: 'value' });
gr.update();

// Retrieve JSON
var data = JSON.parse(gr.u_json_data);
```

### XML Utilities

```javascript
// Create XML document
var xmlDoc = new XMLDocument('<root></root>');
var root = xmlDoc.getDocumentElement();
var child = xmlDoc.createElement('child');
child.setAttribute('attr', 'value');
root.appendChild(child);
var xmlString = xmlDoc.toString();

// Parse XML
var parser = new XMLDocument(xmlString);
var elements = parser.getElementByTagName('child');
```

### XMLHelper

```javascript
// Convert GlideRecord to XML
var gr = new GlideRecord('incident');
gr.get('sys_id_here');
var xml = new GlideRecordXMLSerializer(gr).serialize();

// Pretty print XML
var prettyXml = new global.XMLPrettyPrint().prettyPrint(xmlString);
```

---

## Common Query Patterns

### Pattern 1: Efficient Single Record Lookup

```javascript
// GOOD: Direct lookup
var gr = new GlideRecord('sys_user');
if (gr.get('user_name', 'admin')) {
    gs.info('Found: ' + gr.name);
}

// AVOID: Query with single result
var gr = new GlideRecord('sys_user');
gr.addQuery('user_name', 'admin');
gr.setLimit(1);
gr.query();
if (gr.next()) {
    gs.info('Found: ' + gr.name);
}
```

### Pattern 2: Check Record Exists

```javascript
// Efficient existence check
function recordExists(table, field, value) {
    var gr = new GlideRecord(table);
    gr.addQuery(field, value);
    gr.setLimit(1);
    gr.query();
    return gr.hasNext();
}

// Usage
if (recordExists('sys_user', 'user_name', 'admin')) {
    gs.info('User exists');
}
```

### Pattern 3: Get Field from Reference

```javascript
// Get value from referenced record
var gr = new GlideRecord('incident');
gr.get('sys_id_here');

// Direct dot-walk (generates extra query)
var callerEmail = gr.caller_id.email;

// More efficient for multiple fields
var callerGr = gr.caller_id.getRefRecord();
if (callerGr.isValidRecord()) {
    var email = callerGr.email;
    var phone = callerGr.phone;
    var dept = callerGr.department.getDisplayValue();
}
```

### Pattern 4: Batch Processing

```javascript
// Process records in batches to avoid memory issues
function processInBatches(table, query, batchSize, callback) {
    var offset = 0;
    var hasMore = true;

    while (hasMore) {
        var gr = new GlideRecord(table);
        gr.addEncodedQuery(query);
        gr.chooseWindow(offset, offset + batchSize);
        gr.query();

        var count = 0;
        while (gr.next()) {
            callback(gr);
            count++;
        }

        hasMore = (count === batchSize);
        offset += batchSize;

        gs.info('Processed batch: ' + offset);
    }
}

// Usage
processInBatches('incident', 'active=true', 1000, function(gr) {
    // Process each record
    gr.work_notes = 'Batch processed';
    gr.update();
});
```

### Pattern 5: Safe Reference Setting

```javascript
// Resolve reference by name
function getUserSysId(username) {
    var gr = new GlideRecord('sys_user');
    if (gr.get('user_name', username)) {
        return gr.sys_id.toString();
    }
    return null;
}

// Usage
var gr = new GlideRecord('incident');
gr.initialize();
var userId = getUserSysId('admin');
if (userId) {
    gr.setValue('assigned_to', userId);
} else {
    gs.warn('User not found: admin');
}
gr.insert();
```

### Pattern 6: Conditional Update (Only if Changed)

```javascript
var gr = new GlideRecord('incident');
gr.get('sys_id_here');

var changed = false;

// Only update if different
if (gr.priority != 2) {
    gr.priority = 2;
    changed = true;
}

if (gr.state != 2) {
    gr.state = 2;
    changed = true;
}

if (changed) {
    gr.update();
    gs.info('Record updated');
} else {
    gs.info('No changes needed');
}
```

---

## Using MCP Tools for Glide Operations

### Query with MCP

```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^priority<=2
  fields: sys_id,number,short_description,state,priority,assigned_to
  limit: 50
```

### Execute Script with MCP

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Count incidents by priority
    var results = {};

    var ga = new GlideAggregate('incident');
    ga.addQuery('active', true);
    ga.addAggregate('COUNT');
    ga.groupBy('priority');
    ga.query();

    while (ga.next()) {
      results['P' + ga.priority] = ga.getAggregate('COUNT');
    }

    gs.info('Incident counts: ' + JSON.stringify(results));
  description: Count active incidents by priority
```

### Create Record with MCP

```
Tool: SN-Create-Record
Parameters:
  table_name: incident
  data:
    short_description: Created via MCP
    description: Detailed description
    caller_id: [user_sys_id]
    priority: 3
    category: inquiry
```

---

## Best Practices

- **Use GlideAggregate for counts** - Never iterate with GlideRecord just to count records
- **Set limits** - Always use `setLimit()` to prevent runaway queries
- **Use encoded queries** - More efficient than multiple `addQuery()` calls
- **Avoid dot-walking in loops** - Cache reference lookups outside the loop
- **Check permissions** - Use `canRead()`, `canWrite()` before operations
- **Use setValue for references** - Safer than direct assignment
- **Handle null references** - Check `gr.field.nil()` before accessing
- **Log operations** - Include identifiable info in logs for debugging
- **Test queries first** - Use MCP `SN-Query-Table` to verify query logic

## Troubleshooting

### Query Returns No Results

**Symptom:** GlideRecord query returns nothing
**Causes:**
- Incorrect query syntax
- ACL blocking access
- Data doesn't match criteria
**Solution:**
```javascript
// Debug query
gs.info('Query: ' + gr.getEncodedQuery());
gs.info('Row count: ' + gr.getRowCount());
```

### Reference Field Shows sys_id

**Symptom:** Reference displays sys_id instead of name
**Cause:** Using `getValue()` instead of `getDisplayValue()`
**Solution:**
```javascript
// WRONG
var name = gr.assigned_to.getValue();  // Returns sys_id

// RIGHT
var name = gr.assigned_to.getDisplayValue();  // Returns name
```

### Changes Not Detected in Business Rule

**Symptom:** `gr.field.changes()` returns false unexpectedly
**Cause:** Checking wrong field or comparing wrong values
**Solution:**
```javascript
// Debug changes
gs.info('Field changes: ' + gr.state.changes());
gs.info('Old value: ' + gr.state.getOldValue());
gs.info('New value: ' + gr.state.getValue());
```

## Related Skills

- `admin/script-execution` - Background script execution patterns
- `admin/batch-operations` - Bulk record operations
- `development/business-rules` - Business rule development (coming soon)
- `development/script-includes` - Reusable script patterns (coming soon)

## References

- [GlideRecord API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideRecordScopedAPI)
- [GlideAggregate API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideAggregateScopedAPI)
- [GlideDateTime API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideDateTimeScopedAPI)
- [GlideSystem API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideSystemScopedAPI)
- [ServiceNow Developer Documentation](https://developer.servicenow.com/)
