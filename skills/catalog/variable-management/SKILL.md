---
name: variable-management
version: 1.0.0
description: Complete guide to catalog variables including all types, reference qualifiers, cascading variables, and UI policies
author: Happy Technologies LLC
tags: [catalog, variables, item_option_new, question_choice, ui-policy, service-catalog]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/item_option_new
    - /api/now/table/question_choice
    - /api/now/table/catalog_ui_policy
    - /api/now/table/catalog_ui_policy_action
  native:
    - Bash
complexity: intermediate
estimated_time: 25-40 minutes
---

# Service Catalog Variable Management

## Overview

This skill covers comprehensive catalog variable management:

- All variable types and when to use each
- Creating and configuring variables
- Reference qualifiers for filtering options
- Cascading/dependent variables
- UI policies for show/hide/mandatory logic
- Variable choices (question_choice table)
- Variable sets for reusability

**When to use:** When building catalog forms, implementing dynamic form behavior, or troubleshooting variable issues.

## Prerequisites

- **Roles:** `catalog_admin` or `admin`
- **Access:** item_option_new, question_choice, catalog_ui_policy tables
- **Knowledge:** Basic catalog structure
- **Related Skills:** `catalog/item-creation` for full item configuration

## Procedure

### Step 1: Understand Variable Types

**CRITICAL:** Variable types are numeric values stored in the `type` field.

**Complete Variable Type Reference:**

| Type | Value | Use Case | Example |
|------|-------|----------|---------|
| **Single Line Text** | 16 | Short text input | Names, titles, codes |
| **Multi-Line Text** | 6 | Long text | Descriptions, notes, justifications |
| **Choice (Radio)** | 1 | 2-5 options, visible at once | Priority, Yes/No/Maybe |
| **Select Box (Dropdown)** | 5 | 6+ options or long labels | Department, Location |
| **Reference** | 8 | Link to ServiceNow record | User, CI, Group |
| **Yes/No** | 7 | Boolean toggle | Checkboxes, toggles |
| **CheckBox** | 7 | Same as Yes/No | Acceptance, agreement |
| **Date** | 9 | Date picker | Start date, due date |
| **Date/Time** | 10 | Date and time picker | Meeting time, deadline |
| **Email** | 32 | Email validation | Contact email |
| **URL** | 26 | URL validation | Website, link |
| **Numeric Scale** | 2 | 1-10 rating | Satisfaction, priority |
| **Lookup Select Box** | 21 | Filtered reference dropdown | Filtered users/CIs |
| **Container Start** | 19 | Group variables visually | Section header |
| **Container End** | 20 | End container group | Section footer |
| **Label** | 11 | Display-only text | Instructions, warnings |
| **Break** | 12 | Visual separator | Line break |
| **Macro** | 14 | UI macro execution | Custom widgets |
| **Masked** | 25 | Password-style input | Sensitive data |
| **HTML** | 17 | Rich text/HTML display | Formatted instructions |
| **Wide Text** | 6 | Same as Multi-Line | Legacy |
| **IP Address** | 27 | IP address validation | Network config |
| **Duration** | 29 | Time duration | SLA duration |
| **Attachment** | 15 | File upload | Documents, images |
| **List Collector** | 22 | Multi-select reference | Multiple users/groups |
| **Lookup Multiple Choice** | 23 | Multi-select filtered | Multiple filtered refs |

### Step 2: Create Basic Variables

**Single Line Text Variable:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "employee_name"
    question_text: "Employee Full Name"
    type: 16
    order: 100
    mandatory: true
    active: true
    help_text: "Enter the employee's full legal name as it appears on their ID"
    example_text: "John A. Smith"
    default_value: ""
```

**Multi-Line Text Variable:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "business_justification"
    question_text: "Business Justification"
    type: 6
    order: 200
    mandatory: true
    active: true
    help_text: "Explain why this request is needed for business operations"
```

**Date Variable:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "required_by_date"
    question_text: "Required By Date"
    type: 9
    order: 300
    mandatory: true
    active: true
