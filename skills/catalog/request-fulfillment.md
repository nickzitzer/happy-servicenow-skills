---
name: request-fulfillment
version: 1.0.0
description: Service catalog request processing, fulfillment workflows, and task management
author: Happy Technologies LLC
tags: [catalog, request, fulfillment, service-catalog, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/sc_request
    - /api/now/table/sc_req_item
    - /api/now/table/sc_task
    - /api/sn_sc/servicecatalog/items
  native:
    - Bash
complexity: intermediate
estimated_time: 15-30 minutes
---

# Service Catalog Request Fulfillment

## Overview

This skill covers the end-to-end service catalog request fulfillment process:

- Understanding request structure (Request → Item → Task)
- Processing incoming requests
- Managing fulfillment tasks
- Approval workflows
- Closing requests properly

**When to use:** When fulfilling service catalog requests, managing request queues, or troubleshooting fulfillment issues.

## Prerequisites

- **Roles:** `catalog_admin`, `itil`, or fulfillment group membership
- **Access:** sc_request, sc_req_item, sc_task tables
- **Knowledge:** Service catalog structure, fulfillment workflows

## Procedure

### Step 1: Understand Request Hierarchy

ServiceNow uses a three-level hierarchy:

```
sc_request (Request)
├── sc_req_item (Requested Item) - One per catalog item ordered
│   ├── sc_task (Catalog Task) - Fulfillment tasks
│   └── sc_task (Catalog Task) - Additional tasks
└── sc_req_item (Requested Item) - If multiple items ordered
    └── sc_task (Catalog Task)
```

**Key Fields:**
| Table | Key Fields |
|-------|------------|
| sc_request | number, requested_for, stage, approval |
| sc_req_item | request, cat_item, stage, variables |
| sc_task | request_item, assignment_group, state |

### Step 2: Query Pending Requests

**Find requests awaiting fulfillment:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_req_item
  query: stage=requested^assignment_group=[your_group_sys_id]
  fields: number,short_description,cat_item,requested_for,sys_created_on
  limit: 50
```

**Find tasks assigned to your group:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_task
  query: state=1^assignment_group=[your_group_sys_id]
  fields: number,short_description,request_item,assigned_to,priority
  limit: 50
```

### Step 3: Review Request Details

**Get full request item with variables:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_req_item
  query: number=RITM0012345
  fields: sys_id,number,short_description,description,cat_item,requested_for,opened_by,variables
```

**Variable Values** are stored in `sc_item_option_mtom` table:
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_item_option_mtom
  query: request_item=[ritm_sys_id]
  fields: sc_item_option,item_option_new.value,item_option_new.item_option_new.question_text
```

### Step 4: Process Fulfillment Tasks

**Accept/Start a Task:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_task
  sys_id: [task_sys_id]
  data:
    state: 2  # Work in Progress
    assigned_to: [your_user_sys_id]
    work_notes: "Starting fulfillment work"
```

**Document Progress:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [task_sys_id]
  table_name: sc_task
  work_notes: |
    Fulfillment Progress:
    1. ✅ Verified request details
    2. ✅ Checked inventory availability
    3. 🔄 Provisioning in progress
    4. ⏳ Pending: Delivery scheduling
```

### Step 5: Handle Approvals

**Check Approval Status:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: sysapproval=[ritm_sys_id]
  fields: approver,state,sys_updated_on,comments
```

**Approval States:**
- `not yet requested` - Approval not started
- `requested` - Waiting for approver
- `approved` - Approved
- `rejected` - Rejected
- `cancelled` - Cancelled

**If Rejected, Notify Requester:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_req_item
  sys_id: [ritm_sys_id]
  data:
    stage: Request Cancelled
    comments: "Your request was not approved. Reason: [rejection reason]. Please contact your manager for more information."
```

### Step 6: Complete Fulfillment

**Close Fulfillment Task:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_task
  sys_id: [task_sys_id]
  data:
    state: 3  # Closed Complete
    close_notes: |
      Fulfillment Complete:
      - Software installed on LAPTOP-12345
      - User notified via email
      - Verified user can access application
    work_notes: "Task completed successfully"
```

**Close Requested Item:**
When all tasks are complete, close the RITM:
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_req_item
  sys_id: [ritm_sys_id]
  data:
    stage: Closed Complete
    close_notes: "All fulfillment tasks completed. User has been notified."
```

**Close Parent Request:**
When all RITMs are complete:
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_request
  sys_id: [req_sys_id]
  data:
    stage: Closed Complete
    request_state: closed_complete
```

### Step 7: Handle Special Cases

**Request Cancellation:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_req_item
  sys_id: [ritm_sys_id]
  data:
    stage: Request Cancelled
    close_notes: "Cancelled per user request via email dated 2026-02-06"
```

**Partial Fulfillment:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_req_item
  sys_id: [ritm_sys_id]
  data:
    stage: Closed Incomplete
    close_notes: "Partial fulfillment: Software installed but license limit reached. Remaining 5 licenses on backorder."
```

## Request/Item Stages

```
Request Stages:
Requested → Approved → Delivery → Closed Complete
         ↘ Rejected → Request Cancelled

RITM Stages:
Waiting for Approval → Fulfillment → Delivery → Closed Complete
                    ↘ Request Cancelled
```

## Tool Usage Summary

| Operation | MCP Tool | Table |
|-----------|----------|-------|
| Find requests | SN-Query-Table | sc_request |
| Find items | SN-Query-Table | sc_req_item |
| Find tasks | SN-Query-Table | sc_task |
| Update status | SN-Update-Record | sc_task/sc_req_item |
| Add notes | SN-Add-Work-Notes | sc_task |
| Check approvals | SN-Query-Table | sysapproval_approver |

## Best Practices

- **Check Approvals First:** Don't start fulfillment until approved
- **Document Variables:** Record what was specifically requested
- **Update Regularly:** Keep work notes current for visibility
- **Verify Completion:** Confirm with requester before closing
- **Close Parent Records:** Ensure REQ closes when all RITMs complete
- **SLA Awareness:** Monitor fulfillment time against SLA targets

## Troubleshooting

### Request Stuck in "Waiting for Approval"

**Cause:** Approver hasn't responded or approval rule issue
**Solution:**
1. Check sysapproval_approver for the approver
2. Send reminder or escalate
3. Check workflow for errors

### Tasks Not Auto-Generated

**Cause:** Workflow not published or execution issue
**Solution:**
1. Check workflow context for errors
2. Verify workflow is published
3. Manually create tasks if needed

### Cannot Close RITM

**Cause:** Open child tasks
**Solution:** Close all sc_task records first, then close RITM

## Related Skills

- `catalog/item-creation` - Creating catalog items
- `itsm/incident-lifecycle` - If request becomes incident
- `admin/workflow-management` - Fulfillment workflows

## References

- [ServiceNow Service Catalog](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/service-catalog-management/concept/c_ServiceCatalogManagement.html)
- [ITIL Service Request Management](https://www.itil.org)
