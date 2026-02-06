---
name: data-quality
version: 1.0.0
description: CMDB data quality management including KPIs, duplicate detection, stale records, and reconciliation
author: Happy Technologies LLC
tags: [cmdb, data-quality, governance, reconciliation, compliance, itil]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Update-Record
    - SN-Create-Record
    - SN-List-CmdbCis
    - SN-Discover-Table-Schema
    - SN-Execute-Background-Script
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/cmdb_ci
    - /api/now/table/cmdb_rel_ci
    - /api/now/table/cmdb_ci_service
    - /api/now/stats/cmdb_ci
  native:
    - Bash
complexity: advanced
estimated_time: 45-60 minutes
---

# CMDB Data Quality Management

## Overview

A CMDB is only as valuable as its data quality. Poor data leads to failed changes, incorrect impact analysis, and loss of trust. This skill covers:

- Measuring data quality KPIs (completeness, accuracy, consistency)
- Detecting and resolving duplicate CIs
- Identifying and managing stale/orphan records
- Implementing reconciliation processes
- Establishing ongoing data governance

**When to use:** During CMDB health assessments, before major changes, as part of regular maintenance, or when CMDB trust is low.

**Value proposition:** High-quality CMDB data can reduce change failure rates by 50%, decrease incident resolution time by 30%, and improve audit compliance.

## Prerequisites

- **Roles:** `cmdb_admin` for full access, `itil` for read-only assessment
- **Access:** cmdb_ci, cmdb_rel_ci, sys_audit tables
- **Knowledge:** CMDB structure, identification rules
- **Related skills:** `cmdb/ci-discovery`, `cmdb/relationship-mapping`

## Data Quality Dimensions

| Dimension | Definition | Target | Measurement |
|-----------|------------|--------|-------------|
| **Completeness** | Required fields populated | >95% | % records with all mandatory fields |
| **Accuracy** | Data matches reality | >90% | % verified against authoritative source |
| **Consistency** | No conflicting data | >98% | % records without conflicts |
| **Timeliness** | Data is current | <30 days | % updated within threshold |
| **Uniqueness** | No duplicates | >99% | % unique records |
| **Validity** | Values within allowed ranges | >99% | % passing validation rules |

## Procedure

### Step 1: Assess Completeness

Completeness measures whether required fields are populated.

**Define mandatory fields by CI class:**

| CI Class | Mandatory Fields |
|----------|------------------|
| cmdb_ci_server | name, ip_address, os, operational_status, support_group |
| cmdb_ci_appl | name, version, operational_status, support_group, install_status |
| cmdb_ci_service | name, operational_status, business_criticality, owned_by |
| cmdb_ci_database | name, type, version, operational_status |

**Check completeness for servers:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_server
  query: operational_status=1^nameISEMPTY^ORip_addressISEMPTY^ORsupport_groupISEMPTY
  fields: sys_id,name,ip_address,support_group
  limit: 100
```

**Comprehensive completeness audit:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: CMDB Completeness Audit
  script: |
    var mandatoryFields = {
      'cmdb_ci_server': ['name', 'ip_address', 'os', 'operational_status', 'support_group'],
      'cmdb_ci_appl': ['name', 'version', 'operational_status', 'support_group'],
      'cmdb_ci_service': ['name', 'operational_status', 'business_criticality', 'owned_by'],
      'cmdb_ci_database_instance': ['name', 'type', 'version', 'operational_status']
    };

    var results = {};

    for (var ciClass in mandatoryFields) {
      var fields = mandatoryFields[ciClass];
      var total = 0;
      var complete = 0;
      var incomplete = [];

      var gr = new GlideRecord(ciClass);
      gr.addQuery('operational_status', '1'); // Only operational CIs
      gr.query();

      while (gr.next()) {
        total++;
        var isComplete = true;
        var missingFields = [];

        for (var i = 0; i < fields.length; i++) {
          if (gr.getValue(fields[i]) === null || gr.getValue(fields[i]) === '') {
            isComplete = false;
            missingFields.push(fields[i]);
          }
        }

        if (isComplete) {
          complete++;
        } else {
          incomplete.push({
            sys_id: gr.sys_id.toString(),
            name: gr.name.toString(),
            missing: missingFields
          });
        }
      }

      results[ciClass] = {
        total: total,
        complete: complete,
        completeness: total > 0 ? Math.round((complete / total) * 100) : 100,
        incomplete: incomplete.slice(0, 10) // First 10 examples
      };
    }

    gs.info('=== COMPLETENESS AUDIT RESULTS ===');
    for (var cls in results) {
      var r = results[cls];
      gs.info(cls + ': ' + r.completeness + '% complete (' + r.complete + '/' + r.total + ')');
      if (r.incomplete.length > 0) {
        gs.info('  Examples of incomplete records:');
        r.incomplete.forEach(function(inc) {
          gs.info('    ' + inc.name + ' - Missing: ' + inc.missing.join(', '));
        });
      }
    }
```

