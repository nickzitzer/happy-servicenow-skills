---
name: update-set-management
version: 1.0.0
description: Complete update set lifecycle management - creation, tracking, validation, and deployment
author: Happy Technologies LLC
tags: [admin, update-set, deployment, migration, development]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Create-Record
    - SN-Query-Table
    - SN-Set-Update-Set
    - SN-Get-Current-Update-Set
    - SN-List-Update-Sets
    - SN-Inspect-Update-Set
    - SN-Move-Records-To-Update-Set
    - SN-Clone-Update-Set
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/sys_update_set
    - /api/now/table/sys_update_xml
    - /api/now/table/sys_remote_update_set
  native:
    - Bash
complexity: intermediate
estimated_time: 15-45 minutes
---

# Update Set Management

## Overview

Update sets are the foundation of ServiceNow configuration management. This skill covers:

- Creating properly named update sets
- Setting the current update set for development
- Tracking what's captured in an update set
- Moving records between update sets
- Preparing update sets for deployment
- Validating update sets before migration

**When to use:** Whenever making configuration changes in ServiceNow development or test instances.

## Prerequisites

- **Roles:** `admin` or `update_set_admin`
- **Access:** sys_update_set and sys_update_xml tables
- **Environment:** Development or test instance (never create update sets in production)

## Procedure

### Step 1: Create a New Update Set

Create a descriptive update set following naming conventions.

**Naming Convention:**
```
[PROJECT]-[TYPE]-[DESCRIPTION]-[VERSION]

Examples:
- PROJ123-FEAT-NewTicketForm-v1
- HR-FIX-OnboardingWorkflow-v2
- ITSM-ENH-IncidentAutoAssign-v1
```

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_update_set
  data:
    name: "PROJ123-FEAT-CustomerPortal-v1"
    description: "New customer portal feature including:
      - Custom catalog items
      - Portal widgets
      - Service catalog categories"
    application: [app_sys_id]  # For scoped apps
    state: in progress
```

**Using REST API:**
```bash
POST /api/now/table/sys_update_set
Content-Type: application/json

{
  "name": "PROJ123-FEAT-CustomerPortal-v1",
  "description": "New customer portal feature...",
  "state": "in progress"
}
```

### Step 2: Set as Current Update Set

Make your new update set active so changes are captured.

**Using MCP (Automated!):**
```
Tool: SN-Set-Update-Set
Parameters:
  update_set_sys_id: [sys_id from step 1]
```

**Verification:**
```
Tool: SN-Get-Current-Update-Set
```

Expected response:
```json
{
  "name": "PROJ123-FEAT-CustomerPortal-v1",
  "sys_id": "abc123...",
  "state": "in progress"
}
```

### Step 3: Make Configuration Changes

Now make your configuration changes. All customizations will be captured:

**Automatically Captured:**
- UI Policies
- Business Rules
- Client Scripts
- Script Includes
- Forms and Lists
- ACLs
- Properties
- Scheduled Jobs

**NOT Automatically Captured:**
- Data records (use Data Preservers)
- User records
- Group memberships
- Some system properties

### Step 4: Monitor Update Set Contents

Periodically check what's being captured.

**Using MCP:**
```
Tool: SN-Inspect-Update-Set
Parameters:
  update_set_sys_id: [your_update_set_sys_id]
```

**Or query directly:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_xml
  query: update_set=[your_update_set_sys_id]
  fields: name,type,action,sys_created_on
  limit: 100
```

**Expected Output:**
| Name | Type | Action | Created |
|------|------|--------|---------|
| My Business Rule | sys_script | INSERT | 2026-02-06 |
| Incident Form | sys_ui_policy | INSERT | 2026-02-06 |

### Step 5: Handle Records in Wrong Update Set

If records accidentally went to Default or wrong update set:

**Using MCP:**
```
Tool: SN-Move-Records-To-Update-Set
Parameters:
  source_update_set: Default  # or sys_id
  target_update_set: [your_update_set_sys_id]
  query: sys_created_onONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()
```

