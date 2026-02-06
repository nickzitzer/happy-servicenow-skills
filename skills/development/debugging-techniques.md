---
name: debugging-techniques
version: 1.0.0
description: Comprehensive guide to debugging ServiceNow server-side and client-side code
author: Happy Technologies LLC
tags: [development, debugging, troubleshooting, logs, errors]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp: [SN-Query-Table, SN-Execute-Background-Script, SN-Get-Record]
  rest: [/api/now/table/syslog, /api/now/table/sys_script_execution_history]
  native: [Bash, Read]
complexity: intermediate
estimated_time: 15-30 minutes
---

# ServiceNow Debugging Techniques

## Overview

Master the art of debugging ServiceNow applications using built-in tools and techniques. This skill covers server-side debugging, client-side debugging, log analysis, and common error resolution.

- **What problem does it solve?** Identifies and resolves issues in business rules, script includes, client scripts, workflows, and flows
- **Who should use this skill?** ServiceNow developers, administrators, and support engineers
- **What are the expected outcomes?** Faster issue identification, efficient troubleshooting, and cleaner code

## Prerequisites

- Required ServiceNow roles: `admin` or `script_write` for Script Debugger
- Access to System Logs (System Logs > All)
- Browser Developer Tools knowledge (Chrome DevTools, Firefox Developer Tools)
- Understanding of JavaScript fundamentals

## Procedure

### Server-Side Debugging

#### Logging Functions

ServiceNow provides multiple logging functions for server-side scripts. Choose based on log level and visibility requirements.

| Function | Log Level | Use Case |
|----------|-----------|----------|
| `gs.log(message, source)` | Debug | Development/testing - legacy, prefer gs.debug |
| `gs.debug(message)` | Debug | Detailed troubleshooting (requires debug enabled) |
| `gs.info(message)` | Info | Informational messages for normal operations |
| `gs.warn(message)` | Warning | Potential issues that don't stop execution |
| `gs.error(message)` | Error | Errors that need attention |

**Best Practice: Always include context in log messages:**
```javascript
// BAD - No context
gs.info('Record updated');

// GOOD - Full context
gs.info('[IncidentHandler] Incident ' + current.number + ' updated by ' + gs.getUserName() +
        ' - State changed from ' + current.state.getDisplayValue() + ' to ' + previous.state.getDisplayValue());
```

**Querying System Logs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: source=IncidentHandler^sys_created_onONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()
  fields: sys_created_on,level,message,source
  limit: 50
  order_by: sys_created_on
  order_by_desc: true
```

### Script Debugger

The Script Debugger allows step-by-step execution of server-side scripts.

**Enabling the Script Debugger:**

1. Navigate to **System Diagnostics > Script Debugger**
2. Click **Enable Debugging** for your session
3. Set breakpoints in scripts using the debugger UI
4. Trigger the script (e.g., update a record)
5. Step through code using F10 (step over), F11 (step into), F5 (continue)

**Debugging Business Rules:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: collection=incident^active=true
  fields: name,order,when,script,condition
  limit: 50
  order_by: order
```

**Key Features:**
- Variable inspection (hover over variables)
- Call stack visualization
- Watch expressions
- Conditional breakpoints

### Session Debug Modules

Enable detailed logging for specific components during your session.

**Common Session Debug Modules:**

| Module | Purpose | Enable Path |
|--------|---------|-------------|
| `Session Debug` | All session debugging | System Diagnostics > Session Debug > All |
| `Business Rules` | Log BR execution | System Diagnostics > Session Debug > Business Rules |
| `SQL` | Log database queries | System Diagnostics > Session Debug > SQL |
| `Security` | ACL debugging | System Diagnostics > Session Debug > Security |
| `Client Scripts` | Log client script data | System Diagnostics > Session Debug > Client Scripts |

**Enable via Script:**
```javascript
// Enable business rule debugging for current session
gs.setProperty('glide.debugger.current.enabled', 'true');
```

### Script Execution History