### Step 2: Detect Duplicates

Duplicates undermine CMDB trust and cause confusion.

**Find potential duplicates by name:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Find duplicate CIs by name
  script: |
    var duplicates = new GlideAggregate('cmdb_ci');
    duplicates.addQuery('operational_status', '1');
    duplicates.addAggregate('COUNT');
    duplicates.groupBy('name');
    duplicates.addHaving('COUNT', '>', 1);
    duplicates.orderByAggregate('COUNT', 'DESC');
    duplicates.query();

    gs.info('=== DUPLICATE CI NAMES ===');
    var count = 0;
    while (duplicates.next() && count < 20) {
      var name = duplicates.name.toString();
      var dupCount = duplicates.getAggregate('COUNT');
      gs.info('Name: "' + name + '" - Count: ' + dupCount);

      // Show details
      var details = new GlideRecord('cmdb_ci');
      details.addQuery('name', name);
      details.addQuery('operational_status', '1');
      details.query();
      while (details.next()) {
        gs.info('  sys_id=' + details.sys_id + ', class=' + details.sys_class_name + ', ip=' + details.ip_address + ', created=' + details.sys_created_on);
      }
      count++;
    }
    gs.info('Total duplicate name groups: ' + duplicates.getRowCount());
```

**Find duplicates by IP address:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Find duplicate CIs by IP address
  script: |
    var duplicates = new GlideAggregate('cmdb_ci_computer');
    duplicates.addQuery('operational_status', '1');
    duplicates.addNotNullQuery('ip_address');
    duplicates.addAggregate('COUNT');
    duplicates.groupBy('ip_address');
    duplicates.addHaving('COUNT', '>', 1);
    duplicates.query();

    gs.info('=== DUPLICATE IP ADDRESSES ===');
    while (duplicates.next()) {
      var ip = duplicates.ip_address.toString();
      var count = duplicates.getAggregate('COUNT');
      gs.info('IP: ' + ip + ' - Count: ' + count);

      var details = new GlideRecord('cmdb_ci_computer');
      details.addQuery('ip_address', ip);
      details.addQuery('operational_status', '1');
      details.query();
      while (details.next()) {
        gs.info('  ' + details.name + ' (' + details.sys_class_name + ')');
      }
    }
```

**Find duplicates by serial number:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_hardware
  query: serial_numberISNOTEMPTY^operational_status=1
  fields: serial_number,name,sys_class_name,sys_id
```

Then analyze for duplicates:
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Find duplicate serial numbers
  script: |
    var duplicates = new GlideAggregate('cmdb_ci_hardware');
    duplicates.addQuery('operational_status', '1');
    duplicates.addNotNullQuery('serial_number');
    duplicates.addAggregate('COUNT');
    duplicates.groupBy('serial_number');
    duplicates.addHaving('COUNT', '>', 1);
    duplicates.query();

    gs.info('=== DUPLICATE SERIAL NUMBERS ===');
    gs.info('Found: ' + duplicates.getRowCount() + ' duplicate serial numbers');
    while (duplicates.next()) {
      gs.info('Serial: ' + duplicates.serial_number + ' Count: ' + duplicates.getAggregate('COUNT'));
    }
```

### Step 3: Identify Stale Records

Stale records haven't been updated within acceptable timeframes.

**Define staleness thresholds:**

| CI Type | Staleness Threshold | Rationale |
|---------|---------------------|-----------|
| Servers | 30 days | Should be scanned regularly |
| Applications | 60 days | Less dynamic than infrastructure |
| Services | 90 days | Business services change slowly |
| Network | 14 days | Network scans are frequent |

**Find stale server records:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_server
  query: operational_status=1^sys_updated_on<javascript:gs.daysAgo(30)
  fields: name,ip_address,sys_updated_on,discovery_source
  limit: 100
