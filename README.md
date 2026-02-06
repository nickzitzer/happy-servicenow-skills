# Happy ServiceNow AI Skills

> **Platform-agnostic AI skills library for ServiceNow** - Works with Claude, ChatGPT, Cursor, and any agentic AI system.

[![npm version](https://badge.fury.io/js/@anthropic%2Fhappy-servicenow-skills.svg)](https://www.npmjs.com/package/@anthropic/happy-servicenow-skills)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Built by [Happy Technologies LLC](https://github.com/Happy-Technologies-LLC)

---

## 🎯 What Are AI Skills?

**Skills are packaged instructions that teach AI agents how to perform specific tasks.** Unlike MCP tools (which provide *capabilities*), skills provide *knowledge* - the procedures, best practices, and decision logic that make AI agents effective.

```
MCP = The kitchen and ingredients
Skills = The recipes
```

## 🚀 Quick Start

### Installation

```bash
npm install @anthropic/happy-servicenow-skills
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
import { SkillLoader, SkillRegistry } from '@anthropic/happy-servicenow-skills';

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

## 📚 Available Skills

### ITSM (IT Service Management)

| Skill | Description |
|-------|-------------|
| `itsm/incident-triage` | Intelligent incident triage, prioritization, and assignment |
| `itsm/incident-lifecycle` | Full incident lifecycle management from creation to closure |
| `itsm/change-management` | Change request creation, CAB preparation, and implementation |
| `itsm/problem-analysis` | Root cause analysis and problem record management |
| `itsm/major-incident` | Major incident coordination and communication |

### CMDB (Configuration Management)

| Skill | Description |
|-------|-------------|
| `cmdb/ci-discovery` | Configuration item discovery and classification |
| `cmdb/relationship-mapping` | CI relationship analysis and dependency mapping |
| `cmdb/impact-analysis` | Change impact analysis using CMDB relationships |

### Administration

| Skill | Description |
|-------|-------------|
| `admin/update-set-management` | Update set creation, management, and deployment |
| `admin/deployment-workflow` | Instance-to-instance deployment procedures |
| `admin/user-provisioning` | User account and role management |
| `admin/acl-management` | Access control list creation and troubleshooting |

### Service Catalog

| Skill | Description |
|-------|-------------|
| `catalog/request-fulfillment` | Catalog request processing and fulfillment |
| `catalog/item-creation` | Service catalog item design and implementation |

### Security

| Skill | Description |
|-------|-------------|
| `security/incident-response` | Security incident detection and response |
| `security/audit-compliance` | Audit log analysis and compliance verification |

### Reporting

| Skill | Description |
|-------|-------------|
| `reporting/sla-analysis` | SLA performance analysis and reporting |
| `reporting/executive-dashboard` | Executive-level metrics and KPI generation |

---

## 🔧 Skill Anatomy

Each skill is a Markdown file with YAML frontmatter:

```markdown
---
name: incident-triage
version: 1.0.0
description: Intelligent incident triage and assignment
author: Happy Technologies LLC
tags: [itsm, incident, triage, assignment]
platforms: [claude, chatgpt, cursor, any]
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

## 🌐 Platform Compatibility

Skills are designed to work across multiple AI platforms:

| Platform | Tool Access | Notes |
|----------|-------------|-------|
| **Claude Code** | MCP + Native | Full integration with ServiceNow MCP Server |
| **Claude Desktop** | MCP only | Requires MCP server connection |
| **ChatGPT** | REST/Actions | Use REST API procedures |
| **Cursor** | Native + Extensions | IDE-based automation |
| **Custom Agents** | Any | Adapt procedures to available tools |

---

## 🤝 Integration with ServiceNow MCP Server

These skills are designed to complement the [ServiceNow MCP Server](https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs):

```javascript
// When MCP tools are available, skills reference them directly
// Tool: SN-NL-Search
// Query: "active high priority incidents assigned to is empty"

// When MCP is not available, skills provide REST alternatives
// GET /api/now/table/incident?sysparm_query=active=true^priority=1^assigned_toISEMPTY
```

---

## 📝 Creating Custom Skills

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

## 📊 Statistics

- **Total Skills:** 20+
- **Categories:** 6 (ITSM, CMDB, Admin, Catalog, Security, Reporting)
- **Platforms Supported:** 5+
- **Community Contributors:** Growing!

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for Claude and MCP
- [ServiceNow](https://servicenow.com) for the platform
- The agentic AI community

---

**Built with ❤️ by [Happy Technologies LLC](https://github.com/Happy-Technologies-LLC)**