Track script execution for troubleshooting.

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_execution_history
  query: sys_created_onONLast 1 hour@javascript:gs.hoursAgo(1)@javascript:gs.nowDateTime()
  fields: script,execution_time,status,error_message,sys_created_on
  limit: 100
  order_by: sys_created_on
  order_by_desc: true
```

## Client-Side Debugging

### Browser Console Methods

| Method | Purpose |
|--------|---------|
| `console.log()` | General logging |
| `console.info()` | Informational messages |
| `console.warn()` | Warning messages |
| `console.error()` | Error messages |
| `console.table()` | Display data in table format |
| `console.trace()` | Show call stack |

**ServiceNow-Specific:**
```javascript
// jslog - ServiceNow legacy logging (outputs to console when enabled)
jslog('Client script executed: ' + g_form.getValue('number'));

// Check if debug mode is enabled
if (window.NOW && NOW.debug) {
    console.log('[DEBUG] Form loaded for: ' + g_form.getValue('sys_id'));
}
```

### Browser DevTools Debugging

**Chrome DevTools Workflow:**

1. Open DevTools (F12 or Cmd+Option+I)
2. Navigate to **Sources** tab
3. Find client scripts under `scripts.do?sysparm_type=` or in the page source
4. Set breakpoints by clicking line numbers
5. Use **Watch** panel to monitor variables
6. Use **Scope** panel to inspect local/closure variables

**Useful DevTools Commands:**
```javascript
// In Console - Inspect form field
g_form.getValue('short_description');

// Get all form values
g_form.serialize();

// Check if field is mandatory
g_form.isMandatory('priority');

// Inspect GlideAjax response
// Set breakpoint in callback function to inspect 'response' object
```

### Network Tab Analysis

Monitor AJAX calls and API requests:

1. Open DevTools > Network tab
2. Filter by XHR/Fetch
3. Look for calls to:
   - `xmlhttp.do` - GlideAjax calls
   - `api/now/` - REST API calls
   - `sysparm_processor` - Form submissions

**Common Network Issues:**
- 401/403 errors - Authentication/ACL issues
- 500 errors - Server-side script errors
- Slow responses - Check Timing tab for breakdown

## Transaction Logs

### Analyzing Transaction Performance

```
Tool: SN-Query-Table
Parameters:
  table_name: syslog_transaction
  query: sys_created_onONLast 1 hour@javascript:gs.hoursAgo(1)@javascript:gs.nowDateTime()^urlLIKEincident
  fields: url,response_time,user,sys_created_on,status
  limit: 50
  order_by: response_time
  order_by_desc: true
```

### Slow Query Detection

```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: messageLIKEslow query^sys_created_onONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()
  fields: sys_created_on,message,source
  limit: 100
```

## Debugging Business Rules

### Understanding Business Rule Execution Order

Business rules execute in this order for each operation (insert, update, delete):

1. **before** rules (order ascending) - Execute before database write
2. **after** rules (order ascending) - Execute after database write
3. **async** rules - Execute asynchronously

**Critical: Order Matters!**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: collection=incident^active=true^when=before
  fields: name,order,when,condition,script
  limit: 100
  order_by: order
```

**Debugging Order Issues:**
```javascript
// Add to each business rule to trace execution order
gs.info('[BR Debug] ' + current.sys_class_name + ' - ' +
        'Name: ' + current.getTableName() + '_BR_Name - ' +
        'Order: ' + 100 + ' - ' +
        'When: before - ' +
        'Record: ' + current.number);
```

### Common Business Rule Debugging Patterns

**Check if Script is Running:**
```javascript
(function executeRule(current, previous) {
    gs.info('[BR_NAME] Script starting for: ' + current.getDisplayValue());

    // Your logic here

    gs.info('[BR_NAME] Script completed');
})(current, previous);
```

**Debug Condition:**
```javascript
// Log condition evaluation
gs.info('[BR_NAME] Condition check - current.state: ' + current.state +
        ', previous.state: ' + previous.state +
        ', Result: ' + (current.state != previous.state));
```

