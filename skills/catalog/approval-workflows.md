---
name: approval-workflows
version: 1.0.0
description: Complete guide to configuring catalog approval rules, multi-level approvals, delegation, and escalation
author: Happy Technologies LLC
tags: [catalog, approval, workflow, sysapproval, service-catalog, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
  rest:
    - /api/now/table/sysapproval_approver
    - /api/now/table/sc_ic_aprvl_type_defn
    - /api/now/table/sc_ic_aprvl_defn
    - /api/now/table/sysapproval_group
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Service Catalog Approval Workflows

## Overview

This skill covers approval management for service catalog items:

- Understanding approval architecture
- Configuring approval rules and conditions
- Multi-level and parallel approvals
- Approval delegation and coverage
- Timeout, reminder, and escalation configuration
- Monitoring and managing approval requests

**When to use:** When setting up approval processes for catalog items, troubleshooting stuck approvals, or implementing complex approval routing.

## Prerequisites

- **Roles:** `catalog_admin`, `approval_admin`, or `admin`
- **Access:** sysapproval_approver, sc_ic_aprvl_type_defn, sc_ic_aprvl_defn tables
- **Knowledge:** Service catalog structure, approval concepts
- **Related Skills:** `catalog/item-creation` should be completed first

## Procedure

### Step 1: Understand Approval Architecture

**Approval Tables:**
| Table | Purpose |
|-------|---------|
| sysapproval_approver | Individual approval records (one per approver) |
| sysapproval_group | Group-based approvals |
| sc_ic_aprvl_type_defn | Catalog approval type definitions |
| sc_ic_aprvl_defn | Catalog-specific approval definitions |
| sys_approval_rule | System-wide approval rules |

**Approval Flow:**
```
Request Submitted
      ↓
Approval Rule Evaluated
      ↓
Approval Records Created (sysapproval_approver)
      ↓
Approvers Notified
      ↓
Approver Takes Action
      ↓
Next Level (if multi-level) OR Complete
```

**Approval States:**
| State | Value | Description |
|-------|-------|-------------|
| Not Yet Requested | not yet requested | Approval not triggered |
| Requested | requested | Waiting for approver action |
| Approved | approved | Approver approved |
| Rejected | rejected | Approver rejected |
| Cancelled | cancelled | Approval cancelled |
| Duplicate | duplicate | Duplicate approval skipped |
| Not Required | not_required | Approval waived |

### Step 2: Query Existing Approvals

**Find pending approvals for a request:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: sysapproval=[ritm_sys_id]
  fields: sys_id,approver,state,due_date,source_table,sys_created_on
  limit: 50
```

**Find all pending approvals for a user:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: approver=[user_sys_id]^state=requested
  fields: sys_id,sysapproval,document_id,source_table,sys_created_on
  limit: 100
```

**Find overdue approvals:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: state=requested^due_date<javascript:gs.nowDateTime()
  fields: sys_id,approver,sysapproval,due_date,source_table
  limit: 100
```

### Step 3: Create Approval Rules (Legacy Method)

**Note:** This uses the legacy approval rule system. For new implementations, consider using Flow Designer or Catalog Builder approval types.

**Create basic approval rule:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_approval_rule
  data:
    name: "Manager Approval for Hardware > $1000"
    active: true
    table: sc_req_item
    condition: cat_item.price>1000^cat_item.category.title=Hardware
    approval_type: "single"
    approver_field: "opened_by.manager"
    order: 100
```

### Step 4: Configure Catalog Approval Types

Catalog approval types define reusable approval patterns.

**Query existing approval types:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_ic_aprvl_type_defn
  query: active=true
  fields: sys_id,name,description,approval_type
  limit: 50
```

**Create approval type definition:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_ic_aprvl_type_defn
  data:
    name: "Manager Approval"
    description: "Requires approval from requester's manager"
    active: true
    approval_type: "approver_user_field"
    approver_user_field: "requested_for.manager"
    wait_for: "everyone"  # everyone, anyone
    mandatory: true
```

**Approval Type Options:**
| approval_type | Description |
|--------------|-------------|
| approver_user_field | User from field on record |
| approver_group_field | Group from field on record |
| specific_user | Hardcoded user |
| specific_group | Hardcoded group |
| script | Custom script determines approver |

### Step 5: Configure Multi-Level Approvals

Multi-level approvals execute in sequence based on order.

**Create Level 1 - Manager Approval:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_ic_aprvl_defn
  data:
    catalog_item: [catalog_item_sys_id]
    name: "Manager Approval"
    approval_type_definition: [manager_approval_type_sys_id]
    order: 100
    active: true
    condition: ""  # Always apply
```

**Create Level 2 - Director Approval (for high-value requests):**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_ic_aprvl_defn
  data:
    catalog_item: [catalog_item_sys_id]
    name: "Director Approval"
    approval_type_definition: [director_approval_type_sys_id]
    order: 200
    active: true
    condition: "price>5000"  # Only for requests over $5000
```

**Create Level 3 - Finance Approval (for very high value):**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_ic_aprvl_defn
  data:
    catalog_item: [catalog_item_sys_id]
    name: "Finance Approval"
    approval_type_definition: [finance_approval_type_sys_id]
    order: 300
    active: true
    condition: "price>10000"
```

### Step 6: Configure Parallel Approvals

Parallel approvals execute simultaneously at the same level.

**Create Parallel Approvers (same order = parallel):**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_ic_aprvl_defn
  data:
    catalog_item: [catalog_item_sys_id]
    name: "IT Security Review"
    approval_type_definition: [security_approval_type_sys_id]
    order: 100  # Same order as other parallel approval
    active: true
```

```
Tool: SN-Create-Record
Parameters:
  table_name: sc_ic_aprvl_defn
  data:
    catalog_item: [catalog_item_sys_id]
    name: "Legal Review"
    approval_type_definition: [legal_approval_type_sys_id]
    order: 100  # Same order = parallel execution
    active: true
```

**Wait For Options:**
- `everyone` - All approvers must approve
- `anyone` - First approval completes the level
- `majority` - Majority of approvers must approve

### Step 7: Configure Group Approvals

**Create group-based approval type:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_ic_aprvl_type_defn
  data:
    name: "Change Advisory Board"
    description: "CAB approval required for major changes"
    active: true
    approval_type: "specific_group"
    approver_group: [cab_group_sys_id]
    wait_for: "everyone"
```

**Query group approval status:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_group
  query: parent=[ritm_sys_id]
  fields: sys_id,group,approval,sys_created_on
```

### Step 8: Configure Approval Delegation

Delegation allows users to assign approval authority to others during absence.

**Query existing delegations:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_delegate
  query: delegate=[user_sys_id]^active=true
  fields: sys_id,user,delegate,starts,ends,approval
  limit: 50
```

**Create delegation record:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_user_delegate
  data:
    user: [original_approver_sys_id]
    delegate: [delegate_user_sys_id]
    starts: "2026-02-10"
    ends: "2026-02-24"
    approval: true  # Delegate approvals
    active: true
```

### Step 9: Configure Timeout and Escalation

**Approval with Due Date:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sysapproval_approver
  sys_id: [approval_sys_id]
  data:
    due_date: "2026-02-13 17:00:00"
```

**Create Escalation via SLA:**
Configure through SLA Definitions (sla) table:
```
Tool: SN-Create-Record
Parameters:
  table_name: contract_sla
  data:
    name: "Approval Escalation - 48 Hours"
    table: sysapproval_approver
    condition: "state=requested"
    duration: "2 00:00:00"  # 48 hours
    workflow: [escalation_workflow_sys_id]
    active: true
```

### Step 10: Process Approvals Programmatically

**Approve a request:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sysapproval_approver
  sys_id: [approval_sys_id]
  data:
    state: "approved"
    comments: "Approved - budget verified and manager confirmed need"
```

**Reject a request:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sysapproval_approver
  sys_id: [approval_sys_id]
  data:
    state: "rejected"
    comments: "Rejected - request exceeds department budget. Please resubmit next quarter."
```

**Cancel pending approvals:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sysapproval_approver
  sys_id: [approval_sys_id]
  data:
    state: "cancelled"
    comments: "Approval cancelled - request withdrawn by user"
```

### Step 11: Monitor Approval Metrics

**Count pending approvals by group:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: state=requested^sys_created_on>=javascript:gs.beginningOfLastMonth()
  fields: sys_id,approver.u_group,state
  limit: 1000
```

**Find approval bottlenecks:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: state=requested^sys_created_onRELATIVELE@dayofweek@ago@5
  fields: sys_id,approver,sysapproval,sys_created_on
  limit: 100
```

## Complete Example: Multi-Level Hardware Approval

```
# 1. Create Manager Approval Type
Tool: SN-Create-Record
Parameters:
  table_name: sc_ic_aprvl_type_defn
  data:
    name: "Requester Manager"
    description: "Approval from requester's direct manager"
    active: true
    approval_type: "approver_user_field"
    approver_user_field: "requested_for.manager"
    wait_for: "everyone"
    mandatory: true
# Result: sys_id = "type_manager"

# 2. Create IT Director Approval Type
Tool: SN-Create-Record
Parameters:
  table_name: sc_ic_aprvl_type_defn
  data:
    name: "IT Director"
    description: "IT Director approval for large hardware purchases"
    active: true
    approval_type: "specific_user"
    specific_user: [it_director_sys_id]
    wait_for: "everyone"
    mandatory: true
# Result: sys_id = "type_director"

# 3. Create Level 1 Approval Definition (always required)
Tool: SN-Create-Record
Parameters:
  table_name: sc_ic_aprvl_defn
  data:
    catalog_item: [hardware_item_sys_id]
    name: "Manager Approval"
    approval_type_definition: "type_manager"
    order: 100
    active: true
    condition: ""

# 4. Create Level 2 Approval Definition (only for > $2000)
Tool: SN-Create-Record
Parameters:
  table_name: sc_ic_aprvl_defn
  data:
    catalog_item: [hardware_item_sys_id]
    name: "IT Director Approval"
    approval_type_definition: "type_director"
    order: 200
    active: true
    condition: "price>2000"

# 5. Verify configuration
Tool: SN-Query-Table
Parameters:
  table_name: sc_ic_aprvl_defn
  query: catalog_item=[hardware_item_sys_id]
  fields: name,approval_type_definition,order,condition,active
```

## Approval State Transitions

```
                        ┌──────────────────┐
                        │  not yet requested│
                        └─────────┬────────┘
                                  │ Workflow triggers
                        ┌─────────▼────────┐
                        │    requested      │
                        └─────────┬────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
┌─────────▼────────┐   ┌─────────▼────────┐   ┌─────────▼────────┐
│    approved      │   │    rejected      │   │    cancelled     │
└──────────────────┘   └──────────────────┘   └──────────────────┘
          │
          │ All approvals approved
┌─────────▼──────────────────────┐
│  Request proceeds to fulfillment│
└────────────────────────────────┘
```

## Tool Usage Summary

| Operation | MCP Tool | Table |
|-----------|----------|-------|
| Query approvals | SN-Query-Table | sysapproval_approver |
| Process approval | SN-Update-Record | sysapproval_approver |
| Create approval type | SN-Create-Record | sc_ic_aprvl_type_defn |
| Create approval definition | SN-Create-Record | sc_ic_aprvl_defn |
| Configure delegation | SN-Create-Record | sys_user_delegate |
| Query group approvals | SN-Query-Table | sysapproval_group |

## Best Practices

- **Minimize Approval Levels:** Each level adds delay; use conditions to skip when appropriate
- **Use Groups Over Individuals:** Groups survive personnel changes
- **Set Due Dates:** Ensure approvals don't stall indefinitely
- **Configure Escalation:** Auto-escalate overdue approvals
- **Document Conditions:** Make approval conditions clear and auditable
- **Test All Paths:** Test approval, rejection, and cancellation flows
- **Monitor Metrics:** Track approval time and bottlenecks
- **Enable Delegation:** Allow coverage during PTO

## Troubleshooting

### Approval Not Generated

**Symptom:** Request submitted but no approval record created
**Causes:**
1. Approval rule condition not met
2. Approval type inactive
3. Workflow not triggering approval activity
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_ic_aprvl_defn
  query: catalog_item=[item_sys_id]^active=true
  fields: name,condition,active,order
```

### Approval Stuck in "Requested"

**Symptom:** Approval pending but approver claims to have acted
**Causes:**
1. Multiple approval records (one approved, one pending)
2. Approver acted on wrong record
3. Multi-level approval waiting for previous level
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: sysapproval=[ritm_sys_id]
  fields: sys_id,approver,state,order,sys_updated_on
```

### Request Rejected But Still Processing

**Symptom:** Request continues despite rejection
**Cause:** Business rule or workflow not honoring rejection
**Solution:** Check workflow for proper rejection handling

### Delegation Not Working

**Symptom:** Delegate not receiving approval requests
**Causes:**
1. Delegation record inactive
2. Date range expired
3. approval flag not set
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_delegate
  query: user=[original_user_sys_id]^active=true
  fields: delegate,starts,ends,approval,active
```

## Related Skills

- `catalog/item-creation` - Creating catalog items (prerequisite)
- `catalog/request-fulfillment` - Processing approved requests
- `admin/workflow-management` - Building approval workflows
- `admin/notification-management` - Approval notification setup

## References

- [ServiceNow Approval Engine](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/administer/workflow/concept/c_ApprovalEngine.html)
- [Catalog Approvals](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/service-catalog-management/concept/c_CatalogApprovals.html)
- [Approval Delegation](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/administer/workflow/concept/c_ApprovalDelegation.html)
