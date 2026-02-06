---
name: scripted-rest-apis
version: 1.0.0
description: Comprehensive guide to creating, securing, and testing Scripted REST APIs in ServiceNow for custom integrations and external system connectivity
author: Happy Technologies LLC
tags: [development, rest-api, integration, scripted-rest, web-services, api-design, security]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Create-Record
    - SN-Update-Record
    - SN-Query-Table
    - SN-Get-Table-Schema
    - SN-Execute-Background-Script
    - SN-Set-Current-Application
    - SN-Set-Update-Set
  rest:
    - /api/now/table/sys_ws_definition
    - /api/now/table/sys_ws_operation
    - /api/now/table/sys_script_include
    - /api/now/table/sys_properties
  native:
    - Bash
    - Read
    - Write
complexity: advanced
estimated_time: 45-90 minutes
---

# Scripted REST API Development

## Overview

This skill provides a comprehensive guide to developing custom Scripted REST APIs in ServiceNow. Scripted REST APIs allow you to:

- **Expose custom endpoints** - Create purpose-built APIs beyond the standard Table API
- **Control data transformation** - Shape request/response formats to match integration needs
- **Implement business logic** - Execute complex operations in a single API call
- **Secure integrations** - Apply fine-grained authentication and authorization
- **Support external systems** - Provide interfaces for third-party system integration

**When to use Scripted REST APIs:**
- Standard Table API doesn't meet requirements
- Need custom business logic in the API layer
- Require specific request/response formats
- External systems need specialized endpoints
- Need to aggregate data from multiple tables

**Who should use this:** Developers, integration specialists, and administrators building custom ServiceNow integrations.

## Prerequisites

- **Roles:** `admin`, `web_service_admin`, or scoped app developer
- **Permissions:** Create/modify sys_ws_definition, sys_ws_operation
- **Knowledge:** JavaScript, REST principles, HTTP methods, JSON
- **Environment:** Development instance (never develop APIs directly in production)
- **Related Skills:**
  - `admin/update-set-management` - Capture API definitions
  - `admin/application-scope` - Scoped app API development
  - `security/acl-management` - API security controls

## Table Architecture

Understanding the underlying tables is essential for programmatic API creation.

### Core Tables

```
sys_ws_definition (API Definition)
    |
    +-- sys_ws_operation (Resources/Endpoints)
            |
            +-- Request Headers (configured in operation)
            +-- Query Parameters (configured in operation)
            +-- Path Parameters (defined in relative_path)
            +-- Script (handles request/response)
```

### Key Relationships

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sys_ws_definition` | API container | name, namespace, base_path, active |
| `sys_ws_operation` | Individual endpoints | name, http_method, relative_path, script |
| `sys_script_include` | Reusable logic | name, script, api_name |
| `sys_ws_api_header` | Custom headers | name, api_id, direction |

### API URL Structure

```
https://<instance>.service-now.com/api/<namespace>/<api_name>/<version>/<resource>/<path_param>

Example:
https://dev12345.service-now.com/api/x_company/customer_api/v1/customers/12345
    |                                |     |            |       |           |
    Instance                     Namespace  API Name  Version Resource  Path Param
```

## Procedure

### Phase 1: API Design

Before creating the API, plan the structure carefully.

#### Step 1.1: Define API Requirements

Document the API specification:

```markdown
API Name: Customer Integration API
Namespace: x_company (scoped app) or now (global)
Version: v1
Base Path: /api/x_company/customer_api

Resources:
- GET /customers - List all customers (with pagination)
- GET /customers/{id} - Get specific customer
- POST /customers - Create new customer
- PUT /customers/{id} - Update customer
- DELETE /customers/{id} - Delete customer
- POST /customers/{id}/orders - Create order for customer
```

#### Step 1.2: Plan Authentication

| Auth Type | Use Case | Configuration |
|-----------|----------|---------------|
| Basic Auth | Service accounts | Enabled by default |
| OAuth 2.0 | Third-party apps | Configure OAuth provider |
| API Key | Simple integrations | Custom header validation |
| Session | Browser-based | Cookie-based auth |
| Mutual TLS | High security | Certificate validation |

### Phase 2: Create API Definition

#### Step 2.1: Set Context (Scoped App)

If creating in a scoped application:

**Using MCP:**
```
Tool: SN-Set-Current-Application
Parameters:
  app_sys_id: [your_app_sys_id]
```

```
Tool: SN-Set-Update-Set
Parameters:
  update_set_sys_id: [your_update_set_sys_id]
```

#### Step 2.2: Create API Definition

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ws_definition
  data:
    name: Customer Integration API
    short_description: API for customer management and integration
    namespace: x_company
    doc_link: https://docs.company.com/api/customers
    active: true
    enforce_acl: true
    is_versioned: true
    baseline_version: v1
    published: false
```

**Key Fields Explained:**

| Field | Purpose | Recommendation |
|-------|---------|----------------|
| `namespace` | URL segment, typically app scope | Use app scope (x_company) |
| `enforce_acl` | Check ACLs on underlying tables | Set true for security |
| `is_versioned` | Enable API versioning | Always true |
| `baseline_version` | Default version if none specified | Start with v1 |
| `published` | Make API discoverable | Set false during development |

**Save the sys_id:** `api_definition_sys_id`

#### Step 2.3: Verify API Creation

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_ws_definition
  query: name=Customer Integration API
  fields: sys_id,name,namespace,active,service_address
