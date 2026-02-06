---
name: client-scripts
version: 1.0.0
description: Complete guide to ServiceNow client script development including onLoad, onChange, onSubmit, onCellEdit types, g_form API, GlideAjax server calls, and performance optimization
author: Happy Technologies LLC
tags: [development, client-scripts, scripting, client-side, forms, g_form, glide-ajax, mobile]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Create-Record
    - SN-Update-Record
    - SN-Query-Table
    - SN-Get-Table-Schema
    - SN-Sync-Script-To-Local
  rest:
    - /api/now/table/sys_script_client
    - /api/now/table/sys_ui_script
  native:
    - Bash
    - Read
    - Write
complexity: intermediate
estimated_time: 30-60 minutes
---

# Client Scripts

## Overview

This skill covers comprehensive client script development in ServiceNow:

- Client script types: onLoad, onChange, onSubmit, onCellEdit
- The g_form API for form manipulation
- g_user and g_scratchpad objects for session context
- GlideAjax for asynchronous server calls
- Performance optimization and best practices
- Mobile/Service Portal considerations
- Debugging techniques and common patterns

**When to use:** When you need to execute JavaScript in the browser to manipulate form behavior, validate data, or provide dynamic user interactions.

**Who should use this:** Developers building custom form behaviors, validations, and user experience enhancements.

## Prerequisites

- **Roles:** `client_script_admin` or `admin`
- **Access:** sys_script_client, sys_ui_script tables
- **Knowledge:** JavaScript fundamentals, ServiceNow form architecture
- **Related Skills:** `catalog/ui-policies` for simpler show/hide/mandatory logic

## Understanding Client Scripts

### Script Type Comparison

| Type | Trigger | Use Case | Performance Impact |
|------|---------|----------|-------------------|
| onLoad | Form loads | Initialize fields, set defaults | Medium |
| onChange | Field value changes | Field dependencies, cascading logic | Low-Medium |
| onSubmit | Form submission | Validation, confirmation | Low |
| onCellEdit | List cell edited | List editing validation | Low |

### Client Script vs UI Policy

```
┌─────────────────────────────────────────────────────────────┐
│                    Decision Matrix                           │
├─────────────────────────────────────────────────────────────┤
│  Need to show/hide/mandatory fields?                         │
│      YES → Use UI Policy (no code, easier maintenance)      │
│                                                              │
│  Need to set field values or complex logic?                  │
│      YES → Use Client Script                                 │
│                                                              │
│  Need server-side data?                                      │
│      YES → Use Client Script with GlideAjax                 │
│                                                              │
│  Need to prevent form submission?                            │
│      YES → Use Client Script (onSubmit)                     │
│                                                              │
│  Simple field validation?                                    │
│      Dictionary validation → UI Policy → Client Script      │
└─────────────────────────────────────────────────────────────┘
```

### Execution Order

```
Form Load Sequence:
1. UI Policies (on load = true) evaluate
2. onLoad Client Scripts execute (by order)
3. Default values applied
4. Field-level ACLs applied

Field Change Sequence:
1. onChange Client Script for field executes
2. UI Policies with that field in condition re-evaluate
3. Related onchange handlers fire

Form Submit Sequence:
1. onSubmit Client Scripts execute (by order)
2. If all return true, form submits
3. Server-side business rules fire
```

## Procedure

### Phase 1: Creating Client Scripts

#### Step 1.1: Create an onLoad Script

**Basic onLoad Structure:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_client
  data:
    name: "Initialize Request Form"
    table: incident
    type: onLoad
    script: |
      function onLoad() {
        // Set default values
        g_form.setValue('contact_type', 'email');

        // Hide fields for new records
        if (g_form.isNewRecord()) {
          g_form.setDisplay('resolution_notes', false);
          g_form.setDisplay('resolved_by', false);
        }

        // Show informational message
        g_form.addInfoMessage('Please provide detailed information for faster resolution.');
      }
    active: true
    order: 100
    ui_type: 0
