---
name: relationship-mapping
version: 1.0.0
description: CI relationship management including creation, validation, dependency analysis, and orphan detection
author: Happy Technologies LLC
tags: [cmdb, relationships, dependencies, configuration-management, itil, impact]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Record
    - SN-List-CmdbCis
    - SN-Discover-Table-Schema
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/cmdb_rel_ci
    - /api/now/table/cmdb_rel_type
    - /api/now/table/cmdb_ci
    - /api/now/cmdb/instance/{ci_id}/relation
  native:
    - Bash
complexity: advanced
estimated_time: 30-45 minutes
---

# CI Relationship Mapping

## Overview

CI relationships form the backbone of CMDB value. Without relationships, CIs are isolated islands of data. This skill covers:

- Understanding relationship types and their semantics
- Creating and validating relationships between CIs
- Analyzing dependency chains for impact assessment
- Detecting orphan CIs that lack relationships
- Maintaining relationship health over time

**When to use:** When modeling service dependencies, preparing for change impact analysis, auditing CMDB completeness, or troubleshooting service outages.

**Value proposition:** Well-mapped relationships enable accurate impact analysis, reducing change failures by up to 50% and decreasing MTTR during incidents.

## Prerequisites

- **Roles:** `cmdb_admin` or `itil` with CMDB write access
- **Access:** cmdb_rel_ci, cmdb_rel_type, cmdb_ci tables
- **Knowledge:** CI class hierarchy, dependency modeling concepts
- **Related skills:** Complete `cmdb/ci-discovery` first

## Procedure

### Step 1: Understand Relationship Types

ServiceNow provides relationship types in `cmdb_rel_type`. Each relationship has:
- **Parent descriptor:** How the parent relates to the child
- **Child descriptor:** How the child relates to the parent

**Common Relationship Types:**

| Relationship | Parent Descriptor | Child Descriptor | Use Case |
|--------------|-------------------|------------------|----------|
| Runs on | Runs on | Hosts | Application on Server |
| Depends on | Depends on | Used by | Service dependencies |
| Contains | Contains | Contained by | Physical containment |
| Connects to | Connects to | Connected by | Network connectivity |
| Sends data to | Sends data to | Receives data from | Data flows |
| Cluster of | Cluster of | Cluster member | Clusters |
| Uses | Uses | Is used by | Generic dependency |

**Query available relationship types:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_type
  query: active=true
  fields: sys_id,name,parent_descriptor,child_descriptor
  limit: 100
```

**REST API:**
```bash
GET /api/now/table/cmdb_rel_type?sysparm_query=active=true&sysparm_fields=sys_id,name,parent_descriptor,child_descriptor&sysparm_limit=100
```

### Step 2: Query Existing Relationships

Before creating relationships, understand what exists:

**Find all relationships for a CI:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent=[ci_sys_id]^ORchild=[ci_sys_id]
  fields: parent,child,type,sys_created_on
  limit: 50
```

**Find downstream dependencies (what depends on this CI):**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: child=[ci_sys_id]^type.parent_descriptorLIKEDepends
  fields: parent,parent.name,type,type.parent_descriptor
```

**Find upstream dependencies (what this CI depends on):**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent=[ci_sys_id]^type.parent_descriptorLIKEDepends
  fields: child,child.name,type,type.child_descriptor
```

### Step 3: Create Relationships

**Determine the correct relationship type first:**

**Decision Matrix:**

| Parent CI Type | Child CI Type | Recommended Relationship |
|----------------|---------------|--------------------------|
| Application | Server | Runs on |
| Business Service | Application | Depends on |
| Server | Rack | Contained by |
| Server | Server | Connects to (if network) |
| Database | Server | Runs on |
| Load Balancer | Server Pool | Contains |

**Find relationship type sys_id:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_type
  query: nameLIKERuns on::Runs on
  fields: sys_id,name,parent_descriptor,child_descriptor
```

**Create the relationship:**
```
Tool: SN-Create-Record
Parameters:
  table_name: cmdb_rel_ci
  data:
    parent: [parent_ci_sys_id]
    child: [child_ci_sys_id]
    type: [relationship_type_sys_id]
```

**Example - Application runs on Server:**
```
Tool: SN-Create-Record
Parameters:
  table_name: cmdb_rel_ci
  data:
    parent: "abc123..."  # Application CI sys_id
    child: "def456..."   # Server CI sys_id
    type: "55c95bf6c0a8010e0118ec7056e1c57d"  # Runs on::Hosts
```

### Step 4: Validate Relationships

**Check for invalid relationships:**

**Find relationships with missing CIs:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Find invalid relationships with missing CIs
  script: |
    var gr = new GlideRecord('cmdb_rel_ci');
    gr.addQuery('parent.sys_idISEMPTY^ORchild.sys_idISEMPTY');
    gr.query();
    gs.info('Invalid relationships found: ' + gr.getRowCount());
    while (gr.next()) {
      gs.info('Invalid rel: ' + gr.sys_id + ' parent=' + gr.parent + ' child=' + gr.child);
    }
```

