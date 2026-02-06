<p align="center">
  <img src="assets/logo.svg" alt="Happy ServiceNow AI Skills" width="120" height="120">
</p>

<h1 align="center">Happy ServiceNow AI Skills</h1>

<p align="center">
  <strong>Platform-agnostic AI skills library for ServiceNow</strong><br>
  Works with Claude Code, Claude Desktop, ChatGPT, Cursor, and any agentic AI system
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/happy-servicenow-skills"><img src="https://img.shields.io/npm/v/happy-servicenow-skills.svg?style=flat-square" alt="npm version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT"></a>
  <a href="https://skills.sh"><img src="https://img.shields.io/badge/skills.sh-compatible-blue.svg?style=flat-square" alt="skills.sh"></a>
  <a href="https://servicenow.com"><img src="https://img.shields.io/badge/ServiceNow-compatible-green.svg?style=flat-square" alt="ServiceNow"></a>
</p>

<p align="center">
  <a href="https://happy-tech.biz">Website</a> |
  <a href="https://github.com/nickzitzer/happy-servicenow-skills">GitHub</a> |
  <a href="https://www.npmjs.com/package/happy-servicenow-skills">npm</a> |
  <a href="#-available-skills">Skills</a> |
  <a href="#-creating-custom-skills">Contributing</a>
</p>

---

## What Are AI Skills?

**Skills are packaged instructions that teach AI agents how to perform specific tasks.** Unlike MCP tools (which provide *capabilities*), skills provide *knowledge* - the procedures, best practices, and decision logic that make AI agents effective.

```
MCP = The kitchen and ingredients
Skills = The recipes
```

## Quick Start

### Installation

```bash
# npm
npm install happy-servicenow-skills

# skills.sh
npx skills add nickzitzer/happy-servicenow-skills --all
```

### Usage with Claude Code

```bash
# List available skills
npx sn-skills list

# Search for skills
npx sn-skills search "incident"

# Load a skill into your session
npx sn-skills load itsm/incident-triage
```

### Programmatic Usage

```javascript
import { SkillLoader, SkillRegistry } from 'happy-servicenow-skills';

// Load all skills
const registry = new SkillRegistry();
await registry.discover();

// Find skills by tag
const itsmSkills = registry.findByTag('itsm');

// Load a specific skill
const skill = await SkillLoader.load('itsm/incident-triage');
console.log(skill.instructions);
```

---

## Available Skills

### ITSM - IT Service Management (7 skills)

| Skill | Description |
|-------|-------------|
| `itsm/incident-triage` | Automated incident classification and prioritization |
| `itsm/incident-lifecycle` | End-to-end incident management workflow |
| `itsm/major-incident` | P1/Major incident coordination |
| `itsm/problem-analysis` | Root cause analysis and known error management |
| `itsm/change-management` | RFC creation, CAB, implementation, PIR |
| `itsm/natural-language-queries` | Plain English ServiceNow searches |
| `itsm/quick-reference` | Common operations cheat sheet |

### Development (12 skills)

| Skill | Description |
|-------|-------------|
| `development/business-rules` | Server-side automation scripts |
| `development/client-scripts` | Form manipulation and validation |
| `development/script-includes` | Reusable server-side libraries |
| `development/glide-api-reference` | GlideRecord, GlideAggregate, GlideDateTime |
| `development/debugging-techniques` | Script debugger, logging, troubleshooting |
| `development/notifications` | Email notifications, events, templates |
| `development/ui-actions` | Buttons, context menus, client/server actions |
| `development/scheduled-jobs` | Automated recurring tasks |
| `development/data-import` | Import sets and transform maps |
| `development/scripted-rest-apis` | Custom REST endpoints |
| `development/automated-testing` | ATF and script testing |
| `development/performance-optimization` | Script optimization techniques |

### Administration (12 skills)

| Skill | Description |
|-------|-------------|
| `admin/update-set-management` | Configuration tracking and deployment |
| `admin/deployment-workflow` | Instance-to-instance migration |
| `admin/batch-operations` | Bulk record operations |
| `admin/script-execution` | Background script patterns |
| `admin/script-sync` | Local development workflow |
| `admin/user-provisioning` | User lifecycle management |
| `admin/workflow-creation` | Programmatic workflow building |
| `admin/schema-discovery` | Table and field exploration |
| `admin/instance-management` | Multi-instance operations |
| `admin/application-scope` | Scoped app development |
| `admin/configuration-validation` | Catalog item validation |
| `admin/generic-crud-operations` | Universal table operations |