```

The `service_address` field shows the full API URL.

### Phase 3: Create Resources (Operations)

#### Step 3.1: GET Collection Resource (List)

Create an endpoint to list customers with pagination.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ws_operation
  data:
    name: List Customers
    web_service_definition: [api_definition_sys_id]
    http_method: GET
    relative_path: /customers
    operation_script: |
      (function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

        // Get query parameters for pagination and filtering
        var limit = parseInt(request.queryParams.limit) || 20;
        var offset = parseInt(request.queryParams.offset) || 0;
        var active = request.queryParams.active;
        var search = request.queryParams.q;

        // Validate limit
        if (limit > 100) limit = 100;
        if (limit < 1) limit = 20;

        // Build query
        var gr = new GlideRecord('customer');

        if (active !== undefined) {
          gr.addQuery('active', active === 'true');
        }

        if (search) {
          var qc = gr.addQuery('name', 'CONTAINS', search);
          qc.addOrCondition('email', 'CONTAINS', search);
          qc.addOrCondition('account_number', 'CONTAINS', search);
        }

        // Get total count before pagination
        var countGR = new GlideAggregate('customer');
        countGR.addAggregate('COUNT');
        if (active !== undefined) {
          countGR.addQuery('active', active === 'true');
        }
        countGR.query();
        var totalCount = 0;
        if (countGR.next()) {
          totalCount = parseInt(countGR.getAggregate('COUNT'));
        }

        // Apply pagination
        gr.orderBy('name');
        gr.chooseWindow(offset, offset + limit);
        gr.query();

        // Build response
        var customers = [];
        while (gr.next()) {
          customers.push({
            sys_id: gr.getUniqueValue(),
            name: gr.getValue('name'),
            email: gr.getValue('email'),
            account_number: gr.getValue('account_number'),
            active: gr.getValue('active') === 'true',
            created: gr.getValue('sys_created_on'),
            updated: gr.getValue('sys_updated_on')
          });
        }

        // Set response
        response.setStatus(200);
        response.setBody({
          result: customers,
          meta: {
            total: totalCount,
            limit: limit,
            offset: offset,
            has_more: (offset + limit) < totalCount
          }
        });

      })(request, response);
    short_description: Retrieve list of customers with pagination
    requires_acl_authorization: true
    requires_authentication: true
    requires_snc_internal_role: false
```

**Save the sys_id:** `list_customers_operation_id`

#### Step 3.2: GET Single Resource

Create an endpoint to retrieve a specific customer.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ws_operation
  data:
    name: Get Customer
    web_service_definition: [api_definition_sys_id]
    http_method: GET
    relative_path: /customers/{id}
    operation_script: |
      (function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

        // Get path parameter
        var customerId = request.pathParams.id;

        // Validate input
        if (!customerId) {
          response.setStatus(400);
          response.setBody({
            error: {
              message: 'Customer ID is required',
              code: 'MISSING_PARAMETER'
            }
          });
          return;
        }

        // Query customer
        var gr = new GlideRecord('customer');

        // Support both sys_id and account_number lookup
        if (customerId.length === 32) {
          gr.get(customerId);
        } else {
          gr.addQuery('account_number', customerId);
          gr.query();
          gr.next();
        }

        if (!gr.isValidRecord()) {
          response.setStatus(404);
          response.setBody({
            error: {
              message: 'Customer not found',
              code: 'NOT_FOUND',
              detail: 'No customer exists with ID: ' + customerId
            }
          });
          return;
        }

        // Check ACL (optional if enforce_acl is true on definition)
        if (!gr.canRead()) {
          response.setStatus(403);
          response.setBody({
            error: {
              message: 'Access denied',
              code: 'FORBIDDEN'
            }
          });
          return;
        }

        // Build detailed response
        var customer = {
          sys_id: gr.getUniqueValue(),
          name: gr.getValue('name'),
          email: gr.getValue('email'),
          phone: gr.getValue('phone'),
          account_number: gr.getValue('account_number'),
          address: {
            street: gr.getValue('street'),
            city: gr.getValue('city'),
            state: gr.getValue('state'),
            zip: gr.getValue('zip'),
            country: gr.getValue('country')
          },
          contacts: [],
          active: gr.getValue('active') === 'true',
          created: gr.getValue('sys_created_on'),
          updated: gr.getValue('sys_updated_on'),
          created_by: gr.getDisplayValue('sys_created_by'),
          updated_by: gr.getDisplayValue('sys_updated_by')
        };

        // Get related contacts
        var contacts = new GlideRecord('customer_contact');
        contacts.addQuery('customer', gr.getUniqueValue());
        contacts.query();
        while (contacts.next()) {
          customer.contacts.push({
            sys_id: contacts.getUniqueValue(),
            name: contacts.getValue('name'),
            email: contacts.getValue('email'),
            phone: contacts.getValue('phone'),
            primary: contacts.getValue('primary') === 'true'
          });
        }

        response.setStatus(200);
        response.setBody({ result: customer });

      })(request, response);
    short_description: Retrieve a specific customer by ID
    requires_acl_authorization: true
    requires_authentication: true
