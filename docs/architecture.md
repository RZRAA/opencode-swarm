# OpenCode Swarm Architecture

OpenCode Swarm uses an **architect-centric control model**.

## Design Goals

- Deterministic execution
- Explainable reasoning
- Minimal hallucination propagation
- Clear ownership of decisions

## Control Model

Only the Architect:
- Analyzes user intent
- Selects which SMEs to consult
- Synthesizes specifications
- Approves or blocks outputs

All other agents are strictly delegated and operate without autonomy.

## Execution Guarantees

- Serial agent execution
- No SME broadcast
- QA precedes testing
- No unreviewed code advances

This model prioritizes correctness over throughput.
