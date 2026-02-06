---
name: script-sync
version: 1.0.0
description: Local script development workflow for syncing ServiceNow scripts to local files, enabling version control and modern IDE features
author: Happy Technologies LLC
tags: [admin, development, sync, git, local-development, scripts, version-control]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Sync-Script-To-Local
    - SN-Sync-Local-To-Script
    - SN-Watch-Script
    - SN-Query-Table
    - SN-Update-Record
    - SN-Get-Record
  rest:
    - /api/now/table/sys_script
    - /api/now/table/sys_script_include
    - /api/now/table/sys_ui_script
    - /api/now/table/sys_script_client
  native:
    - Bash
    - Read
    - Write
complexity: intermediate
estimated_time: 15-30 minutes
---

# Script Synchronization - Local Development Workflow

## Overview

This skill covers setting up a local development workflow for ServiceNow scripts:

- Syncing scripts from ServiceNow to local files
- Pushing local changes back to ServiceNow
- Watch mode for continuous development
- Version control integration with Git
- Supported script types and their tables

**When to use:** When you need modern IDE features (IntelliSense, linting, debugging), version control with Git, collaborative development (PRs, code reviews), or backup and disaster recovery.

**Who should use this:** Developers who want a professional development workflow with version control and modern tooling.

## Prerequisites

- **Roles:** `admin` or appropriate scoped app developer role
- **Access:** Script tables (sys_script, sys_script_include, etc.)
- **Local Setup:**
  - Directory for storing scripts (e.g., `/scripts/servicenow/`)
  - Git initialized in the directory (optional but recommended)
  - Modern IDE (VSCode, WebStorm, etc.) for editing
- **Related Skills:** `admin/update-set-management` for tracking changes

## Supported Script Types

| Script Type | Table | Script Field | Common Use |
|-------------|-------|--------------|------------|
| **Business Rule** | sys_script | script | Server-side automation |
| **Script Include** | sys_script_include | script | Reusable server-side code |
| **Client Script** | sys_script_client | script | Form behavior |
| **UI Script** | sys_ui_script | script | Client-side libraries |
| **UI Action** | sys_ui_action | script | Form buttons/links |
| **Scheduled Job** | sysauto_script | script | Scheduled execution |
| **Fix Script** | sys_script_fix | script | One-time scripts |
| **UI Policy** | sys_ui_policy | script_true, script_false | Form conditionals |
| **ACL** | sys_security_acl | script | Access control |
| **Transform Map Script** | sys_transform_script | script | Data import |
| **Workflow Activity** | wf_activity | script | Workflow logic |

## Procedure

### Phase 1: Setup Local Directory Structure

#### Step 1.1: Create Directory Structure

Organize your local scripts by type for easy navigation:

```bash
# Create directory structure
mkdir -p scripts/servicenow/{business_rules,script_includes,client_scripts,ui_scripts,ui_actions,scheduled_jobs,fix_scripts}

# Initialize Git (optional but recommended)
cd scripts/servicenow
git init
echo "*.log" >> .gitignore
echo ".DS_Store" >> .gitignore
git add .
git commit -m "Initial script repository setup"
```

**Recommended Directory Structure:**
```
scripts/
└── servicenow/
    ├── business_rules/
    │   ├── incident/
    │   │   ├── validate_priority.js
    │   │   └── auto_assign.js
    │   └── change_request/
    │       └── approval_check.js
    ├── script_includes/
    │   ├── IncidentUtils.js
    │   └── NotificationHelper.js
    ├── client_scripts/
    │   ├── incident/
    │   │   └── form_validation.js
    │   └── change_request/
    │       └── populate_fields.js
    ├── ui_scripts/
    │   └── custom_functions.js
    ├── ui_actions/
    │   └── escalate_incident.js
    ├── scheduled_jobs/
    │   └── daily_cleanup.js
    └── fix_scripts/
        └── data_migration_2026.js
```

### Phase 2: Download Scripts from ServiceNow

#### Step 2.1: Find Scripts to Sync

**Query Business Rules:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: active=true^collection=incident
  fields: sys_id,name,when,script
  limit: 50
