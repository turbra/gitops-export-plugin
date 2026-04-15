---
title: RBAC Reference
description: >-
  Permissions required to install, run, and use the GitOps Export console plugin.
---

# RBAC Reference

GitOps Export involves three distinct permission contexts: the **installer** who deploys the plugin to the cluster, the **plugin runtime** (the nginx pod), and the **end user** whose browser runs the scan. Each context has different RBAC requirements.

## Installer Permissions

The installer is the person or pipeline that runs `oc apply -k manifests/overlays/install`. This creates namespaced resources, cluster-scoped resources, and a one-time Job that patches the console operator config.

### Namespaced resources (in `gitops-export-console`)

The installer must be able to create the following resources in the `gitops-export-console` namespace:

| Resource | API group | Verbs needed |
|----------|-----------|-------------|
| Deployment | apps/v1 | create, get, patch |
| Service | v1 | create, get, patch |
| ConfigMap | v1 | create, get, patch |
| ServiceAccount | v1 | create, get, patch |
| Job | batch/v1 | create, get, patch |

### Cluster-scoped resources

The installer must also be able to create these cluster-scoped resources:

| Resource | API group | Verbs needed |
|----------|-----------|-------------|
| Namespace | v1 | create, get, patch |
| ConsolePlugin | console.openshift.io/v1 | create, get, patch |
| ClusterRole | rbac.authorization.k8s.io/v1 | create, get, patch |
| ClusterRoleBinding | rbac.authorization.k8s.io/v1 | create, get, patch |

### Patcher Job RBAC

The install overlay creates a one-time Job (`gitops-export-console-install-patcher`) that patches `consoles.operator.openshift.io/cluster` to add the plugin to the active plugin list. This Job runs under its own ServiceAccount with a dedicated ClusterRole:

| Resource | API group | Verbs |
|----------|-----------|-------|
| `consoles` | operator.openshift.io | get, list, patch, update |

The ClusterRole is named `gitops-export-console-patcher` and is bound to the `gitops-export-console-patcher` ServiceAccount in the `gitops-export-console` namespace. The Job has `ttlSecondsAfterFinished: 300`, so the completed Pod is cleaned up after 5 minutes. The ClusterRole and ClusterRoleBinding persist until the plugin is uninstalled.

In practice, **`cluster-admin`** covers all of the above. For environments where `cluster-admin` is not available, the installer needs a custom role that grants the verbs listed in all three tables.

## Plugin Runtime Permissions

The plugin backend is an nginx container that serves static JavaScript files over TLS. It makes no Kubernetes API calls at runtime. It runs with:

- `runAsNonRoot: true`
- `seccompProfile: RuntimeDefault`
- All capabilities dropped
- Privilege escalation disabled

The plugin runtime **requires no RBAC grants**. It uses the default ServiceAccount in the `gitops-export-console` namespace, which needs no additional permissions beyond what OpenShift provides by default.

## End User Permissions

When a user opens the GitOps Export tab and clicks **Export**, the plugin JavaScript running in their browser calls `k8sList` for each selected resource kind. These calls go through the OpenShift console proxy, which authenticates them with the user's existing session. The plugin sees only what the user's RBAC allows.

### Required verb

The plugin uses a single verb for all scan operations:

| Verb | Scope |
|------|-------|
| **list** | Namespaced: in the target namespace only |

No `get`, `watch`, `create`, `update`, `patch`, or `delete` operations are performed. The plugin never modifies resources in the target namespace.

### Resource kinds

The table below lists every resource kind the plugin can scan. The user needs `list` permission on each kind they select. If the user lacks permission on a kind, the plugin silently skips it (API responses with status 401, 403, 404, or 405 are ignored).

| Kind | API group | Resource (plural) | Default selected |
|------|-----------|-------------------|-----------------|
| Deployment | apps | deployments | Yes |
| StatefulSet | apps | statefulsets | Yes |
| DaemonSet | apps | daemonsets | Yes |
| Job | batch | jobs | Yes |
| CronJob | batch | cronjobs | Yes |
| Service | (core) | services | Yes |
| Route | route.openshift.io | routes | Yes |
| Secret | (core) | secrets | Yes |
| ConfigMap | (core) | configmaps | Yes |
| PersistentVolumeClaim | (core) | persistentvolumeclaims | Yes |
| NetworkPolicy | networking.k8s.io | networkpolicies | Yes |
| HorizontalPodAutoscaler | autoscaling (`autoscaling/v2`) | horizontalpodautoscalers | Yes |
| BuildConfig | build.openshift.io | buildconfigs | Yes |
| ImageStream | image.openshift.io | imagestreams | Yes |
| ImageStreamTag | image.openshift.io | imagestreamtags | No |
| Role | rbac.authorization.k8s.io | roles | No |
| RoleBinding | rbac.authorization.k8s.io | rolebindings | No |
| ServiceAccount | (core) | serviceaccounts | No |

### Minimum Role for full scanning

A user who needs to scan all 18 resource kinds in a namespace can be granted a Role like this:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: gitops-export-reader
  namespace: <target-namespace>
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

Bind this Role to the user or group with a RoleBinding in the target namespace. For users who only need a subset of resource kinds, remove the corresponding entries from the Role; the plugin will skip any kind the user cannot list.

On current plugin builds, `HorizontalPodAutoscaler` is queried as `autoscaling/v2`. Clusters that do not serve `autoscaling/v2` will have that kind skipped.

### OpenShift default roles

Users with the built-in OpenShift roles already have some of the required permissions. The table below lists what each role **cannot** list; any kind not listed here is covered.

| OpenShift role | Kinds that cannot be listed | Notes |
|----------------|---------------------------|-------|
| `admin` | (none) | Full coverage of all 18 resource kinds |
| `edit` | Role, RoleBinding | These are not selected by default, so most scans are unaffected |
| `view` | Secret, Role, RoleBinding | Secrets are selected by default; they will be silently skipped unless the user deselects them or uses the **omit** secret handling mode |

Kinds that are silently skipped due to insufficient permissions produce no error in the UI. If a scan result is missing expected resources, check whether the user's role covers that kind using `oc auth can-i list <resource> -n <namespace>`.

## Removal Permissions

Running `oc delete -k manifests/overlays/install` requires the same permissions as installation: the ability to delete all namespaced resources in `gitops-export-console` plus the cluster-scoped ConsolePlugin, ClusterRole, and ClusterRoleBinding.
