---
name: generic-crud-operations
version: 1.0.0
description: Master generic table operations for querying, creating, updating, and reading records in any ServiceNow table
author: Happy Technologies LLC
tags: [admin, crud, tables, api, basics]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp: [SN-Query-Table, SN-Create-Record, SN-Get-Record, SN-Update-Record, SN-Get-Table-Schema]
  rest: ["/api/now/table/{table}"]
  native: [Bash]
complexity: beginner
estimated_time: 10-15 minutes
---

# Generic CRUD Operations

## Overview

ServiceNow MCP provides generic tools that work on ANY table in the platform. This skill teaches you how to perform Create, Read, Update, and Delete (CRUD) operations across 160+ ServiceNow tables without needing specialized tools for each.

- **What problem does it solve?** Provides a single, consistent approach to table operations
- **Who should use this skill?** Developers, administrators, and integrators working with ServiceNow data
- **What are the expected outcomes?** Ability to query, create, update, and retrieve records from any table

## Prerequisites

- MCP ServiceNow server configured and running
- Appropriate ServiceNow roles for target tables (varies by table)
- Basic understanding of ServiceNow table structure (sys_id, display values)

## Procedure

### Step 1: Discover Table Schema

Before working with any table, understand its structure using schema discovery.

**Get Basic Schema:**
```
Tool: SN-Get-Table-Schema
Parameters:
  table_name: incident
```

**Response includes:**
- Field names and types
- Field lengths and mandatory flags
- Reference table relationships
- Choice values for choice fields

**Get Extended Schema:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: incident
  include_relationships: true
```

**Response includes:**
- All base schema information
- Parent/child table relationships
- Referenced tables and foreign keys

### Step 2: Query Records (Read)

Query any table using filters, field selection, and pagination.

**Basic Query:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true
  limit: 10
```

**Query with Field Selection:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^priority=1
  fields: sys_id,number,short_description,state,assigned_to
  limit: 20
```

**Query with Pagination:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true
  fields: number,short_description
  limit: 50
  offset: 100
```

**Query with Ordering:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^ORDERBYDESCpriority
  fields: number,short_description,priority
  limit: 25
```

### Step 3: Get Single Record (Read)

Retrieve a specific record by sys_id.

**Get Record:**
```
Tool: SN-Get-Record
Parameters:
  table_name: incident
  sys_id: abc123def456...
```

**Get Record with Field Selection:**
```
Tool: SN-Get-Record
Parameters:
  table_name: incident
  sys_id: abc123def456...
  fields: number,short_description,state,priority,assigned_to
```

### Step 4: Create Records (Create)

Create new records in any table with proper field values.

**Create Record:**
```
Tool: SN-Create-Record
Parameters:
  table_name: incident
  data:
    short_description: Network connectivity issue in Building A
    description: Users in Building A floor 3 unable to access network resources
    category: network
    subcategory: connectivity
    impact: 2
    urgency: 2
    caller_id: <user_sys_id>
    assignment_group: <group_sys_id>
```

**Response Returns:**
- `sys_id` of the created record
- `number` (if auto-generated)
- All created field values

**Create Record with Reference Fields:**
```
Tool: SN-Create-Record
Parameters:
  table_name: task
  data:
    short_description: Follow up with customer
    parent: <parent_task_sys_id>
    assigned_to: <user_sys_id>
    assignment_group: <group_sys_id>
    due_date: 2024-12-31
```

### Step 5: Update Records (Update)

Update existing records by sys_id.

**Update Single Field:**
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: abc123def456...
  data:
    state: 2
```

**Update Multiple Fields:**
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: abc123def456...
  data:
    state: 2
    assigned_to: <user_sys_id>
    work_notes: Investigation in progress
    priority: 2
```

**Update Reference Fields:**
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: abc123def456...
  data:
    assignment_group: <new_group_sys_id>
    assigned_to: <new_user_sys_id>
```

### Step 6: Batch Operations