```

**Query Script Includes:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_include
  query: active=true^sys_scope=[your_app_scope]
  fields: sys_id,name,api_name,script
  limit: 100
```

**Query Client Scripts:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_client
  query: active=true^table=incident
  fields: sys_id,name,type,script
  limit: 50
```

#### Step 2.2: Sync Script to Local File

**Using MCP (if SN-Sync-Script-To-Local is available):**
```
Tool: SN-Sync-Script-To-Local
Parameters:
  script_sys_id: abc123def456
  local_path: /scripts/servicenow/business_rules/incident/validate_priority.js
  instance: dev
```

**Manual Method (if sync tool not available):**

1. Get the script content:
```
Tool: SN-Get-Record
Parameters:
  table_name: sys_script
  sys_id: abc123def456
  fields: name,script,when,collection,order
```

2. Write to local file using your IDE or Write tool:
```
Tool: Write
Parameters:
  file_path: /scripts/servicenow/business_rules/incident/validate_priority.js
  content: |
    /**
     * Business Rule: Validate Priority
     * Table: incident
     * When: before
     * Order: 100
     * sys_id: abc123def456
     *
     * DO NOT EDIT sys_id line - used for sync
     */

    (function executeRule(current, previous /*null when async*/) {

      // Validate priority based on impact and urgency
      if (current.impact == 1 || current.urgency == 1) {
        current.priority = 1;
      }

    })(current, previous);
```

#### Step 2.3: Batch Download Multiple Scripts

**Download all Business Rules for a table:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: active=true^collection=incident
  fields: sys_id,name,script,when,order
  limit: 100
```

Then for each result, create a local file with the script content.

**File Naming Convention:**
```
[table]/[name_snake_case].js

Examples:
- incident/validate_priority.js
- change_request/auto_approve_standard.js
- sys_user/welcome_email.js
```

### Phase 3: Upload Local Changes to ServiceNow

#### Step 3.1: Push Changes Using MCP

**Using MCP (if SN-Sync-Local-To-Script is available):**
```
Tool: SN-Sync-Local-To-Script
Parameters:
  local_path: /scripts/servicenow/business_rules/incident/validate_priority.js
  script_sys_id: abc123def456
  instance: dev
```

**Manual Method:**

1. Read local file content
2. Update ServiceNow record:
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_script
  sys_id: abc123def456
  data:
    script: |
      (function executeRule(current, previous) {
        // Your updated script here
      })(current, previous);
```

#### Step 3.2: Create New Script from Local File

When creating a new script that doesn't exist in ServiceNow:

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: "New Business Rule"
    collection: incident
    when: before
    order: 200
    active: true
    script: |
      (function executeRule(current, previous) {
        // New script logic
      })(current, previous);
```

**Save the returned sys_id** in your local file header for future syncs.

### Phase 4: Watch Mode for Continuous Development

#### Step 4.1: Enable Watch Mode

**Using MCP (if SN-Watch-Script is available):**
```
Tool: SN-Watch-Script
Parameters:
  local_path: /scripts/servicenow/business_rules/incident/validate_priority.js
  script_sys_id: abc123def456
  instance: dev
```

**How Watch Mode Works:**
1. Monitors the local file for changes
2. When you save (Cmd+S / Ctrl+S), detects the change
3. Automatically uploads new content to ServiceNow
4. Typically polls every 2 seconds

**Benefits of Watch Mode:**
- Edit locally with full IDE features
- Save and test immediately in ServiceNow
- No manual upload step needed

#### Step 4.2: Development Workflow with Watch Mode

1. **Start Watch Mode** for the script you're developing
2. **Edit in IDE** (VSCode, WebStorm, etc.)
3. **Save file** (Cmd+S / Ctrl+S)
4. **Wait ~2 seconds** for sync
5. **Test in ServiceNow** (refresh form, trigger business rule, etc.)
6. **Repeat** until done
7. **Stop Watch Mode** (Ctrl+C or close terminal)

#### Step 4.3: Watch Mode Limitations

