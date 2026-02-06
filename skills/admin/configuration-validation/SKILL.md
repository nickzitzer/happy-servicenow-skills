---
name: configuration-validation
version: 1.0.0
description: Validate ServiceNow configurations including catalog items, workflows, and business rules
author: Happy Technologies LLC
tags: [admin, validation, quality, testing, configuration]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp: [SN-Validate-Configuration, SN-Query-Table, SN-Get-Table-Schema]
  rest: [/api/now/table/sc_cat_item, /api/now/table/wf_workflow, /api/now/table/sys_script]
  native: [Bash, Read]
complexity: advanced
estimated_time: 15-45 minutes
---

# Configuration Validation

## Overview

Configuration validation is essential for maintaining quality and preventing errors in ServiceNow deployments. This skill teaches systematic approaches to validate catalog items, workflows, business rules, and other configurations before deployment.

- **What problem does it solve?** Catches configuration errors, missing dependencies, and broken references before they impact users or cause production issues
- **Who should use this skill?** Administrators, developers, and release managers responsible for quality assurance of ServiceNow configurations
- **What are the expected outcomes?** Validated configurations that work correctly, comprehensive error detection, and confidence in deployments

## Prerequisites

- Required ServiceNow roles: `admin` or specific admin roles (`catalog_admin`, `workflow_admin`)
- Read access to configuration tables (sys_script, wf_workflow, sc_cat_item)
- Understanding of ServiceNow configuration types
- Related skills: `admin/schema-discovery` (helpful for understanding structures)

## Procedure

### Step 1: Identify Configuration Type

Determine what type of configuration you need to validate. Each type has different validation requirements.

**Configuration Types and Tables:**

| Configuration Type | Table | Key Validations |
|-------------------|-------|-----------------|
| Catalog Item | sc_cat_item | Variables, workflows, pricing |
| Catalog Variable | item_option_new | Type, reference, choices |
| Workflow | wf_workflow | Activities, transitions, conditions |
| Business Rule | sys_script | Script syntax, conditions, timing |
| UI Policy | sys_ui_policy | Conditions, actions, triggers |
| Client Script | sys_script_client | Script syntax, type, table |
| Script Include | sys_script_include | Client callable, scope |
| ACL | sys_security_acl | Conditions, script, roles |

### Step 2: Catalog Item Validation

Validate catalog items for completeness, proper configuration, and working dependencies.

**If using MCP tools:**
```
Tool: SN-Validate-Configuration
Parameters:
  type: catalog_item
  sys_id: <catalog_item_sys_id>
  checks:
    - variables
    - workflows
    - pricing
    - approvals
    - fulfillment
```

**If using REST API:**
```bash
# Get catalog item details
GET /api/now/table/sc_cat_item/<sys_id>?sysparm_display_value=all

# Get associated variables
GET /api/now/table/item_option_new?sysparm_query=cat_item=<sys_id>&sysparm_fields=name,type,mandatory,reference,order

# Get associated workflows
GET /api/now/table/wf_workflow?sysparm_query=table=sc_req_item^published=true&sysparm_fields=name,sys_id
```

**Catalog Item Validation Checklist:**

| Check | Description | Severity |
|-------|-------------|----------|
| Active Status | Item is active and visible | Critical |
| Category | Valid category assignment | High |
| Variables | All required variables present | Critical |
| Variable Order | Variables have unique order values | Medium |
| Variable References | Reference fields point to valid tables | Critical |
| Workflow | Fulfillment workflow exists and is published | High |
| Approval Rules | Approval groups/users exist | High |
| Pricing | Price and recurring price are valid | Medium |
| Short Description | Under character limit | Low |
| Icon | Has valid icon or image | Low |

### Step 3: Variable Validation

Validate catalog variables for proper configuration and functionality.

**If using MCP tools:**
```
Tool: SN-Query-Table
Parameters:
  table_name: item_option_new
  query: cat_item=<catalog_item_sys_id>
  fields: name,question_text,type,mandatory,reference,order,variable_set
```

**Variable Type Validation Rules:**

