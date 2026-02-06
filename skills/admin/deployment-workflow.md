---
name: deployment-workflow
version: 1.0.0
description: Complete instance-to-instance deployment workflow including update set export, import, preview, conflict resolution, validation, and rollback procedures
author: Happy Technologies LLC
tags: [admin, deployment, update-set, migration, promotion, rollback, devops]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Clone-Update-Set
    - SN-Move-Records-To-Update-Set
    - SN-Inspect-Update-Set
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Execute-Background-Script
    - SN-Get-Current-Update-Set
    - SN-List-Update-Sets
  rest:
    - /api/now/table/sys_update_set
    - /api/now/table/sys_update_xml
    - /api/now/table/sys_remote_update_set
    - /api/now/table/sys_update_set_source
  native:
    - Bash
    - Read
    - Write
complexity: advanced
estimated_time: 30-90 minutes
---

# Deployment Workflow

## Overview

This skill provides a complete framework for deploying ServiceNow configurations between instances (Dev → Test → Prod). It covers the entire deployment lifecycle:

- Pre-deployment validation and preparation
- Update set export and import processes
- Preview and conflict resolution strategies
- Post-deployment validation
- Rollback procedures for failed deployments

**When to use:** When promoting configuration changes through the SDLC pipeline or migrating customizations between ServiceNow instances.

**Who should use this:** Administrators, DevOps engineers, and developers responsible for ServiceNow deployments.

## Prerequisites

- **Roles:** `admin` or `update_set_admin` on both source and target instances
- **Access:** sys_update_set, sys_update_xml, sys_remote_update_set tables
- **Environment:** Properly configured instance connections (for automated retrieval)
- **Related Skills:** `admin/update-set-management` should be completed first

## Deployment Pipeline Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│     DEV     │────►│    TEST     │────►│    PROD     │
│  (develop)  │     │  (validate) │     │  (release)  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
   Create             Preview              Preview
   Update Set         & Test               & Commit
   Complete           Commit               Validate
   Export             Validate
```

## Procedure

### Phase 1: Pre-Deployment Validation

#### Step 1.1: Inspect Update Set Contents

Before deployment, thoroughly review what will be deployed.

**Using MCP:**
```
Tool: SN-Inspect-Update-Set
Parameters:
  update_set_sys_id: [your_update_set_sys_id]
  instance: dev
```

**Detailed Content Query:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_xml
  query: update_set=[update_set_sys_id]
  fields: name,type,target_name,action,sys_created_on,sys_created_by
  limit: 500
  instance: dev
```

**Expected Output Categories:**
| Type | Count | Description |
|------|-------|-------------|
| sys_script | 5 | Business Rules |
| sys_ui_policy | 3 | UI Policies |
| sys_script_include | 2 | Script Includes |
| sys_ui_action | 1 | UI Actions |

#### Step 1.2: Validate Configuration Quality

Check for common deployment issues.

**Script Validation:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var updateSetId = '[update_set_sys_id]';
    var issues = [];

    // Check for hardcoded sys_ids (potential issue)
    var gr = new GlideRecord('sys_update_xml');
    gr.addQuery('update_set', updateSetId);
    gr.addQuery('payload', 'CONTAINS', 'sys_id');
    gr.query();

    while (gr.next()) {
      if (gr.payload.indexOf("'32") > -1 || gr.payload.indexOf('"32') > -1) {
        issues.push('Potential hardcoded sys_id in: ' + gr.name);
      }
    }

    // Check for instance-specific URLs
    var gr2 = new GlideRecord('sys_update_xml');
    gr2.addQuery('update_set', updateSetId);
    gr2.addQuery('payload', 'CONTAINS', '.service-now.com');
    gr2.query();

    if (gr2.getRowCount() > 0) {
      issues.push('WARNING: ' + gr2.getRowCount() + ' records contain instance-specific URLs');
    }

    gs.info('Validation Issues: ' + JSON.stringify(issues));
  description: Pre-deployment validation check
  instance: dev
