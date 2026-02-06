---
name: item-creation
version: 1.0.0
description: Complete guide to creating and configuring service catalog items with variables, categories, and fulfillment
author: Happy Technologies LLC
tags: [catalog, item, variables, sc_cat_item, service-catalog, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sc_cat_item
    - /api/now/table/item_option_new
    - /api/now/table/sc_category
    - /api/now/table/io_set_item
  native:
    - Bash
complexity: intermediate
estimated_time: 20-45 minutes
---

# Service Catalog Item Creation

## Overview

This skill covers the complete process of creating service catalog items:

- Understanding catalog item structure
- Creating items with proper categorization
- Adding variables (form fields) with correct types
- Configuring variable sets for reusability
- Setting up pricing and fulfillment options
- Publishing and testing items

**When to use:** When creating new service offerings, building request forms, or configuring catalog item fulfillment.

## Prerequisites

- **Roles:** `catalog_admin` or `admin`
- **Access:** sc_cat_item, item_option_new, sc_category tables
- **Knowledge:** Service catalog structure, variable types
- **Related Skills:** Complete `catalog/variable-management` for advanced variable configuration

## Procedure

### Step 1: Understand Catalog Item Structure

```
sc_catalog (Catalog)
└── sc_category (Category)
    └── sc_cat_item (Catalog Item)
        ├── item_option_new (Variables) - Form fields
        ├── io_set_item (Variable Set M2M) - Reusable variable groups
        ├── sc_cat_item_catalog (Catalog M2M) - Multi-catalog support
        └── workflow/flow (Fulfillment) - Processing logic
```

**Key Tables:**
| Table | Purpose |
|-------|---------|
| sc_cat_item | Catalog item definition |
| sc_category | Category for organization |
| item_option_new | Individual variables (form fields) |
| io_set_item | Variable set to item mapping |
| question_choice | Choices for catalog variables (NOT sys_choice!) |

### Step 2: Find or Create Category

**Query existing categories:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_category
  query: active=true
  fields: sys_id,title,parent,sc_catalog,order
  limit: 100
```

**Create new category if needed:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_category
  data:
    title: "Employee Services"
    sc_catalog: [catalog_sys_id]  # Usually Service Catalog
    parent: [parent_category_sys_id]  # Optional
    description: "Services for employee onboarding and lifecycle"
    icon: "user"
    active: true
    order: 100
```

### Step 3: Create the Catalog Item

**Basic Catalog Item:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_cat_item
  data:
    name: "New Employee Laptop Request"
    short_description: "Request a laptop for new employee"
    description: |
      Use this form to request a laptop for a new employee.

      Processing time: 3-5 business days

      Please have the following information ready:
      - Employee name and start date
      - Department and manager
      - Required software
    category: [category_sys_id]
    sc_catalogs: [catalog_sys_id]
    workflow: [workflow_sys_id]  # Or use flow_designer_flow
    active: true
    visible_standalone: true
    visible_bundle: true
    visible_guide: true
    order: 100
    meta: "laptop,computer,hardware,new hire"  # Search keywords
```

**Advanced Item Configuration:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_cat_item
  data:
    name: "Software License Request"
    short_description: "Request software license"
    category: [category_sys_id]
    sc_catalogs: [catalog_sys_id]
    # Pricing
    price: 0
    recurring_price: 99.00
    recurring_frequency: "monthly"
    # Approval
    no_quantity: false
    no_proceed_checkout: false
    # Availability
    start_date: "2026-01-01"
    end_date: ""  # No end date
    availability: "on_desktop"  # desktop, mobile, both
    # SLA
    delivery_time: "3 00:00:00"  # 3 days in GlideDuration format
    # Template
    template: [template_sys_id]  # Pre-fill variables
    active: true
```

### Step 4: Add Variables (Form Fields)

**Variable Types Reference:**
| Type | Value | Use Case |
|------|-------|----------|
| Single Line Text | 16 | Short text input (names, titles) |
| Multi-Line Text | 6 | Long text (descriptions, notes) |
| Choice (Radio) | 1 | 2-5 options, visible at once |
| Select Box (Dropdown) | 5 | 6+ options or long labels |
| Reference | 8 | Link to ServiceNow record |
| Yes/No | 7 | Boolean toggle |
| CheckBox | 7 | Same as Yes/No |
| Date | 9 | Date picker |
| Date/Time | 10 | Date and time picker |
| Email | 32 | Email validation |
| URL | 26 | URL validation |
| Numeric Scale | 2 | 1-10 rating |
| Lookup Select Box | 21 | Filtered reference |
| Container Start | 19 | Group variables visually |
| Container End | 20 | End container group |
| Label | 11 | Display-only text |
| Break | 12 | Visual separator |
| Macro | 14 | UI macro execution |
| Masked | 25 | Password-style input |
| HTML | 17 | Rich text/HTML display |

**Create Single Line Text Variable:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "employee_name"
    question_text: "Employee Full Name"
    type: 16  # Single Line Text
    order: 100
    mandatory: true
    active: true
    help_text: "Enter the employee's full legal name"
    default_value: ""
```

**Create Select Box (Dropdown) Variable:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "laptop_type"
    question_text: "Laptop Type"
    type: 5  # Select Box
    order: 200
    mandatory: true
    active: true
    include_none: false
```

**Create Choice (Radio Button) Variable:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "warranty"
    question_text: "Warranty Option"
    type: 1  # Choice (Radio)
    order: 300
    mandatory: true
    active: true
```

**Create Reference Variable:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "manager"
    question_text: "Manager"
    type: 8  # Reference
    reference: sys_user
    reference_qual: "active=true^roles!=admin"  # Filter options
    order: 400
    mandatory: true
    active: true
```

**Create Date Variable:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "start_date"
    question_text: "Employee Start Date"
    type: 9  # Date
    order: 500
    mandatory: true
    active: true
```

**Create Multi-Line Text Variable:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: [catalog_item_sys_id]
    name: "special_requirements"
    question_text: "Special Requirements or Notes"
    type: 6  # Multi-Line Text
    order: 600
    mandatory: false
    active: true
    default_value: ""
```

### Step 5: Add Choices to Variables

**CRITICAL:** Catalog variable choices use `question_choice` table, NOT `sys_choice`!

**Add choices to a Select Box or Choice variable:**
```
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: [variable_sys_id]  # item_option_new sys_id
    text: "MacBook Pro 14-inch"
    value: "macbook_pro_14"
    order: 100
    inactive: false
```

```
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: [variable_sys_id]
    text: "MacBook Pro 16-inch"
    value: "macbook_pro_16"
    order: 200
    inactive: false
```

```
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: [variable_sys_id]
    text: "Dell XPS 15"
    value: "dell_xps_15"
    order: 300
    inactive: false
```

### Step 6: Configure Variable Sets (Reusable Groups)

Variable sets allow reusing common variable groups across multiple catalog items.

**Query existing variable sets:**
```
Tool: SN-Query-Table
Parameters:
  table_name: item_option_new_set
  query: active=true
  fields: sys_id,title,description
  limit: 50
```

**Create new variable set:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new_set
  data:
    title: "Standard Location Questions"
    description: "Common location-related variables for hardware requests"
    active: true
    type: "one_to_one"  # or "one_to_many"
    order: 100
```

**Add variable to variable set:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    variable_set: [variable_set_sys_id]  # Instead of cat_item
    name: "delivery_location"
    question_text: "Delivery Location"
    type: 16
    order: 100
    mandatory: true
    active: true
```

**Associate variable set with catalog item:**
```
Tool: SN-Create-Record
Parameters:
  table_name: io_set_item
  data:
    sc_cat_item: [catalog_item_sys_id]
    variable_set: [variable_set_sys_id]
    order: 100
```

### Step 7: Configure Pricing

**One-Time Price:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_cat_item
  sys_id: [catalog_item_sys_id]
  data:
    price: 1500.00
    cost: 1200.00  # Internal cost
    recurring_price: 0
```

**Recurring Price:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_cat_item
  sys_id: [catalog_item_sys_id]
  data:
    price: 0
    recurring_price: 49.99
    recurring_frequency: "monthly"  # monthly, quarterly, yearly
```

**Variable-Based Pricing:**
Configure pricing through workflow or catalog client script based on selected options.

### Step 8: Configure Fulfillment

**Assign Fulfillment Group:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_cat_item
  sys_id: [catalog_item_sys_id]
  data:
    fulfillment_group: [group_sys_id]
    group: [group_sys_id]  # Alternative field
```

**Assign Workflow:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_cat_item
  sys_id: [catalog_item_sys_id]
  data:
    workflow: [workflow_sys_id]
```

**Assign Flow Designer Flow:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_cat_item
  sys_id: [catalog_item_sys_id]
  data:
    flow_designer_flow: [flow_sys_id]
```

### Step 9: Publish and Test

**Activate Catalog Item:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_cat_item
  sys_id: [catalog_item_sys_id]
  data:
    active: true
```

**Verify Item Configuration:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_cat_item
  query: sys_id=[catalog_item_sys_id]
  fields: name,short_description,category,active,workflow,price
```

**Verify Variables:**
```
Tool: SN-Query-Table
Parameters:
  table_name: item_option_new
  query: cat_item=[catalog_item_sys_id]
  fields: name,question_text,type,order,mandatory,active
  limit: 50
```

**Verify Variable Choices:**
```
Tool: SN-Query-Table
Parameters:
  table_name: question_choice
  query: question.cat_item=[catalog_item_sys_id]
  fields: question.name,text,value,order
  limit: 100
```

## Complete Example: New Employee Laptop Request

```
# 1. Create catalog item
Tool: SN-Create-Record
Parameters:
  table_name: sc_cat_item
  data:
    name: "New Employee Laptop Request"
    short_description: "Request a laptop for new employee"
    description: "Complete this form to request laptop provisioning for new hires"
    category: [category_sys_id]
    sc_catalogs: [catalog_sys_id]
    price: 0
    delivery_time: "5 00:00:00"
    active: true
# Result: sys_id = "abc123"

# 2. Create employee name variable
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "abc123"
    name: "employee_name"
    question_text: "Employee Name"
    type: 16
    order: 100
    mandatory: true
    active: true

# 3. Create laptop type variable
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "abc123"
    name: "laptop_type"
    question_text: "Laptop Type"
    type: 5
    order: 200
    mandatory: true
    active: true
# Result: sys_id = "def456"

# 4. Add choices to laptop type
Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: "def456"
    text: "MacBook Pro 14-inch"
    value: "macbook_14"
    order: 100

Tool: SN-Create-Record
Parameters:
  table_name: question_choice
  data:
    question: "def456"
    text: "Dell XPS 15"
    value: "dell_xps_15"
    order: 200

# 5. Create start date variable
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "abc123"
    name: "start_date"
    question_text: "Employee Start Date"
    type: 9
    order: 300
    mandatory: true
    active: true

# 6. Create manager reference
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  data:
    cat_item: "abc123"
    name: "reporting_manager"
    question_text: "Reporting Manager"
    type: 8
    reference: sys_user
    reference_qual: "active=true"
    order: 400
    mandatory: true
    active: true
```

## Best Practices

- **Naming Conventions:** Use lowercase_with_underscores for variable names
- **Order Variables Logically:** Group related fields, put mandatory fields first
- **Use Variable Sets:** Reuse common groups (location, approver, dates)
- **Test Before Publishing:** Create test request to verify form flow
- **Document Items:** Use description field for user guidance
- **Optimize for Mobile:** Consider mobile users when designing forms
- **Use Type 5 for 6+ Options:** Select box better UX for long lists
- **Use Type 1 for 2-5 Options:** Radio buttons visible at glance

## Troubleshooting

### Variable Not Appearing on Form

**Symptom:** Created variable but not visible on catalog form
**Causes:**
1. Variable inactive
2. Wrong cat_item reference
3. UI policy hiding it
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: item_option_new
  query: cat_item=[item_sys_id]^active=true
  fields: name,question_text,active,order
```

### Choices Not Appearing in Dropdown

**Symptom:** Select box or choice variable shows no options
**Cause:** Choices created in sys_choice instead of question_choice
**Solution:** Use question_choice table for catalog variables
```
Tool: SN-Query-Table
Parameters:
  table_name: question_choice
  query: question=[variable_sys_id]
  fields: text,value,order,inactive
```

### Reference Qualifier Not Working

**Symptom:** Reference variable showing all records instead of filtered
**Cause:** Invalid reference_qual syntax
**Solution:** Verify encoded query syntax is correct

### Item Not Visible in Catalog

**Symptom:** Item created but not appearing in catalog
**Causes:**
1. Item inactive
2. Wrong category
3. Missing catalog association
**Solution:** Verify active=true and sc_catalogs populated

## Related Skills

- `catalog/variable-management` - Advanced variable configuration
- `catalog/approval-workflows` - Setting up approvals
- `catalog/request-fulfillment` - Processing requests
- `admin/workflow-management` - Building fulfillment workflows

## References

- [ServiceNow Service Catalog](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/service-catalog-management/concept/c_ServiceCatalogManagement.html)
- [Catalog Item Configuration](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/service-catalog-management/concept/c_CatalogItemsOverview.html)
- [Variable Types](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/service-catalog-management/concept/c_IntroductionToCatalogVariables.html)