**Inspect Current vs Previous:**
```javascript
// Log all changed fields
var changes = current.changesLog();
if (changes) {
    gs.info('[BR_NAME] Changes: ' + changes);
}
```

## Debugging Workflows and Flows

### Workflow Debugging

**Query Workflow Context:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wf_context
  query: active=true
  fields: name,state,started,ended,id,scratchpad
  limit: 50
  order_by: sys_created_on
  order_by_desc: true
```

**Check Workflow History:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wf_history
  query: context.active=false^sys_created_onONLast 7 days@javascript:gs.daysAgo(7)@javascript:gs.nowDateTime()
  fields: activity,from_state,to_state,additional_info,sys_created_on
  limit: 100
  order_by: sys_created_on
  order_by_desc: true
```

### Flow Designer Debugging

**Query Flow Executions:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_flow_context
  query: state!=complete^ORstate=error
  fields: name,state,started,ended,error_message
  limit: 50
  order_by: sys_created_on
  order_by_desc: true
```

**Enable Flow Debug Mode:**
1. Open the flow in Flow Designer
2. Click **More Actions** (three dots) > **Debug**
3. Trigger the flow
4. Review execution in the Debug panel

## Common Error Messages and Solutions

### "Record not found in table"

**Cause:** GlideRecord query returned no results
**Solution:**
```javascript
var gr = new GlideRecord('incident');
gr.addQuery('number', 'INC0000001');
gr.query();
if (gr.next()) {
    // Record found
} else {
    gs.warn('Record not found: INC0000001');
}
```

### "User not authorized"

**Cause:** ACL blocking access
**Solution:**
1. Enable Session Debug > Security
2. Check ACL logs: System Logs > Security
3. Query ACLs:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl
  query: name=incident
  fields: name,operation,condition,script,role
  limit: 100
```

### "Invalid script" or "Script error"

**Cause:** JavaScript syntax error or runtime exception
**Solution:**
1. Check System Logs for stack trace
2. Use Script Debugger to step through
3. Validate syntax with browser console

### "Maximum execution time exceeded"

**Cause:** Script running too long (30+ seconds)
**Solution:**
- Add GlideAggregate for counting instead of looping
- Use setLimit() to restrict result sets
- Move to Scheduled Job for large operations

### "Mutual exclusion violation"

**Cause:** Same record being updated by multiple processes
**Solution:**
- Check for recursive business rules
- Add condition to prevent re-entry:
```javascript
if (current.update_in_progress) return;
current.update_in_progress = true;
```

### "Nested call limit exceeded"

**Cause:** Too many nested GlideRecord operations or recursive calls
**Solution:**
- Refactor to reduce nesting depth
- Use GlideAggregate for counts
- Break into separate transactions

## Tool Usage

### MCP Tools (Claude Code/Desktop)

| Tool | Purpose |
|------|---------|
| `SN-Query-Table` | Query syslog, execution history, script records |
| `SN-Execute-Background-Script` | Run diagnostic scripts on the instance |
| `SN-Get-Record` | Retrieve specific log or script records |

### REST API (ChatGPT/Other)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/syslog` | GET | Query system logs |
| `/api/now/table/sys_script_execution_history` | GET | Query script execution history |
| `/api/now/table/syslog_transaction` | GET | Query transaction logs |

### Native Tools (Claude Code)

| Tool | Purpose |
|------|---------|
| `Bash` | Execute curl commands for REST API |
| `Read` | Read local script files for comparison |

## Best Practices

- **Always include context:** Log function name, record identifier, and operation type
- **Use appropriate log levels:** Debug for development, Info for production tracing, Error for issues
- **Clean up debug code:** Remove or disable verbose logging before promoting to production
- **Use conditional logging:** Wrap debug statements in property checks
- **Structured logging:** Use consistent format: `[Component] Action - Details`
- **Test in sub-production:** Always debug in dev/test before touching production

## Troubleshooting

### Logs Not Appearing

**Symptom:** gs.log/gs.info statements not showing in System Logs
**Cause:** Log level filtered or property disabled
**Solution:**
1. Check System Properties for `glide.log.level`
2. Ensure `glide.script.log.level` allows your log level
3. Use `gs.error()` which always logs