```

#### Step 1.3: Document Dependencies

Identify and document update set dependencies.

**Check for Related Update Sets:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_set
  query: parent=[update_set_sys_id]^ORbase_update_set=[update_set_sys_id]
  fields: name,sys_id,state,description
  instance: dev
```

**Dependency Documentation Template:**
```
UPDATE SET: PROJ123-FEAT-CustomerPortal-v1
DEPENDS ON:
  1. PROJ123-BASE-TableSchema-v1 (must be deployed first)
  2. PROJ123-DATA-ReferenceData-v1 (required reference data)
CONFLICTS WITH:
  - None identified
NOTES:
  - Requires system property: com.glide.custom.portal.enabled=true
```

### Phase 2: Export Update Set

#### Step 2.1: Complete the Update Set

Ensure update set is marked complete before export.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_update_set
  sys_id: [update_set_sys_id]
  data:
    state: complete
  instance: dev
```

#### Step 2.2: Clone for Backup (Recommended)

Create a backup clone before deployment.

**Using MCP:**
```
Tool: SN-Clone-Update-Set
Parameters:
  source_update_set_sys_id: [update_set_sys_id]
  new_name: "PROJ123-FEAT-CustomerPortal-v1-BACKUP-20260206"
  instance: dev
```

#### Step 2.3: Export Options

**Option A: XML Export (Manual)**
1. Navigate to System Update Sets → Local Update Sets
2. Open the update set
3. Related Links → Export to XML
4. Save the XML file

**Option B: Automated Remote Instance Retrieval**
If instances are connected:
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var source = new GlideRecord('sys_update_set_source');
    source.get('name', 'Development Instance');

    var updateSet = '[update_set_name]';
    // Trigger retrieval via update set source
    gs.info('Retrieval must be initiated from target instance UI');
  description: Check update set source configuration
  instance: test
```

### Phase 3: Import to Target Instance

#### Step 3.1: Import Update Set

**Option A: XML Import (Manual)**
1. On target instance: System Update Sets → Retrieved Update Sets
2. Import Update Set from XML
3. Select the exported XML file
4. Click Upload

**Option B: Remote Retrieval (Connected Instances)**
1. On target instance: System Update Sets → Update Sources
2. Select the source instance
3. Click Retrieve Update Sets
4. Select the update set to retrieve

#### Step 3.2: Verify Import Success

**Check Retrieved Update Set:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_remote_update_set
  query: name=[update_set_name]
  fields: name,state,remote_sys_id,description,collision_count
  instance: test
```

**States:**
| State | Meaning |
|-------|---------|
| Loaded | Ready for preview |
| Previewing | Preview in progress |
| Previewed | Ready for commit |
| Committing | Commit in progress |
| Committed | Successfully applied |
| Error | Failed - check logs |

### Phase 4: Preview and Conflict Resolution

#### Step 4.1: Preview Update Set

Preview identifies potential conflicts before committing.

**Initiate Preview (Manual):**
1. Open the retrieved update set
2. Click "Preview Update Set"
3. Wait for preview to complete

**Check Preview Status:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_remote_update_set
  query: name=[update_set_name]
  fields: name,state,collision_count,error_count
  instance: test
```

#### Step 4.2: Analyze Conflicts

**Query Preview Problems:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_preview_problem
  query: remote_update_set=[remote_update_set_sys_id]
  fields: description,type,status,disposition
  limit: 100
  instance: test
```

**Conflict Types and Resolution:**

| Type | Description | Resolution |
|------|-------------|------------|
| Collision | Same record modified in target | Choose which version to keep |
| Missing Reference | Referenced record doesn't exist | Create dependency or skip |
| Validation Error | Script/config validation failed | Fix source and re-export |
| Permission Issue | Insufficient rights to modify | Grant necessary permissions |

#### Step 4.3: Resolve Conflicts

**For Collisions - Accept Remote (Source Wins):**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_update_preview_problem
  sys_id: [problem_sys_id]
  data:
    disposition: Accept remote update
  instance: test
```