```

### Step 3: Create Choice Variables

**CRITICAL:** Catalog variable choices use `question_choice` table, NOT `sys_choice`!

**Type 1 - Choice (Radio Buttons):**
Best for 2-5 options that users need to see at once.
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "urgency_level"
    question_text: "Request Urgency"
    type: 1  # Radio buttons
    order: 400
    mandatory: true
    active: true
```

**Type 5 - Select Box (Dropdown):**
Best for 6+ options or options with long labels.
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "department"
    question_text: "Department"
    type: 5  # Dropdown
    order: 500
    mandatory: true
    active: true
    include_none: false  # Don't show "-- None --" option
```

**Add Choices to Variable:**
```
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: [variable_sys_id]  # item_option_new sys_id
    text: "Engineering"
    value: "engineering"
    order: 100
    inactive: false
```

```
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: [variable_sys_id]
    text: "Marketing"
    value: "marketing"
    order: 200
    inactive: false
```

```
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: [variable_sys_id]
    text: "Finance"
    value: "finance"
    order: 300
    inactive: false
```

**Query Variable Choices:**
```
Tool: SN-Query-Table
Parameters:
  table_name: question_choice
  query: question=[variable_sys_id]
  fields: sys_id,text,value,order,inactive
  limit: 100
```

### Step 4: Create Reference Variables

**Basic Reference Variable:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "requested_for"
    question_text: "Request For (User)"
    type: 8  # Reference
    reference: sys_user  # Target table
    order: 100
    mandatory: true
    active: true
```

**Reference with Qualifier (Filter):**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "manager_approval"
    question_text: "Manager for Approval"
    type: 8
    reference: sys_user
    reference_qual: "active=true^rolesLIKEmanager"
    order: 200
    mandatory: true
    active: true
```

**Reference Qualifier Examples:**
| Use Case | Reference Qual |
|----------|---------------|
| Active users only | `active=true` |
| Users in specific group | `sys_idIN<group_members_subquery>` |
| Active CIs | `install_status=1` |
| Specific CI class | `sys_class_name=cmdb_ci_server` |
| Servers in location | `location=[location_sys_id]^sys_class_name=cmdb_ci_server` |

**Dynamic Reference Qualifier (JavaScript):**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "team_member"
    question_text: "Team Member"
    type: 8
    reference: sys_user
    reference_qual: "javascript:new MyCatalogUtils().getTeamMembers(current.variables.department)"
    order: 300
    mandatory: true
    active: true
```

### Step 5: Create Cascading/Dependent Variables

Cascading variables change based on another variable's selection.

**Example: Department -> Team cascade**

**Step 1 - Create Parent Variable (Department):**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "department"
    question_text: "Department"
    type: 5
    order: 100
    mandatory: true
    active: true
# Result: sys_id = "dept_var_id"
```

**Step 2 - Create Child Variable (Team):**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "team"
    question_text: "Team"
    type: 5
    order: 200
    mandatory: true
    active: true
    dependent_on_variable: "dept_var_id"  # Parent variable sys_id
# Result: sys_id = "team_var_id"
```

**Step 3 - Add Choices with Dependencies:**
```
# Engineering teams
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: "team_var_id"
    text: "Frontend Engineering"
    value: "frontend"
    order: 100
    inactive: false
    depends_on: "engineering"  # Value of parent choice
```

```
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: "team_var_id"
    text: "Backend Engineering"
    value: "backend"
    order: 200
    inactive: false
    depends_on: "engineering"
```

```
# Marketing teams
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: "team_var_id"
    text: "Digital Marketing"
    value: "digital"
    order: 100
    inactive: false
    depends_on: "marketing"
```

```
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: "team_var_id"
    text: "Brand Marketing"
    value: "brand"
    order: 200
    inactive: false
    depends_on: "marketing"
```

### Step 6: Create UI Policies

UI policies control variable visibility, mandatory status, and read-only state based on conditions.