| Limitation | Workaround |
|------------|------------|
| Single file only | Run multiple watch processes |
| 2-second polling | Not instant, but usually fast enough |
| Requires active connection | Check network if sync stops |
| Stops when terminal closed | Use background process or tmux |

### Phase 5: Version Control Integration

#### Step 5.1: Git Workflow for ServiceNow Scripts

**Initial Setup:**
```bash
cd /scripts/servicenow
git init
git add .
git commit -m "Initial import of ServiceNow scripts"
git remote add origin https://github.com/your-org/servicenow-scripts.git
git push -u origin main
```

**Daily Workflow:**
```bash
# Create feature branch
git checkout -b feature/incident-validation

# Make changes locally, sync to ServiceNow, test

# Commit changes
git add business_rules/incident/validate_priority.js
git commit -m "Add priority validation for P1 incidents"

# Push for code review
git push origin feature/incident-validation

# Create pull request for team review
```

#### Step 5.2: Include Metadata in Script Files

Include ServiceNow metadata as comments for reference:

```javascript
/**
 * @name Validate Incident Priority
 * @table incident
 * @type Business Rule
 * @when before
 * @order 100
 * @sys_id abc123def456
 * @update_set PROJ-FEAT-Validation-v1
 * @active true
 *
 * @description
 * Validates and sets incident priority based on impact and urgency.
 * Called before insert and update operations.
 *
 * @changelog
 * 2026-02-06 - Initial creation (JIRA-123)
 * 2026-02-07 - Added P1 auto-escalation (JIRA-456)
 */

(function executeRule(current, previous /*null when async*/) {

    // Your script logic here

})(current, previous);
```

#### Step 5.3: Sync Script with Metadata Parsing

When syncing, extract and verify metadata:

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: sys_id=abc123def456
  fields: sys_id,name,when,order,active
```

Compare with local file metadata to detect drift.

### Phase 6: Multi-Instance Sync

#### Step 6.1: Sync Across Environments

When you need to compare or sync scripts across instances:

**Get script from DEV:**
```
Tool: SN-Get-Record
Parameters:
  table_name: sys_script
  sys_id: abc123def456
  instance: dev
```

**Get same script from TEST:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: name=Validate Incident Priority^collection=incident
  fields: sys_id,script
  instance: test
```

**Compare and update if needed:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_script
  sys_id: [test_sys_id]
  data:
    script: [dev_script_content]
  instance: test
```

#### Step 6.2: Environment-Specific Scripts

Use Git branches for environment-specific versions:

```
main            # Production scripts
├── develop     # Development scripts
├── staging     # Staging/test scripts
└── feature/*   # Feature branches
```

### Phase 7: Advanced Patterns

#### Step 7.1: Automated Script Export

Export all scripts from an application scope:

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_include
  query: sys_scope.name=My Custom App
  fields: sys_id,name,api_name,script
  limit: 500
```

Then batch write to local files.

#### Step 7.2: Script Validation Before Upload

Before uploading, validate script syntax locally:

```bash
# Basic JavaScript syntax check
node --check /scripts/servicenow/business_rules/incident/validate_priority.js

# Or use ESLint with ServiceNow config
eslint /scripts/servicenow/business_rules/incident/validate_priority.js
```

**ESLint Configuration for ServiceNow:**
```json
{
  "env": {
    "es6": true
  },
  "globals": {
    "current": "readonly",
    "previous": "readonly",
    "gs": "readonly",
    "GlideRecord": "readonly",
    "GlideDateTime": "readonly",
    "GlideAggregate": "readonly",
    "GlideFilter": "readonly",
    "Class": "readonly",
    "global": "readonly"
  },
  "rules": {
    "no-undef": "error",
    "no-unused-vars": "warn"
  }
}
```

#### Step 7.3: Diff Before Upload

Compare local and remote before uploading:

```
Tool: SN-Get-Record
Parameters:
  table_name: sys_script
  sys_id: abc123def456
  fields: script
```

Use diff tool to compare with local file content before overwriting.

## Complete Example: Full Development Cycle

```bash
# 1. Create local project
mkdir -p ~/servicenow-dev/incident-improvements
cd ~/servicenow-dev/incident-improvements
git init

# 2. Download existing script
```

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: name=Auto Assign P1^collection=incident
  fields: sys_id,name,script,when,order
```

```bash
# 3. Create local file with content
```

```
Tool: Write
Parameters:
  file_path: ~/servicenow-dev/incident-improvements/auto_assign_p1.js
  content: |
    /**
     * @name Auto Assign P1
     * @sys_id xyz789...
     */
    (function executeRule(current, previous) {
      // Downloaded script content
    })(current, previous);
