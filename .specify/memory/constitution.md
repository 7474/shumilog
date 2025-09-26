<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.0.1
- Modified Development Workflow: Added task management and commit discipline rule
- No sections added or removed
- Templates requiring updates: ✅ plan-template.md ✅ spec-template.md ✅ tasks-template.md  
- No deferred placeholders
-->

# shumilog Constitution

## Core Principles

### I. Quick Experimentation Over Robustness
Prioritize rapid prototyping and testing over comprehensive, production-ready builds. Accept technical debt and imperfect solutions to enable faster learning cycles. Favor "good enough" implementations that can be quickly deployed and iterated upon.

### II. Low-Cost Hobby Hosting
All architectural and technology decisions MUST consider operational cost impact. Use free tiers, cheap hosting options, and minimal resource consumption as primary constraints. Optimize for cost-effectiveness over performance or scalability.

### III. Iterative Exploration (NON-NEGOTIABLE)
Every feature starts as a minimal viable implementation that can be deployed and tested quickly. Resist over-engineering and premature optimization. Build incrementally with user feedback driving direction rather than extensive upfront planning.

### IV. Simplicity First
Choose simple, well-understood technologies over complex, cutting-edge solutions. Minimize dependencies, avoid microservices where monoliths suffice, and prefer standard patterns over custom architectures. Complexity must be explicitly justified by cost savings or critical functionality.

### V. Cost-Conscious Development
Each technical decision must include a cost analysis covering hosting, third-party services, maintenance overhead, and development time. Free and open-source solutions are strongly preferred. Paid services require explicit cost justification and monitoring.

## Technology Constraints

Technologies MUST be selected based upon these criteria in order:
1. **Cost**: Free tier available or minimal cost (<$5/month per service)
2. **Simplicity**: Well-documented, mainstream adoption, minimal learning curve
3. **Speed**: Enables rapid development and deployment cycles
4. **Maintenance**: Low operational overhead and maintenance requirements

Forbidden approaches: Complex microservice architectures, expensive enterprise solutions, bleeding-edge technologies without stable free tiers, technologies requiring significant infrastructure investment.

## Development Workflow

All changes follow this lightweight process:
1. **Quick validation**: Manual testing sufficient for hobby use cases
2. **Deploy early**: Push to production frequently with feature flags if needed
3. **Monitor costs**: Weekly cost review for all services and infrastructure
4. **Iterate fast**: Prefer multiple small releases over comprehensive updates
5. **Document decisions**: Brief rationale for technology choices and major changes
6. **Task management discipline**: Each task completion requires (a) git commit with clear message, (b) marking task as completed in tasks.md to track progress

Quality gates are minimal but enforced: basic functionality verification, cost impact assessment, security baseline (authentication/authorization where needed).

## Governance

This constitution supersedes all other development practices and guidelines. All feature specifications and implementation plans MUST demonstrate compliance with these principles.

**Amendment Process**: Changes require demonstration that the amendment reduces operational costs, increases iteration speed, or addresses critical security/legal requirements.

**Compliance Review**: Monthly assessment of actual costs against projections, technology choices against principles, and overall alignment with hobby project goals.

**Complexity Justification**: Any deviation from simplicity principles requires explicit documentation of cost/benefit analysis and sunset timeline for increased complexity.

**Version**: 1.0.1 | **Ratified**: 2025-09-26 | **Last Amended**: 2025-09-26