**IMPORTANT:** UI Policy Actions cannot be fully linked via REST API due to ServiceNow limitations. The `catalog_variable` field won't update through standard API calls.

**Create UI Policy:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy
  data:
    catalog_item: [catalog_item_sys_id]
    short_description: "Show manager approval when cost > 1000"
    active: true
    on_load: true
    reverse_if_false: true
    script_false: ""
    script_true: ""
    order: 100
```

**UI Policy Conditions:**
Conditions are evaluated against catalog item variables.

**Create UI Policy with Conditions:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy
  data:
    catalog_item: [catalog_item_sys_id]
    short_description: "Show additional details for external vendors"
    conditions: "vendor_type=external"  # Variable name = value
    active: true
    on_load: true
    reverse_if_false: true
    order: 200
```

**UI Policy Action Fields:**
| Action | Description |
|--------|-------------|
| visible | Show/hide the variable |
| mandatory | Make variable required |
| disabled | Make variable read-only |

**Create UI Policy Action:**
```
Tool: SN-Create-Record
Parameters:
  table_name: catalog_ui_policy_action
  data:
    ui_policy: [ui_policy_sys_id]
    catalog_variable: "IO:[variable_sys_id]"  # Must use IO: prefix
    visible: true
    mandatory: true
    disabled: false
```

**Known Issue - UI Policy Action Linking:**
The `catalog_variable` field may not link properly via REST API.

**Workaround - Background Script:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var gr = new GlideRecord('catalog_ui_policy_action');
    gr.get('[action_sys_id]');
    gr.setValue('catalog_variable', 'IO:[variable_sys_id]');
    gr.update();
    gs.info('Updated UI policy action: ' + gr.sys_id);
  description: "Link UI policy action to catalog variable"
```

### Step 7: Configure Variable Sets

Variable sets group reusable variables across multiple catalog items.

**Create Variable Set:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new_set
  data:
    title: "Standard Requester Information"
    description: "Common requester fields used across all hardware requests"
    active: true
    type: "one_to_one"  # Each item gets unique variable instances
    order: 100
```

**Variable Set Types:**
| Type | Description |
|------|-------------|
| one_to_one | Variables cloned per item (independent values) |
| one_to_many | Variables shared across items (same record) |

**Add Variables to Variable Set:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    variable_set: [variable_set_sys_id]  # Instead of cat_item
    name: "cost_center"
    question_text: "Cost Center"
    type: 16
    order: 100
    mandatory: true
    active: true
```

**Associate Variable Set with Catalog Item:**
```
Tool: SN-Create-Record
Parameters:
  table_name: io_set_item
  data:
    sc_cat_item: [catalog_item_sys_id]
    variable_set: [variable_set_sys_id]
    order: 100
```

### Step 8: Advanced Variable Configuration

**Hidden Variable (for workflow data):**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "internal_tracking_id"
    question_text: "Tracking ID"
    type: 16
    order: 9999
    mandatory: false
    active: true
    hidden: true  # Not visible to users
    read_only: true
```

**Read-Only Variable (display only):**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "calculated_cost"
    question_text: "Estimated Cost"
    type: 16
    order: 800
    mandatory: false
    active: true
    read_only: true
    default_value: "$0.00"
```

**Variable with Attributes:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "quantity"
    question_text: "Quantity"
    type: 16
    order: 600
    mandatory: true
    active: true
    attributes: "min=1,max=100,step=1"  # HTML5 validation
```

**List Collector (Multi-Select Reference):**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "additional_users"
    question_text: "Additional Users for Access"
    type: 22  # List Collector
    reference: sys_user
    reference_qual: "active=true"
    order: 700
    mandatory: false
    active: true
```

### Step 9: Query and Verify Variables

**Get all variables for a catalog item:**
```
Tool: SN-Query-Table
Parameters:
  table_name: item_option_new
  query: cat_item=[catalog_item_sys_id]
  fields: sys_id,name,question_text,type,order,mandatory,active,reference
  limit: 100