### Script Debugger Not Triggering

**Symptom:** Breakpoints not hit when script executes
**Cause:** Wrong session, script cached, or condition not met
**Solution:**
1. Ensure debugging enabled for YOUR session (not another admin)
2. Clear cache: System Diagnostics > Cache Management > Flush Cache
3. Verify script condition evaluates to true

### Business Rule Not Firing

**Symptom:** Business rule appears inactive despite being enabled
**Cause:** Condition not met, wrong table, or filter condition
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: name=YOUR_BUSINESS_RULE_NAME
  fields: name,active,collection,when,order,condition,filter_condition,script
  limit: 1
```

## Examples

### Example 1: Trace Business Rule Execution

```javascript
// Add to business rule for debugging
(function executeRule(current, previous) {
    var startTime = new Date().getTime();
    var brName = 'Validate Incident Priority';

    gs.info('[' + brName + '] START - Record: ' + current.number);

    try {
        // Original business rule logic
        if (current.priority == 1 && !current.assignment_group) {
            gs.info('[' + brName + '] Setting mandatory assignment group');
            gs.addErrorMessage('Critical incidents require an assignment group');
            current.setAbortAction(true);
        }
    } catch (e) {
        gs.error('[' + brName + '] ERROR: ' + e.message + '\nStack: ' + e.stack);
    }

    var duration = new Date().getTime() - startTime;
    gs.info('[' + brName + '] END - Duration: ' + duration + 'ms');
})(current, previous);
```

### Example 2: Query Recent Errors

```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: level=error^sys_created_onONLast 24 hours@javascript:gs.hoursAgo(24)@javascript:gs.nowDateTime()
  fields: sys_created_on,source,message
  limit: 100
  order_by: sys_created_on
  order_by_desc: true
```

### Example 3: Debug Client Script with GlideAjax

```javascript
// Client Script
function onLoad() {
    console.log('[MyClientScript] Form loaded, fetching data...');

    var ga = new GlideAjax('MyAjaxProcessor');
    ga.addParam('sysparm_name', 'getData');
    ga.addParam('sysparm_record_id', g_form.getUniqueValue());

    ga.getXMLAnswer(function(response) {
        console.log('[MyClientScript] Response received:', response);

        if (!response) {
            console.error('[MyClientScript] Empty response from server');
            return;
        }

        try {
            var data = JSON.parse(response);
            console.table(data);
        } catch (e) {
            console.error('[MyClientScript] Failed to parse response:', e);
        }
    });
}
```

### Example 4: Background Script for Log Analysis

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Find all errors in last hour with stack traces
    var gr = new GlideRecord('syslog');
    gr.addQuery('level', 'error');
    gr.addQuery('sys_created_on', '>=', gs.hoursAgo(1));
    gr.orderByDesc('sys_created_on');
    gr.setLimit(20);
    gr.query();

    var results = [];
    while (gr.next()) {
        results.push({
            time: gr.sys_created_on.getDisplayValue(),
            source: gr.source.toString(),
            message: gr.message.toString().substring(0, 200)
        });
    }

    gs.info('=== Recent Errors ===\n' + JSON.stringify(results, null, 2));
  description: Analyze recent error logs
```

## Related Skills

- `development/script-includes` - Writing reusable server-side scripts
- `development/business-rules` - Business rule development and best practices
- `development/client-scripts` - Client-side scripting techniques
- `administration/system-logs` - System log configuration and management

## References

- [ServiceNow Script Debugger Documentation](https://docs.servicenow.com/bundle/utah-application-development/page/script/debugging/concept/c_ScriptDebugging.html)
- [Debugging Business Rules](https://docs.servicenow.com/bundle/utah-application-development/page/script/business-rules/concept/c_BusinessRules.html)
- [Session Debug Modules](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/platform-performance/concept/c_SessionDebugging.html)
- [Client Script Debugging](https://docs.servicenow.com/bundle/utah-application-development/page/script/client-scripts/concept/c_ClientScripts.html)