| Type | Required Fields | Common Errors |
|------|-----------------|---------------|
| 1 (Yes/No) | question_text | None |
| 5 (Select Box) | question_text, choices | Missing choices |
| 6 (Single Line) | question_text, max_length | Excessive length |
| 8 (Reference) | question_text, reference | Invalid table reference |
| 9 (Date) | question_text | Date format issues |
| 14 (Macro) | macro | Macro not found |
| 18 (Lookup) | reference, lookup_table | Table mismatch |
| 21 (List Collector) | reference, list_table | Invalid list config |

**Validate Variable Choices:**
```
Tool: SN-Query-Table
Parameters:
  table_name: question_choice
  query: question=<variable_sys_id>
  fields: text,value,order
```

**Decision Points:**
- If type is 5 (Select Box) and no choices exist → Error: Missing choices
- If type is 8 (Reference) and reference table doesn't exist → Error: Invalid reference
- If mandatory=true but default_value is empty → Warning: Required field without default

### Step 4: Workflow Validation

Validate workflows for completeness, proper transitions, and no dead-ends.

**If using MCP tools:**
```
Tool: SN-Validate-Configuration
Parameters:
  type: workflow
  sys_id: <workflow_sys_id>
  checks:
    - activities
    - transitions
    - conditions
    - end_states
```

**If using REST API:**
```bash
# Get workflow details
GET /api/now/table/wf_workflow/<sys_id>?sysparm_display_value=all

# Get workflow activities
GET /api/now/table/wf_activity?sysparm_query=workflow_version.workflow=<sys_id>&sysparm_fields=name,activity_definition,x,y

# Get workflow transitions
GET /api/now/table/wf_transition?sysparm_query=workflow_version.workflow=<sys_id>&sysparm_fields=from,to,condition
```

**Workflow Validation Checklist:**

| Check | Description | Severity |
|-------|-------------|----------|
| Published | Workflow is published and active | Critical |
| Begin Activity | Has exactly one Begin activity | Critical |
| End Activity | Has at least one End activity | Critical |
| Orphan Activities | All activities have incoming transitions | High |
| Dead-End Activities | All activities have outgoing transitions (except End) | High |
| Condition Completeness | All branch conditions are exhaustive | High |
| Activity Scripts | Scripts have valid syntax | Critical |
| Timeout Handlers | Long-running activities have timeouts | Medium |
| Rollback Activities | Approval rejections have proper handling | Medium |

**Detect Orphan Activities:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wf_activity
  query: workflow_version.workflow=<sys_id>^activity_definition.name!=Begin
  fields: sys_id,name

# Then check each activity has incoming transition
Tool: SN-Query-Table
Parameters:
  table_name: wf_transition
  query: to=<activity_sys_id>
  fields: sys_id
```

### Step 5: Business Rule Validation

Validate business rules for proper configuration, syntax, and performance considerations.

**If using MCP tools:**
```
Tool: SN-Validate-Configuration
Parameters:
  type: business_rule
  sys_id: <business_rule_sys_id>
  checks:
    - syntax
    - conditions
    - performance
    - scope
```

**If using REST API:**
```bash
# Get business rule details
GET /api/now/table/sys_script/<sys_id>?sysparm_fields=name,when,collection,active,script,filter_condition,order
```

**Business Rule Validation Checklist:**

| Check | Description | Severity |
|-------|-------------|----------|
| Active | Rule is active | Info |
| Table | Valid table reference | Critical |
| When | Appropriate timing (before/after/async) | High |
| Condition | Filter condition is valid | High |
| Script Syntax | No JavaScript errors | Critical |
| GlideRecord in Before | Avoid GlideRecord updates in before rules | High |
| Current.update() | Avoid in before rules (causes recursion) | Critical |
| Changes Check | Uses .changes() for efficiency | Medium |
| Order | Appropriate order value | Medium |
| Scope | Correct application scope | High |

**Common Business Rule Anti-Patterns:**

```javascript
// ANTI-PATTERN 1: current.update() in before rule
// Causes infinite recursion
(function executeRule(current, previous) {
  current.priority = 1;
  current.update(); // BAD! Remove this line
})(current, previous);

// ANTI-PATTERN 2: Unnecessary GlideRecord in before rule
(function executeRule(current, previous) {
  var gr = new GlideRecord('incident');
  gr.get(current.sys_id);
  gr.priority = 1;
  gr.update(); // BAD! Just set current.priority = 1
})(current, previous);