**Find duplicate relationships:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Detect duplicate relationships
  script: |
    var duplicates = new GlideAggregate('cmdb_rel_ci');
    duplicates.addAggregate('COUNT');
    duplicates.groupBy('parent');
    duplicates.groupBy('child');
    duplicates.groupBy('type');
    duplicates.addHaving('COUNT', '>', 1);
    duplicates.query();
    gs.info('Duplicate relationship combinations found: ' + duplicates.getRowCount());
    while (duplicates.next()) {
      gs.info('Duplicate: parent=' + duplicates.parent + ' child=' + duplicates.child + ' type=' + duplicates.type + ' count=' + duplicates.getAggregate('COUNT'));
    }
```

**Validate relationship type appropriateness:**

Some relationship types are only valid for certain CI classes. Check the relationship type's `parent_ci_class` and `child_ci_class` fields if populated.

### Step 5: Analyze Dependency Chains

Understanding full dependency chains is critical for impact analysis.

**Get complete dependency tree (recursive):**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Build dependency tree for CI
  script: |
    var ciSysId = 'YOUR_CI_SYS_ID';
    var maxDepth = 5;
    var visited = {};
    var tree = [];

    function getDependencies(parentId, depth, direction) {
      if (depth > maxDepth || visited[parentId]) return;
      visited[parentId] = true;

      var gr = new GlideRecord('cmdb_rel_ci');
      if (direction === 'down') {
        gr.addQuery('child', parentId);
        gr.addQuery('type.parent_descriptor', 'CONTAINS', 'Depends');
      } else {
        gr.addQuery('parent', parentId);
        gr.addQuery('type.parent_descriptor', 'CONTAINS', 'Depends');
      }
      gr.query();

      while (gr.next()) {
        var targetId = direction === 'down' ? gr.parent.toString() : gr.child.toString();
        var targetName = direction === 'down' ? gr.parent.name.toString() : gr.child.name.toString();
        tree.push({
          depth: depth,
          direction: direction,
          ci_name: targetName,
          ci_sys_id: targetId
        });
        getDependencies(targetId, depth + 1, direction);
      }
    }

    getDependencies(ciSysId, 1, 'down');
    gs.info('Upstream dependencies (what depends on this CI):');
    tree.forEach(function(item) {
      gs.info('  '.repeat(item.depth) + item.ci_name);
    });
```

**Identify critical path:**

Services with single points of failure have critical paths:
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent.sys_class_name=cmdb_ci_service^type.parent_descriptorLIKEDepends
  fields: parent.name,child.name,child.sys_class_name
```

### Step 6: Detect Orphan CIs

Orphan CIs (those without relationships) reduce CMDB value and complicate impact analysis.

**Find CIs with no relationships:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Find orphan CIs with no relationships
  script: |
    var orphans = [];
    var ciClasses = ['cmdb_ci_server', 'cmdb_ci_appl', 'cmdb_ci_database_instance'];

    ciClasses.forEach(function(ciClass) {
      var gr = new GlideRecord(ciClass);
      gr.addQuery('operational_status', '1');
      gr.query();

      while (gr.next()) {
        var relGr = new GlideRecord('cmdb_rel_ci');
        relGr.addQuery('parent', gr.sys_id);
        relGr.addOrCondition('child', gr.sys_id);
        relGr.setLimit(1);
        relGr.query();

        if (!relGr.hasNext()) {
          orphans.push({
            sys_id: gr.sys_id.toString(),
            name: gr.name.toString(),
            class: ciClass
          });
        }
      }
    });

    gs.info('Orphan CIs found: ' + orphans.length);
    orphans.forEach(function(o) {
      gs.info('  ' + o.class + ': ' + o.name + ' (' + o.sys_id + ')');
    });
```

**MCP Alternative - Query-based approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_server
  query: operational_status=1^sys_idNOT IN(SELECT parent FROM cmdb_rel_ci)^sys_idNOT IN(SELECT child FROM cmdb_rel_ci)
  fields: name,ip_address,sys_class_name
  limit: 50
```

Note: Complex subqueries may not work via REST API. Use background script for reliability.

### Step 7: Maintain Relationship Health

**Periodic cleanup script:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Clean up invalid relationships
  script: |
    var deleted = 0;

    // Delete relationships where parent CI was deleted
    var gr = new GlideRecord('cmdb_rel_ci');
    gr.addNullQuery('parent');
    gr.query();
    while (gr.next()) {
      gr.deleteRecord();
      deleted++;
    }

    // Delete relationships where child CI was deleted
    gr = new GlideRecord('cmdb_rel_ci');
    gr.addNullQuery('child');
    gr.query();
    while (gr.next()) {
      gr.deleteRecord();
      deleted++;
    }

    gs.info('Deleted ' + deleted + ' invalid relationships');
```

