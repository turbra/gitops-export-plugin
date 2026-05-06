---
title: Classification
description: Resource categories and rules used during namespace scans.
---

# Classification

Classification decides whether each resource should be exported, reviewed, cleaned up, or ignored. Rules are intentionally conservative and first match wins.

## Categories

| Category | Exported? | Meaning |
| --- | --- | --- |
| `include` | Yes | Declarative resource that is usually ready for Git after sanitization. |
| `cleanup` | Yes | Resource includes environment-specific values that should be adjusted before commit. |
| `review` | Yes | Resource is sensitive, context-heavy, unknown, or managed by another tool. |
| `exclude` | No | Resource is controller-owned, runtime-generated, or namespace scaffolding. |

## Rule Order

| Order | Rule | Result |
| --- | --- | --- |
| 1 | `apiVersion` starts with `gitops.stakkr.io/` | `exclude` |
| 2 | `metadata.ownerReferences` is non-empty | `exclude` |
| 3 | Label `app.kubernetes.io/managed-by=helm` | `review` |
| 4 | OpenShift namespace scaffolding | `exclude` |
| 5 | Runtime or cluster-owned kinds | `exclude` |
| 6 | Sensitive or context-heavy kinds | `review` |
| 7 | Environment-specific kinds | `cleanup` |
| 8 | `Service` of type `LoadBalancer` | `cleanup` |
| 9 | Known declarative workloads and config | `include` |
| 10 | Unknown or unhandled kinds | `review` |

## OpenShift Scaffolding Exclusions

| Kind | Exact names | Name substrings |
| --- | --- | --- |
| `ConfigMap` | `kube-root-ca.crt`, `openshift-service-ca.crt` | `service-cabundle`, `trusted-cabundle`, `ca-bundle` |
| `ServiceAccount` | `default`, `builder`, `deployer`, `pipeline` | None |
| `RoleBinding` | `system:deployers`, `system:image-builders`, `system:image-pullers`, `openshift-pipelines-edit`, `pipelines-scc-rolebinding` | None |

## Curated Resource Set

GitOps Export scans a fixed set of namespaced kinds. Most are selected by default.

| Kind | API group / version | Default? |
| --- | --- | --- |
| Deployment | `apps/v1` | yes |
| StatefulSet | `apps/v1` | yes |
| DaemonSet | `apps/v1` | yes |
| Job | `batch/v1` | yes |
| CronJob | `batch/v1` | yes |
| Service | `v1` | yes |
| Route | `route.openshift.io/v1` | yes |
| Secret | `v1` | yes |
| ConfigMap | `v1` | yes |
| PersistentVolumeClaim | `v1` | yes |
| NetworkPolicy | `networking.k8s.io/v1` | yes |
| HorizontalPodAutoscaler | `autoscaling/v2` | yes |
| BuildConfig | `build.openshift.io/v1` | yes |
| ImageStream | `image.openshift.io/v1` | yes |
| ImageStreamTag | `image.openshift.io/v1` | no |
| Role | `rbac.authorization.k8s.io/v1` | no |
| RoleBinding | `rbac.authorization.k8s.io/v1` | no |
| ServiceAccount | `v1` | no |