// ANTI-PATTERN 3: No changes() check
(function executeRule(current, previous) {
  // Runs on every update even if priority didn't change
  notifyPriorityChange(current.priority);
})(current, previous);

// CORRECT: Check if field changed
(function executeRule(current, previous) {
  if (current.priority.changes()) {
    notifyPriorityChange(current.priority);
  }
})(current, previous);
```

### Step 6: UI Policy Validation

Validate UI policies for proper configuration and action completeness.

**If using MCP tools:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_ui_policy
  query: sys_id=<ui_policy_sys_id>
  fields: short_description,table,conditions,active,global,inherit
```

**Get UI Policy Actions:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_ui_policy_action
  query: ui_policy=<ui_policy_sys_id>
  fields: field,mandatory,visible,disabled
```

**UI Policy Validation Checklist:**

| Check | Description | Severity |
|-------|-------------|----------|
| Active | Policy is active | Info |
| Table | Valid table reference | Critical |
| Conditions | Conditions are valid and testable | High |
| Actions Exist | At least one action defined | High |
| Field References | Action fields exist on table | Critical |
| Reverse Handling | Policy handles both true and false states | Medium |
| Order | No conflicting policies with same fields | Medium |

### Step 7: Script Include Validation

Validate script includes for proper configuration and accessibility.

**If using MCP tools:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_include
  query: sys_id=<script_include_sys_id>
  fields: name,api_name,client_callable,access,active,script
```

**Script Include Validation Checklist:**

| Check | Description | Severity |
|-------|-------------|----------|
| Active | Script include is active | Info |
| Name Convention | Follows naming conventions | Medium |
| API Name | Unique and descriptive | Medium |
| Client Callable | Only if needed (security risk) | High |
| Syntax | Valid JavaScript syntax | Critical |
| Prototype Pattern | Uses proper class pattern | Medium |
| Documentation | Has JSDoc comments | Low |
| Dependencies | Referenced script includes exist | High |

### Step 8: ACL Validation

Validate Access Control Lists for proper security configuration.

**If using MCP tools:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl
  query: name=incident
  fields: name,operation,type,active,condition,script,role
```

**ACL Validation Checklist:**

| Check | Description | Severity |
|-------|-------------|----------|
| Active | ACL is active | Info |
| Operation | Valid operation type | Critical |
| Roles | At least one role or condition | Critical |
| Condition | Valid condition expression | High |
| Script | Valid script if used | High |
| Coverage | All operations covered | Medium |
| Inheritance | Proper use of * ACLs | Medium |

### Step 9: Generate Validation Report

Compile all validation results into a comprehensive report.

**Validation Report Template:**

```markdown
# Configuration Validation Report

## Summary
- Configuration: [Name]
- Type: [Catalog Item / Workflow / Business Rule]
- Date: [Date]
- Validator: [Name]

## Overall Status: [PASS / FAIL / WARNING]

## Detailed Findings

### Critical Issues (Must Fix)
1. [Issue description and remediation]
2. [Issue description and remediation]

### High Priority Issues (Should Fix)
1. [Issue description and remediation]

### Medium Priority Issues (Consider Fixing)
1. [Issue description and remediation]

### Low Priority Issues (Nice to Have)
1. [Issue description and remediation]

## Validation Details

### Component 1: [Name]
- Status: [PASS/FAIL]
- Checks Performed: [List]
- Issues Found: [List]

### Component 2: [Name]
- Status: [PASS/FAIL]
- Checks Performed: [List]
- Issues Found: [List]

## Recommendations
1. [Recommendation]
2. [Recommendation]

## Sign-off
- [ ] All critical issues resolved
- [ ] All high priority issues resolved or documented
- [ ] Configuration approved for deployment
```

## Tool Usage

### MCP Tools (Claude Code/Desktop)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `SN-Validate-Configuration` | Comprehensive validation | Primary validation tool |
| `SN-Query-Table` | Query configuration tables | Detailed inspections |
| `SN-Get-Table-Schema` | Understand table structure | Validate field references |

### REST API (ChatGPT/Other)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sc_cat_item` | GET | Catalog item validation |
| `/api/now/table/item_option_new` | GET | Variable validation |
| `/api/now/table/wf_workflow` | GET | Workflow validation |
| `/api/now/table/sys_script` | GET | Business rule validation |
| `/api/now/table/sys_ui_policy` | GET | UI policy validation |
| `/api/now/table/sys_script_include` | GET | Script include validation |
| `/api/now/table/sys_security_acl` | GET | ACL validation |

