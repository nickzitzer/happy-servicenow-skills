---
name: user-provisioning
version: 1.0.0
description: Complete user lifecycle management including creation, role assignment, group membership, and deprovisioning
author: Happy Technologies LLC
tags: [admin, user-management, provisioning, roles, groups, security, onboarding, offboarding]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-List-SysUsers
    - SN-List-SysUserGroups
    - SN-Create-Record
    - SN-Update-Record
    - SN-Query-Table
    - SN-Get-Record
    - SN-Batch-Create
    - SN-Batch-Update
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/sys_user
    - /api/now/table/sys_user_group
    - /api/now/table/sys_user_grmember
    - /api/now/table/sys_user_has_role
    - /api/now/table/sys_user_role
  native:
    - Bash
    - Read
complexity: intermediate
estimated_time: 15-45 minutes
---

# User Provisioning

## Overview

This skill provides comprehensive guidance for ServiceNow user lifecycle management:

- Creating new user accounts with proper attributes
- Assigning roles based on job function
- Managing group memberships
- Handling user deprovisioning and offboarding
- Bulk user operations

**When to use:** When onboarding new employees, changing user access, or offboarding departing employees.

**Who should use this:** System administrators, security administrators, and HR system integrators.

## Prerequisites

- **Roles:** `admin`, `user_admin`, or `security_admin`
- **Access:** sys_user, sys_user_group, sys_user_grmember, sys_user_has_role tables
- **Knowledge:** Understanding of your organization's role and group structure
- **LDAP/SSO:** If integrated, understand which attributes are managed externally

## Key Tables

| Table | Purpose |
|-------|---------|
| sys_user | User records |
| sys_user_group | Group definitions |
| sys_user_grmember | Group membership associations |
| sys_user_has_role | Direct role assignments |
| sys_user_role | Role definitions |
| sys_group_has_role | Roles assigned to groups |

## Procedure

### Phase 1: User Creation

#### Step 1.1: Gather User Information

Required fields for new user creation:

| Field | Description | Example |
|-------|-------------|---------|
| user_name | Unique login ID | jsmith |
| first_name | First name | John |
| last_name | Last name | Smith |
| email | Email address | john.smith@company.com |
| employee_number | Employee ID | EMP-12345 |
| department | Department reference | IT Operations |
| manager | Manager reference | Manager's sys_id |

#### Step 1.2: Check for Existing User

Before creating, verify user doesn't already exist.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user
  query: user_name=jsmith^ORemail=john.smith@company.com
  fields: sys_id,user_name,email,active
  limit: 5
```

If user exists, proceed to role/group assignment instead.

#### Step 1.3: Create User Account

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_user
  data:
    user_name: jsmith
    first_name: John
    last_name: Smith
    email: john.smith@company.com
    employee_number: EMP-12345
    title: Software Developer
    department: [department_sys_id]
    manager: [manager_sys_id]
    location: [location_sys_id]
    company: [company_sys_id]
    phone: "+1-555-123-4567"
    mobile_phone: "+1-555-987-6543"
    active: true
    locked_out: false
    password_needs_reset: true
    notification: 2  # Email notifications enabled
```

**Using REST API:**
```bash
POST /api/now/table/sys_user
Content-Type: application/json

{
  "user_name": "jsmith",
  "first_name": "John",
  "last_name": "Smith",
  "email": "john.smith@company.com",
  "employee_number": "EMP-12345",
  "active": "true",
  "password_needs_reset": "true"
}
```

#### Step 1.4: Set Initial Password

**Using MCP (Background Script):**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var user = new GlideRecord('sys_user');
    user.get('user_name', 'jsmith');

    // Generate random password
    var password = GlideSecureRandomUtil.getSecureRandomString(16);
    user.setDisplayValue('user_password', password);
    user.password_needs_reset = true;
    user.update();

    // Send welcome email (optional)
    gs.eventQueue('user.created', user, password, '');

    gs.info('User created. Initial password set. User will be prompted to reset on first login.');
  description: Set initial password for new user
```

### Phase 2: Role Assignment

#### Step 2.1: Understand Role Hierarchy

Common ServiceNow roles:

| Role | Description | Typical Users |
|------|-------------|---------------|
| itil | ITSM operations | Help desk, technicians |
| admin | Full administrative access | System admins |
| approver_user | Approval capabilities | Managers |
| catalog_admin | Catalog management | Catalog owners |
| knowledge | Knowledge base access | KB contributors |
| asset | Asset management | Asset managers |
| change_manager | Change management | Change managers |
| problem_manager | Problem management | Problem managers |

#### Step 2.2: Query Available Roles

**Find Roles:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_role
  query: active=true
  fields: sys_id,name,description,suffix
  limit: 50
```