```

```bash
# 4. Start watch mode
```

```
Tool: SN-Watch-Script
Parameters:
  local_path: ~/servicenow-dev/incident-improvements/auto_assign_p1.js
  script_sys_id: xyz789...
  instance: dev
```

```bash
# 5. Edit locally in VSCode, save, test in ServiceNow

# 6. Commit when done
git add auto_assign_p1.js
git commit -m "Improve P1 auto-assignment logic"

# 7. Push for review
git push origin main
```

## Tool Usage Summary

| Operation | MCP Tool | Fallback Method |
|-----------|----------|-----------------|
| Download script | SN-Sync-Script-To-Local | SN-Get-Record + Write |
| Upload script | SN-Sync-Local-To-Script | Read + SN-Update-Record |
| Watch changes | SN-Watch-Script | Manual sync loop |
| Find scripts | SN-Query-Table | N/A |
| Create script | SN-Create-Record | N/A |

## Best Practices

- **Always Include sys_id:** Store sys_id in file header for sync identification
- **Use Git:** Version control all scripts for history and collaboration
- **Meaningful Commits:** Reference ticket numbers in commit messages
- **Test Before Commit:** Verify script works in ServiceNow before committing
- **Document Changes:** Use changelog comments in script header
- **Backup First:** Download existing script before overwriting
- **Use Feature Branches:** Isolate changes for code review
- **Lint Your Code:** Use ESLint with ServiceNow globals

## Troubleshooting

### Watch Mode Not Syncing

**Symptom:** Save file but changes don't appear in ServiceNow
**Causes:**
- Watch process stopped
- Network connectivity issue
- File saved in wrong location
**Solution:**
```bash
# Check if watch is running
ps aux | grep watch-script

# Restart watch mode
```
```
Tool: SN-Watch-Script
Parameters:
  local_path: /absolute/path/to/script.js
  script_sys_id: abc123
  instance: dev
```

### Script Upload Fails

**Symptom:** Error when pushing local changes
**Causes:**
- Invalid sys_id
- Script locked by another user
- Syntax error in script
**Solution:**
1. Verify sys_id is correct
2. Check if record is checked out
3. Validate JavaScript syntax locally first

### Sync Overwrites Incorrect Script

**Symptom:** Wrong script updated in ServiceNow
**Causes:**
- sys_id mismatch between local file and intended target
**Solution:**
```
Tool: SN-Get-Record
Parameters:
  table_name: sys_script
  sys_id: abc123
  fields: name,collection
```
Verify the record before syncing.

### File Permission Errors

**Symptom:** Cannot write to local directory
**Solution:**
```bash
# Check directory permissions
ls -la /scripts/servicenow/

# Fix permissions
chmod 755 /scripts/servicenow/
chmod 644 /scripts/servicenow/*.js
```

## Related Skills

- `admin/update-set-management` - Track script changes in update sets
- `admin/script-execution` - Execute and test scripts
- `admin/deployment-workflow` - Deploy scripts between instances
- `admin/batch-operations` - Bulk script operations

## References

- [ServiceNow Script Development](https://developer.servicenow.com/dev.do#!/guides/utah/now-platform/script-development)
- [Business Rules](https://docs.servicenow.com/bundle/utah-application-development/page/script/business-rules/concept/c_BusinessRules.html)
- [Script Includes](https://docs.servicenow.com/bundle/utah-application-development/page/script/server-scripting/concept/c_ScriptIncludes.html)
- [Client Scripts](https://docs.servicenow.com/bundle/utah-application-development/page/script/client-scripts/concept/c_ClientScripts.html)