### Native Tools (Claude Code)

| Tool | Purpose |
|------|---------|
| `Bash` | Execute validation scripts |
| `Read` | Read validation templates |

## Best Practices

- **Validate Before Promotion:** Always validate configurations before moving between instances
- **Use Automated Validation:** Implement automated validation in CI/CD pipelines
- **Document Exceptions:** Document any validation warnings that are accepted
- **Test with Data:** Validate using realistic test data, not empty records
- **Cross-Reference Dependencies:** Ensure all referenced objects exist in target environment
- **Version Control:** Keep validation reports with update set documentation
- **ITIL Alignment:** Include validation as part of change management process

## Troubleshooting

### Common Issue 1: Validation Returns False Positives

**Symptom:** Validation flags issues that work correctly in practice
**Cause:** Validation logic doesn't account for all valid configurations
**Solution:** Review the specific validation rule and add exception handling

```
# Check if the "error" is actually valid
Tool: SN-Query-Table
Parameters:
  table_name: <relevant_table>
  query: sys_id=<object_sys_id>
  display_value: all
```

### Common Issue 2: Missing Dependencies in Target Instance

**Symptom:** Configuration works in dev but fails validation in test/prod
**Cause:** Dependencies not included in update set
**Solution:** Query sys_update_xml to find all related records

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_xml
  query: update_set=<update_set_sys_id>
  fields: type,target_name,name
```

### Common Issue 3: Script Syntax Errors Not Detected

**Symptom:** Invalid JavaScript passes validation but fails at runtime
**Cause:** Basic syntax check doesn't catch all JavaScript errors
**Solution:** Use ServiceNow's syntax checker or background script test

```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    try {
      eval('<script_content>');
      gs.info('Syntax check passed');
    } catch(e) {
      gs.error('Syntax error: ' + e.message);
    }
```

### Common Issue 4: Workflow Validation Times Out

**Symptom:** Workflow validation takes too long or fails
**Cause:** Complex workflow with many activities and transitions
**Solution:** Break validation into smaller chunks

```
# Validate activities separately
Tool: SN-Query-Table
Parameters:
  table_name: wf_activity
  query: workflow_version.workflow=<sys_id>
  limit: 50
  offset: 0

# Then transitions
Tool: SN-Query-Table
Parameters:
  table_name: wf_transition
  query: workflow_version.workflow=<sys_id>
  limit: 100
```

## Examples

### Example 1: Complete Catalog Item Validation

```
# Step 1: Get catalog item details
Tool: SN-Query-Table
Parameters:
  table_name: sc_cat_item
  query: sys_id=abc123
  fields: name,short_description,active,category,workflow
  display_value: all

# Result:
name: "New Laptop Request"
active: true
category: "Hardware"
workflow: "Standard Laptop Fulfillment"

# Step 2: Validate variables
Tool: SN-Query-Table
Parameters:
  table_name: item_option_new
  query: cat_item=abc123
  fields: name,question_text,type,mandatory,reference,order

# Result:
- laptop_type (Select Box, mandatory) - OK
- memory_size (Select Box) - OK
- justification (Multi-line, mandatory) - OK
- manager_approval (Reference to sys_user) - OK

# Step 3: Validate variable choices exist
Tool: SN-Query-Table
Parameters:
  table_name: question_choice
  query: question.cat_item=abc123
  fields: question.name,text,value

# Result:
laptop_type choices: Standard, Developer, Executive - OK
memory_size choices: 8GB, 16GB, 32GB - OK

# Step 4: Validate workflow exists and is published
Tool: SN-Query-Table
Parameters:
  table_name: wf_workflow
  query: name=Standard Laptop Fulfillment
  fields: name,published,active

# Result:
published: true
active: true - OK

# Final Status: PASS - All validations passed
```

### Example 2: Business Rule Performance Validation

```
# Step 1: Get business rule
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: name=Auto Assign Critical Incidents
  fields: name,when,collection,active,script,filter_condition

# Result:
name: "Auto Assign Critical Incidents"
when: "before"
collection: "incident"
filter_condition: "priority=1"
script: (see below)

