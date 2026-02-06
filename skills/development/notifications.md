---
name: notifications
version: 1.0.0
description: Complete guide to email notification development including events, templates, mail scripts, and delivery troubleshooting
author: Happy Technologies LLC
tags: [development, notifications, email, communication, events, templates, sms, push]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/sysevent_email_action
    - /api/now/table/sysevent_email_template
    - /api/now/table/sys_email_template
    - /api/now/table/sysevent_register
    - /api/now/table/sys_email
    - /api/now/table/cmn_notif_message
  native:
    - Bash
complexity: intermediate
estimated_time: 30-60 minutes
---

# Email Notification Development

## Overview

This skill covers the complete process of creating and managing ServiceNow email notifications:

- Understanding notification types (event-based vs direct)
- Creating email notifications with proper triggers
- Building email templates with dynamic content
- Writing mail scripts for advanced recipient logic
- Configuring SMS and push notifications
- Troubleshooting delivery issues

**When to use:** When building automated notifications for record changes, approvals, SLA breaches, workflow activities, or custom business events.

## Prerequisites

- **Roles:** `admin`, `notification_admin`, or `itil` (for viewing)
- **Access:** sysevent_email_action, sysevent_email_template, sys_script_email tables
- **Knowledge:** GlideRecord basics, email concepts, event registry
- **Related Skills:** Complete `admin/workflow-creation` for workflow-triggered notifications

## Notification Architecture

### Core Tables

```
sysevent_register (Event Registry)
    |
    +-- sysevent_email_action (Email Notifications)
            |
            +-- sysevent_email_template (Email Templates)
            +-- sys_script_email (Mail Scripts)
            +-- cmn_notif_message (Notification Messages)
```

### Notification Types

| Type | Trigger | Use Case |
|------|---------|----------|
| **Event-based** | System/custom events | Standard approach - decoupled, reusable |
| **Direct** | Record conditions | Quick setup - tightly coupled to conditions |
| **Workflow** | Workflow activity | Part of workflow orchestration |
| **Script** | GlideEmailOutbound | Programmatic - full control |

### Key Tables Reference

| Table | Purpose |
|-------|---------|
| sysevent_email_action | Email notification definitions |
| sysevent_email_template | Email body templates |
| sysevent_register | Event definitions |
| sys_script_email | Mail scripts for recipients |
| sys_email | Email log (sent/failed) |
| cmn_notif_message | Notification message store |
| cmn_notif_device | User notification devices |

## Procedure

### Step 1: Understand Event-Based vs Direct Notifications

**Event-Based Notifications (Recommended):**
- Triggered by events (e.g., `incident.assigned`, `change.approval.rejected`)
- Decoupled from business rules
- Can have multiple notifications per event
- Better for complex, reusable notification logic

**Direct Notifications:**
- Triggered directly by record conditions
- Simpler to set up
- Tightly coupled to specific conditions
- Good for one-off notifications

### Step 2: Query Existing Events

Before creating notifications, understand available events.

**Query Event Registry:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysevent_register
  query: table=incident
  fields: sys_id,event_name,table,description,fired_by
  limit: 50
```

**Common System Events:**

| Event | Table | Trigger |
|-------|-------|---------|
| incident.assigned | incident | Incident assigned to user/group |
| incident.commented | incident | Comment added |
| incident.resolved | incident | Incident resolved |
| incident.reopened | incident | Incident reopened |
| change.approval.rejected | change_request | Change approval rejected |
| change.itil.approval.rejected | change_request | ITIL change rejected |
| sc_request.approved | sc_request | Request approved |
| sla.warning | task_sla | SLA warning threshold |
| sla.breached | task_sla | SLA breached |
| approval.inserted | sysapproval_approver | Approval record created |
| task.assigned | task | Task assigned |

### Step 3: Create Custom Event (Optional)

If no existing event matches your needs, create a custom event.

**Create Event Registration:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysevent_register
  data:
    event_name: "x_custom.incident.escalated"
    table: "incident"
    description: "Fired when incident is escalated to management"
    fired_by: "Business Rule: Incident Escalation"
```

