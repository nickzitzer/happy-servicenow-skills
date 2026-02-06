---
name: instance-management
version: 1.0.0
description: Manage multiple ServiceNow instances including switching between dev/test/prod environments
author: Happy Technologies LLC
tags: [admin, instance, multi-instance, environment, configuration]
platforms: [claude-code, claude-desktop, cursor, any]
tools:
  mcp: [SN-Query-Table, SN-Get-Current-Instance, SN-List-Instances]
  rest: [/api/now/table/sys_properties]
  native: [Bash, Read]
complexity: intermediate
estimated_time: 5-10 minutes
---

# Instance Management

## Overview

Multi-instance management is essential for ServiceNow development workflows that span development, testing, and production environments. This skill covers safely switching between instances, verifying current context, and following best practices for environment-specific operations.

- **What problem does it solve?** Prevents accidental changes to wrong environments and ensures proper instance targeting for all operations
- **Who should use this skill?** ServiceNow administrators, developers, and integrators working across multiple instances
- **What are the expected outcomes?** Safe, reliable instance switching with verification and proper isolation of environment-specific changes

## Prerequisites

- Required ServiceNow roles: `admin` or `itil` (varies by operation)
- MCP server configured with multiple instances in `config/servicenow-instances.json`
- Network access to all target instances
- Valid credentials for each instance
- Related skills: `admin/update-set-management` (for update set operations after switching)

## Procedure

### Step 1: List Available Instances

First, identify all configured instances and their current status.

**Using MCP tools:**
```
Tool: SN-List-Instances
Parameters: (none required)
```

**Expected Response:**
```json
{
  "instances": [
    {
      "name": "dev",
      "url": "https://dev12345.service-now.com",
      "default": true,
      "status": "connected"
    },
    {
      "name": "test",
      "url": "https://test12345.service-now.com",
      "default": false,
      "status": "available"
    },
    {
      "name": "prod",
      "url": "https://prod12345.service-now.com",
      "default": false,
      "status": "available"
    }
  ]
}
```

### Step 2: Verify Current Instance Context

Before making any changes, confirm which instance is currently active.

**Using MCP tools:**
```
Tool: SN-Get-Current-Instance
Parameters: (none required)
```

**Decision Points:**
- If current instance matches target → Proceed with operations
- If current instance differs from target → Switch instance first (Step 3)
- If instance status is "disconnected" → Check network/credentials

### Step 3: Switch to Target Instance

Route operations to a specific instance by including the `instance` parameter.

**Using MCP tools (per-operation targeting):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_properties
  query: name=glide.installation.name
  fields: name,value
  instance: dev
```

**Important:** The `instance` parameter must be included on EVERY operation that should target a specific instance. There is no persistent "current instance" state that persists across operations.

### Step 4: Verify Instance Switch

Confirm the operation executed on the correct instance by checking instance-specific identifiers.

**Using MCP tools:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_properties
  query: name=instance_name^ORname=glide.installation.name
  fields: name,value
  instance: dev
```

**Verification Checklist:**
- [ ] Instance URL in response matches expected environment
- [ ] Instance name property confirms correct target
- [ ] No cross-environment data contamination

### Step 5: Instance-Specific Operations

Once verified, perform your intended operations with the `instance` parameter.

**Example: Query incidents on production:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^priority=1
  fields: number,short_description,state,assigned_to
  limit: 10
  instance: prod
```

**Example: Create record on development:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_properties
  data:
    name: x_custom.feature_flag
    value: enabled
  instance: dev
```

## Tool Usage

### MCP Tools (Claude Code/Desktop)

| Tool | Purpose | Instance Parameter |
|------|---------|-------------------|
| `SN-List-Instances` | List all configured instances | N/A |
| `SN-Get-Current-Instance` | Get default instance info | N/A |
| `SN-Query-Table` | Query records on specific instance | Required for non-default |
| `SN-Create-Record` | Create records on specific instance | Required for non-default |
| `SN-Update-Record` | Update records on specific instance | Required for non-default |
| `SN-Execute-Background-Script` | Run scripts on specific instance | Required for non-default |

### REST API (ChatGPT/Other)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `{instance_url}/api/now/table/sys_properties` | GET | Query instance properties |
| `{instance_url}/api/now/table/incident` | GET | Query incidents |

**Note:** For REST API, target different instances by using different base URLs in your requests.

### Native Tools (Claude Code)

| Tool | Purpose |
|------|---------|
| `Bash` | Execute curl commands with instance-specific URLs |
| `Read` | Read instance configuration files |

## Configuration

### Instance Configuration File

Located at `config/servicenow-instances.json`:

```json
{
  "instances": [
    {
      "name": "dev",
      "url": "https://dev12345.service-now.com",
      "username": "admin",
      "password": "${DEV_SN_PASSWORD}",
      "default": true
    },
    {
      "name": "test",
      "url": "https://test12345.service-now.com",
      "username": "integration_user",
      "password": "${TEST_SN_PASSWORD}",
      "default": false
    },
    {
      "name": "prod",
      "url": "https://prod12345.service-now.com",
      "username": "integration_user",
      "password": "${PROD_SN_PASSWORD}",
      "default": false
    }
  ]
}
```

### Environment Variables

Store credentials securely using environment variables:

```bash
# Development
export DEV_SN_PASSWORD="dev_password_here"

# Test
export TEST_SN_PASSWORD="test_password_here"

# Production (use restricted access)
export PROD_SN_PASSWORD="prod_password_here"
```

## Best Practices

- **Always Verify Before Write Operations:** Query the instance identifier before creating or updating records to prevent accidental production changes
- **Use Least Privilege Accounts:** Configure different credentials per environment with appropriate permission levels (read-only for prod queries)
- **Explicit Instance Parameter:** Always include the `instance` parameter explicitly rather than relying on defaults for critical operations
- **Environment Naming Convention:** Use consistent, clear names (dev, test, staging, prod) across all configuration
- **Credential Isolation:** Never share credentials across environments; use environment-specific service accounts
- **Audit Logging:** Enable audit logging on all instances to track cross-environment operations
- **Network Segmentation:** Consider VPN or IP restrictions for production instance access

## Environment-Specific Considerations

### Development Instance
- Full read/write access for experimentation
- Frequent data resets acceptable
- Use for initial development and testing
- May have relaxed ACLs for developer productivity

### Test/QA Instance
- Mirrors production configuration
- Restricted write access
- Used for integration testing
- Data should represent production scenarios

### Production Instance
- **Read-only operations preferred**
- All changes require change management approval
- Use dedicated integration accounts
- Enable comprehensive audit logging
- Consider time-of-day restrictions for updates

## Troubleshooting

### Common Issue 1: Instance Connection Failed

**Symptom:** Operations fail with "Unable to connect to instance"
**Cause:** Network issues, incorrect URL, or firewall restrictions
**Solution:**
1. Verify instance URL is correct and accessible
2. Check VPN connection if required
3. Test with curl: `curl -u username:password https://instance.service-now.com/api/now/table/sys_properties?sysparm_limit=1`
4. Verify credentials are not expired

### Common Issue 2: Authentication Failure

**Symptom:** 401 Unauthorized errors
**Cause:** Invalid credentials or locked account
**Solution:**
1. Verify username and password in configuration
2. Check if account is locked in ServiceNow User Administration
3. Confirm account has appropriate roles assigned
4. Check for password expiration

### Common Issue 3: Wrong Instance Targeted

**Symptom:** Operation succeeded but on wrong instance
**Cause:** Missing or incorrect `instance` parameter
**Solution:**
1. Always include explicit `instance` parameter
2. Verify instance name matches configuration exactly (case-sensitive)
3. Query sys_properties to confirm target before write operations

### Common Issue 4: Permission Denied on Specific Instance

**Symptom:** 403 Forbidden on one instance but not others
**Cause:** Different ACL configurations or role assignments per instance
**Solution:**
1. Compare user roles across instances
2. Check instance-specific ACL rules
3. Request appropriate roles from instance admin

## Examples

### Example 1: Safe Production Query

Query production incidents without risk of modification:

```
# Step 1: Verify targeting production
Tool: SN-Query-Table
Parameters:
  table_name: sys_properties
  query: name=instance_name
  fields: value
  instance: prod

# Step 2: Query incidents (read-only operation)
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^priority=1^state!=6
  fields: number,short_description,state,assigned_to,sys_updated_on
  limit: 25
  instance: prod
```

### Example 2: Development to Test Comparison

Compare record counts across environments:

```
# Query dev instance
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true
  fields: sys_id
  limit: 1
  instance: dev

# Query test instance (parallel call)
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true
  fields: sys_id
  limit: 1
  instance: test
```

### Example 3: Multi-Instance Health Check

Verify connectivity to all instances:

```
# Check dev
Tool: SN-Query-Table
Parameters:
  table_name: sys_properties
  query: name=glide.installation.name
  fields: value
  instance: dev

# Check test (parallel)
Tool: SN-Query-Table
Parameters:
  table_name: sys_properties
  query: name=glide.installation.name
  fields: value
  instance: test

# Check prod (parallel)
Tool: SN-Query-Table
Parameters:
  table_name: sys_properties
  query: name=glide.installation.name
  fields: value
  instance: prod
```

### Example 4: Instance-Aware Update Set Operations

Set update set on specific instance:

```
# First, set application scope on dev
Tool: SN-Set-Current-Application
Parameters:
  app_sys_id: abc123def456...
  instance: dev

# Then, set update set on dev
Tool: SN-Set-Update-Set
Parameters:
  update_set_sys_id: xyz789ghi012...
  instance: dev

# Verify update set is active
Tool: SN-Get-Current-Update-Set
Parameters:
  instance: dev
```

## Related Skills

- `admin/update-set-management` - Managing update sets (often done after instance switching)
- `admin/application-scope` - Setting application scope for scoped development
- `admin/deployment-workflow` - Deploying changes across instances
- `admin/batch-operations` - Performing bulk operations on specific instances

## References

- [ServiceNow Multi-Instance Architecture](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/multi-instance/concept/c_MultiInstanceArchitecture.html)
- [ServiceNow Instance Configuration](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/configuring-servicenow/concept/c_ConfiguringServiceNow.html)
- [MCP Multi-Instance Configuration Guide](docs/MULTI_INSTANCE_CONFIGURATION.md)
- [Instance Switching Guide](docs/INSTANCE_SWITCHING_GUIDE.md)