```

**ui_type Values:**
| Value | Meaning |
|-------|---------|
| 0 | Desktop |
| 1 | Mobile/Service Portal |
| 10 | Both Desktop and Mobile |

#### Step 1.2: Create an onChange Script

**onChange with Field Dependency:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_client
  data:
    name: "Category Sets Subcategory Options"
    table: incident
    type: onChange
    field_name: category
    script: |
      function onChange(control, oldValue, newValue, isLoading, isTemplate) {
        // Skip if loading form or using template
        if (isLoading || isTemplate) {
          return;
        }

        // Clear dependent field when parent changes
        g_form.clearValue('subcategory');

        // Set subcategory based on category
        if (newValue == 'hardware') {
          g_form.setValue('assignment_group', 'Hardware Support');
        } else if (newValue == 'software') {
          g_form.setValue('assignment_group', 'Software Support');
        }
      }
    active: true
    order: 100
    ui_type: 0
```

**onChange Parameters Explained:**
| Parameter | Description |
|-----------|-------------|
| control | The form element (rarely used) |
| oldValue | Previous field value |
| newValue | New field value (current) |
| isLoading | true if form is loading |
| isTemplate | true if using a template |

#### Step 1.3: Create an onSubmit Script

**Validation onSubmit:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_client
  data:
    name: "Validate Required Fields Before Submit"
    table: incident
    type: onSubmit
    script: |
      function onSubmit() {
        // Get field values
        var shortDesc = g_form.getValue('short_description');
        var category = g_form.getValue('category');
        var priority = g_form.getValue('priority');

        // Validate short description length
        if (shortDesc.length < 10) {
          g_form.addErrorMessage('Short description must be at least 10 characters.');
          g_form.flash('short_description', '#FF0000', 0);
          return false;  // Prevent submission
        }

        // Validate P1 requires assignment group
        if (priority == '1' && !g_form.getValue('assignment_group')) {
          g_form.addErrorMessage('P1 incidents require an assignment group.');
          return false;
        }

        // Confirm high priority submission
        if (priority == '1' || priority == '2') {
          var confirmed = confirm('You are submitting a high priority incident. Continue?');
          if (!confirmed) {
            return false;
          }
        }

        return true;  // Allow submission
      }
    active: true
    order: 100
    ui_type: 0
```

#### Step 1.4: Create an onCellEdit Script

**List Editing Validation:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_client
  data:
    name: "Validate Priority Change in List"
    table: incident
    type: onCellEdit
    script: |
      function onCellEdit(sysIDs, table, oldValues, newValue, callback) {
        // sysIDs: array of selected record sys_ids
        // oldValues: array of previous values
        // newValue: the new value being set
        // callback: must be called to complete the edit

        var priority = g_form.getValue('priority');

        // Prevent bulk P1 changes
        if (newValue == '1' && sysIDs.length > 1) {
          g_form.addErrorMessage('Cannot bulk change to P1. Edit records individually.');
          callback(false);  // Cancel edit
          return;
        }

        // Confirm P1 assignment
        if (newValue == '1') {
          var confirmed = confirm('Setting priority to Critical. This will escalate the incident. Continue?');
          callback(confirmed);
          return;
        }

        callback(true);  // Allow edit
      }
    active: true
    order: 100
```

### Phase 2: The g_form API

#### Step 2.1: Getting and Setting Values

**Essential g_form Methods:**

```javascript
// Get field values
var value = g_form.getValue('field_name');           // Internal value
var display = g_form.getDisplayValue('field_name');   // Display value
var reference = g_form.getReference('assigned_to');   // Reference object (deprecated - use GlideAjax)

// Set field values
g_form.setValue('field_name', 'value');               // Set value
g_form.setValue('assigned_to', sysId, displayValue);  // Set reference with display
g_form.clearValue('field_name');                      // Clear to empty

// Check field states
var isEmpty = g_form.getValue('field_name') == '';    // Check empty
var isNewRecord = g_form.isNewRecord();               // New vs existing
```

**Reference Field Handling:**
```javascript
// DEPRECATED - Makes synchronous server call (performance issue!)
var user = g_form.getReference('assigned_to');
var email = user.email;

// BETTER - Use callback (still not ideal)
g_form.getReference('assigned_to', function(ref) {
  var email = ref.email;
  // Continue processing
});

// BEST - Use GlideAjax (see Phase 4)
```

