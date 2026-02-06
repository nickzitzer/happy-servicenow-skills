---
name: impact-analysis
version: 1.0.0
description: Change impact analysis using CMDB relationships, business service mapping, and risk assessment
author: Happy Technologies LLC
tags: [cmdb, impact, change-management, risk, service-mapping, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-List-CmdbCis
    - SN-Get-Record
    - SN-Discover-Table-Schema
    - SN-Create-Record
    - SN-Update-Record
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/cmdb_ci
    - /api/now/table/cmdb_rel_ci
    - /api/now/table/service_ci_assoc
    - /api/now/table/cmdb_ci_service
    - /api/sn_chg_rest/change/ci/{ci_id}/affected
  native:
    - Bash
complexity: advanced
estimated_time: 20-40 minutes
---

# Change Impact Analysis

## Overview

Impact analysis identifies what will be affected by a change to a CI. This skill covers:

- Using CMDB relationships to trace impact paths
- Identifying affected business services
- Mapping CI criticality to business impact
- Quantifying change risk based on CI relationships
- Generating impact reports for CAB review

**When to use:** Before implementing changes, during incident triage, for capacity planning, or when assessing new deployments.

**Value proposition:** Accurate impact analysis prevents unexpected outages, reduces change failures, and enables informed risk decisions.

## Prerequisites

- **Roles:** `itil`, `change_manager`, or `cmdb_read` access
- **Access:** cmdb_ci, cmdb_rel_ci, cmdb_ci_service, service_ci_assoc tables
- **Knowledge:** CMDB relationships, service mapping concepts
- **Related skills:** Complete `cmdb/relationship-mapping` first

## Procedure

### Step 1: Identify the CI Being Changed

First, locate the CI that will be affected by the change:

**By name search:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci
  query: nameLIKEprod-web-01
  fields: sys_id,name,sys_class_name,operational_status,business_criticality
```

**By IP address:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_computer
  query: ip_address=10.0.1.100
  fields: sys_id,name,sys_class_name,operational_status,support_group
```

**Using convenience tool:**
```
Tool: SN-List-CmdbCis
Parameters:
  ci_class: cmdb_ci_server
  query: name=prod-web-01
  fields: sys_id,name,business_criticality,support_group
```

### Step 2: Map Upstream Impact (What Depends on This CI)

Trace what depends on the CI being changed:

**Direct dependencies (1 level):**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: child=[ci_sys_id]^type.parent_descriptorLIKEDepends
  fields: parent,parent.name,parent.sys_class_name,type.parent_descriptor
```

**Get details on dependent CIs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci
  query: sys_idIN[comma_separated_parent_ids]
  fields: sys_id,name,sys_class_name,business_criticality,operational_status
```

**Multi-level dependency chain (recursive):**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Trace full upstream impact
  script: |
    var targetCiId = 'YOUR_CI_SYS_ID';
    var maxDepth = 5;
    var impactedCIs = [];
    var visited = {};

    function traceUpstream(ciId, depth) {
      if (depth > maxDepth || visited[ciId]) return;
      visited[ciId] = true;

      var gr = new GlideRecord('cmdb_rel_ci');
      gr.addQuery('child', ciId);
      gr.addQuery('type.parent_descriptor', 'CONTAINS', 'Depends');
      gr.query();

      while (gr.next()) {
        var parentId = gr.parent.toString();
        var parentCi = new GlideRecord('cmdb_ci');
        if (parentCi.get(parentId)) {
          impactedCIs.push({
            depth: depth,
            sys_id: parentId,
            name: parentCi.name.toString(),
            class: parentCi.sys_class_name.toString(),
            criticality: parentCi.business_criticality.toString()
          });
          traceUpstream(parentId, depth + 1);
        }
      }
    }

    traceUpstream(targetCiId, 1);

    gs.info('=== UPSTREAM IMPACT ANALYSIS ===');
    gs.info('Total CIs impacted: ' + impactedCIs.length);
    impactedCIs.forEach(function(ci) {
      gs.info('Level ' + ci.depth + ': ' + ci.name + ' (' + ci.class + ') - Criticality: ' + ci.criticality);
    });
```

### Step 3: Identify Affected Business Services

Business services are the top of the dependency chain and represent business value:

**Find services directly associated:**
```
Tool: SN-Query-Table
Parameters:
  table_name: service_ci_assoc
  query: ci_id=[ci_sys_id]
  fields: service_id,service_id.name,service_id.operational_status
```

**Find services via relationship chain:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: child=[ci_sys_id]^parent.sys_class_nameLIKEcmdb_ci_service
  fields: parent,parent.name,parent.operational_status,parent.busines_criticality
```

**Comprehensive service impact analysis:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Find all affected business services
  script: |
    var targetCiId = 'YOUR_CI_SYS_ID';
    var affectedServices = [];
    var visited = {};

    function findServices(ciId, path) {
      if (visited[ciId]) return;
      visited[ciId] = true;

      // Check if this CI is a service
      var ci = new GlideRecord('cmdb_ci');
      if (ci.get(ciId)) {
        if (ci.sys_class_name.toString().indexOf('cmdb_ci_service') !== -1) {
          affectedServices.push({
            sys_id: ciId,
            name: ci.name.toString(),
            criticality: ci.business_criticality.toString(),
            path: path.join(' -> ')
          });
          return;
        }
      }

      // Check direct service associations
      var assoc = new GlideRecord('service_ci_assoc');
      assoc.addQuery('ci_id', ciId);
      assoc.query();
      while (assoc.next()) {
        var svc = new GlideRecord('cmdb_ci_service');
        if (svc.get(assoc.service_id)) {
          affectedServices.push({
            sys_id: svc.sys_id.toString(),
            name: svc.name.toString(),
            criticality: svc.business_criticality.toString(),
            path: path.join(' -> ') + ' -> (direct association)'
          });
        }
      }

      // Traverse upstream
      var gr = new GlideRecord('cmdb_rel_ci');
      gr.addQuery('child', ciId);
      gr.query();
      while (gr.next()) {
        var parentId = gr.parent.toString();
        var parentCi = new GlideRecord('cmdb_ci');
        if (parentCi.get(parentId)) {
          findServices(parentId, path.concat([parentCi.name.toString()]));
        }
      }
    }

    var startCi = new GlideRecord('cmdb_ci');
    startCi.get(targetCiId);
    findServices(targetCiId, [startCi.name.toString()]);

    gs.info('=== AFFECTED BUSINESS SERVICES ===');
    gs.info('Total services: ' + affectedServices.length);
    affectedServices.forEach(function(svc) {
      gs.info('Service: ' + svc.name + ' | Criticality: ' + svc.criticality);
      gs.info('  Path: ' + svc.path);
    });
```

### Step 4: Assess Business Criticality

CI criticality determines change risk level:

**Business Criticality Values:**

| Value | Label | Description | Change Risk |
|-------|-------|-------------|-------------|
| 1 | Most Critical | Core business operations | Very High |
| 2 | Critical | Important business functions | High |
| 3 | Important | Supporting functions | Medium |
| 4 | Somewhat Important | Non-essential functions | Low |
| 5 | Non-Critical | Minimal business impact | Very Low |

**Calculate aggregate risk:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Calculate change risk score
  script: |
    var targetCiId = 'YOUR_CI_SYS_ID';
    var impactData = {
      directCriticality: '',
      servicesImpacted: 0,
      criticalServicesImpacted: 0,
      totalDependentCIs: 0,
      riskScore: 0
    };

    // Get target CI criticality
    var targetCi = new GlideRecord('cmdb_ci');
    if (targetCi.get(targetCiId)) {
      impactData.directCriticality = targetCi.business_criticality.toString() || '5';
    }

    // Count dependent CIs and criticality
    var visited = {};
    function countImpact(ciId) {
      if (visited[ciId]) return;
      visited[ciId] = true;

      var gr = new GlideRecord('cmdb_rel_ci');
      gr.addQuery('child', ciId);
      gr.query();

      while (gr.next()) {
        var parentCi = new GlideRecord('cmdb_ci');
        if (parentCi.get(gr.parent)) {
          impactData.totalDependentCIs++;

          if (parentCi.sys_class_name.toString().indexOf('service') !== -1) {
            impactData.servicesImpacted++;
            if (parseInt(parentCi.business_criticality) <= 2) {
              impactData.criticalServicesImpacted++;
            }
          }

          countImpact(gr.parent.toString());
        }
      }
    }

    countImpact(targetCiId);

    // Calculate risk score (1-10)
    var critScore = 6 - parseInt(impactData.directCriticality || 5);
    var svcScore = Math.min(impactData.servicesImpacted * 2, 4);
    var critSvcScore = impactData.criticalServicesImpacted * 2;
    impactData.riskScore = Math.min(critScore + svcScore + critSvcScore, 10);

    gs.info('=== RISK ASSESSMENT ===');
    gs.info('Direct CI Criticality: ' + impactData.directCriticality);
    gs.info('Dependent CIs: ' + impactData.totalDependentCIs);
    gs.info('Services Impacted: ' + impactData.servicesImpacted);
    gs.info('Critical Services: ' + impactData.criticalServicesImpacted);
    gs.info('RISK SCORE: ' + impactData.riskScore + '/10');
    gs.info('Recommendation: ' + (impactData.riskScore >= 7 ? 'CAB REVIEW REQUIRED' : impactData.riskScore >= 4 ? 'Peer Review Recommended' : 'Standard Change Process'));
```

### Step 5: Generate Impact Report

Create a comprehensive impact report for CAB review:

**Get all impact data in structured format:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Generate comprehensive impact report
  script: |
    var targetCiId = 'YOUR_CI_SYS_ID';
    var report = {
      generatedAt: new GlideDateTime().getDisplayValue(),
      targetCI: {},
      upstreamImpact: [],
      downstreamImpact: [],
      affectedServices: [],
      affectedUsers: 0,
      riskLevel: '',
      recommendations: []
    };

    // Target CI details
    var targetCi = new GlideRecord('cmdb_ci');
    if (targetCi.get(targetCiId)) {
      report.targetCI = {
        name: targetCi.name.toString(),
        class: targetCi.sys_class_name.toString(),
        criticality: targetCi.business_criticality.getDisplayValue(),
        environment: targetCi.environment.toString(),
        supportGroup: targetCi.support_group.getDisplayValue(),
        location: targetCi.location.getDisplayValue()
      };
    }

    // Upstream (what depends on this)
    var upGr = new GlideRecord('cmdb_rel_ci');
    upGr.addQuery('child', targetCiId);
    upGr.query();
    while (upGr.next()) {
      var upCi = new GlideRecord('cmdb_ci');
      if (upCi.get(upGr.parent)) {
        report.upstreamImpact.push({
          name: upCi.name.toString(),
          class: upCi.sys_class_name.toString(),
          criticality: upCi.business_criticality.getDisplayValue()
        });
      }
    }

    // Downstream (what this depends on)
    var downGr = new GlideRecord('cmdb_rel_ci');
    downGr.addQuery('parent', targetCiId);
    downGr.query();
    while (downGr.next()) {
      var downCi = new GlideRecord('cmdb_ci');
      if (downCi.get(downGr.child)) {
        report.downstreamImpact.push({
          name: downCi.name.toString(),
          class: downCi.sys_class_name.toString()
        });
      }
    }

    // Services
    var svcAssoc = new GlideRecord('service_ci_assoc');
    svcAssoc.addQuery('ci_id', targetCiId);
    svcAssoc.query();
    while (svcAssoc.next()) {
      var svc = new GlideRecord('cmdb_ci_service');
      if (svc.get(svcAssoc.service_id)) {
        report.affectedServices.push({
          name: svc.name.toString(),
          criticality: svc.business_criticality.getDisplayValue()
        });
      }
    }

    // Estimate affected users (if service has user_base field)
    report.affectedServices.forEach(function(svc) {
      var svcGr = new GlideRecord('cmdb_ci_service');
      svcGr.addQuery('name', svc.name);
      svcGr.query();
      if (svcGr.next() && svcGr.user_base) {
        report.affectedUsers += parseInt(svcGr.user_base) || 0;
      }
    });

    // Risk level
    var criticalCount = report.affectedServices.filter(function(s) {
      return s.criticality === 'Most Critical' || s.criticality === 'Critical';
    }).length;

    if (criticalCount > 0 || report.upstreamImpact.length > 10) {
      report.riskLevel = 'HIGH';
      report.recommendations.push('Schedule during maintenance window');
      report.recommendations.push('Prepare rollback plan');
      report.recommendations.push('Notify affected service owners');
    } else if (report.upstreamImpact.length > 3) {
      report.riskLevel = 'MEDIUM';
      report.recommendations.push('Peer review recommended');
      report.recommendations.push('Test in non-prod first');
    } else {
      report.riskLevel = 'LOW';
      report.recommendations.push('Standard change process');
    }

    gs.info(JSON.stringify(report, null, 2));
```

### Step 6: Link Impact to Change Request

Associate the impact analysis with a change request:

**Add affected CIs to change:**
```
Tool: SN-Create-Record
Parameters:
  table_name: task_ci
  data:
    task: [change_request_sys_id]
    ci_item: [affected_ci_sys_id]
```

**Update change with impact summary:**
```
Tool: SN-Update-Record
Parameters:
  table_name: change_request
  sys_id: [change_sys_id]
  data:
    impact: 2  # 1=High, 2=Medium, 3=Low
    risk: "Medium"
    business_duration: "4 hours"
    justification: "Impact analysis shows 5 dependent services, 2 critical"
```

## Tool Usage Summary

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Find CI | SN-Query-Table, SN-List-CmdbCis | GET /cmdb_ci |
| Query relationships | SN-Query-Table | GET /cmdb_rel_ci |
| Find services | SN-Query-Table | GET /cmdb_ci_service |
| Service associations | SN-Query-Table | GET /service_ci_assoc |
| Complex analysis | SN-Execute-Background-Script | POST /api/sn_chg_rest |
| Link to change | SN-Create-Record | POST /task_ci |

## Best Practices

- **Start Wide, Then Deep:** First identify all first-level dependencies, then trace recursively
- **Consider Both Directions:** Impact flows upstream (dependencies) but also downstream (infrastructure)
- **Include Time Factor:** Same change during business hours vs. maintenance window has different impact
- **Document Assumptions:** Record any assumptions about relationships not in CMDB
- **Verify Before CAB:** Validate critical paths manually before presenting to CAB
- **Update CMDB First:** If relationships are missing, add them before completing impact analysis

## Risk Assessment Matrix

| Criteria | Low (1 pt) | Medium (2 pt) | High (3 pt) |
|----------|-----------|---------------|-------------|
| CI Criticality | Non-critical | Important | Critical/Most Critical |
| Services Affected | 0-1 | 2-5 | 6+ |
| Critical Services | 0 | 1 | 2+ |
| User Impact | <100 | 100-1000 | 1000+ |
| Recovery Time | <1 hour | 1-4 hours | 4+ hours |

**Risk Score Interpretation:**
- 5-7: Low Risk - Standard change process
- 8-11: Medium Risk - Peer review required
- 12-15: High Risk - CAB review required

## Troubleshooting

### Impact Analysis Shows No Dependencies

**Symptom:** CI shows zero upstream impact but is clearly used by services
**Cause:** Missing relationships in CMDB
**Solution:** Review and create missing relationships using `cmdb/relationship-mapping` skill

### Service Not Appearing in Impact

**Symptom:** Known business service doesn't show as impacted
**Cause:** Missing service_ci_assoc record or relationship
**Solution:**
1. Check `service_ci_assoc` for direct association
2. Check `cmdb_rel_ci` for relationship chain
3. Create missing associations

### Risk Score Seems Too Low

**Symptom:** Critical infrastructure shows low risk score
**Cause:** Business criticality not set on CIs
**Solution:** Update `business_criticality` field on CIs before analysis

### Recursive Query Times Out

**Symptom:** Background script times out on complex environments
**Cause:** Too many levels of recursion or poorly optimized query
**Solution:** Reduce `maxDepth` or use indexed queries with limits

## Examples

### Example 1: Database Server Maintenance Impact

```
# 1. Find the database server
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_server
  query: name=prod-db-01
  fields: sys_id,name,business_criticality

# Result: sys_id = abc123, criticality = 2 (Critical)

# 2. Find what runs on this server
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: child=abc123^type.parent_descriptorLIKERuns
  fields: parent.name,parent.sys_class_name

# Result: Oracle DB Instance, MySQL Instance

# 3. Find what depends on these databases
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: child.nameLIKEOracle^ORchild.nameLIKEMySQL
  fields: parent.name,parent.sys_class_name

# Result: ERP Application, HR Portal, Customer Portal

# 4. Find affected services
Tool: SN-Query-Table
Parameters:
  table_name: service_ci_assoc
  query: ci_id.nameLIKEPortal^ORci_id.nameLIKEERP
  fields: service_id.name,service_id.business_criticality

# Result:
#   - Customer Service (Critical)
#   - HR Services (Important)
#   - Finance Operations (Most Critical)

# CONCLUSION: HIGH RISK - 3 services affected, 2 critical
```

### Example 2: Application Deployment Impact

```
# Scenario: Deploying new version of "Portal Frontend" application

# 1. Get application CI
Tool: SN-List-CmdbCis
Parameters:
  ci_class: cmdb_ci_appl
  query: name=Portal Frontend
  fields: sys_id,business_criticality,support_group

# 2. Run full impact analysis script (from Step 5)
# This returns structured JSON with:
# - All dependent CIs
# - Affected services
# - Risk score
# - Recommendations

# 3. Create impact record for change
Tool: SN-Update-Record
Parameters:
  table_name: change_request
  sys_id: CHG0012345_sys_id
  data:
    impact: 2
    risk: "Medium"
    justification: |
      Impact Analysis Results:
      - 1 Business Service Affected: Customer Portal
      - 3 Dependent Components: Load Balancer, CDN, Auth Service
      - Risk Score: 6/10
      - Recommended: Peer review, rollback plan ready
```

## Related Skills

- `cmdb/relationship-mapping` - Creating and validating relationships
- `cmdb/ci-discovery` - CI creation and classification
- `cmdb/data-quality` - Ensuring CMDB accuracy for reliable impact analysis
- `itsm/change-management` - Change request workflows

## References

- [ServiceNow Impact Analysis](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/product/configuration-management/concept/c_ImpactAnalysis.html)
- [CMDB Health Dashboard](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/product/configuration-management/concept/cmdb-health.html)
- [ITIL Change Management](https://www.itil.org)
- [ServiceNow Change Risk Assessment](https://docs.servicenow.com/bundle/utah-it-service-management/page/product/change-management/concept/change-risk-assessment.html)