Perform multiple operations efficiently.

**Batch Create:**
```
Tool: SN-Batch-Create
Parameters:
  records:
    - table: sys_user_group
      data:
        name: Network Support L1
        description: Level 1 network support
    - table: sys_user_group
      data:
        name: Network Support L2
        description: Level 2 network support
    - table: sys_user_group
      data:
        name: Network Support L3
        description: Level 3 network support
```

**Batch Update:**
```
Tool: SN-Batch-Update
Parameters:
  updates:
    - table: incident
      sys_id: abc123...
      data:
        state: 6
        resolution_code: Solved
    - table: incident
      sys_id: def456...
      data:
        state: 6
        resolution_code: Solved
    - table: incident
      sys_id: ghi789...
      data:
        state: 6
        resolution_code: Solved
```

## Common Field Patterns

### System Fields (All Tables)

| Field | Description | Notes |
|-------|-------------|-------|
| `sys_id` | Unique identifier | 32-character GUID, read-only |
| `sys_created_on` | Creation timestamp | Read-only |
| `sys_created_by` | Creator username | Read-only |
| `sys_updated_on` | Last update timestamp | Read-only |
| `sys_updated_by` | Last updater username | Read-only |
| `sys_mod_count` | Modification count | Read-only |
| `sys_class_name` | Table name | For extended tables |

### Reference Fields

Reference fields link to records in other tables.

**Setting a Reference:**
```json
{
  "assigned_to": "5137153cc611227c000bbd1bd8cd2007"
}
```

**Getting Display Values:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true
  fields: number,assigned_to,assigned_to.name,assigned_to.email
  limit: 10
```

**Response includes:**
```json
{
  "assigned_to": {
    "value": "5137153cc611227c000bbd1bd8cd2007",
    "display_value": "John Smith"
  },
  "assigned_to.name": "John Smith",
  "assigned_to.email": "john.smith@example.com"
}
```

### Choice Fields

Choice fields have predefined values.

**Get Available Choices:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_choice
  query: name=incident^element=state
  fields: value,label
```

**Common Incident States:**
| Value | Label |
|-------|-------|
| 1 | New |
| 2 | In Progress |
| 3 | On Hold |
| 6 | Resolved |
| 7 | Closed |

### Date/Time Fields

**Date Format:** `YYYY-MM-DD`
**DateTime Format:** `YYYY-MM-DD HH:MM:SS`

**Example:**
```json
{
  "due_date": "2024-12-31",
  "work_start": "2024-12-01 09:00:00"
}
```

## Tool Usage

### MCP Tools (Claude Code/Desktop)

| Tool | Purpose |
|------|---------|
| `SN-Query-Table` | Query records with filters |
| `SN-Get-Record` | Get single record by sys_id |
| `SN-Create-Record` | Create new records |
| `SN-Update-Record` | Update existing records |
| `SN-Get-Table-Schema` | Discover table structure |
| `SN-Discover-Table-Schema` | Extended schema with relationships |
| `SN-Batch-Create` | Create multiple records |
| `SN-Batch-Update` | Update multiple records |

### REST API (ChatGPT/Other)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/{table}` | GET | Query records |
| `/api/now/table/{table}/{sys_id}` | GET | Get single record |
| `/api/now/table/{table}` | POST | Create record |
| `/api/now/table/{table}/{sys_id}` | PATCH | Update record |
| `/api/now/table/{table}/{sys_id}` | PUT | Replace record |
| `/api/now/table/{table}/{sys_id}` | DELETE | Delete record |

**REST Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| `sysparm_query` | Encoded query string |
| `sysparm_fields` | Comma-separated field list |
| `sysparm_limit` | Maximum records to return |
| `sysparm_offset` | Records to skip (pagination) |
| `sysparm_display_value` | Return display values (`all`, `true`, `false`) |

### Native Tools (Claude Code)

For REST API access without MCP:

```bash
# Query records
curl -u "username:password" \
  "https://instance.service-now.com/api/now/table/incident?sysparm_query=active=true&sysparm_limit=10"

# Create record
curl -X POST -u "username:password" \
  -H "Content-Type: application/json" \
  -d '{"short_description":"Test incident"}' \
  "https://instance.service-now.com/api/now/table/incident"

# Update record
curl -X PATCH -u "username:password" \
  -H "Content-Type: application/json" \
  -d '{"state":"2"}' \
  "https://instance.service-now.com/api/now/table/incident/abc123..."
```

## Best Practices

- **Always Check Schema First:** Use `SN-Get-Table-Schema` before working with unfamiliar tables
- **Specify Fields:** Include only needed fields to reduce response payload and improve performance
- **Use Pagination:** For large datasets, use `limit` and `offset` to page through results
- **Validate sys_ids:** Reference fields require valid sys_ids from the referenced table
- **Handle Errors:** Check response for error messages, especially on create/update operations
- **Batch Operations:** Use batch tools for multiple records (5-10+ operations) for efficiency

## Troubleshooting

### Record Not Found

**Symptom:** Query returns empty results or get returns 404
**Cause:** Invalid sys_id, record deleted, or insufficient permissions
**Solution:** Verify sys_id exists and user has read access to the table

### Permission Denied (403)

**Symptom:** 403 Forbidden error on create/update
**Cause:** User lacks write permissions to the table or specific fields
**Solution:** Check ACLs and required roles for the table operation

### Invalid Field Value

**Symptom:** Create/update fails with field validation error
**Cause:** Value doesn't match field type or choice list
**Solution:** Check field schema for valid values, especially for choice and reference fields

### Reference Field Rejected

**Symptom:** Reference field value not saved
**Cause:** Invalid sys_id or referenced record doesn't exist
**Solution:** Query the reference table to get valid sys_ids

### Mandatory Field Missing

**Symptom:** Create fails with mandatory field error
**Cause:** Required field not provided in data
**Solution:** Check schema for mandatory fields and include all required values

## Examples

### Example 1: Query Active Users

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user
  query: active=true
  fields: sys_id,user_name,name,email,department
  limit: 50
```

### Example 2: Create Configuration Item

```
Tool: SN-Create-Record
Parameters:
  table_name: cmdb_ci_server
  data:
    name: web-server-01
    ip_address: 192.168.1.100
    os: Linux Red Hat
    cpu_count: 4
    ram: 16384
    classification: Production
    environment: Production
```

### Example 3: Update Multiple Incidents

```
Tool: SN-Batch-Update
Parameters:
  updates:
    - table: incident
      sys_id: inc001...
      data:
        assignment_group: <network_team_id>
        work_notes: Routing to network team per triage
    - table: incident
      sys_id: inc002...
      data:
        assignment_group: <network_team_id>
        work_notes: Routing to network team per triage
```

### Example 4: Get Record with Dot-Walking

```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: number=INC0010001
  fields: number,short_description,caller_id.name,caller_id.email,caller_id.department.name
```

### Example 5: Paginated Query

```
# Page 1
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: state=-1
  fields: number,short_description,start_date,end_date
  limit: 100
  offset: 0

# Page 2
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: state=-1
  fields: number,short_description,start_date,end_date
  limit: 100
  offset: 100
```

## Related Skills

- `itsm/natural-language-queries` - Natural language search mastery
- `itsm/quick-reference` - ITSM quick reference card
- `admin/batch-operations` - Advanced batch operations

## References

- [ServiceNow Table API](https://docs.servicenow.com/bundle/utah-api-reference/page/integrate/inbound-rest/concept/c_TableAPI.html)
- [Encoded Query Strings](https://docs.servicenow.com/bundle/utah-platform-user-interface/page/use/using-lists/concept/c_EncodedQueryStrings.html)
- [REST API Best Practices](https://docs.servicenow.com/bundle/utah-api-reference/page/integrate/inbound-rest/concept/c_BestPractices.html)