### Service Catalog (5 skills)

| Skill | Description |
|-------|-------------|
| `catalog/request-fulfillment` | End-to-end request processing |
| `catalog/item-creation` | Catalog item setup |
| `catalog/approval-workflows` | Approval configuration |
| `catalog/variable-management` | Form variables and options |
| `catalog/ui-policies` | Dynamic form behavior |

### CMDB (4 skills)

| Skill | Description |
|-------|-------------|
| `cmdb/ci-discovery` | Configuration item management |
| `cmdb/relationship-mapping` | CI relationships and dependencies |
| `cmdb/impact-analysis` | Service impact assessment |
| `cmdb/data-quality` | CMDB health and validation |

### Security (4 skills)

| Skill | Description |
|-------|-------------|
| `security/incident-response` | Security incident handling |
| `security/acl-management` | Access control configuration |
| `security/audit-compliance` | Compliance monitoring |
| `security/data-classification` | Data sensitivity management |

### Reporting (3 skills)

| Skill | Description |
|-------|-------------|
| `reporting/sla-analysis` | SLA performance metrics |
| `reporting/executive-dashboard` | KPI dashboards |
| `reporting/trend-analysis` | Historical trend reporting |

---

## Skill Anatomy

Each skill is a Markdown file with YAML frontmatter:

```markdown
---
name: incident-triage
version: 1.0.0
description: Intelligent incident triage and assignment
author: Happy Technologies LLC
tags: [itsm, incident, triage, assignment]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp: [SN-Query-Table, SN-NL-Search, SN-Assign-Incident]
  rest: [/api/now/table/incident, /api/now/table/sys_user_group]
  native: [Bash, Read, Write]
complexity: intermediate
estimated_time: 5-15 minutes
---

# Incident Triage Skill

## Overview
[What this skill accomplishes]

## Prerequisites
[Required access, permissions, or setup]

## Procedure
[Step-by-step instructions with decision points]

## Tool Usage
[How to use available tools - MCP, REST, or native]

## Best Practices
[ServiceNow and ITIL best practices]

## Troubleshooting
[Common issues and solutions]
```

---

## Platform Compatibility

Skills are designed to work across multiple AI platforms:

| Platform | Tool Access | Notes |
|----------|-------------|-------|
| **Claude Code** | MCP + Native | Full integration with ServiceNow MCP Server |
| **Claude Desktop** | MCP only | Requires MCP server connection |
| **ChatGPT** | REST/Actions | Use REST API procedures |
| **Cursor** | Native + Extensions | IDE-based automation |
| **Custom Agents** | Any | Adapt procedures to available tools |

---

## Integration with ServiceNow MCP Server

These skills are designed to complement the [ServiceNow MCP Server](https://github.com/nickzitzer/mcp-servicenow-nodejs):

```javascript
// When MCP tools are available, skills reference them directly
// Tool: SN-NL-Search
// Query: "active high priority incidents assigned to is empty"

// When MCP is not available, skills provide REST alternatives
// GET /api/now/table/incident?sysparm_query=active=true^priority=1^assigned_toISEMPTY
```

---

## Creating Custom Skills

### Quick Start

```bash
# Copy the template
cp templates/skill-template.md skills/custom/my-skill.md

# Edit your skill
code skills/custom/my-skill.md

# Validate
npm run validate
```

### Skill Specification

See [docs/SKILL_SPEC.md](docs/SKILL_SPEC.md) for the complete skill specification.

### Contributing Skills

1. Fork the repository
2. Create your skill in the appropriate category
3. Run `npm run validate` to ensure it's valid
4. Submit a pull request

---

## Statistics

| Metric | Value |
|--------|-------|
| **Total Skills** | 47 |
| **Categories** | 7 |
| **Platforms Supported** | 5+ |
| **MCP Tool References** | 40+ |

---

## Related Projects

- **[ServiceNow MCP Server](https://github.com/nickzitzer/mcp-servicenow-nodejs)** - MCP server providing 40+ tools for ServiceNow automation
- **[Happy Technologies](https://happy-tech.biz)** - Enterprise AI solutions

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude and MCP
- [ServiceNow](https://servicenow.com) for the platform
- The agentic AI community

---

<p align="center">
  Built with care by <a href="https://happy-tech.biz">Happy Technologies LLC</a>
</p>
