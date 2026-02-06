---
name: incident-response
version: 1.0.0
description: Security incident detection, containment, and response procedures for ServiceNow environments
author: Happy Technologies LLC
tags: [security, incident-response, soc, threat, containment]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Execute-Background-Script
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/sn_si_incident
    - /api/now/table/sys_audit
    - /api/now/table/syslog
  native:
    - Bash
complexity: advanced
estimated_time: varies (immediate response required)
---

# Security Incident Response

## Overview

This skill covers security incident handling in ServiceNow:

- Detecting potential security incidents
- Classifying security threats
- Containment procedures
- Investigation and evidence gathering
- Communication protocols
- Post-incident review

**When to use:** Upon detection of any potential security threat, unauthorized access, data breach, or suspicious activity.

## Prerequisites

- **Roles:** `sn_si.admin` (Security Incident Response), `security_admin`
- **Access:** Security Incident tables, audit logs, system logs
- **Plugins:** Security Incident Response (sn_si)

## Procedure

### Phase 1: Detection & Identification

**Common Detection Sources:**
- User reports (phishing, suspicious email)
- SIEM alerts
- Audit log anomalies
- Failed login spikes
- Unusual data access patterns

**Query for Suspicious Login Activity:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: tablename=sys_user^fieldname=failed_attempts^newvalueGT5^sys_created_onONLast 24 hours
  fields: documentkey,user,newvalue,sys_created_on
  limit: 100
```

**Check Recent Admin Actions:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: sys_created_onONLast hour^userLIKEadmin
  fields: tablename,fieldname,oldvalue,newvalue,user,sys_created_on
  limit: 50
```

### Phase 2: Classification

**Security Incident Severity Matrix:**

| Severity | Impact | Examples |
|----------|--------|----------|
| Critical | Business-wide | Ransomware, data breach, admin compromise |
| High | Department-wide | Unauthorized access to sensitive data |
| Medium | Limited scope | Phishing attempt, malware on single system |
| Low | Minimal | Spam, failed attack attempts |

**Create Security Incident:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_si_incident
  data:
    short_description: "Potential unauthorized access - Admin account"
    description: |
      Detection: Multiple failed login attempts followed by successful login
      Source IP: 203.0.113.50 (external)
      Target Account: admin.user@company.com
      Time: 2026-02-06 14:30 UTC

      Initial Analysis:
      - 15 failed attempts over 5 minutes
      - Successful login from unfamiliar IP
      - Unusual time (outside business hours)
    category: Unauthorized Access
    subcategory: Account Compromise
    priority: 1
    state: Analysis
    affected_user: [user_sys_id]
    business_criticality: Critical
```

### Phase 3: Containment

**Immediate Actions (Critical/High):**

1. **Disable Compromised Account:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_user
  sys_id: [compromised_user_sys_id]
  data:
    locked_out: true
    active: false
```

2. **Revoke Active Sessions:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var gr = new GlideRecord('v_user_session');
    gr.addQuery('user', '[compromised_user_sys_id]');
    gr.query();
    while (gr.next()) {
      gr.deleteRecord();
    }
    gs.info('Terminated all sessions for compromised user');
  description: "Emergency: Terminate compromised user sessions"
```

3. **Document Containment Action:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [security_incident_sys_id]
  table_name: sn_si_incident
  work_notes: |
    CONTAINMENT ACTION - [TIMESTAMP]

    Actions Taken:
    1. Account locked - sys_user.locked_out = true
    2. Account deactivated - sys_user.active = false
    3. Active sessions terminated - v_user_session cleared

    Performed by: [Analyst Name]
    Approved by: [Manager Name]
```

### Phase 4: Investigation

**Gather Evidence:**

1. **Audit Trail for Affected User:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: user=[compromised_user_id]^sys_created_onONLast 7 days
  fields: tablename,fieldname,oldvalue,newvalue,sys_created_on
  limit: 500
