# Design Rationale: Heterogeneous Models

Most agent systems use a single model across all roles.  
This creates correlated failure modes.

## OpenCode Swarm Approach

Each role may use a different model class:

- Reasoning-heavy models for architecture
- Fast models for ingestion
- Adversarial models for security review

## Benefits

- Independent perspectives
- Early disagreement detection
- Reduced hallucination reinforcement
- Higher confidence outputs

This mirrors real-world engineering teams, where diversity of expertise improves outcomes.
