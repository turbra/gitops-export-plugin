---
title: Manifest Parsing and Pruning
description: >-
  How the GitOps Export plugin reads live objects, classifies them, and
  removes cluster-generated noise before preview and export.
---

# Manifest Parsing and Pruning

This document explains the internal behavior of GitOps Export at a practical level: how the plugin reads live objects from a namespace, decides whether each object should be included, and produces the sanitized YAML shown in the preview and export flows.

All of this logic runs in the user's browser. The main sources are `src/scan-utils.ts`, `src/export-archive.ts`, `src/gitops-definition-utils.ts`, and `src/hooks/useNamespaceScan.ts`.

## Scan Flow

When the user clicks **Export**, the plugin does this:

1. Lists each selected namespaced resource kind through the OpenShift console proxy with the current user's RBAC.
2. Classifies each returned object as `include`, `cleanup`, `review`, or `exclude`.
3. Deep-clones non-excluded objects and removes cluster-generated metadata, defaults, and runtime-only fields.
4. Stores the sanitized object as the source for preview, ZIP export, and GitOps definition generation.
5. Sorts the results, computes summary counts, and renders them in the UI.

Kinds that return `401`, `403`, `404`, or `405` during listing are skipped quietly.

## Classification Summary

Classification is intentionally conservative. The first matching rule wins.

| Rule group | Result |
|------|------|
| GitOps Export control-plane objects, controller-owned objects, and OpenShift namespace scaffolding | `exclude` |
| Runtime-generated or cluster-owned kinds such as `Pod`, `ReplicaSet`, `Endpoints`, `EndpointSlice`, `ControllerRevision`, `Event`, `Lease`, `TokenReview`, `SubjectAccessReview`, `Node`, and `PersistentVolume` | `exclude` |
| Helm-managed resources (`app.kubernetes.io/managed-by=helm`) | `review` |
| Sensitive or context-heavy resources such as `Secret`, `PodDisruptionBudget`, `ResourceQuota`, `LimitRange`, and `DeploymentConfig` | `review` |
| Resources that usually need environment-specific cleanup such as `PersistentVolumeClaim`, `ImageStream`, `ImageStreamTag`, and `Service` of type `LoadBalancer` | `cleanup` |
| Common declarative workload and config resources such as `Deployment`, `StatefulSet`, `DaemonSet`, `Job`, `CronJob`, `ConfigMap`, `Service`, `Route`, `BuildConfig`, `NetworkPolicy`, `Role`, `RoleBinding`, and `ServiceAccount` | `include` |
| Unknown kinds with no explicit rule | `review` |

### OpenShift Scaffolding That Is Excluded

The plugin excludes namespace scaffolding that OpenShift injects automatically, including:

- ConfigMaps such as `kube-root-ca.crt`, `openshift-service-ca.crt`, and names containing `service-cabundle`, `trusted-cabundle`, or `ca-bundle`
- ServiceAccounts such as `default`, `builder`, `deployer`, and `pipeline`
- RoleBindings such as `system:deployers`, `system:image-builders`, `system:image-pullers`, `openshift-pipelines-edit`, and `pipelines-scc-rolebinding`

## Sanitization Summary

For resources that are not excluded, the plugin produces a sanitized manifest with these broad rules:

- Remove server-assigned metadata such as `uid`, `resourceVersion`, `generation`, `creationTimestamp`, `managedFields`, and `selfLink`
- Remove controller ownership and most system finalizers
- Strip known noisy annotations such as `kubectl.kubernetes.io/last-applied-configuration`, `deployment.kubernetes.io/revision`, `openshift.io/generated-by`, `openshift.io/host.generated`, and several OpenShift or PV-related prefixes
- Remove top-level runtime state such as `status`, `spec.nodeName`, and default scheduler references
- Clean pod templates by removing defaulted pod spec values (`schedulerName: default-scheduler`, `dnsPolicy: ClusterFirst`, `restartPolicy: Always`, empty `securityContext`) and container termination-message defaults (`terminationMessagePath: /dev/termination-log`, `terminationMessagePolicy: File`)
- Apply small kind-specific cleanup passes for resources such as `Deployment`, `Secret`, `PersistentVolumeClaim`, `Service`, and `ImageStream`

The goal is not to perfectly normalize every Kubernetes object. The goal is to remove the common cluster-generated noise so the YAML looks closer to what a human would commit to Git.

## Important Kind-Specific Behavior

### Secret handling

Secrets follow the user-selected secret mode:

- `redact`: keep keys but replace values with `<REDACTED>`
- `omit`: skip the Secret entirely
- `include`: keep the values as-is

### Deployment cleanup

Deployments have a small default-pruning pass that removes values such as:

- `progressDeadlineSeconds: 600`
- `revisionHistoryLimit: 10`
- `minReadySeconds: 0`
- the default rolling-update strategy block

### Service cleanup

Services always drop cluster-assigned networking fields such as `clusterIP`, `clusterIPs`, `ipFamilies`, `ipFamilyPolicy`, and `internalTrafficPolicy`, plus `sessionAffinity` when it is the default value `None`. LoadBalancer services also drop common platform-specific service annotations (prefixes `service.beta.kubernetes.io/`, `service.kubernetes.io/`, and `metallb.universe.tf/`).

### ImageStream cleanup

ImageStreams always drop `spec.dockerImageRepository` because the cluster populates this from the registry.

### PersistentVolumeClaim cleanup

PersistentVolumeClaims always drop `spec.volumeName` because it is assigned by the cluster after binding.

## Preview, ZIP, and GitOps Output

The same sanitized object feeds every downstream output:

- the YAML preview in the console
- the ZIP archive download
- the generated Argo CD Application YAML

Serialization uses `js-yaml` with original key order preserved and YAML anchors disabled.

The preview is capped at 16 KB. If the YAML is longer, the preview is truncated and ends with `# Preview truncated`. ZIP export and GitOps definition generation use the full sanitized content, not the truncated preview text.

## Supported Kinds

The plugin ships with a fixed list of namespaced kinds that the user can scan. The default selection focuses on common workloads and configuration resources, while additional kinds such as `Role`, `RoleBinding`, `ServiceAccount`, and `ImageStreamTag` are optional.

## Example

A live Deployment often includes runtime metadata and defaulted values that are not useful in Git, for example:

- metadata fields such as `uid`, `resourceVersion`, and `managedFields`
- rollout annotations such as `deployment.kubernetes.io/revision`
- top-level `status`
- default pod-template fields such as `schedulerName`, `dnsPolicy`, and container termination-message settings

After sanitization, the preview/exported YAML keeps the declarative parts:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: demo
  labels:
    app: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          ports:
            - containerPort: 8080
```