**Manual Method:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_xml
  query: update_set=[wrong_set_sys_id]^sys_created_onONToday
  fields: sys_id,name,type

# Then for each record:
Tool: SN-Update-Record
Parameters:
  table_name: sys_update_xml
  sys_id: [record_sys_id]
  data:
    update_set: [correct_update_set_sys_id]
```

### Step 6: Complete the Update Set

When development is complete, mark as complete:

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_update_set
  sys_id: [your_update_set_sys_id]
  data:
    state: complete
    description: "COMPLETED: [original description]

    Contains:
    - 3 Business Rules
    - 2 UI Policies
    - 1 Script Include
    - 5 Form modifications

    Tested by: [tester name]
    Test date: 2026-02-06"
```

### Step 7: Pre-Deployment Validation

Before exporting to higher environments:

**Check for Issues:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_xml
  query: update_set=[sys_id]^type=sys_script^actionINinsert,update
  fields: name,payload
```

**Validation Checklist:**
- [ ] No hardcoded sys_ids
- [ ] No hardcoded instance URLs
- [ ] No test data included
- [ ] All scripts have error handling
- [ ] No credentials in scripts
- [ ] Dependencies documented

### Step 8: Export and Migrate

**Export to XML:**
Navigate to the update set → Related Links → Export to XML

**For Remote Instances:**
1. On target instance: System Update Sets → Retrieved Update Sets → Import from XML
2. Preview the update set
3. Review conflicts
4. Commit the update set

## Update Set States

```
┌─────────────┐     ┌──────────┐     ┌───────────┐
│ In Progress │────►│ Complete │────►│ Exported  │
│   (build)   │     │ (ready)  │     │ (shipped) │
└─────────────┘     └──────────┘     └───────────┘
                          │
                          ▼
                    ┌──────────┐
                    │ Ignore   │
                    │ (voided) │
                    └──────────┘
```

## Tool Usage Summary

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Create | SN-Create-Record | POST /sys_update_set |
| Set Current | SN-Set-Update-Set | Custom API |
| Get Current | SN-Get-Current-Update-Set | GET /sys_user_preference |
| List | SN-List-Update-Sets | GET /sys_update_set |
| Inspect | SN-Inspect-Update-Set | GET /sys_update_xml |
| Move Records | SN-Move-Records-To-Update-Set | PATCH /sys_update_xml |
| Clone | SN-Clone-Update-Set | POST /sys_update_set |

## Best Practices

- **One Feature Per Update Set:** Don't mix unrelated changes
- **Descriptive Names:** Follow naming conventions consistently
- **Regular Commits:** Complete update sets incrementally, not all at once
- **Test Before Promoting:** Always test in a lower environment first
- **Document Dependencies:** Note if other update sets must be applied first
- **Never Edit in Production:** Always develop in dev/test instances

## Troubleshooting

### Records Going to Default Update Set

**Cause:** Current update set not set or got reset
**Solution:** Always verify current update set before making changes:
```
Tool: SN-Get-Current-Update-Set
```

### Missing Records in Update Set

**Cause:** Record type not tracked or created before setting update set
**Solution:**
1. Check if record type is tracked (sys_update_set_source)
2. Manually add using "Add to Update Set" related link

### Conflicts During Commit

**Cause:** Same record modified in multiple update sets
**Solution:**
1. Preview update set first
2. Review conflicts carefully
3. Choose to keep local or skip
4. Document conflict resolution

### Update Set Too Large

**Cause:** Too many changes in single update set
**Solution:**
1. Clone to new update set
2. Split logically by feature
3. Remove unnecessary records

## Related Skills

- `admin/deployment-workflow` - Full deployment process
- `admin/scoped-app-development` - Scoped application best practices
- `itsm/change-management` - Change process for deployments

## References

- [ServiceNow Update Sets](https://docs.servicenow.com/bundle/utah-application-development/page/build/system-update-sets/concept/system-update-sets.html)
- [Update Set Best Practices](https://developer.servicenow.com)
