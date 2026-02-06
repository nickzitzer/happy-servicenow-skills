# Happy ServiceNow Skills Specification

Version: 1.0.0

This document defines the specification for creating skills in the Happy ServiceNow AI Skills library.

## File Format

Skills are written as Markdown files with YAML frontmatter.

```markdown
---
# YAML Frontmatter (Required)
name: skill-name
version: 1.0.0
description: Brief description
...
---

# Markdown Body
Content here...
```

## Frontmatter Specification

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique skill identifier (kebab-case) |
| `version` | string | Semantic version (x.y.z) |
| `description` | string | Brief description (under 200 chars) |

### Recommended Fields

| Field | Type | Description |
|-------|------|-------------|
| `author` | string | Author or organization name |
| `tags` | array | Searchable tags for discovery |
| `platforms` | array | Supported AI platforms |
| `tools` | object | Tools used by this skill |
| `complexity` | string | Skill complexity level |
| `estimated_time` | string | Typical completion time |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `prerequisites` | array | Required skills or knowledge |
| `related_skills` | array | Related skill paths |
| `servicenow_version` | string | Minimum ServiceNow version |
| `plugins` | array | Required ServiceNow plugins |

## Field Details

### name

- Must be unique within category
- Use kebab-case (lowercase with hyphens)
- Should be descriptive but concise

```yaml
name: incident-triage        # Good
name: Incident Triage        # Bad (spaces, capitals)
name: triage                 # Bad (not descriptive enough)
```

### version

- Follow semantic versioning (semver)
- Major.Minor.Patch

```yaml
version: 1.0.0   # Initial release
version: 1.1.0   # New feature added
version: 1.1.1   # Bug fix
version: 2.0.0   # Breaking changes
```

### tags

- Use lowercase
- Include relevant categories
- Max 10 tags recommended

```yaml
tags:
  - itsm
  - incident
  - triage
  - assignment
  - itil
```

### platforms

Valid values:
- `claude-code` - Claude Code CLI
- `claude-desktop` - Claude Desktop App
- `chatgpt` - OpenAI ChatGPT
- `cursor` - Cursor IDE
- `any` - Platform agnostic

```yaml
platforms:
  - claude-code
  - claude-desktop
  - chatgpt
  - any
```

### tools

Organized by tool type:

```yaml
tools:
  mcp:                    # MCP tools (ServiceNow MCP Server)
    - SN-Query-Table
    - SN-Create-Record
  rest:                   # REST API endpoints
    - /api/now/table/incident
    - /api/now/table/sys_user
  native:                 # Native agent tools
    - Bash
    - Read
    - Write
  cli:                    # Command-line tools
    - curl
    - jq
```

### complexity

Valid values:
- `beginner` - Simple, single-step procedures
- `intermediate` - Multi-step with some decisions
- `advanced` - Complex workflows, multiple systems
- `expert` - Requires deep expertise, edge cases

## Body Specification

### Required Sections

```markdown
## Overview
What this skill does and when to use it.

## Prerequisites
What's needed before using this skill.

## Procedure
Step-by-step instructions with numbered steps.
```

### Recommended Sections

```markdown
## Tool Usage
Reference for tools mentioned in procedure.

## Best Practices
Guidelines and recommendations.

## Troubleshooting
Common issues and solutions.
```

### Optional Sections

```markdown
## Examples
Concrete usage examples.

## Related Skills
Links to related skills.

## References
External documentation links.
```

## Section Guidelines

### Procedure Section

- Use numbered steps for sequential actions
- Include tool usage blocks with parameters
- Provide both MCP and REST alternatives when possible
- Include decision points for branching logic

**Tool Usage Block Format:**

```markdown
**Using MCP:**
\`\`\`
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true
  fields: number,short_description
  limit: 10
\`\`\`

**Using REST API:**
\`\`\`bash
GET /api/now/table/incident?sysparm_query=active=true&sysparm_fields=number,short_description&sysparm_limit=10
\`\`\`
```

### Troubleshooting Section

Use consistent format:

```markdown
### Issue Title

**Symptom:** What the user observes
**Cause:** Why it happens
**Solution:** How to fix it
```

## File Organization

```
skills/
├── itsm/
│   ├── incident-triage.md
│   └── incident-lifecycle.md
├── cmdb/
│   └── ci-discovery.md
├── admin/
│   └── update-set-management.md
├── catalog/
│   └── request-fulfillment.md
├── security/
│   └── incident-response.md
└── reporting/
    └── sla-analysis.md
```

### Category Guidelines

| Category | Content |
|----------|---------|
| `itsm` | Incident, Problem, Change, Request |
| `cmdb` | Configuration Management |
| `admin` | System Administration |
| `catalog` | Service Catalog |
| `security` | Security Operations |
| `reporting` | Reports, Dashboards, Analytics |

## Validation

Run validation before submitting:

```bash
npm run validate
```

Validation checks:
- Required frontmatter fields present
- Valid field values
- Required sections present
- Procedure section has content

## Examples

### Minimal Valid Skill

```markdown
---
name: simple-query
version: 1.0.0
description: Query ServiceNow records
---

## Overview
Query records from any ServiceNow table.

## Prerequisites
- Read access to target table

## Procedure

1. Identify the table name
2. Build your query
3. Execute the query
```

### Complete Skill

See `templates/skill-template.md` for a full example.

## Changelog

### 1.0.0 (2026-02-06)
- Initial specification release