```

#### Step 3.3: POST Resource (Create)

Create an endpoint to create a new customer.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ws_operation
  data:
    name: Create Customer
    web_service_definition: [api_definition_sys_id]
    http_method: POST
    relative_path: /customers
    operation_script: |
      (function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

        // Parse request body
        var body = request.body.data;

        // Validate required fields
        var errors = [];
        if (!body.name) errors.push('name is required');
        if (!body.email) errors.push('email is required');

        // Validate email format
        if (body.email && !body.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          errors.push('email format is invalid');
        }

        if (errors.length > 0) {
          response.setStatus(400);
          response.setBody({
            error: {
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: errors
            }
          });
          return;
        }

        // Check for duplicate email
        var existing = new GlideRecord('customer');
        existing.addQuery('email', body.email);
        existing.query();
        if (existing.next()) {
          response.setStatus(409);
          response.setBody({
            error: {
              message: 'Customer with this email already exists',
              code: 'DUPLICATE_ERROR',
              existing_id: existing.getUniqueValue()
            }
          });
          return;
        }

        // Create customer
        var gr = new GlideRecord('customer');
        gr.initialize();

        // Required fields
        gr.setValue('name', body.name);
        gr.setValue('email', body.email);

        // Optional fields
        if (body.phone) gr.setValue('phone', body.phone);
        if (body.account_number) gr.setValue('account_number', body.account_number);
        if (body.address) {
          if (body.address.street) gr.setValue('street', body.address.street);
          if (body.address.city) gr.setValue('city', body.address.city);
          if (body.address.state) gr.setValue('state', body.address.state);
          if (body.address.zip) gr.setValue('zip', body.address.zip);
          if (body.address.country) gr.setValue('country', body.address.country);
        }

        gr.setValue('active', true);

        // Check create permission
        if (!gr.canCreate()) {
          response.setStatus(403);
          response.setBody({
            error: {
              message: 'Permission denied to create customer',
              code: 'FORBIDDEN'
            }
          });
          return;
        }

        var sysId = gr.insert();

        if (sysId) {
          // Set Location header for created resource
          response.setHeader('Location', request.url + '/' + sysId);
          response.setStatus(201);
          response.setBody({
            result: {
              sys_id: sysId,
              message: 'Customer created successfully'
            }
          });
        } else {
          response.setStatus(500);
          response.setBody({
            error: {
              message: 'Failed to create customer',
              code: 'INTERNAL_ERROR'
            }
          });
        }

      })(request, response);
    short_description: Create a new customer
    requires_acl_authorization: true
    requires_authentication: true
```

#### Step 3.4: PUT Resource (Update)

Create an endpoint to update an existing customer.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ws_operation
  data:
    name: Update Customer
    web_service_definition: [api_definition_sys_id]
    http_method: PUT
    relative_path: /customers/{id}
    operation_script: |
      (function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

        var customerId = request.pathParams.id;
        var body = request.body.data;

        // Find customer
        var gr = new GlideRecord('customer');
        if (!gr.get(customerId)) {
          response.setStatus(404);
          response.setBody({
            error: {
              message: 'Customer not found',
              code: 'NOT_FOUND'
            }
          });
          return;
        }

        // Check update permission
        if (!gr.canWrite()) {
          response.setStatus(403);
          response.setBody({
            error: {
              message: 'Permission denied to update customer',
              code: 'FORBIDDEN'
            }
          });
          return;
        }

        // Validate email if being changed
        if (body.email && body.email !== gr.getValue('email')) {
          if (!body.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            response.setStatus(400);
            response.setBody({
              error: {
                message: 'Invalid email format',
                code: 'VALIDATION_ERROR'
              }
            });
            return;
          }

          // Check for duplicate
          var existing = new GlideRecord('customer');
          existing.addQuery('email', body.email);
          existing.addQuery('sys_id', '!=', customerId);
          existing.query();
          if (existing.next()) {
            response.setStatus(409);
            response.setBody({
              error: {
                message: 'Another customer with this email exists',
                code: 'DUPLICATE_ERROR'
              }
            });
            return;
          }
        }

        // Update fields
        var updatedFields = [];

        if (body.name !== undefined) {
          gr.setValue('name', body.name);
          updatedFields.push('name');
        }
        if (body.email !== undefined) {
          gr.setValue('email', body.email);
          updatedFields.push('email');
        }
        if (body.phone !== undefined) {
          gr.setValue('phone', body.phone);
          updatedFields.push('phone');
        }
        if (body.active !== undefined) {
          gr.setValue('active', body.active);
          updatedFields.push('active');
        }
        if (body.address) {
          if (body.address.street !== undefined) gr.setValue('street', body.address.street);
          if (body.address.city !== undefined) gr.setValue('city', body.address.city);
          if (body.address.state !== undefined) gr.setValue('state', body.address.state);
          if (body.address.zip !== undefined) gr.setValue('zip', body.address.zip);
          if (body.address.country !== undefined) gr.setValue('country', body.address.country);
          updatedFields.push('address');
        }

        gr.update();

        response.setStatus(200);
        response.setBody({
          result: {
            sys_id: customerId,
            message: 'Customer updated successfully',
            updated_fields: updatedFields
          }
        });

      })(request, response);
    short_description: Update an existing customer
    requires_acl_authorization: true
    requires_authentication: true
