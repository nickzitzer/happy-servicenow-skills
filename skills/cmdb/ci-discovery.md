---
name: ci-discovery
version: 1.0.0
description: Configuration Item discovery, classification, and CMDB population strategies
author: Happy Technologies LLC
tags: [cmdb, ci, discovery, configuration-management, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-List-CmdbCis
    - SN-Get-Table-Schema
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/cmdb_ci
    - /api/now/table/cmdb_ci_computer
    - /api/now/table/cmdb_ci_service
    - /api/now/cmdb/instance
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Configuration Item Discovery

## Overview

Configuration Items (CIs) are the foundation of the CMDB. This skill covers:

- Understanding the CI class hierarchy
- Discovering and classifying CIs
- Creating CIs manually when automated discovery isn't available
- Maintaining CI data quality
- Establishing CI relationships

**When to use:** When populating or maintaining the CMDB, onboarding new infrastructure, or validating CI data.

## Prerequisites

- **Roles:** `cmdb_admin` or `itil` with CMDB write access
- **Access:** CMDB tables (cmdb_ci and subclasses)
- **Knowledge:** CMDB class structure, CI attributes

## Procedure

### Step 1: Understand the CI Class Hierarchy

The CMDB uses inheritance. All CIs extend from `cmdb_ci`:

```
cmdb_ci (Base CI)
├── cmdb_ci_computer
│   ├── cmdb_ci_server
│   │   ├── cmdb_ci_win_server
│   │   ├── cmdb_ci_linux_server
│   │   └── cmdb_ci_unix_server
│   └── cmdb_ci_pc_hardware
│       ├── cmdb_ci_computer_win
│       └── cmdb_ci_computer_mac
├── cmdb_ci_service
│   ├── cmdb_ci_service_auto
│   └── cmdb_ci_service_manual
├── cmdb_ci_appl
│   ├── cmdb_ci_app_server
│   └── cmdb_ci_database_instance
├── cmdb_ci_network_gear
│   ├── cmdb_ci_netgear
│   └── cmdb_ci_ip_router
└── cmdb_ci_storage_device
```

**Discover available CI classes:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_db_object
  query: nameLIKEcmdb_ci^super_class.name=cmdb_ci
  fields: name,label,super_class
  limit: 50
```

### Step 2: Query Existing CIs

Before adding new CIs, check what exists:

**Using MCP:**
```
Tool: SN-List-CmdbCis
Parameters:
  ci_class: cmdb_ci_server
  query: operational_status=1
  fields: name,ip_address,os,sys_class_name
  limit: 100
```

**Search by name:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci
  query: nameLIKEweb-server
  fields: sys_id,name,sys_class_name,operational_status
```

### Step 3: Create New CIs

**Manual CI Creation (when discovery isn't available):**

```
Tool: SN-Create-Record
Parameters:
  table_name: cmdb_ci_linux_server
  data:
    name: "prod-web-01"
    ip_address: "10.0.1.100"
    dns_domain: "corp.company.com"
    fqdn: "prod-web-01.corp.company.com"
    os: "Red Hat Enterprise Linux"
    os_version: "8.5"
    cpu_count: 8
    ram: 32768
    disk_space: 500
    serial_number: "SN12345678"
    asset_tag: "ASSET-001"
    operational_status: 1
    install_status: 1
    environment: Production
    location: [location_sys_id]
    department: [department_sys_id]
    support_group: [group_sys_id]
    managed_by: [user_sys_id]
    comments: "Production web server - Node 1"
```

**CI Attribute Reference:**

| Attribute | Description | Example |
|-----------|-------------|---------|
| name | CI display name | prod-web-01 |
| ip_address | Primary IP | 10.0.1.100 |
| fqdn | Fully qualified domain name | prod-web-01.corp.com |
| operational_status | 1=Operational, 2=Non-Op | 1 |
| install_status | 1=Installed, 7=Retired | 1 |
| environment | Production/Test/Dev | Production |
| support_group | Supporting team | Linux Admins |

### Step 4: Classify CIs Properly

Choose the most specific class that fits:

**Decision Tree:**
```
Is it hardware?
├── Yes → Is it a computer?
│   ├── Yes → Server or Workstation?
│   │   ├── Server → What OS? → cmdb_ci_win_server / cmdb_ci_linux_server
│   │   └── Workstation → cmdb_ci_pc_hardware
│   └── No → Network gear? Storage? → cmdb_ci_netgear / cmdb_ci_storage
└── No → Is it software?
    ├── Application → cmdb_ci_appl
    ├── Database → cmdb_ci_database_instance
    └── Service → cmdb_ci_service
```

**Get class schema to understand attributes:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: cmdb_ci_linux_server
```

### Step 5: Establish CI Relationships

CIs don't exist in isolation. Define relationships:

**Relationship Types:**
| Type | Description | Example |
|------|-------------|---------|
| Runs on | Software on hardware | App runs on Server |
| Depends on | Service dependency | Web depends on DB |
| Contains | Physical containment | Rack contains Server |
| Owned by | Ownership | Server owned by Team |

**Create Relationship:**
```
Tool: SN-Create-Record
Parameters:
  table_name: cmdb_rel_ci
  data:
    parent: [parent_ci_sys_id]
    child: [child_ci_sys_id]
    type: [relationship_type_sys_id]
```

**Find relationship types:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_type
  fields: sys_id,name,parent_descriptor,child_descriptor
  limit: 50
```

### Step 6: Validate CI Data

Ensure data quality with validation queries:

**Find CIs missing required data:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_server
  query: ip_addressISEMPTY^operational_status=1
  fields: name,sys_class_name,support_group
```

**Find duplicate CIs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci
  query: nameLIKEserver-name
  fields: sys_id,name,ip_address,sys_created_on
```

**Check orphan CIs (no relationships):**
```
# Query CIs not in any relationship
# This requires a more complex query or script
```

### Step 7: Maintain CI Lifecycle

Update CI status as things change:

**Operational Status Values:**
| Value | Status | When to Use |
|-------|--------|-------------|
| 1 | Operational | CI is functioning normally |
| 2 | Non-Operational | CI is down/broken |
| 3 | Repair in Progress | Being fixed |
| 4 | DR Standby | Disaster recovery standby |
| 6 | Retired | No longer in use |

**Update CI Status:**
```
Tool: SN-Update-Record
Parameters:
  table_name: cmdb_ci_server
  sys_id: [ci_sys_id]
  data:
    operational_status: 6
    install_status: 7
    decommissioned: true
    comments: "Decommissioned per CHG0012345 on 2026-02-06"
```

## CI Data Quality Checklist

- [ ] Name follows naming convention
- [ ] IP address is accurate and unique
- [ ] Serial number recorded (for hardware)
- [ ] Support group assigned
- [ ] Location specified
- [ ] Environment set (Prod/Test/Dev)
- [ ] Relationships defined
- [ ] Operational status current
- [ ] Discovery source documented

## Tool Usage Summary

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query CIs | SN-Query-Table, SN-List-CmdbCis | GET /cmdb_ci |
| Create CI | SN-Create-Record | POST /cmdb_ci_* |
| Update CI | SN-Update-Record | PATCH /cmdb_ci/{id} |
| Get Schema | SN-Discover-Table-Schema | GET /sys_dictionary |
| Relationships | SN-Create-Record | POST /cmdb_rel_ci |

## Best Practices

- **Use Most Specific Class:** cmdb_ci_linux_server, not cmdb_ci_server
- **Standardize Naming:** Follow consistent naming conventions
- **Link to Assets:** Connect CIs to asset records when applicable
- **Document Sources:** Note whether CI was discovered or manually created
- **Regular Audits:** Periodically validate CI data accuracy
- **Relationship Completeness:** CIs should have at least one relationship

## Troubleshooting

### CI Not Appearing in Reports

**Cause:** Wrong class or missing attributes
**Solution:** Check sys_class_name and ensure required fields are populated

### Duplicate CIs

**Cause:** Multiple discovery sources or manual duplicates
**Solution:** Use identification rules; merge or retire duplicates

### Relationships Not Showing

**Cause:** Relationship type not valid for CI classes
**Solution:** Verify relationship type supports the parent/child classes

## Related Skills

- `cmdb/relationship-mapping` - Deep dive into relationships
- `cmdb/impact-analysis` - Using CMDB for impact analysis
- `admin/discovery-patterns` - Automated discovery setup
- `itsm/change-management` - CI changes during changes

## References

- [ServiceNow CMDB](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/product/configuration-management/concept/c_CMDB.html)
- [ITIL Configuration Management](https://www.itil.org)
- [CMDB Best Practices](https://developer.servicenow.com)
