---
name: natural-language-queries
version: 1.0.0
description: Master natural language search patterns to query ServiceNow without complex encoded queries
author: Happy Technologies LLC
tags: [itsm, search, natural-language, queries]
platforms: [claude-code, claude-desktop]
tools:
  mcp: [SN-NL-Search, SN-NL-Query-Builder, SN-Query-Table]
  rest: ["/api/now/table/{table}"]
  native: []
complexity: beginner
estimated_time: 5-10 minutes
---

# Natural Language Queries

## Overview

Natural language search allows you to query ServiceNow using plain English instead of complex encoded queries. This skill teaches you how to leverage the NL search capabilities for faster, more intuitive data retrieval.

- **What problem does it solve?** Eliminates the need to memorize encoded query syntax
- **Who should use this skill?** Anyone who needs to search ServiceNow data quickly
- **What are the expected outcomes?** Faster query building, easier exploration, intuitive searches

## Prerequisites

- MCP ServiceNow server configured and running
- Access to query ServiceNow tables (typically `itil` or `admin` role)
- Understanding of basic ServiceNow table structures

## Procedure

### Step 1: Understand NL Search Basics

Natural language search translates plain English queries into ServiceNow encoded queries. Start with simple queries and build complexity.

**Basic NL Search:**
```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: show me active high priority incidents
  limit: 10
```

**Equivalent Encoded Query:**
```
active=true^priority=1
```

### Step 2: Learn Supported Patterns

The NL engine supports several query patterns. Master these for effective searching.

#### Field Comparisons

| Natural Language | Encoded Query | Description |
|------------------|---------------|-------------|
| `priority is 1` | `priority=1` | Exact match |
| `priority equals Critical` | `priority=1` | Label-to-value mapping |
| `state not equals Closed` | `state!=7` | Negation |
| `priority greater than 2` | `priority>2` | Greater than |
| `priority less than 3` | `priority<3` | Less than |

**Example:**
```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: incidents where priority is 1 and state not equals Closed
  limit: 20
```

#### Text Searches

| Natural Language | Encoded Query | Description |
|------------------|---------------|-------------|
| `description contains network` | `descriptionLIKEnetwork` | Contains text |
| `short description starts with Error` | `short_descriptionSTARTSWITHError` | Prefix match |
| `description ends with timeout` | `descriptionENDSWITHtimeout` | Suffix match |
| `description does not contain test` | `descriptionNOTLIKEtest` | Does not contain |

**Example:**
```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: incidents where description contains database and short description starts with Error
  limit: 10
```

#### Assignment Patterns

| Natural Language | Encoded Query | Description |
|------------------|---------------|-------------|
| `assigned to John Smith` | `assigned_to=<sys_id>` | User assignment |
| `assigned to is empty` | `assigned_toISEMPTY` | Unassigned |
| `assigned to is not empty` | `assigned_toISNOTEMPTY` | Assigned |
| `assignment group is Network` | `assignment_group=<sys_id>` | Group assignment |

**Example:**
```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: active incidents where assigned to is empty and priority is 1
  limit: 10
```

#### Date Patterns

| Natural Language | Encoded Query | Description |
|------------------|---------------|-------------|
| `created today` | `sys_created_onONToday@javascript:...` | Today's records |
| `created yesterday` | `sys_created_onONYesterday@javascript:...` | Yesterday |
| `created last 7 days` | `sys_created_onONLast 7 days@javascript:...` | Last week |
| `updated last 24 hours` | `sys_updated_onRELATIVEGE@hour@ago@24` | Recent updates |
| `resolved this month` | `resolved_atONThis month@javascript:...` | This month |

**Example:**
```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: high priority incidents created last 7 days
  limit: 20
```

#### Logical Operators

| Natural Language | Encoded Query | Description |
|------------------|---------------|-------------|
| `priority is 1 AND state is New` | `priority=1^state=1` | Both conditions |
| `priority is 1 OR priority is 2` | `priority=1^ORpriority=2` | Either condition |
| `NOT priority is 5` | `priority!=5` | Exclusion |

**Example:**
```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: incidents where priority is 1 or priority is 2 and state is New
  limit: 15
```

#### Ordering

| Natural Language | Encoded Query | Description |
|------------------|---------------|-------------|
| `sort by priority` | `ORDERBYpriority` | Ascending order |
| `sort by priority descending` | `ORDERBYDESCpriority` | Descending order |
| `order by created date descending` | `ORDERBYDESCsys_created_on` | Newest first |

**Example:**
```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: active incidents sort by priority descending
  limit: 25
```

### Step 3: Build Complex Queries

Combine patterns for sophisticated searches.

**Complex Query Example:**
```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: active high priority incidents assigned to is empty created last 7 days where description contains network sort by created date descending
  limit: 20
  fields: number,short_description,priority,state,sys_created_on
```

### Step 4: Validate Queries with Query Builder

Before executing, validate your NL query translates correctly.

**Validate Query:**
```
Tool: SN-NL-Query-Builder
Parameters:
  natural_query: active incidents where priority is 1 and assigned to is empty
```

**Returns:**
```
active=true^priority=1^assigned_toISEMPTY
```

Use the returned encoded query to verify accuracy before searching large datasets.