**Find Role by Name:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_role
  query: name=itil
  fields: sys_id,name,description
  limit: 1
```

#### Step 2.3: Assign Role to User

**Direct Role Assignment:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_user_has_role
  data:
    user: [user_sys_id]
    role: [role_sys_id]
    state: active
    inherited: false
```

**Assign Multiple Roles (Batch):**
```
Tool: SN-Batch-Create
Parameters:
  records:
    - table_name: sys_user_has_role
      data:
        user: [user_sys_id]
        role: [itil_role_sys_id]
    - table_name: sys_user_has_role
      data:
        user: [user_sys_id]
        role: [knowledge_role_sys_id]
    - table_name: sys_user_has_role
      data:
        user: [user_sys_id]
        role: [approver_user_role_sys_id]
```

#### Step 2.4: Verify Role Assignment

**Check User's Roles:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_has_role
  query: user=[user_sys_id]^state=active
  fields: role,role.name,inherited,granted_by
  limit: 50
```

### Phase 3: Group Membership

#### Step 3.1: List Available Groups

**Using MCP:**
```
Tool: SN-List-SysUserGroups
Parameters:
  limit: 100
```

**Or query with filters:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_group
  query: active=true^type=itil
  fields: sys_id,name,description,manager,email
  limit: 50
```

#### Step 3.2: Add User to Group

**Single Group Assignment:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_user_grmember
  data:
    user: [user_sys_id]
    group: [group_sys_id]
```

**Multiple Group Assignments (Batch):**
```
Tool: SN-Batch-Create
Parameters:
  records:
    - table_name: sys_user_grmember
      data:
        user: [user_sys_id]
        group: [network_support_group_sys_id]
    - table_name: sys_user_grmember
      data:
        user: [user_sys_id]
        group: [it_operations_group_sys_id]
    - table_name: sys_user_grmember
      data:
        user: [user_sys_id]
        group: [change_advisory_board_sys_id]
```

#### Step 3.3: Verify Group Membership

**Check User's Groups:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_grmember
  query: user=[user_sys_id]
  fields: group,group.name,group.type
  limit: 50
```

**Check Group Members:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_grmember
  query: group=[group_sys_id]
  fields: user,user.name,user.email
  limit: 100
```

### Phase 4: Role-Based Provisioning Templates

#### Step 4.1: Define Role Templates

Create standardized provisioning for common job functions:

**IT Support Technician Template:**
```
Roles: itil, knowledge
Groups: Service Desk, IT Support Tier 1
Notification: Email enabled
```

**IT Manager Template:**
```
Roles: itil, approver_user, report_user
Groups: IT Management, Change Advisory Board
Notification: Email enabled
```

**Developer Template:**
```
Roles: itil, personalize_dictionary
Groups: Development Team, Testing
Notification: Email enabled
```

#### Step 4.2: Automated Provisioning Script

**Provision by Template:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var userSysId = '[user_sys_id]';
    var template = 'IT_SUPPORT_TECHNICIAN';

    var templates = {
      'IT_SUPPORT_TECHNICIAN': {
        roles: ['itil', 'knowledge'],
        groups: ['Service Desk', 'IT Support Tier 1']
      },
      'IT_MANAGER': {
        roles: ['itil', 'approver_user', 'report_user'],
        groups: ['IT Management', 'Change Advisory Board']
      },
      'DEVELOPER': {
        roles: ['itil', 'personalize_dictionary'],
        groups: ['Development Team', 'Testing']
      }
    };

    var config = templates[template];
    if (!config) {
      gs.error('Unknown template: ' + template);
      return;
    }

    // Assign roles
    config.roles.forEach(function(roleName) {
      var role = new GlideRecord('sys_user_role');
      role.addQuery('name', roleName);
      role.query();
      if (role.next()) {
        var userRole = new GlideRecord('sys_user_has_role');
        userRole.initialize();
        userRole.user = userSysId;
        userRole.role = role.sys_id;
        userRole.insert();
        gs.info('Assigned role: ' + roleName);
      }
    });

    // Assign groups
    config.groups.forEach(function(groupName) {
      var group = new GlideRecord('sys_user_group');
      group.addQuery('name', groupName);
      group.query();
      if (group.next()) {
        var membership = new GlideRecord('sys_user_grmember');
        membership.initialize();
        membership.user = userSysId;
        membership.group = group.sys_id;
        membership.insert();
        gs.info('Added to group: ' + groupName);
      }
    });

    gs.info('Provisioning complete for template: ' + template);
  description: Provision user by job template
```