```

#### Step 3.5: DELETE Resource

Create an endpoint to delete a customer.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ws_operation
  data:
    name: Delete Customer
    web_service_definition: [api_definition_sys_id]
    http_method: DELETE
    relative_path: /customers/{id}
    operation_script: |
      (function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

        var customerId = request.pathParams.id;

        // Find customer
        var gr = new GlideRecord('customer');
        if (!gr.get(customerId)) {
          response.setStatus(404);
          response.setBody({
            error: {
              message: 'Customer not found',
              code: 'NOT_FOUND'
            }
          });
          return;
        }

        // Check delete permission
        if (!gr.canDelete()) {
          response.setStatus(403);
          response.setBody({
            error: {
              message: 'Permission denied to delete customer',
              code: 'FORBIDDEN'
            }
          });
          return;
        }

        // Soft delete vs hard delete decision
        // Option 1: Soft delete (preferred)
        gr.setValue('active', false);
        gr.update();

        // Option 2: Hard delete (use with caution)
        // gr.deleteRecord();

        response.setStatus(200);
        response.setBody({
          result: {
            sys_id: customerId,
            message: 'Customer deactivated successfully'
          }
        });

        // Alternative: Return 204 No Content for true DELETE
        // response.setStatus(204);

      })(request, response);
    short_description: Delete (deactivate) a customer
    requires_acl_authorization: true
    requires_authentication: true
```

### Phase 4: Authentication and Security

#### Step 4.1: Configure API-Level Authentication

The API definition controls authentication requirements:

```
Tool: SN-Update-Record
Parameters:
  table_name: sys_ws_definition
  sys_id: [api_definition_sys_id]
  data:
    requires_authentication: true
    enforce_acl: true
    acl_failure_result: UNAUTHORIZED
```

#### Step 4.2: Implement API Key Authentication

For simple integrations, implement API key validation:

**Create API Key Script Include:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_include
  data:
    name: CustomerAPIAuth
    script: |
      var CustomerAPIAuth = Class.create();
      CustomerAPIAuth.prototype = {
        initialize: function() {
          this.API_KEY_HEADER = 'X-API-Key';
          this.API_KEY_TABLE = 'x_company_api_keys';
        },

        validateApiKey: function(request) {
          var apiKey = request.getHeader(this.API_KEY_HEADER);

          if (!apiKey) {
            return {
              valid: false,
              error: 'API key required',
              code: 'MISSING_API_KEY'
            };
          }

          // Look up API key
          var keyRecord = new GlideRecord(this.API_KEY_TABLE);
          keyRecord.addQuery('key_value', apiKey);
          keyRecord.addQuery('active', true);
          keyRecord.addQuery('expires', '>', new GlideDateTime());
          keyRecord.query();

          if (!keyRecord.next()) {
            return {
              valid: false,
              error: 'Invalid or expired API key',
              code: 'INVALID_API_KEY'
            };
          }

          // Update last used timestamp
          keyRecord.setValue('last_used', new GlideDateTime());
          keyRecord.update();

          return {
            valid: true,
            client_id: keyRecord.getValue('client_id'),
            permissions: keyRecord.getValue('permissions').split(','),
            rate_limit: parseInt(keyRecord.getValue('rate_limit')) || 1000
          };
        },

        type: 'CustomerAPIAuth'
      };
    api_name: CustomerAPIAuth
    active: true
    access: public
```

**Use in API Operation:**
```javascript
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

  // Validate API key
  var auth = new CustomerAPIAuth();
  var authResult = auth.validateApiKey(request);

  if (!authResult.valid) {
    response.setStatus(401);
    response.setBody({
      error: {
        message: authResult.error,
        code: authResult.code
      }
    });
    return;
  }

  // Check permission
  if (authResult.permissions.indexOf('read:customers') === -1) {
    response.setStatus(403);
    response.setBody({
      error: {
        message: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: 'read:customers'
      }
    });
    return;
  }

  // Continue with request processing...

})(request, response);
```

#### Step 4.3: Implement Rate Limiting

Add rate limiting to protect the API:

**Create Rate Limiter Script Include:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_include
  data:
    name: APIRateLimiter
    script: |
      var APIRateLimiter = Class.create();
      APIRateLimiter.prototype = {
        initialize: function(clientId, rateLimit) {
          this.clientId = clientId;
          this.rateLimit = rateLimit || 100;  // requests per minute
          this.CACHE_PREFIX = 'api_rate_';
        },

        isAllowed: function() {
          var cacheKey = this.CACHE_PREFIX + this.clientId;
          var cache = new GlideSysCache('APIRateLimit');

          // Get current count
          var countStr = cache.get(cacheKey);
          var count = countStr ? parseInt(countStr) : 0;

          if (count >= this.rateLimit) {
            return {
              allowed: false,
              remaining: 0,
              reset_in: 60
            };
          }

          // Increment count with 60 second TTL
          cache.put(cacheKey, String(count + 1), 60);

          return {
            allowed: true,
            remaining: this.rateLimit - count - 1,
            limit: this.rateLimit
          };
        },

        type: 'APIRateLimiter'
      };
    api_name: APIRateLimiter
    active: true
```

**Use Rate Limiting in API:**
```javascript
// After authentication
var rateLimiter = new APIRateLimiter(authResult.client_id, authResult.rate_limit);
var rateResult = rateLimiter.isAllowed();

response.setHeader('X-RateLimit-Limit', rateResult.limit || authResult.rate_limit);
response.setHeader('X-RateLimit-Remaining', rateResult.remaining);

if (!rateResult.allowed) {
  response.setStatus(429);
  response.setHeader('Retry-After', rateResult.reset_in);
  response.setBody({
    error: {
      message: 'Rate limit exceeded',
      code: 'RATE_LIMITED',
      retry_after: rateResult.reset_in
    }
  });
  return;
}
```

### Phase 5: Query Parameters and Path Parameters

#### Step 5.1: Common Query Parameter Patterns