**Fire Event from Business Rule:**
```javascript
// In business rule script
if (current.escalation.changes() && current.escalation > 0) {
    gs.eventQueue('x_custom.incident.escalated', current, current.assigned_to, current.assignment_group);
}
```

**Fire Event via Background Script:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    var inc = new GlideRecord('incident');
    inc.get('number', 'INC0010001');
    if (inc.isValidRecord()) {
        gs.eventQueue('x_custom.incident.escalated', inc, inc.assigned_to.toString(), inc.assignment_group.toString());
        gs.info('Event fired for: ' + inc.number);
    }
  description: "Fire custom escalation event for testing"
```

### Step 4: Create Email Notification

**Basic Event-Based Notification:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysevent_email_action
  data:
    name: "Incident Escalation Alert"
    event_name: "x_custom.incident.escalated"
    sys_domain: "global"
    collection: "incident"
    active: true
    # Subject
    subject: "URGENT: Incident ${number} Escalated - ${short_description}"
    # Recipients
    send_to_event_creator: false
    recipient_users: [user_sys_id]  # Specific users
    recipient_groups: [group_sys_id]  # Groups
    send_to_event_parm_1: true  # gs.eventQueue parm1 (assigned_to)
    send_to_event_parm_2: true  # gs.eventQueue parm2 (assignment_group)
    # Content
    content_type: "text/html"
    message_html: |
      <html>
      <body>
      <h2>Incident Escalated</h2>
      <p>The following incident has been escalated and requires immediate attention:</p>
      <table border="1" cellpadding="5">
        <tr><td><b>Number:</b></td><td>${number}</td></tr>
        <tr><td><b>Priority:</b></td><td>${priority}</td></tr>
        <tr><td><b>Description:</b></td><td>${short_description}</td></tr>
        <tr><td><b>Assigned To:</b></td><td>${assigned_to}</td></tr>
        <tr><td><b>Assignment Group:</b></td><td>${assignment_group}</td></tr>
        <tr><td><b>Escalation Level:</b></td><td>${escalation}</td></tr>
      </table>
      <p><a href="${URI_REF}">View Incident</a></p>
      </body>
      </html>
```

**Direct (Condition-Based) Notification:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysevent_email_action
  data:
    name: "High Priority Incident Created"
    # No event_name - uses conditions instead
    sys_domain: "global"
    collection: "incident"
    action_insert: true
    action_update: false
    action_delete: false
    condition: "priority=1^state=1"  # P1, New state
    active: true
    subject: "P1 Incident Created: ${number}"
    send_to_event_parm_1: true
    content_type: "text/html"
    message_html: |
      <h2>Priority 1 Incident Created</h2>
      <p>A new Priority 1 incident requires immediate attention.</p>
      <p><b>Number:</b> ${number}</p>
      <p><b>Description:</b> ${short_description}</p>
      <p><a href="${URI_REF}">View Incident</a></p>
```

### Step 5: Configure Recipients

**Recipient Options in sysevent_email_action:**

| Field | Purpose |
|-------|---------|
| `recipient_users` | Specific user sys_ids (comma-separated) |
| `recipient_groups` | Group sys_ids - emails all members |
| `send_to_event_creator` | User who triggered event |
| `send_to_event_parm_1` | First parameter from gs.eventQueue |
| `send_to_event_parm_2` | Second parameter from gs.eventQueue |
| `recipient_fields` | Record field containing user reference |
| `send_self` | Send to user who made change |
| `exclude_delegates` | Skip delegate users |
| `email_template` | Reference to reusable template |

**Field-Based Recipients:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sysevent_email_action
  sys_id: [notification_sys_id]
  data:
    recipient_fields: "assigned_to,opened_by,caller_id"  # Comma-separated fields
```

**Group Recipients:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sysevent_email_action
  sys_id: [notification_sys_id]
  data:
    recipient_groups: [group1_sys_id],[group2_sys_id]
