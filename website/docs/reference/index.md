---
title: Reference
description: GitOps Export operational and developer reference.
---

# Reference

Use these pages when you need exact resources, permissions, commands, or development workflows.

## Pages

| Page | Use it for |
| --- | --- |
| [Install Manifests](./install-manifests.md) | Resources created by `manifests/overlays/install`. |
| [RBAC](./rbac.md) | Installer, runtime, and end-user permissions. |
| [Local Development](./local-development.md) | Running the plugin locally against a cluster. |
| [Versioning](./versioning.md) | Release version and image tag behavior. |
| [Testing](../project/testing.md) | Fixture validation and parity checks. |

## Common Commands

```sh
oc apply -k manifests/overlays/install
oc delete -k manifests/overlays/install
npm run lint:check
npm run check-types
npm run test:fixtures
```