#### Step 2.2: Visibility and State Control

```javascript
// Visibility
g_form.setDisplay('field_name', true);    // Show field (affects row)
g_form.setVisible('field_name', true);    // Show field (preserves space)
g_form.hideFieldMsg('field_name');        // Hide field message

// State control
g_form.setMandatory('field_name', true);  // Make required
g_form.setReadOnly('field_name', true);   // Make read-only
g_form.setDisabled('field_name', true);   // Disable (grayed out)

// Labels
g_form.setLabelOf('field_name', 'New Label');  // Change label text

// Options (choice fields)
g_form.clearOptions('priority');                           // Remove all options
g_form.addOption('priority', '1', 'Critical', 0);         // Add option (value, label, index)
g_form.removeOption('priority', '5');                      // Remove specific option
```

#### Step 2.3: Messages and Highlighting

```javascript
// Form-level messages
g_form.addInfoMessage('Information message');
g_form.addWarningMessage('Warning message');
g_form.addErrorMessage('Error message');
g_form.clearMessages();                        // Clear all messages

// Field-level messages
g_form.showFieldMsg('field_name', 'Message text', 'info');    // info, warning, error
g_form.hideFieldMsg('field_name');                             // Clear field message
g_form.hideAllFieldMsgs();                                     // Clear all field messages

// Visual highlighting
g_form.flash('field_name', '#FF0000', 0);      // Flash red (color, count; 0=once)
```

#### Step 2.4: Section and Related List Control

```javascript
// Sections (tabs)
g_form.setSectionDisplay('section_name', true);    // Show/hide section
g_form.isSectionVisible('section_name');           // Check visibility
g_form.activateTab('section_name');                // Switch to tab

// Related lists (limited support)
// Use UI Actions or GlideAjax for related list operations
```

### Phase 3: g_user and g_scratchpad Objects

#### Step 3.1: The g_user Object

The g_user object provides information about the currently logged-in user:

```javascript
// User identification
var userSysId = g_user.userID;           // User sys_id
var userName = g_user.userName;           // Username (login name)
var firstName = g_user.firstName;         // First name
var lastName = g_user.lastName;           // Last name
var fullName = g_user.getFullName();      // Full display name

// Role checks
var isAdmin = g_user.hasRole('admin');              // Check single role
var isItil = g_user.hasRoleExactly('itil');         // Exact role match
var hasAnyRole = g_user.hasRoles();                 // Has any role

// Client data (set in business rules)
var customData = g_user.getClientData('custom_key');

// Preferences
var pref = g_user.getPreference('preference_name');
```

**Setting Client Data from Server (Business Rule):**
```javascript
// Server-side (business rule, before query/display)
gs.getSession().putClientData('manager_email', current.caller_id.manager.email);

// Client-side (client script)
var managerEmail = g_user.getClientData('manager_email');
```

#### Step 3.2: The g_scratchpad Object

g_scratchpad passes data from server to client during form load:

**Server-Side (Display Business Rule):**
```javascript
// Type: display, When: before
// Set scratchpad values for client access
g_scratchpad.isVip = current.caller_id.vip == true;
g_scratchpad.callerCompany = current.caller_id.company.name.toString();
g_scratchpad.maxPriority = gs.getProperty('incident.max_priority', '3');
```

**Client-Side (onLoad Script):**
```javascript
function onLoad() {
  // Access scratchpad data (no server call needed!)
  if (g_scratchpad.isVip) {
    g_form.addInfoMessage('VIP Caller - Handle with priority');
    g_form.setValue('priority', '2');
  }

  // Use server-side property value
  var maxPriority = g_scratchpad.maxPriority;

  // Remove low priority options for VIP
  if (g_scratchpad.isVip) {
    g_form.removeOption('priority', '5');
    g_form.removeOption('priority', '4');
  }
}
```

### Phase 4: GlideAjax for Server Calls

#### Step 4.1: Create a Script Include

