---
title: Reference
description: GitOps Export operational reference.
---

# Reference

Use these pages when you need exact install resources, permissions, or version behavior.

## Pages

| Page | Use it for |
| --- | --- |
| [Install Manifests](./install-manifests.md) | Resources created by `manifests/overlays/install`. |
| [RBAC](./rbac.md) | Installer, runtime, and end-user permissions. |
| [Versioning](./versioning.md) | Release version and image tag behavior. |

## Common Commands

```sh
oc apply -k manifests/overlays/install
oc delete -k manifests/overlays/install
```
