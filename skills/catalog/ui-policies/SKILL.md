---
name: ui-policies
version: 1.0.0
description: Complete guide to catalog UI policies including show/hide/mandatory actions, scripted conditions, and REST API limitations with workarounds
author: Happy Technologies LLC
tags: [catalog, ui-policy, forms, variables, service-catalog, automation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Create-Record
    - SN-Update-Record
    - SN-Query-Table
    - SN-Execute-Background-Script
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/catalog_ui_policy
    - /api/now/table/catalog_ui_policy_action
    - /api/now/table/item_option_new
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Catalog UI Policies

## Overview

This skill covers creating and managing UI policies for Service Catalog items:

- Creating UI policies with conditions
- Show/hide/mandatory/disabled actions
- Scripted UI policy conditions
- UI Policy Actions and their REST API limitations
- Workarounds for linking actions via background scripts
- Testing and debugging UI policies

**When to use:** When building dynamic catalog forms that need to show/hide fields, make fields mandatory based on other selections, or implement complex conditional logic.

**Who should use this:** Catalog administrators and developers building service catalog items with dynamic form behavior.

## Prerequisites

- **Roles:** `catalog_admin` or `admin`
- **Access:** catalog_ui_policy, catalog_ui_policy_action, item_option_new tables
- **Knowledge:** Basic catalog item structure, variables
- **Related Skills:** `catalog/variable-management` for variable creation

## Understanding Catalog UI Policies

### UI Policy Components

```
┌─────────────────────────────────────────────────────────┐
│                    Catalog UI Policy                     │
├─────────────────────────────────────────────────────────┤
│  Catalog Item: [reference to sc_cat_item]               │
│  Short Description: "Show approval fields for >$1000"   │
│  Conditions: amount>1000                                │
│  On Load: true    Reverse If False: true                │
│  Script True: [optional advanced logic]                 │
│  Script False: [optional reverse logic]                 │
├─────────────────────────────────────────────────────────┤
│                    UI Policy Actions                     │
├─────────────────────────────────────────────────────────┤
│  Action 1: manager_approval → visible=true, mandatory=true │
│  Action 2: justification → visible=true                    │
│  Action 3: cost_center → disabled=false                    │
└─────────────────────────────────────────────────────────┘
```

### UI Policy Evaluation

```
User Opens Form
      │
      ▼
┌─────────────────┐
│  On Load = true?│───No──► Conditions evaluated only on change
      │
     Yes
      │
      ▼
┌─────────────────┐
│ Evaluate        │
│ Conditions      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
  True      False
    │         │
    ▼         ▼
┌────────┐ ┌────────────────┐
│ Apply  │ │Reverse If False│───Yes──► Apply opposite actions
│Actions │ │    = true?     │
└────────┘ └───────┬────────┘
                   │
                  No
                   │
                   ▼
              Do nothing
```

## Procedure

### Phase 1: Create Basic UI Policy

#### Step 1.1: Create UI Policy Record

**Simple Condition-Based Policy:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy
  data:
    catalog_item: [catalog_item_sys_id]
    short_description: "Show approval fields when amount exceeds $1000"
    active: true
    on_load: true
    reverse_if_false: true
    order: 100
    global: false
    run_scripts: false
```

**Result:** Returns sys_id of created UI policy (e.g., `policy_sys_id`)

#### Step 1.2: Understand UI Policy Fields

| Field | Type | Description |
|-------|------|-------------|
| catalog_item | Reference | Target catalog item |
| short_description | String | Policy name/description |
| active | Boolean | Enable/disable policy |
| on_load | Boolean | Evaluate when form loads |
| reverse_if_false | Boolean | Apply opposite when condition false |
| order | Integer | Execution order (lower = first) |
| global | Boolean | Apply to all catalog items |
| run_scripts | Boolean | Enable Script True/Script False |
| conditions | Conditions | Encoded query against variables |

### Phase 2: Add UI Policy Conditions

#### Step 2.1: Simple Field Condition

Conditions compare variable values using encoded query syntax:

**Create Policy with Condition:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy
  data:
    catalog_item: [catalog_item_sys_id]
    short_description: "Show manager approval for external vendors"
    conditions: "vendor_type=external"
    active: true
    on_load: true
    reverse_if_false: true
    order: 100
```

**Condition Syntax Examples:**

| Condition | Meaning |
|-----------|---------|
| `priority=1` | Priority equals 1 |
| `amount>1000` | Amount greater than 1000 |
| `category=hardware^urgency=1` | Category is hardware AND urgency is 1 |
| `department=IT^ORdepartment=Security` | Department is IT OR Security |
| `requested_for.active=true` | Referenced user is active |
| `descriptionISNOTEMPTY` | Description has a value |
| `quantityBETWEEN1@10` | Quantity between 1 and 10 |

#### Step 2.2: Multiple Conditions (AND/OR)

**AND Conditions:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy
  data:
    catalog_item: [catalog_item_sys_id]
    short_description: "Require justification for high-cost IT equipment"
    conditions: "department=IT^hardware_type=laptop^estimated_cost>2000"
    active: true
    on_load: true
    reverse_if_false: true
    order: 200
```

**OR Conditions:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy
  data:
    catalog_item: [catalog_item_sys_id]
    short_description: "Show security review for sensitive departments"
    conditions: "department=Finance^ORdepartment=Legal^ORdepartment=HR"
    active: true
    on_load: true
    reverse_if_false: true
    order: 300
```

### Phase 3: Create UI Policy Actions

**CRITICAL:** UI Policy Actions cannot be fully linked to variables via REST API due to ServiceNow limitations. The `catalog_variable` field requires special handling.

#### Step 3.1: Understand the Limitation

When you create a `catalog_ui_policy_action` via REST API:
- The record is created successfully
- The `catalog_variable` field WILL NOT link properly
- The action won't work until manually fixed or updated via background script

**Why This Happens:**
- The `catalog_variable` field expects a special format: `IO:[variable_sys_id]`
- The REST API doesn't properly resolve this reference type
- This is a known ServiceNow platform limitation

#### Step 3.2: Create Action Record (Step 1 of 2)

First, create the UI policy action record:

```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy_action
  data:
    ui_policy: [policy_sys_id]
    visible: true
    mandatory: true
    disabled: false
```

**Result:** Returns action sys_id (e.g., `action_sys_id`)

**Note:** The action is created but NOT linked to any variable yet.

#### Step 3.3: Link Action to Variable (Step 2 of 2)

**REQUIRED:** Use background script to properly link the action:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Link UI Policy Action to Catalog Variable
    var actionSysId = '[action_sys_id]';
    var variableSysId = '[variable_sys_id]';

    var gr = new GlideRecord('catalog_ui_policy_action');
    if (gr.get(actionSysId)) {
      // The catalog_variable field requires IO: prefix
      gr.setValue('catalog_variable', 'IO:' + variableSysId);
      gr.update();
      gs.info('Linked UI policy action ' + actionSysId + ' to variable ' + variableSysId);
    } else {
      gs.error('UI policy action not found: ' + actionSysId);
    }
  description: Link UI policy action to catalog variable
```

#### Step 3.4: Batch Link Multiple Actions

For multiple actions, batch them in one script:

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Batch link UI Policy Actions
    var links = [
      { action: '[action1_sys_id]', variable: '[var1_sys_id]' },
      { action: '[action2_sys_id]', variable: '[var2_sys_id]' },
      { action: '[action3_sys_id]', variable: '[var3_sys_id]' }
    ];

    var success = 0;
    var failed = 0;

    links.forEach(function(link) {
      var gr = new GlideRecord('catalog_ui_policy_action');
      if (gr.get(link.action)) {
        gr.setValue('catalog_variable', 'IO:' + link.variable);
        gr.update();
        gs.info('Linked: ' + link.action + ' -> ' + link.variable);
        success++;
      } else {
        gs.error('Action not found: ' + link.action);
        failed++;
      }
    });

    gs.info('Batch link complete: ' + success + ' success, ' + failed + ' failed');
  description: Batch link UI policy actions to variables
```

### Phase 4: UI Policy Action Types

#### Step 4.1: Show/Hide Variables

**Show a variable when condition is true:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy_action
  data:
    ui_policy: [policy_sys_id]
    visible: true
    mandatory: false
    disabled: false
```

Then link to variable using background script (Step 3.3).

**Hide a variable (with reverse_if_false):**
- Set `visible: true` in action
- Set `reverse_if_false: true` on policy
- When condition is FALSE, variable will be hidden

#### Step 4.2: Mandatory Actions

**Make variable mandatory when condition is true:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy_action
  data:
    ui_policy: [policy_sys_id]
    visible: true
    mandatory: true
    disabled: false
```

**Common Pattern:** Show AND make mandatory:
- `visible: true` - Show the field
- `mandatory: true` - Require a value
- With `reverse_if_false: true` - When condition false, field hidden and not required

#### Step 4.3: Disabled/Read-Only Actions

**Make variable read-only when condition is true:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy_action
  data:
    ui_policy: [policy_sys_id]
    visible: true
    mandatory: false
    disabled: true
```

**Use Case:** Lock calculated fields or display-only values.

### Phase 5: Scripted UI Policies

#### Step 5.1: Enable Script Execution

For complex conditions that can't be expressed in simple encoded queries:

```
Tool: SN-Update-Record
Parameters:
  table_name: catalog_ui_policy
  sys_id: [policy_sys_id]
  data:
    run_scripts: true
    script_true: |
      // Runs when condition is TRUE
      // Access variables via g_form
      var amount = g_form.getValue('amount');
      var dept = g_form.getValue('department');

      if (parseFloat(amount) > 5000 && dept == 'IT') {
        // Additional client-side logic
        g_form.showFieldMsg('amount', 'Requires CIO approval', 'info');
      }
    script_false: |
      // Runs when condition is FALSE (optional)
      g_form.hideFieldMsg('amount');
```

#### Step 5.2: Script Examples

**Complex Validation:**
```javascript
// script_true
var hardware = g_form.getValue('hardware_type');
var quantity = parseInt(g_form.getValue('quantity')) || 0;

// Show warning for bulk orders
if (hardware == 'laptop' && quantity > 10) {
  g_form.showFieldMsg('quantity', 'Bulk orders require procurement approval', 'warning');
}

// Dynamic mandatory based on multiple fields
if (hardware == 'other') {
  g_form.setMandatory('other_description', true);
}
```

**Date Validation:**
```javascript
// script_true
var startDate = g_form.getValue('start_date');
var endDate = g_form.getValue('end_date');

if (startDate && endDate) {
  var start = new Date(startDate);
  var end = new Date(endDate);

  if (end < start) {
    g_form.showFieldMsg('end_date', 'End date must be after start date', 'error');
    g_form.setMandatory('end_date', true);
  }
}
```

### Phase 6: Complete UI Policy Example

#### Step 6.1: Full Implementation

**Scenario:** Software request form where:
- If license type is "Enterprise", show cost center and manager approval
- If quantity > 5, require business justification

**Step 1: Get variable sys_ids:**
```
Tool: SN-Query-Table
Parameters:
  table_name: item_option_new
  query: cat_item=[catalog_item_sys_id]
  fields: sys_id,name,question_text
  limit: 50
```

**Step 2: Create Policy 1 - Enterprise License:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy
  data:
    catalog_item: [catalog_item_sys_id]
    short_description: "Show approval fields for Enterprise license"
    conditions: "license_type=enterprise"
    active: true
    on_load: true
    reverse_if_false: true
    order: 100
# Result: policy1_sys_id
```

**Step 3: Create Actions for Policy 1:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy_action
  data:
    ui_policy: [policy1_sys_id]
    visible: true
    mandatory: true
    disabled: false
# Result: action1a_sys_id (for cost_center)
```

```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy_action
  data:
    ui_policy: [policy1_sys_id]
    visible: true
    mandatory: true
    disabled: false
# Result: action1b_sys_id (for manager_approval)
```

**Step 4: Link Actions to Variables:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var links = [
      { action: '[action1a_sys_id]', variable: '[cost_center_var_sys_id]' },
      { action: '[action1b_sys_id]', variable: '[manager_approval_var_sys_id]' }
    ];

    links.forEach(function(link) {
      var gr = new GlideRecord('catalog_ui_policy_action');
      if (gr.get(link.action)) {
        gr.setValue('catalog_variable', 'IO:' + link.variable);
        gr.update();
        gs.info('Linked: ' + gr.sys_id);
      }
    });
  description: Link enterprise license policy actions
```

**Step 5: Create Policy 2 - Bulk Order:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy
  data:
    catalog_item: [catalog_item_sys_id]
    short_description: "Require justification for bulk orders (>5)"
    conditions: "quantity>5"
    active: true
    on_load: true
    reverse_if_false: true
    order: 200
# Result: policy2_sys_id
```

**Step 6: Create and Link Action for Policy 2:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy_action
  data:
    ui_policy: [policy2_sys_id]
    visible: true
    mandatory: true
    disabled: false
# Result: action2_sys_id
```

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var gr = new GlideRecord('catalog_ui_policy_action');
    if (gr.get('[action2_sys_id]')) {
      gr.setValue('catalog_variable', 'IO:[justification_var_sys_id]');
      gr.update();
      gs.info('Linked bulk order justification action');
    }
  description: Link bulk order policy action
```

### Phase 7: Testing and Debugging

#### Step 7.1: Verify UI Policy Configuration

**Query all policies for a catalog item:**
```
Tool: SN-Query-Table
Parameters:
  table_name: catalog_ui_policy
  query: catalog_item=[catalog_item_sys_id]^active=true
  fields: sys_id,short_description,conditions,on_load,reverse_if_false,order,run_scripts
  limit: 50
```

**Query all actions for a policy:**
```
Tool: SN-Query-Table
Parameters:
  table_name: catalog_ui_policy_action
  query: ui_policy=[policy_sys_id]
  fields: sys_id,catalog_variable,visible,mandatory,disabled
  limit: 20
```

#### Step 7.2: Debug Action Links

**Check if catalog_variable is properly linked:**
```
Tool: SN-Query-Table
Parameters:
  table_name: catalog_ui_policy_action
  query: ui_policy=[policy_sys_id]
  fields: sys_id,catalog_variable.name,visible,mandatory,disabled
  limit: 20
```

If `catalog_variable.name` is empty, the link failed - run the background script again.

#### Step 7.3: Testing Checklist

**Before Testing:**
- [ ] All UI policies are active
- [ ] All policy actions have linked variables (catalog_variable not empty)
- [ ] Order numbers are set correctly (no conflicts)
- [ ] reverse_if_false is set appropriately

**Test Scenarios:**
1. **On Load:** Open form fresh - verify initial visibility
2. **True Condition:** Set values to make condition true - verify actions apply
3. **False Condition:** Change values to make condition false - verify reverse
4. **Multiple Policies:** Test combinations of conditions
5. **Script Policies:** Verify scripts execute without errors

#### Step 7.4: Common Debug Commands

**Find unlinked actions:**
```
Tool: SN-Query-Table
Parameters:
  table_name: catalog_ui_policy_action
  query: ui_policy.catalog_item=[catalog_item_sys_id]^catalog_variableISEMPTY
  fields: sys_id,ui_policy.short_description
  limit: 50
```

**Get variable sys_ids by name:**
```
Tool: SN-Query-Table
Parameters:
  table_name: item_option_new
  query: cat_item=[catalog_item_sys_id]^name=manager_approval
  fields: sys_id,name
```

## Tool Usage Summary

| Operation | MCP Tool | Notes |
|-----------|----------|-------|
| Create UI Policy | SN-Create-Record | catalog_ui_policy table |
| Create UI Policy Action | SN-Create-Record | catalog_ui_policy_action table |
| Link Action to Variable | SN-Execute-Background-Script | REQUIRED - REST API limitation |
| Query Policies | SN-Query-Table | catalog_ui_policy |
| Query Actions | SN-Query-Table | catalog_ui_policy_action |
| Update Policy | SN-Update-Record | For script_true/script_false |

## Best Practices

- **Descriptive Names:** Use clear short_description for debugging
- **Order Carefully:** Lower order executes first - avoid conflicts
- **Use reverse_if_false:** Cleaner than creating two opposing policies
- **Test Both States:** Always test true AND false conditions
- **Minimize Scripts:** Use conditions when possible - scripts are slower
- **Document Logic:** Comment complex conditions in description field
- **Batch Link Actions:** Use single background script for multiple links
- **Verify Links:** Always query to confirm catalog_variable is populated

## Troubleshooting

### UI Policy Not Executing

**Symptom:** Variable visibility/mandatory doesn't change
**Causes:**
1. Policy inactive
2. Condition syntax error
3. Action not linked to variable
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: catalog_ui_policy
  query: catalog_item=[item_sys_id]
  fields: short_description,active,conditions
```

Check `active=true` and verify condition syntax.

### Action Not Linked (catalog_variable Empty)

**Symptom:** Policy executes but field doesn't change
**Cause:** REST API limitation - action not properly linked
**Solution:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var gr = new GlideRecord('catalog_ui_policy_action');
    gr.get('[action_sys_id]');
    gr.setValue('catalog_variable', 'IO:[variable_sys_id]');
    gr.update();
    gs.info('Fixed action link');
  description: Fix unlinked UI policy action
```

### reverse_if_false Not Working

**Symptom:** Variable stays visible/mandatory when condition is false
**Causes:**
1. reverse_if_false not enabled
2. on_load not enabled (only evaluates on change)
**Solution:**
```
Tool: SN-Update-Record
Parameters:
  table_name: catalog_ui_policy
  sys_id: [policy_sys_id]
  data:
    on_load: true
    reverse_if_false: true
```

### Script Errors

**Symptom:** Console errors when form loads, script not executing
**Cause:** JavaScript syntax error in script_true or script_false
**Solution:**
1. Check browser console for errors
2. Validate JavaScript syntax
3. Test script in browser console first

### Multiple Policies Conflicting

**Symptom:** Unpredictable variable behavior
**Cause:** Multiple policies affecting same variable with conflicting actions
**Solution:**
1. Query all policies affecting the variable
2. Adjust order numbers
3. Consider consolidating into single policy with complex condition

## Related Skills

- `catalog/variable-management` - Create and configure variables
- `catalog/item-creation` - Full catalog item setup
- `catalog/approval-workflows` - Approval configuration
- `admin/script-execution` - Background script patterns

## References

- [ServiceNow Catalog UI Policies](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/service-catalog-management/task/t_CreateACatalogUIPolicy.html)
- [UI Policy Actions](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/service-catalog-management/task/t_CreateACatalogUIPolicyAction.html)
- [Client Scripts vs UI Policies](https://docs.servicenow.com/bundle/utah-application-development/page/script/client-scripts/concept/c_ClientScriptsVersusUIPolicies.html)