First, create a client-callable Script Include:

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_include
  data:
    name: "IncidentAjaxUtils"
    api_name: IncidentAjaxUtils
    client_callable: true
    script: |
      var IncidentAjaxUtils = Class.create();
      IncidentAjaxUtils.prototype = Object.extendsObject(AbstractAjaxProcessor, {

        // Get user details by sys_id
        getUserDetails: function() {
          var userId = this.getParameter('sysparm_user_id');
          var result = {};

          var user = new GlideRecord('sys_user');
          if (user.get(userId)) {
            result.name = user.name.toString();
            result.email = user.email.toString();
            result.phone = user.phone.toString();
            result.department = user.department.getDisplayValue();
            result.manager = user.manager.getDisplayValue();
            result.vip = user.vip == true;
          }

          return JSON.stringify(result);
        },

        // Validate assignment group can handle priority
        validateAssignment: function() {
          var groupId = this.getParameter('sysparm_group_id');
          var priority = this.getParameter('sysparm_priority');
          var result = { valid: true, message: '' };

          var group = new GlideRecord('sys_user_group');
          if (group.get(groupId)) {
            // Check if group handles this priority
            var canHandleP1 = group.u_handles_critical == true;
            if (priority == '1' && !canHandleP1) {
              result.valid = false;
              result.message = group.name + ' does not handle Critical incidents. Please select a Critical-capable group.';
            }
          }

          return JSON.stringify(result);
        },

        // Get related incidents count
        getRelatedIncidentCount: function() {
          var ciId = this.getParameter('sysparm_ci_id');
          var count = 0;

          if (ciId) {
            var ga = new GlideAggregate('incident');
            ga.addQuery('cmdb_ci', ciId);
            ga.addQuery('active', true);
            ga.addAggregate('COUNT');
            ga.query();
            if (ga.next()) {
              count = ga.getAggregate('COUNT');
            }
          }

          return count.toString();
        },

        type: 'IncidentAjaxUtils'
      });
    access: public
    active: true
```

#### Step 4.2: Call GlideAjax from Client Script

**Basic GlideAjax Pattern:**
```javascript
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || isTemplate || !newValue) {
    return;
  }

  // Create GlideAjax call
  var ga = new GlideAjax('IncidentAjaxUtils');
  ga.addParam('sysparm_name', 'getUserDetails');  // Method name
  ga.addParam('sysparm_user_id', newValue);       // Custom parameter

  // Make asynchronous call
  ga.getXMLAnswer(function(response) {
    // Parse JSON response
    var user = JSON.parse(response);

    if (user.name) {
      // Update form with retrieved data
      g_form.setValue('u_caller_email', user.email);
      g_form.setValue('u_caller_phone', user.phone);

      // VIP handling
      if (user.vip) {
        g_form.addInfoMessage('VIP Caller: ' + user.name);
        g_form.setValue('priority', '2');
      }
    }
  });
}
```

**Validation with GlideAjax:**
```javascript
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || isTemplate || !newValue) {
    return;
  }

  var priority = g_form.getValue('priority');

  var ga = new GlideAjax('IncidentAjaxUtils');
  ga.addParam('sysparm_name', 'validateAssignment');
  ga.addParam('sysparm_group_id', newValue);
  ga.addParam('sysparm_priority', priority);

  ga.getXMLAnswer(function(response) {
    var result = JSON.parse(response);

    if (!result.valid) {
      g_form.showFieldMsg('assignment_group', result.message, 'error');
      g_form.setValue('assignment_group', '');
    } else {
      g_form.hideFieldMsg('assignment_group');
    }
  });
}
```

#### Step 4.3: GlideAjax with getXML (Full Response)

For more control over the response:

```javascript
function onLoad() {
  var ciId = g_form.getValue('cmdb_ci');
  if (!ciId) return;

  var ga = new GlideAjax('IncidentAjaxUtils');
  ga.addParam('sysparm_name', 'getRelatedIncidentCount');
  ga.addParam('sysparm_ci_id', ciId);

  ga.getXML(function(response) {
    // Get the answer element
    var answer = response.responseXML.documentElement.getAttribute('answer');
    var count = parseInt(answer) || 0;

    if (count > 5) {
      g_form.addWarningMessage('This CI has ' + count + ' active incidents. Consider checking for related problems.');
    }
  });
}
```

### Phase 5: Performance Best Practices

#### Step 5.1: Minimize Server Calls

```javascript
// BAD - Multiple synchronous calls
function onLoad() {
  var caller = g_form.getReference('caller_id');      // Server call 1
  var assignee = g_form.getReference('assigned_to');  // Server call 2
  var group = g_form.getReference('assignment_group'); // Server call 3
  // Form takes 3+ seconds to load!
}