```

**Comprehensive staleness audit:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: CMDB Staleness Audit
  script: |
    var thresholds = {
      'cmdb_ci_server': 30,
      'cmdb_ci_computer': 30,
      'cmdb_ci_appl': 60,
      'cmdb_ci_service': 90,
      'cmdb_ci_network_gear': 14,
      'cmdb_ci_database_instance': 30
    };

    var results = {};
    var cutoffDate = new GlideDateTime();

    for (var ciClass in thresholds) {
      var days = thresholds[ciClass];
      cutoffDate.setValue(new GlideDateTime());
      cutoffDate.addDays(-days);

      var gr = new GlideRecord(ciClass);
      gr.addQuery('operational_status', '1');
      gr.query();
      var total = gr.getRowCount();

      var stale = new GlideRecord(ciClass);
      stale.addQuery('operational_status', '1');
      stale.addQuery('sys_updated_on', '<', cutoffDate);
      stale.query();
      var staleCount = stale.getRowCount();

      results[ciClass] = {
        total: total,
        stale: staleCount,
        threshold: days,
        freshness: total > 0 ? Math.round(((total - staleCount) / total) * 100) : 100
      };

      // Sample stale records
      var samples = [];
      stale.setLimit(5);
      stale.query();
      while (stale.next()) {
        samples.push({
          name: stale.name.toString(),
          last_updated: stale.sys_updated_on.getDisplayValue()
        });
      }
      results[ciClass].samples = samples;
    }

    gs.info('=== STALENESS AUDIT RESULTS ===');
    for (var cls in results) {
      var r = results[cls];
      gs.info(cls + ': ' + r.freshness + '% fresh (' + r.stale + ' stale of ' + r.total + ', threshold: ' + r.threshold + ' days)');
      if (r.samples.length > 0) {
        r.samples.forEach(function(s) {
          gs.info('  Stale: ' + s.name + ' (last updated: ' + s.last_updated + ')');
        });
      }
    }
```

### Step 4: Check Relationship Health

Relationships are a key quality dimension.

**Find orphan CIs (no relationships):**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Find CIs with no relationships
  script: |
    var ciClasses = ['cmdb_ci_server', 'cmdb_ci_appl', 'cmdb_ci_database_instance'];
    var orphans = {};

    ciClasses.forEach(function(ciClass) {
      orphans[ciClass] = [];

      var gr = new GlideRecord(ciClass);
      gr.addQuery('operational_status', '1');
      gr.query();

      while (gr.next()) {
        var hasRel = new GlideRecord('cmdb_rel_ci');
        hasRel.addQuery('parent', gr.sys_id);
        hasRel.addOrCondition('child', gr.sys_id);
        hasRel.setLimit(1);
        hasRel.query();

        if (!hasRel.hasNext()) {
          orphans[ciClass].push({
            sys_id: gr.sys_id.toString(),
            name: gr.name.toString()
          });
        }
      }
    });

    gs.info('=== ORPHAN CI REPORT ===');
    for (var cls in orphans) {
      gs.info(cls + ': ' + orphans[cls].length + ' orphans');
      orphans[cls].slice(0, 5).forEach(function(o) {
        gs.info('  ' + o.name + ' (' + o.sys_id + ')');
      });
    }
```

**Find invalid relationships:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent.operational_status!=1^ORchild.operational_status!=1
  fields: parent.name,child.name,parent.operational_status,child.operational_status
  limit: 50
```

### Step 5: Validate Data Accuracy

Compare CMDB data against authoritative sources.