### Phase 5: User Modification

#### Step 5.1: Update User Attributes

**Update User Record:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_user
  sys_id: [user_sys_id]
  data:
    title: Senior Software Developer
    department: [new_department_sys_id]
    manager: [new_manager_sys_id]
    location: [new_location_sys_id]
```

#### Step 5.2: Transfer User to New Group

**Remove from Old Group:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_grmember
  query: user=[user_sys_id]^group=[old_group_sys_id]
  fields: sys_id
  limit: 1

# Then delete:
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var gr = new GlideRecord('sys_user_grmember');
    gr.get('[membership_sys_id]');
    gr.deleteRecord();
  description: Remove user from group
```

**Add to New Group:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_user_grmember
  data:
    user: [user_sys_id]
    group: [new_group_sys_id]
```

#### Step 5.3: Role Elevation/Removal

**Remove Role:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_has_role
  query: user=[user_sys_id]^role=[role_sys_id]
  fields: sys_id
  limit: 1

# Then deactivate (preferred) or delete:
Tool: SN-Update-Record
Parameters:
  table_name: sys_user_has_role
  sys_id: [user_role_sys_id]
  data:
    state: revoked
```

### Phase 6: Deprovisioning/Offboarding

#### Step 6.1: Immediate Actions

When an employee departs, take these steps immediately:

**1. Deactivate User Account:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_user
  sys_id: [user_sys_id]
  data:
    active: false
    locked_out: true
```

**2. Revoke All Roles:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var userSysId = '[user_sys_id]';

    var gr = new GlideRecord('sys_user_has_role');
    gr.addQuery('user', userSysId);
    gr.addQuery('state', 'active');
    gr.query();

    var count = 0;
    while (gr.next()) {
      gr.state = 'revoked';
      gr.update();
      count++;
    }
    gs.info('Revoked ' + count + ' roles for user');
  description: Revoke all user roles
```

**3. Remove from All Groups:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var userSysId = '[user_sys_id]';

    var gr = new GlideRecord('sys_user_grmember');
    gr.addQuery('user', userSysId);
    gr.query();

    var count = 0;
    while (gr.next()) {
      gr.deleteRecord();
      count++;
    }
    gs.info('Removed user from ' + count + ' groups');
  description: Remove user from all groups
```

#### Step 6.2: Reassign Owned Records

**Find Records Owned by User:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: assigned_to=[user_sys_id]^active=true
  fields: number,short_description,state
  limit: 100

Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: assigned_to=[user_sys_id]^stateNOT IN3,4,7
  fields: number,short_description,state
  limit: 100
```

**Bulk Reassignment:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var departingUser = '[departing_user_sys_id]';
    var newAssignee = '[new_assignee_sys_id]';
    var tables = ['incident', 'change_request', 'problem', 'sc_task'];

    tables.forEach(function(tableName) {
      var gr = new GlideRecord(tableName);
      gr.addQuery('assigned_to', departingUser);
      gr.addQuery('active', true);
      gr.query();

      var count = 0;
      while (gr.next()) {
        gr.assigned_to = newAssignee;
        gr.work_notes = 'Reassigned due to employee departure';
        gr.update();
        count++;
      }
      gs.info('Reassigned ' + count + ' ' + tableName + ' records');
    });
  description: Reassign all active records from departing user
```

#### Step 6.3: Document Offboarding

**Create Offboarding Record:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_user_task
  data:
    short_description: "Offboarding: [User Name] - [Employee ID]"
    description: |
      Employee Offboarding Checklist:

      [x] User account deactivated
      [x] All roles revoked
      [x] Removed from all groups
      [x] Active tickets reassigned

      Departure Date: 2026-02-06
      Reason: [Resignation/Termination/Transfer]

      IT Actions:
      - [ ] VPN access revoked
      - [ ] Email forwarding configured
      - [ ] Hardware returned
      - [ ] Access badges collected

      Manager: [Manager Name]
      HR Contact: [HR Name]
    assigned_to: [hr_admin_sys_id]
    priority: 2
```