// BETTER - Use g_scratchpad (set in Display Business Rule)
function onLoad() {
  // Data already available - no server calls!
  var callerVip = g_scratchpad.callerVip;
  var assigneeEmail = g_scratchpad.assigneeEmail;
}

// BEST - Single GlideAjax call returning all needed data
function onLoad() {
  var ga = new GlideAjax('FormDataUtils');
  ga.addParam('sysparm_name', 'getFormContext');
  ga.addParam('sysparm_incident_id', g_form.getUniqueValue());

  ga.getXMLAnswer(function(response) {
    var data = JSON.parse(response);
    // All data in one call
    processFormData(data);
  });
}
```

#### Step 5.2: Use Conditions Wisely

```javascript
// BAD - Script runs for every incident
function onLoad() {
  if (g_form.getValue('priority') == '1') {
    // Logic only needed for P1
  }
}

// BETTER - Use script condition in client script record
// Condition: priority=1
function onLoad() {
  // Only runs when priority is 1
  // No condition check needed in script
}
```

**Set Condition in Client Script Record:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_client
  data:
    name: "P1 Special Handling"
    table: incident
    type: onLoad
    condition: "priority=1"
    script: |
      function onLoad() {
        // Only executes when condition matches
        g_form.addInfoMessage('Critical incident - expedited handling required');
      }
    active: true
```

#### Step 5.3: Debounce Rapid Changes

```javascript
// BAD - Ajax call on every keystroke
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading) return;

  // Fires on every character typed!
  var ga = new GlideAjax('SearchUtils');
  ga.addParam('sysparm_name', 'search');
  ga.addParam('sysparm_query', newValue);
  ga.getXMLAnswer(handleResults);
}

// BETTER - Debounce rapid changes
var searchTimeout;

function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading) return;

  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  // Wait 500ms after last change before searching
  searchTimeout = setTimeout(function() {
    var ga = new GlideAjax('SearchUtils');
    ga.addParam('sysparm_name', 'search');
    ga.addParam('sysparm_query', newValue);
    ga.getXMLAnswer(handleResults);
  }, 500);
}
```

#### Step 5.4: Cache Reference Data

```javascript
// Store lookup results to avoid repeated calls
var categoryAssignments = {};

function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || !newValue) return;

  // Check cache first
  if (categoryAssignments[newValue]) {
    g_form.setValue('assignment_group', categoryAssignments[newValue]);
    return;
  }

  // Fetch and cache
  var ga = new GlideAjax('CategoryUtils');
  ga.addParam('sysparm_name', 'getAssignmentGroup');
  ga.addParam('sysparm_category', newValue);

  ga.getXMLAnswer(function(response) {
    var groupId = response;
    categoryAssignments[newValue] = groupId;  // Cache for next time
    g_form.setValue('assignment_group', groupId);
  });
}
```

### Phase 6: Mobile and Service Portal Considerations

#### Step 6.1: Mobile-Compatible Scripts

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_client
  data:
    name: "Mobile-Compatible Validation"
    table: incident
    type: onSubmit
    ui_type: 10
    script: |
      function onSubmit() {
        // These g_form methods work on mobile
        var shortDesc = g_form.getValue('short_description');

        if (!shortDesc || shortDesc.length < 5) {
          // Use g_form messages (works on mobile)
          g_form.addErrorMessage('Please provide a description');
          return false;
        }

        // AVOID: alert(), confirm(), prompt() - don't work on mobile
        // AVOID: document.getElementById() - DOM may differ
        // AVOID: jQuery selectors - not available

        return true;
      }
    active: true
