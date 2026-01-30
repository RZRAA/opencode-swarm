# OpenCode Swarm

![License](https://img.shields.io/badge/license-MIT-blue)
![OpenCode Plugin](https://img.shields.io/badge/opencode-plugin-green)
![Architecture](https://img.shields.io/badge/architecture-architect--centric-purple)
![Version](https://img.shields.io/badge/version-2.2.1-orange)

**Architect-driven, multi-agent development for OpenCode.**

Design-first orchestration with codebase discovery, domain-aware SMEs, heterogeneous model perspectives, and layered QA review.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  "Review this PowerShell application for security issues"                │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  ARCHITECT: Delegating to @explorer for codebase analysis...             │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  EXPLORER: PowerShell module, 12 files, domains: powershell, security    │
│  → Flagged: auth.ps1, invoke-command.ps1 for SME review                  │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  SME_POWERSHELL: Remoting patterns detected, needs constrained endpoints │
│  SME_SECURITY: Credential handling issues in auth.ps1:42-58              │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  ARCHITECT: Collated review with 3 HIGH findings, 2 recommendations      │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Why OpenCode Swarm?

Most agent frameworks parallelize everything and hope coherence emerges.
**OpenCode Swarm enforces discipline:**

| Problem | Our Solution |
|---------|--------------|
| Agents read the same files repeatedly | Explorer scans once, shares context |
| All 11 SMEs consulted for every task | Only relevant domains (1-3) based on Explorer findings |
| Single model = correlated failures | Different models per role = diverse perspectives |
| No visibility into agent decisions | Serial execution with clear delegation traces |
| Code ships without review | Mandatory Security → Audit → Test pipeline |

---

## Architecture

```
User Request
     │
     ▼
┌─────────────┐
│  ARCHITECT  │ ◄── Orchestrates everything, owns all decisions
└─────────────┘
     │
     ▼
┌─────────────┐
│  EXPLORER   │ ◄── Fast codebase discovery (read-only)
└─────────────┘     Returns: structure, languages, domains, flagged files
     │
     ▼
┌─────────────┐
│    SMEs     │ ◄── Domain experts consulted serially (read-only)
└─────────────┘     Only domains identified by Explorer
     │
     ▼
┌─────────────┐
│   CODER     │ ◄── Implements unified specification
└─────────────┘
     │
     ▼
┌─────────────┐     ┌─────────────┐
│  SECURITY   │ ──► │   AUDITOR   │ ◄── QA review (read-only)
└─────────────┘     └─────────────┘
     │
     ▼
┌─────────────┐
│    TEST     │ ◄── Generates tests for approved code
└─────────────┘
```

### Agent Permissions

| Agent | Read | Write | Role |
|-------|:----:|:-----:|------|
| Architect | ✅ | ✅ | Orchestrator - can fall back if delegation fails |
| Explorer | ✅ | ❌ | Discovery - scans, summarizes, identifies domains |
| SMEs (×15) | ✅ | ❌ | Advisory - domain expertise, never implements |
| Coder | ✅ | ✅ | Implementation - writes production code |
| Security Reviewer | ✅ | ❌ | Audit - vulnerability assessment |
| Auditor | ✅ | ❌ | Audit - correctness verification |
| Test Engineer | ✅ | ✅ | Testing - generates test cases |

---

## Heterogeneous Model Perspectives

OpenCode Swarm allows **different models per role**, reducing correlated failures:

```json
{
  "agents": {
    "architect": { "model": "anthropic/claude-sonnet-4-5" },
    "explorer": { "model": "google/gemini-2.0-flash" },
    "coder": { "model": "anthropic/claude-sonnet-4-5" },
    "_sme": { "model": "google/gemini-2.0-flash" },
    "_qa": { "model": "openai/gpt-4o" },
    "test_engineer": { "model": "google/gemini-2.0-flash" }
  }
}
```

**Why this matters:**
- Reasoning-heavy model for Architect decisions
- Fast/cheap model for Explorer and SME consultation  
- Different model family for QA catches errors the others miss
- Mix local (Ollama) and cloud models based on cost/capability

---

## Installation

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-swarm"]
}
```

Or install via CLI:

```bash
bunx opencode-swarm install
```

---

## Configuration

Create `~/.config/opencode/opencode-swarm.json`:

```json
{
  "agents": {
    "architect": { "model": "anthropic/claude-sonnet-4-5" },
    "explorer": { "model": "google/gemini-2.0-flash" },
    "coder": { "model": "anthropic/claude-sonnet-4-5" },
    "_sme": { "model": "google/gemini-2.0-flash" },
    "_qa": { "model": "google/gemini-2.0-flash" },
    "test_engineer": { "model": "google/gemini-2.0-flash" }
  }
}
```

### Category Defaults

`_sme` and `_qa` set defaults for all agents in that category:

```json
{
  "agents": {
    "_sme": { "model": "google/gemini-2.0-flash" },
    "sme_oracle": { "model": "anthropic/claude-sonnet-4-5" }
  }
}
```

### Disable Unused Domains

```json
{
  "agents": {
    "sme_vmware": { "disabled": true },
    "sme_azure": { "disabled": true }
  }
}
```

### Custom Prompts

Place in `~/.config/opencode/opencode-swarm/`:
- `{agent}.md` - Replace default prompt
- `{agent}_append.md` - Append to default prompt

---

## Agents

### Orchestrator
| Agent | Description |
|-------|-------------|
| `architect` | Central orchestrator. Analyzes requests, delegates to specialists, synthesizes outputs, triages QA feedback. |

### Discovery
| Agent | Description |
|-------|-------------|
| `explorer` | Fast codebase scanner. Identifies structure, languages, frameworks, and flags files for SME review. |

### Domain Experts (SMEs)
| Agent | Domain |
|-------|--------|
| `sme_windows` | Windows internals, registry, services, WMI/CIM |
| `sme_powershell` | PowerShell scripting, cmdlets, modules, remoting |
| `sme_python` | Python ecosystem, libraries, packaging |
| `sme_oracle` | Oracle Database, SQL/PLSQL, administration |
| `sme_network` | TCP/IP, firewalls, DNS, TLS, load balancing |
| `sme_security` | STIG compliance, hardening, CVEs, PKI |
| `sme_linux` | Linux administration, systemd, package management |
| `sme_vmware` | vSphere, ESXi, PowerCLI, virtualization |
| `sme_azure` | Azure services, Entra ID, ARM/Bicep |
| `sme_active_directory` | AD, LDAP, Group Policy, Kerberos |
| `sme_ui_ux` | UI/UX design, accessibility, interaction patterns |
| `sme_web` | Flutter, React, Vue, Angular, JS/TS, HTML/CSS |
| `sme_database` | SQL Server, PostgreSQL, MySQL, MongoDB, Redis |
| `sme_devops` | Docker, Kubernetes, CI/CD, Terraform, GitHub Actions |
| `sme_api` | REST, GraphQL, OAuth, JWT, webhooks |

### Implementation
| Agent | Description |
|-------|-------------|
| `coder` | Writes production code from unified specifications |
| `test_engineer` | Generates test cases and validation scripts |

### Quality Assurance
| Agent | Description |
|-------|-------------|
| `security_reviewer` | Vulnerability assessment, injection risks, data exposure |
| `auditor` | Correctness verification, logic errors, edge cases |

---

## Tools

| Tool | Description |
|------|-------------|
| `gitingest` | Fetch GitHub repository contents for analysis |
| `detect_domains` | Auto-detect relevant SME domains from text |
| `extract_code_blocks` | Extract code blocks to files |

### gitingest Example

```
"Analyze the architecture of https://github.com/user/repo"
"Use gitingest to fetch https://github.com/user/repo with pattern *.py include"
```

---

## Workflow Examples

### Code Review
```
User: "Review this codebase for issues"
  → Explorer scans, identifies: TypeScript, React, needs sme_security
  → SME_Security reviews flagged files
  → Architect collates findings into review report
```

### Implementation
```
User: "Add authentication to this API"
  → Explorer scans existing code
  → SME_Security + SME_Network consulted
  → Coder implements spec
  → Security_Reviewer → Auditor validates
  → Test_Engineer generates tests
```

### Bug Fix
```
User: "Fix the null reference in user.ts:42"
  → Explorer locates context
  → Relevant SME consulted
  → Coder implements fix
  → QA validates
```

---

## Design Philosophy

1. **Single point of control** - Architect owns all decisions
2. **Discovery before action** - Explorer maps the terrain first
3. **Selective expertise** - Only relevant SMEs consulted
4. **Serial execution** - Traceable, debuggable, predictable
5. **Mandatory QA** - No code ships without security + audit review
6. **Fail-safe orchestration** - Architect can handle tasks itself if agents fail

---

## Documentation

- [Architecture Details](docs/architecture.md)
- [Design Rationale](docs/design-rationale.md)
- [Installation Guide](docs/installation.md)

---

## License

MIT