```

2. **System Logs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: syslog
  query: sys_created_onONLast 24 hours^messageLIKElogin
  fields: level,message,source,sys_created_on
  limit: 200
```

3. **Data Access Logs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_audit
  query: user=[user_id]^tablenameINsys_user,customer_account,hr_core_profile
  fields: tablename,documentkey,fieldname,sys_created_on
```

**Document Findings:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [security_incident_sys_id]
  work_notes: |
    INVESTIGATION FINDINGS - [TIMESTAMP]

    Timeline:
    - 14:25 - First failed login attempt
    - 14:30 - Successful login from IP 203.0.113.50
    - 14:32 - Accessed HR records
    - 14:35 - Downloaded employee list
    - 14:40 - Session terminated by security

    Data Accessed:
    - hr_core_profile: 150 records viewed
    - sys_user: 50 records exported

    Indicators of Compromise:
    - External IP (not company VPN)
    - Outside business hours
    - Bulk data access pattern
```

### Phase 5: Eradication & Recovery

**Reset Credentials:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var user = new GlideRecord('sys_user');
    user.get('[compromised_user_sys_id]');
    user.user_password.setDisplayValue('TEMP-' + gs.generateGUID().substring(0,8));
    user.update();
    gs.info('Password reset for: ' + user.user_name);
  description: "Reset compromised user password"
```

**Reactivate with Enhanced Security:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_user
  sys_id: [user_sys_id]
  data:
    active: true
    locked_out: false
    password_needs_reset: true
    failed_attempts: 0
```

### Phase 6: Communication

**Notification Templates:**

**To Affected User:**
> Subject: Security Action Required - Account Access
>
> Your account was temporarily disabled due to suspicious activity.
> Your password has been reset. Please contact IT Security at x1234
> to verify your identity and receive new credentials.

**To Management:**
> Security Incident #[number] - Status Update
>
> Summary: [Brief description]
> Impact: [Scope of impact]
> Current Status: [Contained/Investigating/Resolved]
> Actions Taken: [List of actions]
> Next Steps: [Planned actions]

### Phase 7: Post-Incident Review

**Close Security Incident:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_si_incident
  sys_id: [incident_sys_id]
  data:
    state: Closed
    close_code: Resolved
    close_notes: |
      Resolution Summary:
      - Compromised credentials reset
      - No data exfiltration confirmed
      - User re-trained on security awareness

      Root Cause: Weak password + phishing attack

      Preventive Actions:
      - MFA enabled for all admin accounts
      - Password policy strengthened
      - Phishing training scheduled

      Lessons Learned documented in KB0012345
```

## Response Time Targets

| Severity | Initial Response | Containment | Resolution |
|----------|------------------|-------------|------------|
| Critical | 15 minutes | 1 hour | 24 hours |
| High | 1 hour | 4 hours | 72 hours |
| Medium | 4 hours | 24 hours | 1 week |
| Low | 24 hours | 1 week | 2 weeks |

## Best Practices

- **Preserve Evidence:** Don't modify or delete logs before investigation
- **Document Everything:** Every action should be recorded in work notes
- **Follow Chain of Custody:** Track who accessed what evidence
- **Need-to-Know:** Limit incident details to essential personnel
- **Legal Considerations:** Engage legal for data breaches

## Troubleshooting

### Cannot Access Security Incident Tables

**Cause:** Missing Security Incident Response plugin or roles
**Solution:** Verify sn_si plugin is active; request sn_si.admin role

### Audit Logs Missing

**Cause:** Auditing not enabled for table
**Solution:** Check sys_dictionary for audit flag on table

## Related Skills

- `security/audit-compliance` - Compliance checking
- `itsm/major-incident` - Major incident handling
- `admin/acl-management` - Access control

## References

- [NIST Incident Response Guide](https://nvd.nist.gov)
- [ServiceNow Security Incident Response](https://docs.servicenow.com)
- [SANS Incident Handler's Handbook](https://www.sans.org)