**Validate against discovery data:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Compare CMDB to discovery data
  script: |
    // Find CIs where CMDB data differs from discovery
    var mismatches = [];

    var gr = new GlideRecord('cmdb_ci_server');
    gr.addQuery('operational_status', '1');
    gr.addNotNullQuery('discovery_source');
    gr.query();

    while (gr.next()) {
      var issues = [];

      // Check if last discovery was recent
      if (gr.last_discovered) {
        var lastDisc = new GlideDateTime(gr.last_discovered);
        var now = new GlideDateTime();
        var daysSince = gs.dateDiff(lastDisc, now, true) / (24 * 60 * 60 * 1000);

        if (daysSince > 30) {
          issues.push('Not discovered in ' + Math.round(daysSince) + ' days');
        }
      }

      // Check for empty critical fields that discovery should populate
      if (!gr.os || gr.os.toString() === '') {
        issues.push('OS not set');
      }
      if (!gr.cpu_count || gr.cpu_count.toString() === '0') {
        issues.push('CPU count not set');
      }
      if (!gr.ram || gr.ram.toString() === '0') {
        issues.push('RAM not set');
      }

      if (issues.length > 0) {
        mismatches.push({
          name: gr.name.toString(),
          sys_id: gr.sys_id.toString(),
          issues: issues
        });
      }
    }

    gs.info('=== ACCURACY VALIDATION ===');
    gs.info('CIs with potential accuracy issues: ' + mismatches.length);
    mismatches.slice(0, 20).forEach(function(m) {
      gs.info('  ' + m.name + ': ' + m.issues.join(', '));
    });
```

### Step 6: Generate Data Quality Dashboard

Create a comprehensive quality score:

```
Tool: SN-Execute-Background-Script
Parameters:
  description: Generate CMDB Data Quality Score
  script: |
    var dashboard = {
      generatedAt: new GlideDateTime().getDisplayValue(),
      totalCIs: 0,
      operationalCIs: 0,
      scores: {
        completeness: 0,
        uniqueness: 0,
        freshness: 0,
        relationships: 0
      },
      overallScore: 0,
      grade: '',
      topIssues: []
    };

    // Count total CIs
    var totalGr = new GlideAggregate('cmdb_ci');
    totalGr.addAggregate('COUNT');
    totalGr.query();
    if (totalGr.next()) {
      dashboard.totalCIs = parseInt(totalGr.getAggregate('COUNT'));
    }

    // Count operational CIs
    var opGr = new GlideAggregate('cmdb_ci');
    opGr.addQuery('operational_status', '1');
    opGr.addAggregate('COUNT');
    opGr.query();
    if (opGr.next()) {
      dashboard.operationalCIs = parseInt(opGr.getAggregate('COUNT'));
    }

    // Completeness Score (check name and class are set)
    var completeGr = new GlideAggregate('cmdb_ci');
    completeGr.addQuery('operational_status', '1');
    completeGr.addNotNullQuery('name');
    completeGr.addNotNullQuery('sys_class_name');
    completeGr.addAggregate('COUNT');
    completeGr.query();
    if (completeGr.next()) {
      var complete = parseInt(completeGr.getAggregate('COUNT'));
      dashboard.scores.completeness = Math.round((complete / dashboard.operationalCIs) * 100);
    }

    // Uniqueness Score (inverse of duplicate rate)
    var dupGr = new GlideAggregate('cmdb_ci');
    dupGr.addQuery('operational_status', '1');
    dupGr.addAggregate('COUNT');
    dupGr.groupBy('name');
    dupGr.addHaving('COUNT', '>', 1);
    dupGr.query();
    var dupGroups = dupGr.getRowCount();
    dashboard.scores.uniqueness = Math.max(0, 100 - Math.round((dupGroups / dashboard.operationalCIs) * 100 * 10));

    // Freshness Score (updated in last 30 days)
    var cutoff = new GlideDateTime();
    cutoff.addDays(-30);
    var freshGr = new GlideAggregate('cmdb_ci');
    freshGr.addQuery('operational_status', '1');
    freshGr.addQuery('sys_updated_on', '>', cutoff);
    freshGr.addAggregate('COUNT');
    freshGr.query();
    if (freshGr.next()) {
      var fresh = parseInt(freshGr.getAggregate('COUNT'));
      dashboard.scores.freshness = Math.round((fresh / dashboard.operationalCIs) * 100);
    }

    // Relationship Score (CIs with at least one relationship)
    var withRelGr = new GlideAggregate('cmdb_rel_ci');
    withRelGr.addAggregate('COUNT', 'DISTINCT', 'parent');
    withRelGr.query();
    var withRel = 0;
    if (withRelGr.next()) {
      withRel = parseInt(withRelGr.getAggregate('COUNT', 'DISTINCT', 'parent'));
    }
    dashboard.scores.relationships = Math.min(100, Math.round((withRel / dashboard.operationalCIs) * 100));

    // Overall Score (weighted average)
    dashboard.overallScore = Math.round(
      (dashboard.scores.completeness * 0.3) +
      (dashboard.scores.uniqueness * 0.25) +
      (dashboard.scores.freshness * 0.25) +
      (dashboard.scores.relationships * 0.2)
    );

    // Grade
    if (dashboard.overallScore >= 90) dashboard.grade = 'A';
    else if (dashboard.overallScore >= 80) dashboard.grade = 'B';
    else if (dashboard.overallScore >= 70) dashboard.grade = 'C';
    else if (dashboard.overallScore >= 60) dashboard.grade = 'D';
    else dashboard.grade = 'F';

    // Top Issues
    if (dashboard.scores.completeness < 90) {
      dashboard.topIssues.push('Completeness below 90%: Review mandatory field requirements');
    }
    if (dashboard.scores.uniqueness < 95) {
      dashboard.topIssues.push('Duplicate CIs detected: Run deduplication process');
    }
    if (dashboard.scores.freshness < 80) {
      dashboard.topIssues.push('Stale data: ' + (100 - dashboard.scores.freshness) + '% of CIs not updated in 30 days');
    }
    if (dashboard.scores.relationships < 70) {
      dashboard.topIssues.push('Orphan CIs: Many CIs lack relationships');
    }

    gs.info('=== CMDB DATA QUALITY DASHBOARD ===');
    gs.info('Generated: ' + dashboard.generatedAt);
    gs.info('');
    gs.info('CI Population:');
    gs.info('  Total CIs: ' + dashboard.totalCIs);
    gs.info('  Operational CIs: ' + dashboard.operationalCIs);
    gs.info('');
    gs.info('Quality Scores:');
    gs.info('  Completeness: ' + dashboard.scores.completeness + '%');
    gs.info('  Uniqueness: ' + dashboard.scores.uniqueness + '%');
    gs.info('  Freshness: ' + dashboard.scores.freshness + '%');
    gs.info('  Relationships: ' + dashboard.scores.relationships + '%');
    gs.info('');
    gs.info('OVERALL SCORE: ' + dashboard.overallScore + '% (Grade: ' + dashboard.grade + ')');
    gs.info('');
    if (dashboard.topIssues.length > 0) {
      gs.info('Top Issues to Address:');
      dashboard.topIssues.forEach(function(issue) {
        gs.info('  - ' + issue);
      });
    }