```

**Mobile-Compatible g_form Methods:**
| Method | Desktop | Mobile | Service Portal |
|--------|---------|--------|----------------|
| getValue() | Yes | Yes | Yes |
| setValue() | Yes | Yes | Yes |
| setMandatory() | Yes | Yes | Yes |
| setDisplay() | Yes | Yes | Yes |
| setReadOnly() | Yes | Yes | Yes |
| addErrorMessage() | Yes | Yes | Yes |
| showFieldMsg() | Yes | Yes | Yes |
| getReference() | Yes | No | Limited |
| flash() | Yes | No | No |
| activateTab() | Yes | No | No |

#### Step 6.2: Service Portal UI Scripts

For Service Portal-specific client logic, use UI Scripts:

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_script
  data:
    name: "SP Incident Form Handler"
    script: |
      // Service Portal UI Script
      // Runs in the Service Portal context

      function spIncidentFormInit() {
        // Use $scope for Angular integration
        // Access widget data
        console.log('SP Incident form initialized');
      }

      // Self-executing for immediate availability
      if (typeof angular !== 'undefined') {
        angular.element(document).ready(function() {
          spIncidentFormInit();
        });
      }
    active: true
    global: false
    ui_type: 10
```

### Phase 7: Debugging Client Scripts

#### Step 7.1: Console Logging

```javascript
function onLoad() {
  // Development logging (remove in production)
  console.log('=== Client Script: Initialize Form ===');
  console.log('Record sys_id:', g_form.getUniqueValue());
  console.log('Is new record:', g_form.isNewRecord());
  console.log('Current user:', g_user.userName);

  // Log scratchpad contents
  console.log('Scratchpad:', JSON.stringify(g_scratchpad));

  // Performance timing
  console.time('formSetup');

  // ... form setup logic ...

  console.timeEnd('formSetup');
}
```

#### Step 7.2: JavaScript Debugger

```javascript
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  // Add breakpoint for debugging
  debugger;  // Browser will pause here when DevTools open

  if (isLoading) return;

  // Step through logic in browser DevTools
  var priority = g_form.getValue('priority');
  var category = g_form.getValue('category');

  // Inspect variables in DevTools console
}
```

#### Step 7.3: Error Handling

```javascript
function onLoad() {
  try {
    // Main logic
    initializeForm();
    setupFieldDependencies();
    loadReferenceData();
  } catch (error) {
    // Log error details
    console.error('Client Script Error:', error.message);
    console.error('Stack:', error.stack);

    // Notify user gracefully
    g_form.addErrorMessage('Form initialization error. Please refresh the page.');
  }
}

function initializeForm() {
  // Potentially error-prone code
  var data = JSON.parse(g_scratchpad.formData);
  // ...
}
```

#### Step 7.4: Query Client Scripts for Debugging

**Find all client scripts for a table:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_client
  query: table=incident^active=true
  fields: sys_id,name,type,field_name,order,condition,ui_type
  limit: 50
```

**Check script execution order:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_client
  query: table=incident^active=true^type=onLoad
  fields: name,order,condition
  order_by: order
  limit: 50
```

### Phase 8: Common Patterns

#### Pattern 1: Cascading Field Dependencies

```javascript
// Category -> Subcategory -> Assignment Group cascade
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || isTemplate) return;

  // Clear downstream fields
  g_form.clearValue('subcategory');
  g_form.clearValue('assignment_group');

  if (!newValue) return;

  // Fetch valid subcategories for this category
  var ga = new GlideAjax('CategoryUtils');
  ga.addParam('sysparm_name', 'getSubcategories');
  ga.addParam('sysparm_category', newValue);

  ga.getXMLAnswer(function(response) {
    var subcategories = JSON.parse(response);

    // Clear and repopulate options
    g_form.clearOptions('subcategory');
    g_form.addOption('subcategory', '', '-- Select --');

    subcategories.forEach(function(sub) {
      g_form.addOption('subcategory', sub.value, sub.label);
    });
  });
}
```

#### Pattern 2: Conditional Mandatory Fields

```javascript
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading) return;

  // State = Resolved (6) requires resolution notes
  var isResolved = (newValue == '6');

  g_form.setMandatory('resolution_code', isResolved);
  g_form.setMandatory('resolution_notes', isResolved);
  g_form.setDisplay('resolution_code', isResolved);
  g_form.setDisplay('resolution_notes', isResolved);

  if (isResolved) {
    g_form.addInfoMessage('Please provide resolution details.');
  }
}
```