```

**Get choices for a variable:**
```
Tool: SN-Query-Table
Parameters:
  table_name: question_choice
  query: question=[variable_sys_id]
  fields: sys_id,text,value,order,depends_on,inactive
  limit: 100
```

**Get UI policies for catalog item:**
```
Tool: SN-Query-Table
Parameters:
  table_name: catalog_ui_policy
  query: catalog_item=[catalog_item_sys_id]^active=true
  fields: sys_id,short_description,conditions,on_load,reverse_if_false
  limit: 50
```

**Get variable sets for catalog item:**
```
Tool: SN-Query-Table
Parameters:
  table_name: io_set_item
  query: sc_cat_item=[catalog_item_sys_id]
  fields: sys_id,variable_set.title,order
  limit: 50
```

## Complete Example: Hardware Request Form

```
# 1. Create container for requester info
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "hardware_item_id"
    name: "requester_section"
    question_text: "Requester Information"
    type: 19  # Container Start
    order: 100
    active: true

# 2. Requested For
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "hardware_item_id"
    name: "requested_for"
    question_text: "Requested For"
    type: 8
    reference: sys_user
    reference_qual: "active=true"
    order: 110
    mandatory: true
    active: true

# 3. Department (dropdown)
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "hardware_item_id"
    name: "department"
    question_text: "Department"
    type: 5
    order: 120
    mandatory: true
    active: true
# Result: sys_id = "dept_id"

# Add department choices
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: "dept_id"
    text: "Engineering"
    value: "eng"
    order: 100

Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: "dept_id"
    text: "Sales"
    value: "sales"
    order: 200

Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: "dept_id"
    text: "Finance"
    value: "fin"
    order: 300

# 4. End requester section
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "hardware_item_id"
    name: "requester_section_end"
    question_text: ""
    type: 20  # Container End
    order: 190
    active: true

# 5. Hardware type (radio - 3 options)
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "hardware_item_id"
    name: "hardware_type"
    question_text: "Hardware Type"
    type: 1  # Radio buttons
    order: 200
    mandatory: true
    active: true
# Result: sys_id = "hw_type_id"

Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: "hw_type_id"
    text: "Laptop"
    value: "laptop"
    order: 100

Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: "hw_type_id"
    text: "Desktop"
    value: "desktop"
    order: 200

Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: "hw_type_id"
    text: "Monitor"
    value: "monitor"
    order: 300

# 6. Business justification
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "hardware_item_id"
    name: "justification"
    question_text: "Business Justification"
    type: 6  # Multi-line
    order: 300
    mandatory: true
    active: true

# 7. Required by date
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "hardware_item_id"
    name: "needed_by"
    question_text: "Required By"
    type: 9  # Date
    order: 400
    mandatory: true
    active: true
```

## Variable Type Decision Guide

```
Text Input:
├── Short answer (< 100 chars)?
│   └── Type 16: Single Line Text
├── Long answer (> 100 chars)?
│   └── Type 6: Multi-Line Text
└── Sensitive/password?
    └── Type 25: Masked

Selection (from list):
├── 2-5 options, visible at once?
│   └── Type 1: Choice (Radio)
├── 6+ options OR long labels?
│   └── Type 5: Select Box
├── Single ServiceNow record?
│   └── Type 8: Reference
├── Multiple ServiceNow records?
│   └── Type 22: List Collector
└── Filtered reference list?
    └── Type 21: Lookup Select Box

Boolean:
└── Yes/No or Checkbox?
    └── Type 7: Yes/No

Date/Time:
├── Date only?
│   └── Type 9: Date
└── Date and time?
    └── Type 10: Date/Time

Special:
├── Email address?
│   └── Type 32: Email
├── URL/link?
│   └── Type 26: URL
├── IP address?
│   └── Type 27: IP Address
├── File upload?
│   └── Type 15: Attachment
├── Rating (1-10)?
│   └── Type 2: Numeric Scale
└── Time duration?
    └── Type 29: Duration