```

### Step 7: Remediate Issues

**Fix incomplete records:**
```
Tool: SN-Update-Record
Parameters:
  table_name: cmdb_ci_server
  sys_id: [ci_sys_id]
  data:
    support_group: [group_sys_id]
    os: "Red Hat Enterprise Linux 8"
    operational_status: 1
```

**Merge duplicate records:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Merge duplicate CIs (keep newer, retire older)
  script: |
    var keepSysId = 'NEWER_CI_SYS_ID';
    var retireSysId = 'OLDER_CI_SYS_ID';

    // Move relationships from retired CI to kept CI
    var rels = new GlideRecord('cmdb_rel_ci');
    rels.addQuery('parent', retireSysId);
    rels.query();
    while (rels.next()) {
      rels.parent = keepSysId;
      rels.update();
    }

    rels = new GlideRecord('cmdb_rel_ci');
    rels.addQuery('child', retireSysId);
    rels.query();
    while (rels.next()) {
      rels.child = keepSysId;
      rels.update();
    }

    // Retire the duplicate
    var retireCi = new GlideRecord('cmdb_ci');
    if (retireCi.get(retireSysId)) {
      retireCi.operational_status = 6; // Retired
      retireCi.install_status = 7; // Retired
      retireCi.comments = 'Merged into ' + keepSysId + ' on ' + new GlideDateTime().getDisplayValue();
      retireCi.update();
      gs.info('Retired duplicate CI: ' + retireCi.name);
    }
```

**Retire stale records:**
```
Tool: SN-Update-Record
Parameters:
  table_name: cmdb_ci_server
  sys_id: [stale_ci_sys_id]
  data:
    operational_status: 6
    install_status: 7
    comments: "Retired due to staleness - not discovered in 90+ days"
```

## Tool Usage Summary

| Operation | MCP Tool | REST Endpoint |
|-----------|----------|---------------|
| Query CIs | SN-Query-Table, SN-List-CmdbCis | GET /cmdb_ci |
| Update CI | SN-Update-Record | PATCH /cmdb_ci/{id} |
| Get schema | SN-Get-Table-Schema | GET /sys_dictionary |
| Complex analysis | SN-Execute-Background-Script | N/A |
| Aggregate queries | SN-Execute-Background-Script | GET /stats/cmdb_ci |

