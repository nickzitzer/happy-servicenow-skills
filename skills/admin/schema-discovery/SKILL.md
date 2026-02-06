---
name: schema-discovery
version: 1.0.0
description: Explore and understand ServiceNow table schemas, field definitions, and relationships
author: Happy Technologies LLC
tags: [admin, schema, tables, discovery, metadata, development]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp: [SN-Get-Table-Schema, SN-List-Available-Tables, SN-Discover-Table-Schema, SN-Explain-Field]
  rest: [/api/now/table/sys_dictionary, /api/now/table/sys_db_object, /api/now/table/sys_documentation]
  native: [Bash, Read]
complexity: intermediate
estimated_time: 10-30 minutes
---

# Schema Discovery

## Overview

Schema discovery is the foundation of effective ServiceNow development. This skill teaches you how to explore table structures, understand field types, discover relationships between tables, and document your findings for development work.

- **What problem does it solve?** Eliminates guesswork when working with unfamiliar tables, prevents field type errors, and reveals hidden relationships between ServiceNow entities
- **Who should use this skill?** Developers, administrators, and integrators who need to understand ServiceNow data structures before creating queries, scripts, or integrations
- **What are the expected outcomes?** Complete understanding of table schemas, field configurations, reference relationships, and proper field usage

## Prerequisites

- Required ServiceNow roles: `admin` or `personalize_dictionary` (for full schema access)
- Read access to `sys_dictionary`, `sys_db_object`, and `sys_documentation` tables
- Basic understanding of ServiceNow table hierarchy and field types
- Related skills: None required (this is foundational)

## Procedure

### Step 1: Discover Available Tables

Start by exploring what tables are available in your ServiceNow instance. Tables are organized into categories based on their function.

**If using MCP tools:**
```
Tool: SN-List-Available-Tables
Parameters:
  category: core_itsm
```

Available categories:
- `core_itsm` - Incident, Problem, Change, Request
- `cmdb` - Configuration Management Database tables
- `service_catalog` - Catalog items, variables, requests
- `security` - Users, groups, roles, ACLs
- `system` - System properties, scheduled jobs, update sets
- `custom` - Custom application tables (x_* prefix)

**If using REST API:**
```bash
GET /api/now/table/sys_db_object?sysparm_query=super_class.name=task^ORsuper_class.name=cmdb_ci&sysparm_fields=name,label,super_class&sysparm_limit=50
```

**Decision Points:**
- If looking for ITSM tables → Use category `core_itsm`
- If exploring CMDB → Use category `cmdb`
- If working on custom app → Use category `custom` or query by scope prefix

### Step 2: Get Table Schema

Once you identify the table, retrieve its complete schema including all fields, types, and configurations.

**If using MCP tools:**
```
Tool: SN-Get-Table-Schema
Parameters:
  table_name: incident
```

**If using REST API:**
```bash
GET /api/now/table/sys_dictionary?sysparm_query=name=incident^internal_type!=collection&sysparm_fields=element,column_label,internal_type,max_length,mandatory,reference
```

**Expected Response Fields:**
| Field | Description |
|-------|-------------|
| `element` | Internal field name |
| `column_label` | Display label |
| `internal_type` | Field type (string, reference, integer, etc.) |
| `max_length` | Maximum character length |
| `mandatory` | Whether field is required |
| `reference` | Target table for reference fields |
| `default_value` | Default value if any |
| `choice` | Whether field uses choice list |

### Step 3: Deep Schema Discovery with Relationships

For complex integrations, discover the full relationship map including parent tables, child tables, and reference chains.

**If using MCP tools:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: incident
  include_relationships: true
  depth: 2
```

**If using REST API:**
```bash
# Get table hierarchy (parent/child)
GET /api/now/table/sys_db_object?sysparm_query=name=incident&sysparm_fields=name,super_class,label

# Get all reference fields
GET /api/now/table/sys_dictionary?sysparm_query=name=incident^internal_type=reference&sysparm_fields=element,reference

# Get tables that reference this table
GET /api/now/table/sys_dictionary?sysparm_query=reference=incident&sysparm_fields=name,element
```

**Relationship Types to Discover:**
| Relationship | Description | Example |
|--------------|-------------|---------|
| Inheritance | Parent table hierarchy | incident extends task |
| Reference | Foreign key relationship | incident.assigned_to -> sys_user |
| Glide List | Multi-value reference | incident.watch_list -> sys_user (list) |
| Document ID | Dynamic table reference | sys_attachment.table_sys_id |

### Step 4: Understand Field Types

Different field types have different behaviors, storage characteristics, and query syntax.

**Common ServiceNow Field Types:**

| Type Code | Type Name | Description | Query Example |
|-----------|-----------|-------------|---------------|
| `string` | String | Text up to max_length | `short_description=test` |
| `integer` | Integer | Whole numbers | `priority=1` |
| `boolean` | True/False | Boolean values | `active=true` |
| `reference` | Reference | FK to another table | `assigned_to.name=admin` |
| `glide_date` | Date | Date only | `due_date>2024-01-01` |
| `glide_date_time` | Date/Time | Date with time | `sys_created_on>=javascript:gs.daysAgo(7)` |
| `choice` | Choice | Predefined options | `state=1` |
| `journal` | Journal | Append-only text | Cannot query directly |
| `journal_input` | Journal Input | Work notes/comments | `work_notesLIKEupdate` |
| `script` | Script | JavaScript code | N/A |
| `conditions` | Conditions | Encoded query | N/A |

### Step 5: Get Field Documentation

For unfamiliar fields, get detailed documentation including usage examples and best practices.

**If using MCP tools:**
```
Tool: SN-Explain-Field
Parameters:
  table_name: incident
  field_name: impact
