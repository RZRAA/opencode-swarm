# OpenCode Swarm

![License](https://img.shields.io/badge/license-MIT-blue)
![OpenCode Plugin](https://img.shields.io/badge/opencode-plugin-green)
![Agentic Architecture](https://img.shields.io/badge/architecture-architect--centric-purple)

**Architect-driven, multi-agent development for OpenCode.**  
Design-first orchestration with domain-aware SMEs, heterogeneous model perspectives, production-grade code generation, and layered QA.

OpenCode Swarm is built for engineers who want **structured reasoning, controlled delegation, and predictable outcomes**—not parallel agent noise.

---

## Why OpenCode Swarm

Most agent frameworks parallelize everything and hope coherence emerges later.  
OpenCode Swarm enforces discipline:

- A single Architect owns analysis and decisions
- Experts are consulted only when technically relevant
- Agents execute serially for traceability
- Security and correctness are validated before delivery
- Different models can be assigned per role, introducing genuinely distinct perspectives

This design improves **accuracy, efficiency, and failure detection**, especially on complex or high-stakes tasks.

---

## Key Advantage: Heterogeneous Model Perspectives

OpenCode Swarm allows **per-role model selection** so that each cognitive function is optimized independently:

- Architect → deep reasoning and synthesis
- SMEs → domain recall and speed
- Coder → implementation fidelity
- QA → adversarial review and audit rigor

Using different models per role reduces correlated failure modes, increases early error detection, and mirrors how real engineering teams benefit from diverse expertise.

See: [docs/design-rationale.md](docs/design-rationale.md)

---

## Architecture Overview

OpenCode Swarm implements a hub-and-spoke pipeline with a single controlling Architect.

```
User → Architect (analysis)
     → Reader (optional)
     → Relevant SMEs (serial)
     → Architect (spec synthesis)
     → Coder
     → Security Review → Audit
     → Architect (triage)
     → Test Engineer
```

See: [docs/architecture.md](docs/architecture.md)

---

## Installation

```json
{
  "plugin": ["opencode-swarm"]
}
```

```bash
bunx opencode-swarm install
```

---

## License

MIT