**For Collisions - Skip (Target Wins):**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_update_preview_problem
  sys_id: [problem_sys_id]
  data:
    disposition: Skip remote update
  instance: test
```

**Bulk Resolution Script:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var remoteSetId = '[remote_update_set_sys_id]';

    // Accept all remote updates (source wins for all)
    var gr = new GlideRecord('sys_update_preview_problem');
    gr.addQuery('remote_update_set', remoteSetId);
    gr.addQuery('disposition', '');  // Unresolved only
    gr.query();

    var count = 0;
    while (gr.next()) {
      gr.disposition = 'Accept remote update';
      gr.update();
      count++;
    }
    gs.info('Resolved ' + count + ' conflicts by accepting remote updates');
  description: Bulk resolve conflicts - accept remote
  instance: test
```

### Phase 5: Commit Update Set

#### Step 5.1: Final Validation

Before committing, verify all conflicts are resolved.

**Check for Unresolved Problems:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_preview_problem
  query: remote_update_set=[remote_update_set_sys_id]^dispositionISEMPTY
  fields: description,type
  instance: test
```

If count > 0, resolve all problems before proceeding.

#### Step 5.2: Commit the Update Set

**Commit (Manual):**
1. Open the retrieved update set
2. Verify state is "Previewed" and no unresolved conflicts
3. Click "Commit Update Set"
4. Monitor progress

**Verify Commit Success:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_remote_update_set
  query: name=[update_set_name]
  fields: name,state,committed_on,committed_by
  instance: test
```

Expected state: "Committed"

### Phase 6: Post-Deployment Validation

#### Step 6.1: Verify Deployed Records

**Check Committed Changes:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_version
  query: source_update_set=[remote_update_set_sys_id]
  fields: name,type,state,action
  limit: 100
  instance: test
```

#### Step 6.2: Functional Testing

**Create Test Checklist:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_user_task
  data:
    short_description: "Post-Deployment Testing: [update_set_name]"
    description: |
      Deployment Validation Checklist:

      [ ] Business Rules execute correctly
      [ ] UI Policies display/hide fields correctly
      [ ] ACLs enforce proper access
      [ ] Forms render without errors
      [ ] Scripts run without errors
      [ ] Integration points functional
      [ ] No console errors in browser
    assigned_to: [tester_sys_id]
    priority: 2
  instance: test
```

#### Step 6.3: Monitor System Logs

**Check for Errors After Deployment:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: level=2^sys_created_on>javascript:gs.hoursAgo(1)
  fields: message,source,sys_created_on
  limit: 50
  instance: test
```

### Phase 7: Rollback Procedures

#### Step 7.1: When to Rollback

**Rollback Indicators:**
- Critical functionality broken
- System performance degraded
- Unexpected errors in logs
- Business process failures

#### Step 7.2: Immediate Rollback Options

**Option A: Back Out Individual Records**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var remoteSetId = '[remote_update_set_sys_id]';

    // Get all versions from this update set
    var gr = new GlideRecord('sys_update_version');
    gr.addQuery('source_update_set', remoteSetId);
    gr.query();

    gs.info('Found ' + gr.getRowCount() + ' records to potentially back out');

    // List records for review
    while (gr.next()) {
      gs.info('Record: ' + gr.name + ' | Type: ' + gr.type + ' | Action: ' + gr.action);
    }
  description: List records from committed update set for rollback planning
  instance: test
```

**Option B: Revert to Previous Version**

For individual records, use sys_update_version to restore:
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var recordSysId = '[record_to_revert_sys_id]';
    var tableName = '[table_name]';

    // Find previous version
    var version = new GlideRecord('sys_update_version');
    version.addQuery('name', tableName + '_' + recordSysId);
    version.orderByDesc('sys_recorded_at');
    version.setLimit(2);  // Current and previous
    version.query();

    version.next();  // Skip current
    if (version.next()) {
      gs.info('Previous version found from: ' + version.sys_recorded_at);
      // Restore would require loading the payload
    } else {
      gs.info('No previous version found');
    }
  description: Find previous version for rollback
  instance: test