#### Pattern 3: Form Validation with Multiple Checks

```javascript
function onSubmit() {
  var errors = [];

  // Check 1: Short description length
  var shortDesc = g_form.getValue('short_description');
  if (shortDesc.length < 10) {
    errors.push('Short description must be at least 10 characters');
    g_form.showFieldMsg('short_description', 'Too short', 'error');
  }

  // Check 2: High priority requires assignment
  var priority = g_form.getValue('priority');
  var assignee = g_form.getValue('assigned_to');
  var group = g_form.getValue('assignment_group');

  if ((priority == '1' || priority == '2') && !assignee && !group) {
    errors.push('High priority incidents must be assigned');
  }

  // Check 3: Configuration item recommended
  var ci = g_form.getValue('cmdb_ci');
  if (!ci) {
    // Warning only, don't block
    var proceed = confirm('No Configuration Item specified. Continue anyway?');
    if (!proceed) {
      return false;
    }
  }

  // Display all errors
  if (errors.length > 0) {
    g_form.addErrorMessage('Please fix the following issues:\n' + errors.join('\n'));
    return false;
  }

  return true;
}
```

#### Pattern 4: Auto-populate from Reference

```javascript
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || isTemplate || !newValue) {
    return;
  }

  // Get caller details via GlideAjax
  var ga = new GlideAjax('UserUtils');
  ga.addParam('sysparm_name', 'getUserInfo');
  ga.addParam('sysparm_user_id', newValue);

  ga.getXMLAnswer(function(response) {
    var user = JSON.parse(response);

    // Auto-populate fields
    g_form.setValue('location', user.location);
    g_form.setValue('u_department', user.department);
    g_form.setValue('u_phone', user.phone);

    // VIP handling
    if (user.vip) {
      g_form.setValue('priority', '2');
      g_form.addInfoMessage('VIP Caller - Priority elevated');
    }
  });
}
```

### Phase 9: Anti-Patterns to Avoid

#### Anti-Pattern 1: Synchronous Server Calls

```javascript
// BAD - Blocks the UI
function onLoad() {
  var user = g_form.getReference('caller_id');  // Synchronous!
  var manager = g_form.getReference('assigned_to');  // More blocking!
  // User experiences frozen form
}

// GOOD - Asynchronous with callback
function onLoad() {
  var callerId = g_form.getValue('caller_id');
  if (!callerId) return;

  var ga = new GlideAjax('UserUtils');
  ga.addParam('sysparm_name', 'getUserInfo');
  ga.addParam('sysparm_user_id', callerId);
  ga.getXMLAnswer(processUser);  // Non-blocking
}
```

#### Anti-Pattern 2: DOM Manipulation

```javascript
// BAD - Direct DOM access
function onLoad() {
  document.getElementById('incident.short_description').style.backgroundColor = 'yellow';
  jQuery('#incident\\.priority').hide();
}

// GOOD - Use g_form API
function onLoad() {
  g_form.flash('short_description', '#FFFF00', 3);
  g_form.setDisplay('priority', false);
}
```

#### Anti-Pattern 3: Hardcoded sys_ids

```javascript
// BAD - Hardcoded values
function onChange(control, oldValue, newValue, isLoading) {
  if (newValue == 'hardware') {
    g_form.setValue('assignment_group', 'a715cd759f2002002920bde8132e7018');  // Magic string!
  }
}

// GOOD - Use GlideAjax lookup or sys_properties
function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading || !newValue) return;

  var ga = new GlideAjax('AssignmentUtils');
  ga.addParam('sysparm_name', 'getGroupByCategory');
  ga.addParam('sysparm_category', newValue);
  ga.getXMLAnswer(function(groupId) {
    g_form.setValue('assignment_group', groupId);
  });
}
```

#### Anti-Pattern 4: Heavy onLoad Processing