```

**If using REST API:**
```bash
# Get field definition
GET /api/now/table/sys_dictionary?sysparm_query=name=incident^element=impact&sysparm_fields=element,column_label,internal_type,comments,hint

# Get field documentation
GET /api/now/table/sys_documentation?sysparm_query=name=incident^element=impact&sysparm_fields=text,short_description
```

**Documentation Includes:**
- Field purpose and business meaning
- Valid values (for choice fields)
- Related fields and dependencies
- Common use cases
- API behavior notes

### Step 6: Explore Choice Values

For choice fields (dropdowns), discover all valid values and their meanings.

**If using MCP tools:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_choice
  query: name=incident^element=state
  fields: value,label,sequence
```

**If using REST API:**
```bash
GET /api/now/table/sys_choice?sysparm_query=name=incident^element=state&sysparm_fields=value,label,sequence&sysparm_orderby=sequence
```

**Common Choice Tables:**
| Table | Purpose |
|-------|---------|
| `sys_choice` | Standard field choices |
| `question_choice` | Catalog variable choices |
| `sys_choice_set` | Reusable choice sets |

### Step 7: Document Findings

Create a schema reference document for your development work.

**Schema Documentation Template:**
```markdown
## Table: incident

### Hierarchy
- Parent: task
- Children: None

### Key Fields
| Field | Type | Required | Reference | Notes |
|-------|------|----------|-----------|-------|
| number | string | auto | - | Auto-generated |
| short_description | string | yes | - | Max 160 chars |
| assigned_to | reference | no | sys_user | Can be empty |
| state | integer | yes | - | Choice: 1-8 |

### State Values
| Value | Label |
|-------|-------|
| 1 | New |
| 2 | In Progress |
| 3 | On Hold |
| 6 | Resolved |
| 7 | Closed |
| 8 | Canceled |

### Key Relationships
- assignment_group -> sys_user_group
- caller_id -> sys_user
- cmdb_ci -> cmdb_ci
- problem_id -> problem
```

## Tool Usage

### MCP Tools (Claude Code/Desktop)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `SN-List-Available-Tables` | List tables by category | Starting exploration |
| `SN-Get-Table-Schema` | Get field definitions | Understanding table structure |
| `SN-Discover-Table-Schema` | Deep relationship discovery | Complex integrations |
| `SN-Explain-Field` | Get field documentation | Unfamiliar fields |
| `SN-Query-Table` | Query sys_choice, sys_dictionary | Custom schema queries |

### REST API (ChatGPT/Other)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sys_db_object` | GET | List tables |
| `/api/now/table/sys_dictionary` | GET | Get field definitions |
| `/api/now/table/sys_choice` | GET | Get choice values |
| `/api/now/table/sys_documentation` | GET | Get field documentation |
| `/api/now/table/sys_glide_object` | GET | Get field type definitions |

### Native Tools (Claude Code)

| Tool | Purpose |
|------|---------|
| `Bash` | Execute curl commands for REST API |
| `Read` | Read cached schema files |

## Best Practices

- **Cache Schema Information:** Schema rarely changes - cache results locally to reduce API calls
- **Start with Parent Tables:** Understand task before incident, cmdb_ci before cmdb_ci_computer
- **Check Both sys_dictionary and sys_db_object:** Dictionary has fields, db_object has table metadata
- **Document Reference Chains:** incident -> assignment_group -> sys_user_group helps in dot-walking
- **Verify in Dev First:** Schema may differ between instances due to customizations
- **Use Encoded Query Builder:** Test queries in ServiceNow UI before coding them

## Troubleshooting

### Common Issue 1: Missing Fields in Schema

**Symptom:** Expected field not appearing in schema results
**Cause:** Field may be on parent table, not child table
**Solution:** Query parent table or use SN-Discover-Table-Schema with depth parameter

```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: incident
  include_parent_fields: true
```

### Common Issue 2: Permission Denied on sys_dictionary