```

**Option C: Full Rollback via Backup Clone**

If you created a backup clone:
1. Deploy the backup update set
2. Conflicts will restore previous versions

#### Step 7.3: Document Rollback

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_update_set
  data:
    name: "ROLLBACK-PROJ123-FEAT-CustomerPortal-v1-20260206"
    description: |
      ROLLBACK RECORD

      Original Update Set: PROJ123-FEAT-CustomerPortal-v1
      Deployed: 2026-02-06 14:00 UTC
      Rolled Back: 2026-02-06 16:30 UTC

      Reason: [Document the failure reason]

      Records Affected:
      - [List affected records]

      Resolution:
      - [Document fix approach]
    state: complete
  instance: test
```

## Deployment Checklist

### Pre-Deployment
- [ ] Update set reviewed and contents validated
- [ ] No hardcoded sys_ids or instance URLs
- [ ] Dependencies identified and documented
- [ ] Backup clone created
- [ ] Change request approved (if required)

### During Deployment
- [ ] Update set imported successfully
- [ ] Preview completed without errors
- [ ] All conflicts reviewed and resolved
- [ ] Commit completed successfully

### Post-Deployment
- [ ] All records committed verified
- [ ] Functional testing completed
- [ ] No new errors in system logs
- [ ] Stakeholders notified of deployment
- [ ] Documentation updated

## Tool Usage Summary

| Operation | MCP Tool | Purpose |
|-----------|----------|---------|
| Inspect | SN-Inspect-Update-Set | Review update set contents |
| Clone | SN-Clone-Update-Set | Create backup before deployment |
| Move Records | SN-Move-Records-To-Update-Set | Fix records in wrong set |
| Query | SN-Query-Table | Check states and conflicts |
| Update | SN-Update-Record | Resolve conflicts, update states |
| Script | SN-Execute-Background-Script | Complex validation and rollback |

## Best Practices

- **Always Preview First:** Never commit without previewing
- **Create Backups:** Clone update sets before major deployments
- **Document Everything:** Record all decisions and conflict resolutions
- **Test Thoroughly:** Complete functional testing in each environment
- **Deploy in Order:** Follow DEV → TEST → PROD pipeline strictly
- **Schedule Wisely:** Deploy during low-usage periods
- **Have a Rollback Plan:** Know how to revert before deploying
- **Notify Stakeholders:** Communicate deployment windows and status

## Troubleshooting

### Preview Hangs or Times Out

**Cause:** Large update set or complex dependencies
**Solution:**
1. Split update set into smaller pieces
2. Increase system job timeout
3. Schedule preview during off-hours

### Commit Fails with Errors

**Cause:** Validation errors in scripts or missing dependencies
**Solution:**
1. Review error messages in logs
2. Fix issues in source instance
3. Re-export and re-import update set

### Missing References After Commit

**Cause:** Referenced records not included in update set
**Solution:**
1. Export missing records in separate update set
2. Use Data Preservers for data records
3. Deploy dependency update set first

### Performance Degradation After Deployment

**Cause:** Inefficient scripts or queries in deployed code
**Solution:**
1. Review business rules and script includes
2. Check for unnecessary queries in loops
3. Add proper indexing for new fields
4. Consider rollback if severe

## Related Skills

- `admin/update-set-management` - Creating and managing update sets
- `admin/batch-operations` - Bulk record operations for deployment
- `admin/script-execution` - Background script execution for validation
- `itsm/change-management` - Change process for production deployments

## References

- [ServiceNow Update Sets](https://docs.servicenow.com/bundle/utah-application-development/page/build/system-update-sets/concept/system-update-sets.html)
- [Retrieved Update Sets](https://docs.servicenow.com/bundle/utah-application-development/page/build/system-update-sets/task/retrieve-update-sets.html)
- [Preview and Commit](https://docs.servicenow.com/bundle/utah-application-development/page/build/system-update-sets/task/preview-update-set.html)