## Best Practices

- **Automate Audits:** Schedule weekly quality reports via scheduled jobs
- **Define KPIs First:** Establish quality targets before measuring
- **Prioritize Critical CIs:** Focus on production, critical infrastructure first
- **Root Cause Analysis:** Fix the source of bad data, not just symptoms
- **Governance Process:** Establish data stewards for CI classes
- **Discovery Alignment:** Ensure discovery patterns support quality goals
- **Continuous Improvement:** Track quality trends over time

## Quality Improvement Roadmap

| Phase | Focus | Target | Timeline |
|-------|-------|--------|----------|
| 1 | Completeness | 95% | Week 1-2 |
| 2 | Duplicates | <1% | Week 3-4 |
| 3 | Staleness | <5% | Week 5-6 |
| 4 | Relationships | >80% | Week 7-8 |
| 5 | Ongoing | Maintain | Continuous |

## Troubleshooting

### Quality Score Drops Suddenly

**Symptom:** Dashboard shows significant quality decrease
**Cause:** Discovery import, bulk data load, or schema change
**Solution:** Check recent bulk operations in sys_import_log; review discovery patterns

### Cannot Find Duplicates

**Symptom:** Manual review finds duplicates not detected by scripts
**Cause:** Minor variations in naming (spaces, case, typos)
**Solution:** Use fuzzy matching or Levenshtein distance comparison

### Stale Records Keep Reappearing

**Symptom:** Same CIs repeatedly flagged as stale after remediation
**Cause:** Discovery not running or CI not in discovery scope
**Solution:** Verify discovery schedule and patterns include the CI

### Relationship Score Low Despite Mapping

**Symptom:** Relationships exist but score remains low
**Cause:** Counting only parent relationships, not child
**Solution:** Ensure query counts CIs appearing as either parent OR child

## Examples

### Example 1: Weekly Quality Report

```
# Run weekly via scheduled job
Tool: SN-Execute-Background-Script
Parameters:
  description: Weekly CMDB Quality Report
  script: |
    // [Include dashboard script from Step 6]

    // Email results
    var email = new GlideEmailOutbound();
    email.setSubject('Weekly CMDB Quality Report - Score: ' + dashboard.overallScore + '%');
    email.setBody(JSON.stringify(dashboard, null, 2));
    email.addRecipient('cmdb-team@company.com');
    email.send();
```

### Example 2: Batch Deduplication

```
# 1. Identify duplicates
Tool: SN-Execute-Background-Script
Parameters:
  script: [duplicate detection script from Step 2]

# 2. Review and approve merge candidates
# (Manual review step)

# 3. Execute merges (batch)
Tool: SN-Execute-Background-Script
Parameters:
  description: Batch merge approved duplicates
  script: |
    var merges = [
      { keep: 'sys_id_1', retire: 'sys_id_2' },
      { keep: 'sys_id_3', retire: 'sys_id_4' }
    ];

    merges.forEach(function(m) {
      // [Merge logic from Step 7]
    });
```

### Example 3: Completeness Remediation Campaign

```
# 1. Export incomplete records
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_server
  query: operational_status=1^support_groupISEMPTY
  fields: sys_id,name,ip_address,os

# 2. Assign to teams for remediation
# (Route to support groups based on naming/IP patterns)

# 3. Batch update when teams provide data
Tool: SN-Update-Record
Parameters:
  table_name: cmdb_ci_server
  sys_id: [ci_sys_id]
  data:
    support_group: [group_sys_id]

# 4. Re-run completeness audit to verify
```

## Related Skills

- `cmdb/ci-discovery` - CI creation and classification
- `cmdb/relationship-mapping` - Managing CI relationships
- `cmdb/impact-analysis` - Using quality CMDB for impact analysis
- `admin/discovery-patterns` - Automated discovery configuration

## References

- [ServiceNow CMDB Health](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/product/configuration-management/concept/cmdb-health.html)
- [CMDB Data Manager](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/product/configuration-management/concept/cmdb-data-manager.html)
- [ServiceNow Identification and Reconciliation](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/product/configuration-management/concept/c_IdentificationReconciliation.html)
- [ITIL Configuration Management](https://www.itil.org)
- [Gartner CMDB Best Practices](https://www.gartner.com)