```javascript
// Pagination
var limit = Math.min(parseInt(request.queryParams.limit) || 20, 100);
var offset = parseInt(request.queryParams.offset) || 0;
var page = parseInt(request.queryParams.page) || 1;
offset = (page - 1) * limit;  // If using page instead of offset

// Sorting
var sortField = request.queryParams.sort || 'name';
var sortOrder = request.queryParams.order || 'asc';
var validSortFields = ['name', 'email', 'created', 'updated'];
if (validSortFields.indexOf(sortField) === -1) {
  sortField = 'name';
}
if (sortOrder === 'desc') {
  gr.orderByDesc(sortField);
} else {
  gr.orderBy(sortField);
}

// Filtering
var filters = {
  active: request.queryParams.active,
  category: request.queryParams.category,
  created_after: request.queryParams.created_after,
  created_before: request.queryParams.created_before
};

if (filters.active !== undefined) {
  gr.addQuery('active', filters.active === 'true');
}
if (filters.category) {
  gr.addQuery('category', filters.category);
}
if (filters.created_after) {
  gr.addQuery('sys_created_on', '>=', filters.created_after);
}
if (filters.created_before) {
  gr.addQuery('sys_created_on', '<=', filters.created_before);
}

// Field selection
var fields = request.queryParams.fields;
if (fields) {
  var fieldList = fields.split(',');
  // Validate fields before use
  var validFields = ['sys_id', 'name', 'email', 'phone', 'active'];
  fieldList = fieldList.filter(function(f) {
    return validFields.indexOf(f.trim()) !== -1;
  });
}

// Search/Text filter
var searchQuery = request.queryParams.q || request.queryParams.search;
if (searchQuery) {
  var qc = gr.addQuery('name', 'CONTAINS', searchQuery);
  qc.addOrCondition('description', 'CONTAINS', searchQuery);
}
```

#### Step 5.2: Path Parameter Patterns

```javascript
// Single path parameter
// URL: /customers/{id}
var customerId = request.pathParams.id;

// Multiple path parameters
// URL: /customers/{customer_id}/orders/{order_id}
var customerId = request.pathParams.customer_id;
var orderId = request.pathParams.order_id;

// Validate path parameters
if (!customerId || customerId.length < 1) {
  response.setStatus(400);
  response.setBody({
    error: {
      message: 'Invalid customer ID',
      code: 'INVALID_PARAMETER'
    }
  });
  return;
}

// Support multiple ID formats
function resolveCustomerId(id) {
  // sys_id (32 char hex)
  if (/^[a-f0-9]{32}$/i.test(id)) {
    return { field: 'sys_id', value: id };
  }
  // Account number (numeric or alphanumeric)
  if (/^[A-Z]{2}\d{6}$/.test(id)) {
    return { field: 'account_number', value: id };
  }
  // Email
  if (id.indexOf('@') !== -1) {
    return { field: 'email', value: id };
  }
  return null;
}

var idInfo = resolveCustomerId(customerId);
if (!idInfo) {
  response.setStatus(400);
  response.setBody({
    error: {
      message: 'Unrecognized ID format',
      code: 'INVALID_ID_FORMAT',
      supported_formats: ['sys_id', 'account_number (XX000000)', 'email']
    }
  });
  return;
}
```

### Phase 6: Error Handling and Status Codes

#### Step 6.1: Standard Error Response Format

```javascript
// Error response helper
function sendError(response, status, message, code, details) {
  response.setStatus(status);
  var error = {
    error: {
      message: message,
      code: code,
      timestamp: new GlideDateTime().getValue()
    }
  };
  if (details) {
    error.error.details = details;
  }
  response.setBody(error);
}

// Usage examples
sendError(response, 400, 'Invalid request body', 'BAD_REQUEST');
sendError(response, 401, 'Authentication required', 'UNAUTHORIZED');
sendError(response, 403, 'Permission denied', 'FORBIDDEN');
sendError(response, 404, 'Resource not found', 'NOT_FOUND');
sendError(response, 409, 'Conflict with existing resource', 'CONFLICT');
sendError(response, 422, 'Validation failed', 'VALIDATION_ERROR', errors);
sendError(response, 429, 'Rate limit exceeded', 'RATE_LIMITED');
sendError(response, 500, 'Internal server error', 'INTERNAL_ERROR');
sendError(response, 503, 'Service unavailable', 'SERVICE_UNAVAILABLE');
```

#### Step 6.2: Comprehensive Error Handling

```javascript
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

  try {
    // Wrap entire request processing in try-catch

    // Validate content type for POST/PUT
    if (['POST', 'PUT', 'PATCH'].indexOf(request.getMethod()) !== -1) {
      var contentType = request.getHeader('Content-Type');
      if (!contentType || contentType.indexOf('application/json') === -1) {
        response.setStatus(415);
        response.setBody({
          error: {
            message: 'Content-Type must be application/json',
            code: 'UNSUPPORTED_MEDIA_TYPE'
          }
        });
        return;
      }
    }

    // Parse body with error handling
    var body;
    try {
      body = request.body.data;
      if (!body && request.body.dataString) {
        body = JSON.parse(request.body.dataString);
      }
    } catch (parseError) {
      response.setStatus(400);
      response.setBody({
        error: {
          message: 'Invalid JSON in request body',
          code: 'PARSE_ERROR',
          detail: parseError.message
        }
      });
      return;
    }

    // Main processing logic here...

  } catch (e) {
    // Log error for debugging
    gs.error('[CustomerAPI] Unhandled error: ' + e.message + '\nStack: ' + e.stack);

    response.setStatus(500);
    response.setBody({
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        reference: gs.generateGUID()  // For support reference
      }
    });
  }

})(request, response);
```