**Symptom:** 403 error when querying sys_dictionary
**Cause:** Missing `personalize_dictionary` or `admin` role
**Solution:** Request appropriate role or use table-specific endpoints

```bash
# Alternative: Use table API with schema
GET /api/now/table/incident?sysparm_limit=1&sysparm_display_value=all
# Response headers include field metadata
```

### Common Issue 3: Reference Field Shows sys_id Not Value

**Symptom:** Reference fields return sys_id instead of display value
**Cause:** Not using sysparm_display_value parameter
**Solution:** Add display_value parameter to query

```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  display_value: all
```

### Common Issue 4: Choice Values Not Found

**Symptom:** sys_choice returns empty for a choice field
**Cause:** Field uses choice set or is defined differently
**Solution:** Check sys_choice_set or query with dependent value

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_choice
  query: name=incident^element=subcategory^dependent_value=network
```

## Examples

### Example 1: Discover CMDB Computer Schema

```
# Step 1: List CMDB tables
Tool: SN-List-Available-Tables
Parameters:
  category: cmdb

# Result: Lists cmdb_ci, cmdb_ci_computer, cmdb_ci_server, etc.

# Step 2: Get cmdb_ci_computer schema
Tool: SN-Get-Table-Schema
Parameters:
  table_name: cmdb_ci_computer

# Result:
Fields:
- cpu_core_count (integer)
- cpu_count (integer)
- cpu_speed (float)
- disk_space (float)
- ram (integer)
- os (string)
- os_version (string)
- serial_number (string)
- [inherited from cmdb_ci: name, ip_address, manufacturer, etc.]

# Step 3: Understand OS field
Tool: SN-Explain-Field
Parameters:
  table_name: cmdb_ci_computer
  field_name: os

# Result:
- Type: String
- Label: Operating System
- Description: Operating system name
- Common values: Windows, Linux, macOS
- Related field: os_version
```

### Example 2: Map Incident Reference Relationships

```
# Discover all relationships from incident table
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: incident
  include_relationships: true
  depth: 2

# Result:
Table: incident
Extends: task

Reference Fields:
- assigned_to -> sys_user
  - sys_user.manager -> sys_user (depth 2)
  - sys_user.department -> cmn_department (depth 2)
- assignment_group -> sys_user_group
  - sys_user_group.manager -> sys_user (depth 2)
  - sys_user_group.parent -> sys_user_group (depth 2)
- caller_id -> sys_user
- cmdb_ci -> cmdb_ci
  - cmdb_ci.location -> cmn_location (depth 2)
  - cmdb_ci.support_group -> sys_user_group (depth 2)
- problem_id -> problem
- rfc -> change_request

Reverse References (tables referencing incident):
- incident_sla.task -> incident
- incident_alert.incident -> incident
- sc_task.incident -> incident
```

### Example 3: Catalog Variable Schema Discovery

```
# Step 1: Get catalog variable types
Tool: SN-Query-Table
Parameters:
  table_name: sys_choice
  query: name=item_option_new^element=type
  fields: value,label

# Result:
- 1: Yes/No
- 2: Multi Line Text
- 3: Multiple Choice
- 4: Numeric Scale
- 5: Select Box
- 6: Single Line Text
- 7: CheckBox
- 8: Reference
- 9: Date
- 10: Date/Time
- etc.

# Step 2: Understand variable definition structure
Tool: SN-Get-Table-Schema
Parameters:
  table_name: item_option_new

# Result:
- name (string): Variable name
- question_text (string): Label shown to user
- type (integer): Variable type from above
- reference (string): For type 8, target table
- cat_item (reference): Parent catalog item
- order (integer): Display sequence
- mandatory (boolean): Required field
```

### Example 4: Custom Application Table Discovery

```
# List custom tables in specific scope
Tool: SN-Query-Table
Parameters:
  table_name: sys_db_object
  query: nameSTARTSWITHx_myapp_
  fields: name,label,super_class

# Result:
- x_myapp_request (label: My App Request, extends: task)
- x_myapp_config (label: Configuration, extends: none)
- x_myapp_log (label: Activity Log, extends: none)

# Get schema for custom table
Tool: SN-Get-Table-Schema
Parameters:
  table_name: x_myapp_request

# Discover custom table relationships
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: x_myapp_request
  include_relationships: true
```

## Related Skills

- `admin/update-set-management` - Managing update sets during development
- `admin/batch-operations` - Creating multiple records using schema knowledge
- `development/business-rule-creation` - Writing scripts that use discovered fields
- `integration/rest-api-integration` - Building integrations based on schema

## References

- [ServiceNow Table Administration](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/table-administration/concept/c_TableAdministration.html)
- [Dictionary Entries](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/dictionary/concept/c_Dictionary.html)
- [Field Types Reference](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/field-administration/reference/r_FieldTypes.html)
- [Table Hierarchy and Inheritance](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/table-administration/concept/table-extension.html)