```

### Step 6: Create Mail Script for Dynamic Recipients

Mail scripts allow complex recipient logic beyond simple field references.

**Create Mail Script:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_email
  data:
    name: "Get On-Call Manager"
    description: "Returns the on-call manager for the assignment group"
    script: |
      // Mail script to find on-call manager
      // 'current' is the record, 'email' is the GlideEmailOutbound object

      (function runMailScript(current, template, email, email_action, event) {

        // Get on-call rotation for assignment group
        var oncall = new GlideRecord('on_call_rotation');
        oncall.addQuery('group', current.assignment_group);
        oncall.addQuery('active', true);
        oncall.query();

        if (oncall.next()) {
          // Add on-call user as recipient
          var user = new GlideRecord('sys_user');
          user.get(oncall.user);
          if (user.isValidRecord() && user.email) {
            email.addAddress('to', user.email, user.name);
            gs.info('Mail script: Added recipient ' + user.email);
          }
        }

        // Optionally add escalation manager
        if (current.escalation > 1) {
          var manager = current.assignment_group.manager;
          if (manager && manager.email) {
            email.addAddress('cc', manager.email, manager.name);
          }
        }

      })(current, template, email, email_action, event);
```

**Associate Mail Script with Notification:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sysevent_email_action
  sys_id: [notification_sys_id]
  data:
    sys_script_mail: [mail_script_sys_id]
```

**Advanced Mail Script - Manager Hierarchy:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_email
  data:
    name: "Get Manager Chain"
    description: "Adds manager hierarchy up to specified levels"
    script: |
      (function runMailScript(current, template, email, email_action, event) {

        var MAX_LEVELS = 3;
        var userId = current.assigned_to.toString();

        for (var level = 0; level < MAX_LEVELS && userId; level++) {
          var user = new GlideRecord('sys_user');
          user.get(userId);

          if (user.isValidRecord() && user.manager) {
            var manager = new GlideRecord('sys_user');
            manager.get(user.manager);

            if (manager.isValidRecord() && manager.email) {
              email.addAddress('cc', manager.email, manager.name);
              userId = manager.sys_id.toString();
            } else {
              break;
            }
          } else {
            break;
          }
        }

      })(current, template, email, email_action, event);
```

### Step 7: Create Email Template

Email templates allow reusable HTML/text formatting.