#### Step 6.3: HTTP Status Code Reference

| Status | Meaning | When to Use |
|--------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST creating new resource |
| 204 | No Content | Successful DELETE with no response body |
| 400 | Bad Request | Invalid syntax, missing required fields |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | HTTP method not supported for endpoint |
| 409 | Conflict | Duplicate resource, state conflict |
| 415 | Unsupported Media Type | Wrong Content-Type header |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Temporary maintenance/overload |

### Phase 7: API Versioning

#### Step 7.1: Version Configuration

**Update API Definition for Versioning:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_ws_definition
  sys_id: [api_definition_sys_id]
  data:
    is_versioned: true
    baseline_version: v1
    deprecated_versions: v1-beta
```

#### Step 7.2: Version-Specific Operations

Create version-specific endpoints:

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ws_operation
  data:
    name: List Customers v2
    web_service_definition: [api_definition_sys_id]
    http_method: GET
    relative_path: /v2/customers
    operation_script: |
      // V2 version with enhanced response format
      (function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

        // V2 includes additional fields and different structure
        var customers = [];
        var gr = new GlideRecord('customer');
        gr.query();

        while (gr.next()) {
          customers.push({
            id: gr.getUniqueValue(),
            attributes: {
              name: gr.getValue('name'),
              email: gr.getValue('email'),
              phone: gr.getValue('phone')
            },
            relationships: {
              contacts: '/api/x_company/customer_api/v2/customers/' + gr.getUniqueValue() + '/contacts',
              orders: '/api/x_company/customer_api/v2/customers/' + gr.getUniqueValue() + '/orders'
            },
            meta: {
              created: gr.getValue('sys_created_on'),
              updated: gr.getValue('sys_updated_on')
            }
          });
        }

        response.setStatus(200);
        response.setBody({
          data: customers,
          links: {
            self: request.url,
            next: null,
            prev: null
          }
        });

      })(request, response);
```

#### Step 7.3: Deprecation Headers

```javascript
// Add deprecation headers for old versions
if (request.url.indexOf('/v1/') !== -1) {
  response.setHeader('Deprecation', 'true');
  response.setHeader('Sunset', 'Sat, 01 Jul 2027 00:00:00 GMT');
  response.setHeader('Link', '</api/x_company/customer_api/v2/customers>; rel="successor-version"');
}
```

### Phase 8: Documentation and Testing

#### Step 8.1: API Explorer Integration

ServiceNow automatically generates API Explorer documentation. Enhance it:

```
Tool: SN-Update-Record
Parameters:
  table_name: sys_ws_definition
  sys_id: [api_definition_sys_id]
  data:
    doc_link: https://docs.company.com/api/customers
    short_description: |
      Customer management API for external integrations.

      Authentication: Basic Auth or API Key (X-API-Key header)
      Rate Limit: 100 requests per minute

      Base URL: https://instance.service-now.com/api/x_company/customer_api/v1
```

#### Step 8.2: Testing with curl

**GET Request:**
```bash
# List customers
curl -X GET \
  "https://dev12345.service-now.com/api/x_company/customer_api/v1/customers?limit=10&offset=0" \
  -H "Accept: application/json" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)"

# Get specific customer
curl -X GET \
  "https://dev12345.service-now.com/api/x_company/customer_api/v1/customers/abc123def456" \
  -H "Accept: application/json" \
  -H "X-API-Key: your-api-key-here"
```

**POST Request:**
```bash
curl -X POST \
  "https://dev12345.service-now.com/api/x_company/customer_api/v1/customers" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \
  -d '{
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "phone": "555-1234",
    "address": {
      "street": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "zip": "62701"
    }
  }'
```

**PUT Request:**
```bash
curl -X PUT \
  "https://dev12345.service-now.com/api/x_company/customer_api/v1/customers/abc123def456" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \
  -d '{
    "name": "Acme Corporation Updated",
    "phone": "555-5678"
  }'
```

**DELETE Request:**
```bash
curl -X DELETE \
  "https://dev12345.service-now.com/api/x_company/customer_api/v1/customers/abc123def456" \
  -H "Accept: application/json" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)"
```

#### Step 8.3: Testing with Postman

**Postman Collection Structure:**
```json
{
  "info": {
    "name": "Customer API",
    "description": "ServiceNow Customer Integration API"
  },
  "variable": [
    { "key": "base_url", "value": "https://dev12345.service-now.com" },
    { "key": "api_path", "value": "/api/x_company/customer_api/v1" }
  ],
  "auth": {
    "type": "basic",
    "basic": [
      { "key": "username", "value": "{{username}}" },
      { "key": "password", "value": "{{password}}" }
    ]
  },
  "item": [
    {
      "name": "List Customers",
      "request": {
        "method": "GET",
        "url": "{{base_url}}{{api_path}}/customers?limit=10"
      }
    },
    {
      "name": "Create Customer",
      "request": {
        "method": "POST",
        "url": "{{base_url}}{{api_path}}/customers",
        "body": {
          "mode": "raw",
          "raw": "{ \"name\": \"Test Customer\", \"email\": \"test@example.com\" }"
        }
      }
    }
  ]
}
```