```javascript
// BAD - Too much in onLoad
function onLoad() {
  // 5 GlideAjax calls
  loadCallerInfo();
  loadCIDetails();
  loadRelatedIncidents();
  loadSLAStatus();
  loadApprovalHistory();
  // Form takes forever to load!
}

// GOOD - Use g_scratchpad for essential data, lazy load the rest
function onLoad() {
  // Essential data from g_scratchpad (set in display business rule)
  if (g_scratchpad.callerVip) {
    g_form.addInfoMessage('VIP Caller');
  }

  // Load additional data only when needed
  // e.g., when user clicks a tab or expands a section
}
```

## Tool Usage Summary

| Operation | MCP Tool | Table |
|-----------|----------|-------|
| Create Client Script | SN-Create-Record | sys_script_client |
| Update Client Script | SN-Update-Record | sys_script_client |
| Query Client Scripts | SN-Query-Table | sys_script_client |
| Create Script Include | SN-Create-Record | sys_script_include |
| Create UI Script | SN-Create-Record | sys_ui_script |
| Get Schema | SN-Get-Table-Schema | Any table |
| Sync to Local | SN-Sync-Script-To-Local | For version control |

## Best Practices

- **Use UI Policies First:** For simple show/hide/mandatory, avoid code
- **Minimize Server Calls:** Use g_scratchpad, batch GlideAjax, cache results
- **Handle isLoading:** Always check in onChange to avoid initialization issues
- **Return Values:** onSubmit must return true/false explicitly
- **Use Script Conditions:** Filter execution at the platform level
- **Avoid DOM Access:** Use g_form API for cross-platform compatibility
- **Error Handling:** Wrap risky code in try-catch blocks
- **Console Logging:** Use for development, remove in production
- **Mobile Testing:** Test scripts with ui_type=10 on actual devices
- **Version Control:** Use SN-Sync-Script-To-Local for code management

## Troubleshooting

### Script Not Executing

**Symptom:** No console output, form unchanged
**Causes:**
1. Script inactive
2. Condition not matched
3. ui_type mismatch (desktop vs mobile)
4. JavaScript syntax error

**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_client
  query: table=incident^name=*my script*
  fields: name,active,condition,ui_type
```

Check active=true, verify condition, check ui_type matches your environment.

### onChange Not Firing

**Symptom:** Changing field value doesn't trigger script
**Causes:**
1. field_name doesn't match actual field
2. isLoading/isTemplate not handled
3. Script error before reaching logic

**Solution:**
```javascript
function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  console.log('onChange fired:', {
    field: 'field_name',
    old: oldValue,
    new: newValue,
    loading: isLoading
  });

  if (isLoading || isTemplate) {
    console.log('Skipping - form loading');
    return;
  }
  // ...
}
```

### GlideAjax Returns Empty

**Symptom:** Response is empty or undefined
**Causes:**
1. Script include not client_callable
2. Method name misspelled
3. Server-side error in script include

**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_include
  query: name=MyAjaxUtil
  fields: name,client_callable,active
```

Verify client_callable=true. Check System Logs for server errors.

### Form Loads Slowly

**Symptom:** Long delay before form is interactive
**Causes:**
1. Synchronous getReference calls
2. Multiple GlideAjax calls in onLoad
3. Heavy DOM manipulation

**Solution:**
1. Replace getReference with GlideAjax
2. Combine multiple Ajax calls into one
3. Use g_scratchpad for server data
4. Profile with browser DevTools Performance tab

## Related Skills

- `catalog/ui-policies` - No-code show/hide/mandatory
- `admin/script-execution` - Server-side script patterns
- `development/business-rules` - Server-side form processing
- `development/script-includes` - Reusable server functions
- `admin/script-sync` - Local development workflow

## References

- [ServiceNow Client Scripts](https://docs.servicenow.com/bundle/utah-application-development/page/script/client-scripts/concept/c_ClientScripts.html)
- [g_form API](https://developer.servicenow.com/dev.do#!/reference/api/utah/client/c_GlideFormAPI)
- [GlideAjax](https://developer.servicenow.com/dev.do#!/reference/api/utah/client/c_GlideAjaxAPI)
- [g_user Object](https://developer.servicenow.com/dev.do#!/reference/api/utah/client/c_GlideUserAPI)
- [Mobile Client Scripting](https://docs.servicenow.com/bundle/utah-mobile/page/product/servicenow-mobile/concept/mobile-client-scripting.html)