### Step 5: Decide NL vs Encoded Queries

**Use Natural Language When:**
- Exploring data (figuring out what you need)
- Building ad-hoc queries quickly
- Prototyping before automation
- Communicating requirements to stakeholders
- Simple to moderate complexity queries

**Use Encoded Queries When:**
- Performance-critical operations (large datasets)
- Complex nested OR conditions
- Programmatic/automated workflows
- You already know the exact query needed
- Precise control over query structure required

## Tool Usage

### MCP Tools (Claude Code/Desktop)

| Tool | Purpose |
|------|---------|
| `SN-NL-Search` | Execute natural language searches directly |
| `SN-NL-Query-Builder` | Convert NL to encoded query for validation |
| `SN-Query-Table` | Execute encoded queries for precision |

### REST API (Fallback)

For REST API access, first use `SN-NL-Query-Builder` to get the encoded query, then:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/{table}` | GET | Query with `sysparm_query` parameter |

## Best Practices

- **Start Simple:** Begin with basic queries and add complexity gradually
- **Validate First:** Use `SN-NL-Query-Builder` to check query translation before large searches
- **Specify Fields:** Always include the `fields` parameter to reduce response payload
- **Use Limits:** Set appropriate `limit` values to avoid overwhelming results
- **Be Specific:** More specific language yields more accurate translations

## Troubleshooting

### Query Returns Unexpected Results

**Symptom:** NL query returns different results than expected
**Cause:** Ambiguous language or unsupported pattern
**Solution:** Use `SN-NL-Query-Builder` to see the actual encoded query, then adjust natural language

### Field Name Not Recognized

**Symptom:** Query ignores a field condition
**Cause:** Field name not mapped to NL patterns
**Solution:** Use the actual field name (e.g., `assigned_to` instead of `assignee`)

### Date Queries Not Working

**Symptom:** Date-based queries return empty results
**Cause:** Ambiguous date reference (e.g., "yesterday" vs "last day")
**Solution:** Use explicit patterns: `created today`, `created last 7 days`, `updated last 24 hours`

### Complex OR Conditions Fail

**Symptom:** OR conditions not applied correctly
**Cause:** NL parser has limited OR support
**Solution:** For complex OR logic, use `SN-NL-Query-Builder` then modify the encoded query manually

## Table-Specific Mappings

### Incident Table

| Natural Language | Field | Values |
|------------------|-------|--------|
| `high priority` | priority | 1, 2 |
| `critical priority` | priority | 1 |
| `new` | state | 1 |
| `in progress` | state | 2 |
| `on hold` | state | 3 |
| `resolved` | state | 6 |
| `closed` | state | 7 |
| `active` | active | true |

### Change Request Table

| Natural Language | Field | Values |
|------------------|-------|--------|
| `emergency` | type | emergency |
| `normal` | type | normal |
| `standard` | type | standard |
| `draft` | state | -5 |
| `assess` | state | -4 |
| `authorize` | state | -3 |
| `scheduled` | state | -2 |
| `implement` | state | -1 |
| `review` | state | 0 |
| `closed` | state | 3 |
| `canceled` | state | 4 |

### Problem Table

| Natural Language | Field | Values |
|------------------|-------|--------|
| `new` | state | 1 |
| `assess` | state | 2 |
| `root cause analysis` | state | 3 |
| `fix in progress` | state | 4 |
| `resolved` | state | 5 |
| `closed` | state | 6 |

## Examples

### Example 1: Basic Incident Search

Find active P1 incidents:

```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: active incidents with priority 1
  fields: number,short_description,state,assigned_to
  limit: 10
```

### Example 2: Unassigned Work

Find unassigned high priority work:

```
Tool: SN-NL-Search
Parameters:
  table_name: incident
  query: active incidents where priority is 1 or priority is 2 and assigned to is empty
  fields: number,short_description,priority,sys_created_on
  limit: 20
```

### Example 3: Recent Changes

Find recent emergency changes:

```
Tool: SN-NL-Search
Parameters:
  table_name: change_request
  query: emergency changes created last 7 days
  fields: number,short_description,state,start_date,end_date
  limit: 15
```

### Example 4: Text Search with Filters

Find network-related problems:

```
Tool: SN-NL-Search
Parameters:
  table_name: problem
  query: problems where description contains network and state not equals closed sort by priority
  fields: number,short_description,state,priority
  limit: 10
```

### Example 5: Query Validation

Validate a complex query before execution:

```
Tool: SN-NL-Query-Builder
Parameters:
  natural_query: active high priority incidents assigned to Network Team created today
```

**Returns:** `active=true^priority IN (1,2)^assignment_group=<network_team_sys_id>^sys_created_onONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()`

## Related Skills

- `itsm/incident-triage` - Incident triage and prioritization
- `itsm/quick-reference` - ITSM quick reference card
- `admin/generic-crud-operations` - Basic table operations

## References

- [ServiceNow Encoded Query Syntax](https://docs.servicenow.com/bundle/utah-platform-user-interface/page/use/using-lists/concept/c_EncodedQueryStrings.html)
- [GlideRecord Query Operations](https://docs.servicenow.com/bundle/utah-api-reference/page/app-store/dev_portal/API_reference/GlideRecord/concept/c_GlideRecordAPI.html)