**Update stale relationships:**
When a CI's operational status changes, relationships may need updates:
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent.operational_status!=1^ORchild.operational_status!=1
  fields: sys_id,parent.name,child.name,parent.operational_status,child.operational_status
```

## Tool Usage Summary

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| List relationship types | SN-Query-Table | GET /cmdb_rel_type |
| Query relationships | SN-Query-Table | GET /cmdb_rel_ci |
| Create relationship | SN-Create-Record | POST /cmdb_rel_ci |
| Delete relationship | SN-Update-Record (set inactive) | DELETE /cmdb_rel_ci/{id} |
| Complex queries | SN-Execute-Background-Script | POST /api/sn_chg_rest/change |
| CI relationships API | N/A | GET /cmdb/instance/{id}/relation |

## Best Practices

- **Bidirectional Awareness:** Remember relationships have two perspectives (parent/child)
- **Minimum Relationships:** Every operational CI should have at least one relationship
- **Type Consistency:** Use consistent relationship types across similar CI patterns
- **Avoid Circular Dependencies:** A should not depend on B if B depends on A
- **Document Business Context:** Use relationship attributes to explain why the relationship exists
- **Regular Audits:** Run orphan detection monthly; invalid relationship cleanup weekly
- **Discovery Integration:** Align manual relationships with discovery-created relationships

## Troubleshooting

### Relationship Not Showing in Dependency View

**Symptom:** Created relationship doesn't appear in CI dependency views
**Cause:** Relationship type not configured for dependency visualization
**Solution:** Check `cmdb_rel_type` record - ensure `is_used_by` and `is_dependency` flags are set appropriately

### Duplicate Relationships After Discovery

**Symptom:** Same relationship exists multiple times
**Cause:** Manual creation overlapped with discovery
**Solution:** Run duplicate detection script; delete duplicates keeping discovery-created records

### Circular Dependency Detected

**Symptom:** Impact analysis shows infinite loop warning
**Cause:** CI A depends on B, B depends on C, C depends on A
**Solution:** Review and break the circular chain; often indicates incorrect relationship type usage

### Relationship Type Not Found

**Symptom:** Cannot find appropriate relationship type for use case
**Cause:** OOB types may not cover all scenarios
**Solution:** Create custom relationship type via `cmdb_rel_type` table (requires cmdb_admin)

## Examples

### Example 1: Map a Three-Tier Application

```
# 1. Identify the CIs
Business Service: "Customer Portal"
Web Application: "Portal Frontend"
App Server: "prod-app-01"
Database: "Portal DB"
DB Server: "prod-db-01"

# 2. Find relationship type sys_ids
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_type
  query: nameLIKEDepends on^ORnameLIKERuns on
  fields: sys_id,name,parent_descriptor

# 3. Create relationships (batch in one message)
# Service depends on Web App
SN-Create-Record: cmdb_rel_ci
  parent: [service_sys_id], child: [webapp_sys_id], type: [depends_on_type]

# Web App runs on App Server
SN-Create-Record: cmdb_rel_ci
  parent: [webapp_sys_id], child: [appserver_sys_id], type: [runs_on_type]

# Web App depends on Database
SN-Create-Record: cmdb_rel_ci
  parent: [webapp_sys_id], child: [database_sys_id], type: [depends_on_type]

# Database runs on DB Server
SN-Create-Record: cmdb_rel_ci
  parent: [database_sys_id], child: [dbserver_sys_id], type: [runs_on_type]
```

### Example 2: Orphan Detection and Remediation

```
# 1. Find orphan servers
Tool: SN-Execute-Background-Script
Parameters:
  script: [orphan detection script from Step 6]

# 2. For each orphan, determine what it hosts
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_appl
  query: install_dateLIKE[orphan_ip_address]
  fields: name,sys_id

# 3. Create missing relationships
Tool: SN-Create-Record
Parameters:
  table_name: cmdb_rel_ci
  data:
    parent: [app_sys_id]
    child: [orphan_server_sys_id]
    type: [runs_on_type_sys_id]
```

## Related Skills

- `cmdb/ci-discovery` - CI creation and classification
- `cmdb/impact-analysis` - Using relationships for impact analysis
- `cmdb/data-quality` - CMDB data quality management
- `itsm/change-management` - Changes and CI relationships

## References

- [ServiceNow CMDB Relationships](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/product/configuration-management/concept/c_CMDBRelationships.html)
- [CMDB Relationship Types](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/product/configuration-management/reference/r_CMDBRelationshipTypes.html)
- [ITIL Configuration Management](https://www.itil.org)
- [ServiceNow CMDB Best Practices](https://developer.servicenow.com)
