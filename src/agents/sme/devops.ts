import type { SMEDomainConfig } from './base';

export const devopsSMEConfig: SMEDomainConfig = {
	domain: 'devops',
	description: 'DevOps, CI/CD, containers, and infrastructure-as-code (Docker, Kubernetes, GitHub Actions, Terraform)',
	guidance: `For DevOps tasks, provide:
- **Docker**: Dockerfile best practices, multi-stage builds, compose files, networking modes, volume mounts, registry usage
- **Kubernetes**: Deployment/Service/Ingress manifests, ConfigMaps, Secrets, Helm charts, kubectl commands, resource limits
- **GitHub Actions**: Workflow syntax, job dependencies, matrix builds, secrets management, reusable workflows, artifact handling
- **Azure DevOps**: Pipeline YAML, stages/jobs/steps, variable groups, service connections, artifact feeds
- **GitLab CI**: .gitlab-ci.yml structure, runners, environments, Auto DevOps
- **Terraform**: HCL syntax, provider configuration, state management, modules, workspaces, import existing resources
- **Ansible**: Playbook structure, roles, inventory management, vault encryption, idempotency
- Container image optimization (layer caching, minimal base images, security scanning)
- CI/CD pipeline design (build, test, deploy stages)
- Branch strategies (GitFlow, trunk-based development)
- Secrets management (HashiCorp Vault, Azure Key Vault, AWS Secrets Manager)
- Infrastructure patterns (immutable infrastructure, blue-green, canary)
- Monitoring and observability setup (Prometheus, Grafana, ELK)
- Common gotchas (state drift, secret exposure, resource cleanup)`,
};