### Phase 7: Bulk Operations

#### Step 7.1: Bulk User Creation

**Create Multiple Users:**
```
Tool: SN-Batch-Create
Parameters:
  records:
    - table_name: sys_user
      data:
        user_name: user1
        first_name: Alice
        last_name: Johnson
        email: alice.johnson@company.com
        active: true
    - table_name: sys_user
      data:
        user_name: user2
        first_name: Bob
        last_name: Williams
        email: bob.williams@company.com
        active: true
    - table_name: sys_user
      data:
        user_name: user3
        first_name: Carol
        last_name: Davis
        email: carol.davis@company.com
        active: true
```

#### Step 7.2: Bulk Role Assignment

**Assign Role to Multiple Users:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var userIds = ['[user1_sys_id]', '[user2_sys_id]', '[user3_sys_id]'];
    var roleName = 'itil';

    var role = new GlideRecord('sys_user_role');
    role.addQuery('name', roleName);
    role.query();

    if (role.next()) {
      userIds.forEach(function(userId) {
        var userRole = new GlideRecord('sys_user_has_role');
        userRole.initialize();
        userRole.user = userId;
        userRole.role = role.sys_id;
        userRole.insert();
      });
      gs.info('Assigned ' + roleName + ' role to ' + userIds.length + ' users');
    }
  description: Bulk role assignment
```

#### Step 7.3: Bulk Group Membership

**Add Multiple Users to Group:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var groupName = 'Network Support';
    var userIds = ['[user1_sys_id]', '[user2_sys_id]', '[user3_sys_id]'];

    var group = new GlideRecord('sys_user_group');
    group.addQuery('name', groupName);
    group.query();

    if (group.next()) {
      userIds.forEach(function(userId) {
        var member = new GlideRecord('sys_user_grmember');
        member.initialize();
        member.user = userId;
        member.group = group.sys_id;
        member.insert();
      });
      gs.info('Added ' + userIds.length + ' users to ' + groupName);
    }
  description: Bulk group membership assignment
```

## Tool Usage Summary

| Operation | MCP Tool | Purpose |
|-----------|----------|---------|
| List Users | SN-List-SysUsers | Get all users |
| List Groups | SN-List-SysUserGroups | Get all groups |
| Create User | SN-Create-Record | Create new user |
| Update User | SN-Update-Record | Modify user attributes |
| Query | SN-Query-Table | Search users, roles, groups |
| Bulk Create | SN-Batch-Create | Create multiple records |
| Script | SN-Execute-Background-Script | Complex operations |

## Best Practices

- **Principle of Least Privilege:** Assign minimum roles needed for job function
- **Use Groups for Roles:** Assign roles to groups, add users to groups
- **Document Role Assignments:** Maintain documentation of who has what access
- **Regular Access Reviews:** Audit user access quarterly
- **Immediate Offboarding:** Deactivate accounts same day as departure
- **Use Templates:** Standardize provisioning with job function templates
- **Avoid Direct Role Assignment:** Prefer group-based role inheritance
- **Lock, Don't Delete:** Deactivate users instead of deleting for audit trail

## Troubleshooting

### User Can't Log In

**Symptom:** User receives "invalid credentials" error
**Causes:**
- Account inactive
- Account locked out
- Password expired
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user
  query: user_name=[username]
  fields: active,locked_out,password_needs_reset,failed_attempts
```

### User Missing Expected Access

**Symptom:** User can't access expected modules or records
**Causes:**
- Role not assigned
- Role revoked or expired
- Group membership missing
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_has_role
  query: user=[user_sys_id]^state=active
  fields: role.name,inherited,granted_by
```

### Inherited Roles Not Appearing

**Symptom:** User in group but not getting group's roles
**Causes:**
- Group role inheritance disabled
- Group inactive
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_group
  query: sys_id=[group_sys_id]
  fields: name,active,roles
```

## Related Skills

- `admin/batch-operations` - Bulk user operations
- `security/access-control` - ACL configuration
- `admin/script-execution` - Automated provisioning scripts
- `itsm/change-management` - Change process for access changes

## References

- [ServiceNow User Administration](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/users-and-groups/concept/c_UsersAndGroups.html)
- [Roles and Access Control](https://docs.servicenow.com/bundle/utah-platform-security/page/administer/roles/concept/c_Roles.html)
- [Group Administration](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/users-and-groups/concept/c_Groups.html)
