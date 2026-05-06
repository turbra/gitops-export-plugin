---
title: RBAC
description: Permissions required to install, run, and use GitOps Export.
---

# RBAC

GitOps Export has three permission contexts: installer, runtime, and end user.

## Installer Permissions

The installer runs:

```sh
oc apply -k manifests/overlays/install
```

Namespaced resources in `gitops-export-console`:

| Resource | API group | Verbs |
| --- | --- | --- |
| Deployment | `apps/v1` | create, get, patch |
| Service | `v1` | create, get, patch |
| ConfigMap | `v1` | create, get, patch |
| ServiceAccount | `v1` | create, get, patch |
| Job | `batch/v1` | create, get, patch |

Cluster-scoped resources:

| Resource | API group | Verbs |
| --- | --- | --- |
| Namespace | `v1` | create, get, patch |
| ConsolePlugin | `console.openshift.io/v1` | create, get, patch |
| ClusterRole | `rbac.authorization.k8s.io/v1` | create, get, patch |
| ClusterRoleBinding | `rbac.authorization.k8s.io/v1` | create, get, patch |

The patcher Job uses a dedicated ClusterRole with `get`, `list`, `patch`, and `update` on `consoles.operator.openshift.io`.

## Runtime Permissions

The nginx plugin pod serves static files and makes no Kubernetes API calls. It requires no additional RBAC grants.

## End-user Permissions

The browser uses the current user's console session. The plugin needs `list` on each selected resource kind in the target namespace.

| Kind | Resource | Default selected |
| --- | --- | --- |
| Deployment | `deployments.apps` | yes |
| StatefulSet | `statefulsets.apps` | yes |
| DaemonSet | `daemonsets.apps` | yes |
| Job | `jobs.batch` | yes |
| CronJob | `cronjobs.batch` | yes |
| Service | `services` | yes |
| Route | `routes.route.openshift.io` | yes |
| Secret | `secrets` | yes |
| ConfigMap | `configmaps` | yes |
| PersistentVolumeClaim | `persistentvolumeclaims` | yes |
| NetworkPolicy | `networkpolicies.networking.k8s.io` | yes |
| HorizontalPodAutoscaler | `horizontalpodautoscalers.autoscaling` | yes |
| BuildConfig | `buildconfigs.build.openshift.io` | yes |
| ImageStream | `imagestreams.image.openshift.io` | yes |
| ImageStreamTag | `imagestreamtags.image.openshift.io` | no |
| Role | `roles.rbac.authorization.k8s.io` | no |
| RoleBinding | `rolebindings.rbac.authorization.k8s.io` | no |
| ServiceAccount | `serviceaccounts` | no |

## Minimum Reader Role

Use this as a starting point for a user who should scan all supported resource kinds in one namespace.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: gitops-export-reader
  namespace: my-app
rules:
  - apiGroups: [""]
    resources:
      - configmaps
      - persistentvolumeclaims
      - secrets
      - serviceaccounts
      - services
    verbs: ["list"]
  - apiGroups: ["apps"]
    resources:
      - daemonsets
      - deployments
      - statefulsets
    verbs: ["list"]
  - apiGroups: ["batch"]
    resources:
      - cronjobs
      - jobs
    verbs: ["list"]
  - apiGroups: ["autoscaling"]
    resources:
      - horizontalpodautoscalers
    verbs: ["list"]
  - apiGroups: ["networking.k8s.io"]
    resources:
      - networkpolicies
    verbs: ["list"]
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources:
      - rolebindings
      - roles
    verbs: ["list"]
  - apiGroups: ["route.openshift.io"]
    resources:
      - routes
    verbs: ["list"]
  - apiGroups: ["build.openshift.io"]
    resources:
      - buildconfigs
    verbs: ["list"]
  - apiGroups: ["image.openshift.io"]
    resources:
      - imagestreams
      - imagestreamtags
    verbs: ["list"]
```

Check access with:

```sh
oc auth can-i list deployments -n my-app
oc auth can-i list secrets -n my-app
oc auth can-i list rolebindings.rbac.authorization.k8s.io -n my-app
```