**Create Email Template:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysevent_email_template
  data:
    name: "Incident Alert Template"
    description: "Standard template for incident notifications"
    subject: "${number}: ${short_description}"
    message_html: |
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { background-color: #1a73e8; color: white; padding: 20px; }
          .content { padding: 20px; }
          .details { border-collapse: collapse; width: 100%; }
          .details td { border: 1px solid #ddd; padding: 10px; }
          .label { background-color: #f5f5f5; font-weight: bold; width: 30%; }
          .footer { background-color: #f5f5f5; padding: 15px; font-size: 12px; }
          .button { background-color: #1a73e8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Incident Alert</h1>
        </div>
        <div class="content">
          <p>An incident requires your attention:</p>
          <table class="details">
            <tr>
              <td class="label">Number</td>
              <td>${number}</td>
            </tr>
            <tr>
              <td class="label">Priority</td>
              <td>${priority}</td>
            </tr>
            <tr>
              <td class="label">State</td>
              <td>${state}</td>
            </tr>
            <tr>
              <td class="label">Description</td>
              <td>${short_description}</td>
            </tr>
            <tr>
              <td class="label">Assigned To</td>
              <td>${assigned_to}</td>
            </tr>
            <tr>
              <td class="label">Assignment Group</td>
              <td>${assignment_group}</td>
            </tr>
            <tr>
              <td class="label">Opened</td>
              <td>${opened_at}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">
            <a href="${URI_REF}" class="button">View Incident</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated notification from ServiceNow.</p>
          <p>Do not reply to this email.</p>
        </div>
      </body>
      </html>
    message: |
      Incident Alert

      Number: ${number}
      Priority: ${priority}
      State: ${state}
      Description: ${short_description}
      Assigned To: ${assigned_to}
      Assignment Group: ${assignment_group}

      View Incident: ${URI_REF}

      This is an automated notification.
    collection: "incident"
```

**Associate Template with Notification:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sysevent_email_action
  sys_id: [notification_sys_id]
  data:
    email_template: [template_sys_id]
    # Clear inline content if using template
    message_html: ""
    message: ""
```

### Step 8: Email Variable Syntax

**Standard Field Variables:**
```
${field_name}            - Display value of field
${field_name.name}       - Reference field's name
${field_name.email}      - Reference field's email
${field_name.sys_id}     - Reference field's sys_id
${number}                - Incident number
${short_description}     - Short description
${priority}              - Priority display value
${state}                 - State display value
```

**Special Variables:**
```
${URI}                   - Record URI path only
${URI_REF}               - Full URL to record
${mailto:email}          - Mailto link
${event.parm1}           - First event parameter
${event.parm2}           - Second event parameter
${current}               - Current record reference
${gs.getProperty('name')} - System property value
```

**Conditional Content (Mail Script Required):**
```javascript
// In notification body script or template script
if (current.priority == 1) {
    template.print('<span style="color: red; font-weight: bold;">CRITICAL</span>');
} else {
    template.print('<span>' + current.priority.getDisplayValue() + '</span>');
}
```

**Iterating Over Related Records:**
```javascript
// Show related tasks in notification
template.print('<h3>Related Tasks:</h3>');
template.print('<ul>');

var tasks = new GlideRecord('sc_task');
tasks.addQuery('request_item', current.sys_id);
tasks.query();

while (tasks.next()) {
    template.print('<li>' + tasks.number + ' - ' + tasks.short_description + '</li>');
}

template.print('</ul>');
```

### Step 9: Add Attachments

**Include Record Attachments:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sysevent_email_action
  sys_id: [notification_sys_id]
  data:
    include_attachments: true
```

**Programmatic Attachment via Mail Script:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_email
  data:
    name: "Attach Report PDF"
    description: "Attaches a generated report to the email"
    script: |
      (function runMailScript(current, template, email, email_action, event) {

        // Get attachment from related record
        var attach = new GlideRecord('sys_attachment');
        attach.addQuery('table_name', 'incident');
        attach.addQuery('table_sys_id', current.sys_id);
        attach.addQuery('content_type', 'CONTAINS', 'pdf');
        attach.query();

        while (attach.next()) {
          // Add each PDF attachment
          var gsa = new GlideSysAttachment();
          var content = gsa.getContentBase64(attach);
          email.addAttachment(attach.file_name, attach.content_type, content);
        }

      })(current, template, email, email_action, event);
```

### Step 10: Configure SMS Notifications

SMS notifications require the SMS plugin and carrier configuration.

**Check SMS Capability:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_plugins
  query: name=com.snc.sms
  fields: sys_id,name,active
```

**Create SMS Notification:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysevent_email_action
  data:
    name: "P1 Incident SMS Alert"
    event_name: "incident.assigned"
    sys_domain: "global"
    collection: "incident"
    condition: "priority=1"
    active: true
    # SMS specific
    sms_alternate: true  # Enable SMS option
    subject: "P1: ${number}"  # SMS subject (carrier dependent)
    message: "P1 Incident ${number}: ${short_description}. Priority: ${priority}. View: ${URI_REF}"
    content_type: "text/plain"
    # Recipients
    send_to_event_parm_1: true
```

**Configure SMS for User:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmn_notif_device
  query: user=[user_sys_id]^type=SMS
  fields: sys_id,phone_number,carrier,active
```

### Step 11: Configure Push Notifications

Push notifications require the mobile plugin and device registration.

**Create Push Notification:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysevent_email_action
  data:
    name: "Approval Required Push"
    event_name: "approval.inserted"
    collection: "sysapproval_approver"
    active: true
    # Push specific
    push_message_only: true  # Send push only, no email
    subject: "Approval Required"
    message: "You have a new approval request: ${document_id.short_description}"
    # Recipients
    recipient_fields: "approver"
```

**Query User's Push Devices:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmn_notif_device
  query: user=[user_sys_id]^type=Push
  fields: sys_id,device_name,active,last_registration
```

### Step 12: Notification Conditions and Filtering

**Advanced Condition Examples:**

| Condition | Purpose |
|-----------|---------|
| `priority=1^state!=6` | P1, not resolved |
| `active=true^assigned_toISEMPTY` | Active, unassigned |
| `sys_created_onONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()` | Created today |
| `priority.changes()=true` | Priority field changed |
| `state.changesFrom(1)^state.changesTo(2)` | State changed from New to In Progress |

**Condition Script (Advanced):**
```
Tool: SN-Update-Record
Parameters:
  table_name: sysevent_email_action
  sys_id: [notification_sys_id]
  data:
    advanced_condition: |
      // Return true to send notification, false to skip
      function advancedCondition() {
        // Don't notify if CI is in maintenance window
        if (current.cmdb_ci && current.cmdb_ci.maintenance) {
          return false;
        }

        // Only notify during business hours
        var now = new GlideDateTime();
        var hour = now.getLocalTime().getHourOfDayLocalTime();
        if (hour < 8 || hour > 18) {
          return false;  // Outside business hours
        }

        // Check if user has opted out
        var prefs = new GlideRecord('sys_user_preference');
        prefs.addQuery('user', current.assigned_to);
        prefs.addQuery('name', 'notification.incident.optout');
        prefs.addQuery('value', 'true');
        prefs.query();
        if (prefs.next()) {
          return false;
        }

        return true;
      }

      advancedCondition();
```

### Step 13: Weight and Priority

Control notification frequency and importance.

**Set Notification Weight:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sysevent_email_action
  sys_id: [notification_sys_id]
  data:
    weight: 10  # Higher weight = higher priority
    digest: false  # true = batch into digest
    digest_interval: ""  # hourly, daily if digest=true
    omit_watermark: false  # Watermark prevents duplicates
```

**Digest Configuration:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysevent_email_action
  data:
    name: "Daily Incident Summary"
    event_name: "incident.created"
    collection: "incident"
    active: true
    digest: true
    digest_interval: "daily"
    digest_template: [digest_template_sys_id]
    subject: "Daily Incident Summary - ${digest.count} incidents"
```

## Troubleshooting Email Delivery

### Step 1: Check Email Log

**Query Recent Emails:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_email
  query: type=send-ready^ORtype=sent^ORtype=send-error^sys_created_onONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()
  fields: sys_id,type,recipients,subject,sys_created_on,error,mailbox
  limit: 50
  orderBy: sys_created_on
  orderByDesc: true
```

**Email Status Types:**

| Type | Meaning |
|------|---------|
| send-ready | Queued for sending |
| sent | Successfully sent |
| send-error | Send failed |
| received | Inbound email |
| received-error | Inbound processing error |
| draft | Pending approval |
| ignored | Skipped by rule |

**Find Failed Emails:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_email
  query: type=send-error^sys_created_onONLast 7 days@javascript:gs.daysAgoStart(7)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,recipients,subject,error,sys_created_on
  limit: 100
```

### Step 2: Check Event Queue

**Query Event Queue:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysevent
  query: name=x_custom.incident.escalated^sys_created_onONToday@javascript:gs.beginningOfToday()@javascript:gs.endOfToday()
  fields: sys_id,name,instance,parm1,parm2,state,sys_created_on
  limit: 50
```

**Event States:**

| State | Meaning |
|-------|---------|
| ready | Queued for processing |
| processed | Successfully processed |
| error | Processing failed |

### Step 3: Verify Notification Configuration

**Check Notification Is Active:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysevent_email_action
  query: sys_id=[notification_sys_id]
  fields: name,active,event_name,condition,recipient_users,recipient_groups,recipient_fields
```

**Verify Event Registration:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysevent_register
  query: event_name=[your_event_name]
  fields: sys_id,event_name,table,description
```

### Step 4: Test Notification

**Fire Test Event:**
```
Tool: SN-Execute-Background-Script
Parameters:
  script: |
    // Test notification by firing event
    var inc = new GlideRecord('incident');
    inc.addQuery('active', true);
    inc.setLimit(1);
    inc.query();
    if (inc.next()) {
        gs.eventQueue('x_custom.incident.escalated', inc, inc.assigned_to.toString(), inc.assignment_group.toString());
        gs.info('Test event fired for: ' + inc.number);
    }
  description: "Fire test notification event"
```

**Check Email Generation:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_email
  query: recipients=[test_email]^ORsubjectLIKE[incident_number]^sys_created_onONLast hour@javascript:gs.hoursAgoStart(1)@javascript:gs.hoursAgoEnd(0)
  fields: sys_id,type,recipients,subject,body,error
```

### Common Issues

#### Notification Not Firing

**Symptom:** No email generated after record change
**Causes:**
1. Notification inactive
2. Condition not matched
3. Event not registered
4. No recipients defined

**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysevent_email_action
  query: collection=incident^active=true
  fields: name,event_name,condition,active,recipient_users,recipient_groups
```

#### Recipients Not Receiving Email

**Symptom:** Email shows as sent but users don't receive
**Causes:**
1. User email address invalid/missing
2. User notification preferences disabled
3. Email blocked by spam filter
4. Incorrect recipient configuration

**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user
  query: sys_id=[user_sys_id]
  fields: email,notification,active
```

Check user notification preferences:
```
Tool: SN-Query-Table
Parameters:
  table_name: cmn_notif_message
  query: user=[user_sys_id]
  fields: notification,device,state
```

#### Email Shows as send-error

**Symptom:** Emails fail with error status
**Causes:**
1. SMTP server configuration
2. Invalid email addresses
3. Mail server rejection
4. Attachment too large

**Solution:** Check the `error` field in sys_email record for specific error message.

#### Variables Not Resolving

**Symptom:** Email shows `${field_name}` literally instead of value
**Causes:**
1. Incorrect variable syntax
2. Field doesn't exist on table
3. Null/empty field value

**Solution:** Verify field exists:
```
Tool: SN-Get-Table-Schema
Parameters:
  table_name: incident
```

## Tool Usage Summary

### MCP Tools (Preferred)

| Tool | Purpose |
|------|---------|
| `SN-Query-Table` | Query notifications, events, email logs |
| `SN-Create-Record` | Create notifications, templates, mail scripts |
| `SN-Update-Record` | Modify notification configuration |
| `SN-Get-Table-Schema` | Verify available fields for variables |
| `SN-Execute-Background-Script` | Fire test events, debug |

### REST API (Alternative)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sysevent_email_action` | GET/POST | Query/create notifications |
| `/api/now/table/sysevent_email_template` | GET/POST | Query/create templates |
| `/api/now/table/sys_script_email` | POST | Create mail scripts |
| `/api/now/table/sys_email` | GET | Check email log |
| `/api/now/table/sysevent_register` | GET/POST | Manage events |

## Best Practices

- **Use Events:** Prefer event-based over direct notifications for decoupling
- **Template Reuse:** Create templates for consistent formatting across notifications
- **Test in Sub-Production:** Always test notifications in dev/test first
- **Monitor Email Queue:** Regularly check sys_email for send-error records
- **User Preferences:** Respect user notification opt-out settings
- **Business Hours:** Consider time zones and business hours for non-critical alerts
- **HTML + Plain Text:** Provide both for maximum compatibility
- **Avoid Spam:** Use digest for high-frequency events
- **Watermarks:** Keep watermarks enabled to prevent duplicate notifications
- **Document Events:** Add descriptions to custom events for maintainability

## Examples

### Example 1: Complete P1 Incident Notification

```
# 1. Register custom event
Tool: SN-Create-Record
Parameters:
  table_name: sysevent_register
  data:
    event_name: "incident.p1.created"
    table: "incident"
    description: "Fired when Priority 1 incident is created"

# 2. Create notification
Tool: SN-Create-Record
Parameters:
  table_name: sysevent_email_action
  data:
    name: "P1 Incident Alert - All Hands"
    event_name: "incident.p1.created"
    collection: "incident"
    active: true
    weight: 100
    subject: "[URGENT] P1 Incident: ${number} - ${short_description}"
    content_type: "text/html"
    message_html: |
      <h1 style="color: #d32f2f;">Priority 1 Incident Created</h1>
      <p>A critical incident requires immediate attention.</p>
      <table>
        <tr><td><b>Number:</b></td><td>${number}</td></tr>
        <tr><td><b>Description:</b></td><td>${short_description}</td></tr>
        <tr><td><b>Caller:</b></td><td>${caller_id}</td></tr>
        <tr><td><b>Assignment Group:</b></td><td>${assignment_group}</td></tr>
      </table>
      <p><a href="${URI_REF}">View Incident Now</a></p>
    recipient_groups: [incident_managers_group_sys_id]
    send_to_event_parm_1: true
    send_to_event_parm_2: true

# 3. Create business rule to fire event
# (Create via UI or background script)
```

### Example 2: Approval Request Notification with Mail Script

```
# 1. Create mail script for manager chain
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_email
  data:
    name: "CC Manager Chain"
    script: |
      (function runMailScript(current, template, email, email_action, event) {
        // Get requested_for user
        var reqFor = current.document_id.requested_for;
        if (reqFor) {
          var user = new GlideRecord('sys_user');
          user.get(reqFor);

          // Add manager as CC
          if (user.manager && user.manager.email) {
            email.addAddress('cc', user.manager.email.toString(), user.manager.name.toString());
          }
        }
      })(current, template, email, email_action, event);

# 2. Create notification with mail script
Tool: SN-Create-Record
Parameters:
  table_name: sysevent_email_action
  data:
    name: "Approval Request - With Manager CC"
    event_name: "approval.inserted"
    collection: "sysapproval_approver"
    active: true
    subject: "Approval Required: ${document_id.number}"
    recipient_fields: "approver"
    sys_script_mail: [mail_script_sys_id]
    message_html: |
      <h2>Approval Request</h2>
      <p>You have a pending approval request.</p>
      <p><b>Request:</b> ${document_id.number}</p>
      <p><b>Requested By:</b> ${document_id.requested_for}</p>
      <p><a href="${URI_REF}">Approve/Reject</a></p>
```

### Example 3: SLA Breach Warning

```
Tool: SN-Create-Record
Parameters:
  table_name: sysevent_email_action
  data:
    name: "SLA Warning - 75% Elapsed"
    event_name: "sla.warning"
    collection: "task_sla"
    active: true
    condition: "percentage>=75^percentage<100"
    subject: "SLA Warning: ${task.number} at ${percentage}%"
    recipient_fields: "task.assigned_to"
    content_type: "text/html"
    message_html: |
      <h2 style="color: #ff9800;">SLA Warning</h2>
      <p>The following task is approaching SLA breach:</p>
      <table>
        <tr><td><b>Task:</b></td><td>${task.number}</td></tr>
        <tr><td><b>SLA:</b></td><td>${sla.name}</td></tr>
        <tr><td><b>Percentage:</b></td><td>${percentage}%</td></tr>
        <tr><td><b>Time Remaining:</b></td><td>${business_time_left}</td></tr>
      </table>
      <p><a href="${task.URI_REF}">View Task</a></p>
```

## Related Skills

- `admin/workflow-creation` - Workflow-triggered notifications
- `catalog/approval-workflows` - Approval notifications
- `itsm/incident-lifecycle` - Incident notification triggers
- `admin/script-execution` - Testing notifications via scripts

## References

- [ServiceNow Email Notifications](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/administer/notification/concept/c_EmailNotifications.html)
- [Email Templates](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/administer/notification/concept/c_EmailTemplates.html)
- [Mail Scripts](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/administer/notification/concept/c_MailScripts.html)
- [Event Registry](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/script/server-scripting/concept/c_EventRegistry.html)
- [SMS Notifications](https://docs.servicenow.com/bundle/utah-servicenow-platform/page/administer/notification/concept/c_SMSNotifications.html)