Display Only:
├── Instructions/info?
│   └── Type 11: Label
├── Rich HTML content?
│   └── Type 17: HTML
└── Visual separator?
    └── Type 12: Break

Layout:
├── Start section?
│   └── Type 19: Container Start
└── End section?
    └── Type 20: Container End
```

## Tool Usage Summary

| Operation | MCP Tool | Table |
|-----------|----------|-------|
| Create variable | SN-Create-Record | item_option_new |
| Create choice | SN-Create-Record | question_choice |
| Create UI policy | SN-Create-Record | catalog_ui_policy |
| Create UI policy action | SN-Create-Record | catalog_ui_policy_action |
| Create variable set | SN-Create-Record | item_option_new_set |
| Link variable set | SN-Create-Record | io_set_item |
| Query variables | SN-Query-Table | item_option_new |
| Query choices | SN-Query-Table | question_choice |

## Best Practices

- **Use Type 5 for 6+ Options:** Dropdowns handle long lists better than radio buttons
- **Use Type 1 for 2-5 Options:** Radio buttons let users see all options at once
- **question_choice NOT sys_choice:** Always use question_choice for catalog variables
- **Order in Increments of 100:** Allows inserting variables later (100, 200, 300...)
- **Meaningful Variable Names:** Use lowercase_with_underscores naming
- **Help Text:** Always provide context for complex fields
- **Group with Containers:** Use Type 19/20 to organize related fields
- **Reference Qualifiers:** Filter reference fields to relevant records only
- **Test UI Policies:** Verify show/hide logic works in both directions

## Troubleshooting

### Choices Not Appearing

**Symptom:** Dropdown or radio shows no options
**Cause:** Choices created in `sys_choice` instead of `question_choice`
**Solution:**
```
# Verify choices are in question_choice
Tool: SN-Query-Table
Parameters:
  table_name: question_choice
  query: question=[variable_sys_id]
  fields: text,value,order,inactive

# If empty, create choices in correct table
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: [variable_sys_id]
    text: "Option 1"
    value: "opt1"
    order: 100
```

### Cascading Variable Not Filtering

**Symptom:** Child variable shows all choices regardless of parent selection
**Cause:** `depends_on` value doesn't match parent choice value
**Solution:**
```
# Check parent choices
Tool: SN-Query-Table
Parameters:
  table_name: question_choice
  query: question=[parent_variable_sys_id]
  fields: text,value

# Verify child choices have matching depends_on values
Tool: SN-Query-Table
Parameters:
  table_name: question_choice
  query: question=[child_variable_sys_id]
  fields: text,value,depends_on
```

### UI Policy Not Working

**Symptom:** Variable not hiding/showing based on conditions
**Causes:**
1. UI policy inactive
2. Condition syntax incorrect
3. UI policy action not linked
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: catalog_ui_policy
  query: catalog_item=[item_sys_id]
  fields: short_description,conditions,active,reverse_if_false

Tool: SN-Query-Table
Parameters:
  table_name: catalog_ui_policy_action
  query: ui_policy=[policy_sys_id]
  fields: catalog_variable,visible,mandatory,disabled
```

### Reference Qualifier Syntax Error

**Symptom:** Reference field shows error or no results
**Cause:** Invalid encoded query syntax in reference_qual
**Solution:** Test query in list filter first, then use exact same syntax

## Related Skills

- `catalog/item-creation` - Creating complete catalog items
- `catalog/approval-workflows` - Approval configuration
- `catalog/request-fulfillment` - Processing submitted requests
- `admin/client-script-development` - Dynamic form behavior

## References

- [ServiceNow Variable Types](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/service-catalog-management/concept/c_IntroductionToCatalogVariables.html)
- [Catalog UI Policies](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/service-catalog-management/task/t_CreateACatalogUIPolicy.html)
- [Variable Sets](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/service-catalog-management/concept/c_VariableSets.html)