**Postman Tests:**
```javascript
// Test response status
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

// Test response structure
pm.test("Response has result array", function () {
  var jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('result');
  pm.expect(jsonData.result).to.be.an('array');
});

// Test pagination
pm.test("Response has meta with pagination", function () {
  var jsonData = pm.response.json();
  pm.expect(jsonData.meta).to.have.property('total');
  pm.expect(jsonData.meta).to.have.property('limit');
  pm.expect(jsonData.meta).to.have.property('offset');
});

// Save sys_id for subsequent requests
pm.test("Save created customer ID", function () {
  var jsonData = pm.response.json();
  if (jsonData.result && jsonData.result.sys_id) {
    pm.environment.set("customer_id", jsonData.result.sys_id);
  }
});
```

### Phase 9: Publishing and Activation

#### Step 9.1: Pre-Publication Checklist

Before publishing, verify:

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_ws_operation
  query: web_service_definition=[api_definition_sys_id]
  fields: name,http_method,relative_path,requires_authentication
```

**Checklist:**
- [ ] All operations have authentication enabled
- [ ] Error handling implemented in all scripts
- [ ] Rate limiting configured
- [ ] Input validation complete
- [ ] ACL enforcement enabled
- [ ] Documentation updated
- [ ] Test cases passing
- [ ] Update set captured

#### Step 9.2: Publish API

```
Tool: SN-Update-Record
Parameters:
  table_name: sys_ws_definition
  sys_id: [api_definition_sys_id]
  data:
    published: true
    active: true
```

#### Step 9.3: Verify Publication

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_ws_definition
  query: sys_id=[api_definition_sys_id]
  fields: name,active,published,service_address
```

The API is now accessible at the `service_address` URL.

## Tool Usage Summary

| Operation | MCP Tool | Purpose |
|-----------|----------|---------|
| Create API | SN-Create-Record (sys_ws_definition) | Create API container |
| Create Resource | SN-Create-Record (sys_ws_operation) | Add endpoints |
| Update API | SN-Update-Record | Modify settings |
| Query APIs | SN-Query-Table | List/verify APIs |
| Schema Discovery | SN-Get-Table-Schema | Understand table structure |
| Test Scripts | SN-Execute-Background-Script | Test API logic |

## Best Practices

- **Design First:** Plan API structure before implementation
- **Version from Start:** Always enable versioning (is_versioned: true)
- **Consistent Responses:** Use standard error/success formats
- **Validate Everything:** Input validation before processing
- **Secure by Default:** Enable authentication on all endpoints
- **Document Thoroughly:** Use short_description and doc_link
- **Test Extensively:** Use curl/Postman before publication
- **Monitor Usage:** Log API calls for debugging and metrics
- **Rate Limit:** Protect against abuse
- **Use Script Includes:** Centralize reusable logic

## Troubleshooting

### API Returns 404

**Symptom:** API endpoint not found
**Causes:**
- API not published/active
- Incorrect URL path
- Wrong namespace
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_ws_definition
  query: name=[your_api_name]
  fields: active,published,service_address,namespace
```

### 401 Unauthorized

**Symptom:** Authentication fails
**Causes:**
- Invalid credentials
- User lacks REST API access
- Missing web_service_admin role
**Solution:**
1. Verify credentials with Table API first
2. Check user has rest_service role
3. Verify API key if using custom auth

### 403 Forbidden

**Symptom:** Access denied after authentication
**Causes:**
- ACL blocking access
- Missing table permissions
- Scoped app restrictions
**Solution:**
1. Check ACLs on underlying table
2. Verify user roles match ACL requirements
3. Check enforce_acl setting on API

### 500 Internal Server Error

**Symptom:** Server error with no detail
**Causes:**
- Script error in operation
- Invalid GlideRecord query
- Null reference in script
**Solution:**
1. Check System Logs for script errors
2. Add try-catch to operation script
3. Test script in background scripts first

### Response Body Empty

**Symptom:** 200 status but no body
**Causes:**
- Missing response.setBody()
- Script terminated early
- Body set before return
**Solution:**
1. Verify response.setBody() is called
2. Check all code paths set response
3. Ensure no early returns without response

### Script Not Executing

**Symptom:** API returns but script doesn't run
**Causes:**
- Script syntax error
- Operation not linked to API
- Wrong HTTP method
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_ws_operation
  query: web_service_definition=[api_sys_id]
  fields: name,http_method,active,operation_script
```

## Examples

### Example 1: Minimal CRUD API

Complete minimal API with basic CRUD:

```
# 1. Create API Definition
Tool: SN-Create-Record
Parameters:
  table_name: sys_ws_definition
  data:
    name: Simple Task API
    namespace: x_company
    short_description: Simple task management API
    active: true
    is_versioned: true
    baseline_version: v1

# 2. Create List Operation
Tool: SN-Create-Record
Parameters:
  table_name: sys_ws_operation
  data:
    name: List Tasks
    web_service_definition: [api_sys_id]
    http_method: GET
    relative_path: /tasks
    operation_script: |
      (function process(request, response) {
        var gr = new GlideRecord('x_company_task');
        gr.setLimit(100);
        gr.query();
        var tasks = [];
        while (gr.next()) {
          tasks.push({
            sys_id: gr.getUniqueValue(),
            name: gr.getValue('name'),
            status: gr.getValue('status')
          });
        }
        response.setBody({ result: tasks });
      })(request, response);

# 3. Create Get Operation
Tool: SN-Create-Record
Parameters:
  table_name: sys_ws_operation
  data:
    name: Get Task
    web_service_definition: [api_sys_id]
    http_method: GET
    relative_path: /tasks/{id}
    operation_script: |
      (function process(request, response) {
        var gr = new GlideRecord('x_company_task');
        if (gr.get(request.pathParams.id)) {
          response.setBody({
            result: {
              sys_id: gr.getUniqueValue(),
              name: gr.getValue('name'),
              description: gr.getValue('description'),
              status: gr.getValue('status')
            }
          });
        } else {
          response.setStatus(404);
          response.setBody({ error: { message: 'Task not found' }});
        }
      })(request, response);
```