# Step 2: Analyze script for anti-patterns
Script Content:
```javascript
(function executeRule(current, previous) {
  var gr = new GlideRecord('sys_user_group');
  gr.addQuery('name', 'Critical Incident Team');
  gr.query();
  if (gr.next()) {
    current.assignment_group = gr.sys_id;
  }

  // ISSUE FOUND: GlideRecord query in before rule
  // This runs on EVERY insert of P1 incident
})(current, previous);
```

# Step 3: Generate recommendations
Issues Found:
1. WARNING: GlideRecord query in before rule
   - Impact: Performance degradation on incident creation
   - Recommendation: Cache group sys_id in system property or use gs.getProperty()

Recommended Fix:
```javascript
(function executeRule(current, previous) {
  // Use cached value instead of query
  var criticalTeamId = gs.getProperty('x_app.critical_team_sys_id');
  if (criticalTeamId) {
    current.assignment_group = criticalTeamId;
  }
})(current, previous);
```

# Final Status: WARNING - Performance issue detected
```

### Example 3: Workflow Dead-End Detection

```
# Step 1: Get workflow activities
Tool: SN-Query-Table
Parameters:
  table_name: wf_activity
  query: workflow_version.workflow=wf123
  fields: sys_id,name,activity_definition.name

# Result:
- act1: Begin
- act2: Create Task
- act3: Approval
- act4: If Approved (Branch)
- act5: Fulfill Request
- act6: End
- act7: Send Rejection Email

# Step 2: Get all transitions
Tool: SN-Query-Table
Parameters:
  table_name: wf_transition
  query: workflow_version.workflow=wf123
  fields: from.name,to.name,condition

# Result:
- Begin -> Create Task
- Create Task -> Approval
- Approval -> If Approved
- If Approved -> Fulfill Request (condition: approved)
- If Approved -> Send Rejection Email (condition: rejected)
- Fulfill Request -> End

# Step 3: Analyze for issues
ISSUE FOUND: Dead-end activity
- "Send Rejection Email" (act7) has no outgoing transition
- This will cause workflow to hang after rejection

# Recommendation:
Add transition from "Send Rejection Email" to "End"

# Final Status: FAIL - Workflow has dead-end activity
```

### Example 4: ACL Coverage Validation

```
# Step 1: Get all ACLs for table
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl
  query: name=x_app_custom_table
  fields: name,operation,type,active,admin_overrides,role.name

# Result:
- x_app_custom_table (read) - role: x_app.user - ACTIVE
- x_app_custom_table (write) - role: x_app.admin - ACTIVE
- x_app_custom_table (create) - role: x_app.admin - ACTIVE
- x_app_custom_table (delete) - role: x_app.admin - ACTIVE
- x_app_custom_table.* (read) - role: x_app.user - ACTIVE

# Step 2: Analyze coverage
Operations Covered:
- read: YES
- write: YES
- create: YES
- delete: YES

Field-Level ACLs:
- *.* (all fields): YES

# Step 3: Check for gaps
ISSUE FOUND: No row-level restriction
- All users with x_app.user role can read ALL records
- Consider adding condition for record-level security

# Recommendation:
If records should be user-specific, add condition:
`created_by=javascript:gs.getUserID()`

# Final Status: WARNING - Consider row-level security
```

## Related Skills

- `admin/schema-discovery` - Understanding table structures for validation
- `admin/update-set-management` - Managing validated configurations
- `admin/batch-operations` - Fixing validation issues in bulk
- `admin/deployment-workflow` - Deploying validated configurations

## References

- [ServiceNow Instance Scan](https://docs.servicenow.com/bundle/utah-application-development/page/build/instance-scan/concept/instance-scan.html)
- [Catalog Item Best Practices](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/product/service-catalog-management/concept/c_ServiceCatalogBestPractices.html)
- [Workflow Best Practices](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/administer/workflow-administration/concept/c_WorkflowBestPractices.html)
- [Business Rule Best Practices](https://docs.servicenow.com/bundle/utah-application-development/page/script/server-scripting/concept/c_BusinessRuleBestPractices.html)
- [ACL Best Practices](https://docs.servicenow.com/bundle/utah-platform-security/page/administer/contextual-security/concept/access-control-best-practices.html)