### Example 2: Search API with Aggregations

```javascript
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

  var searchTerm = request.queryParams.q;
  var category = request.queryParams.category;
  var includeStats = request.queryParams.stats === 'true';

  // Search incidents
  var gr = new GlideRecord('incident');

  if (searchTerm) {
    var qc = gr.addQuery('short_description', 'CONTAINS', searchTerm);
    qc.addOrCondition('description', 'CONTAINS', searchTerm);
    qc.addOrCondition('number', searchTerm);
  }

  if (category) {
    gr.addQuery('category', category);
  }

  gr.addQuery('active', true);
  gr.setLimit(50);
  gr.orderByDesc('sys_created_on');
  gr.query();

  var results = [];
  while (gr.next()) {
    results.push({
      number: gr.getValue('number'),
      short_description: gr.getValue('short_description'),
      priority: gr.getDisplayValue('priority'),
      state: gr.getDisplayValue('state'),
      created: gr.getValue('sys_created_on')
    });
  }

  var responseBody = {
    query: searchTerm,
    count: results.length,
    results: results
  };

  // Add statistics if requested
  if (includeStats) {
    var stats = {};

    // Count by priority
    var priorityAgg = new GlideAggregate('incident');
    priorityAgg.addQuery('active', true);
    priorityAgg.addAggregate('COUNT');
    priorityAgg.groupBy('priority');
    priorityAgg.query();

    stats.by_priority = {};
    while (priorityAgg.next()) {
      var priority = priorityAgg.getDisplayValue('priority');
      stats.by_priority[priority] = parseInt(priorityAgg.getAggregate('COUNT'));
    }

    responseBody.stats = stats;
  }

  response.setStatus(200);
  response.setBody(responseBody);

})(request, response);
```

### Example 3: Bulk Operations API

```javascript
(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

  var body = request.body.data;

  // Validate bulk request
  if (!body.operations || !Array.isArray(body.operations)) {
    response.setStatus(400);
    response.setBody({
      error: {
        message: 'operations array required',
        code: 'VALIDATION_ERROR'
      }
    });
    return;
  }

  if (body.operations.length > 100) {
    response.setStatus(400);
    response.setBody({
      error: {
        message: 'Maximum 100 operations per request',
        code: 'LIMIT_EXCEEDED'
      }
    });
    return;
  }

  var results = [];

  body.operations.forEach(function(op, index) {
    var result = { index: index, operation: op.action };

    try {
      switch (op.action) {
        case 'create':
          var gr = new GlideRecord('customer');
          gr.initialize();
          for (var field in op.data) {
            gr.setValue(field, op.data[field]);
          }
          result.sys_id = gr.insert();
          result.success = !!result.sys_id;
          break;

        case 'update':
          var grUpdate = new GlideRecord('customer');
          if (grUpdate.get(op.sys_id)) {
            for (var updateField in op.data) {
              grUpdate.setValue(updateField, op.data[updateField]);
            }
            grUpdate.update();
            result.success = true;
          } else {
            result.success = false;
            result.error = 'Record not found';
          }
          break;

        case 'delete':
          var grDelete = new GlideRecord('customer');
          if (grDelete.get(op.sys_id)) {
            grDelete.setValue('active', false);
            grDelete.update();
            result.success = true;
          } else {
            result.success = false;
            result.error = 'Record not found';
          }
          break;

        default:
          result.success = false;
          result.error = 'Unknown action: ' + op.action;
      }
    } catch (e) {
      result.success = false;
      result.error = e.message;
    }

    results.push(result);
  });

  var successCount = results.filter(function(r) { return r.success; }).length;

  response.setStatus(successCount === results.length ? 200 : 207);  // 207 = Multi-Status
  response.setBody({
    summary: {
      total: results.length,
      succeeded: successCount,
      failed: results.length - successCount
    },
    results: results
  });

})(request, response);
```

## Related Skills

- `admin/update-set-management` - Capture API definitions in update sets
- `admin/application-scope` - Create APIs in scoped applications
- `security/acl-management` - Configure API security
- `admin/script-execution` - Test API scripts
- `catalog/request-fulfillment` - API-driven fulfillment

## References

- [ServiceNow Scripted REST APIs](https://docs.servicenow.com/bundle/utah-api-reference/page/integrate/custom-web-services/concept/c_CustomWebServices.html)
- [REST API Request Object](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/sn_ws-namespace/c_RESTAPIRequest)
- [REST API Response Object](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/sn_ws-namespace/c_RESTAPIResponse)
- [GlideRecord API](https://developer.servicenow.com/dev.do#!/reference/api/utah/server/c_GlideRecordScopedAPI)
- [API Explorer](https://docs.servicenow.com/bundle/utah-api-reference/page/integrate/inbound-rest/concept/c_GettingStartedWithREST.html)
- [OAuth 2.0 Configuration](https://docs.servicenow.com/bundle/utah-platform-security/page/administer/security/concept/c_OAuth.html)
