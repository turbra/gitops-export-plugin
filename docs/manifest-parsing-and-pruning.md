---
title: Manifest Parsing and Pruning
description: >-
  How GitOps Export reads live objects, classifies them, and removes
  cluster-generated noise before preview and export.
---

# Manifest Parsing and Pruning

This document explains the internal behavior of GitOps Export at a practical level. It covers how each tool reads live objects, decides whether each object should be included, and produces the sanitized YAML shown in the preview, ZIP export, and Argo CD Application generator.

## Shared Implementation

GitOps Export ships two tools that implement the same curated resource set, classification rules, and sanitization pipeline. The logic is implemented twice (once in TypeScript for the browser-based console plugin, and once in Go for the standalone [`scrubctl` CLI](https://github.com/turbra/scrubctl)), and a fixture-based parity test suite keeps the two implementations in step.

| Behavior | TypeScript (console plugin, runs in browser) | Go ([`scrubctl`](https://github.com/turbra/scrubctl), runs locally) |
|----------|----------------------------------------------|-------------------------------|
| Scan a namespace | `src/hooks/useNamespaceScan.ts`, `src/scan-utils.ts` | [`internal/scan`](https://github.com/turbra/scrubctl/tree/main/internal/scan) |
| Classify a resource | `src/scan-utils.ts` | [`internal/classify`](https://github.com/turbra/scrubctl/tree/main/internal/classify) |
| Sanitize a resource | `src/scan-utils.ts` | [`internal/sanitize`](https://github.com/turbra/scrubctl/tree/main/internal/sanitize) |
| Curated kind registry | `src/scan-utils.ts` (`RESOURCE_TYPE_OPTIONS`) | [`internal/resources`](https://github.com/turbra/scrubctl/tree/main/internal/resources) |
| OpenShift scaffolding detection | `src/scan-utils.ts` | [`internal/openshift`](https://github.com/turbra/scrubctl/tree/main/internal/openshift) |
| Build ZIP archive | `src/export-archive.ts` | [`internal/archive`](https://github.com/turbra/scrubctl/tree/main/internal/archive) |
| Generate Argo CD Application | `src/gitops-definition-utils.ts` | [`internal/argocd`](https://github.com/turbra/scrubctl/tree/main/internal/argocd) |

Whenever you change the TypeScript implementation, run `npm run generate-fixtures` and `npm run test:fixtures` to update and verify the golden files. Then copy the updated `testdata/fixtures/` to the scrubctl repo and run `go test ./...` there to confirm parity.

## Scan Flow

When a user clicks **Export** in the console plugin, or runs `scrubctl scan`/`scrubctl export`/`scrubctl generate argocd`, the tool does this:

1. Lists each selected namespaced resource kind through the Kubernetes API, scoped to the caller's RBAC (the console proxy in the browser, or the active kubeconfig context for `scrubctl`).
2. Classifies each returned object as `include`, `cleanup`, `review`, or `exclude` using the rules below.
3. Deep-clones non-excluded objects and removes cluster-generated metadata, defaults, and runtime-only fields.
4. Stores the sanitized object as the source for every downstream output (YAML preview, ZIP export, generated Argo CD Application).
5. Sorts the results, computes summary counts, and returns them to the caller.

Kinds that return `401`, `403`, `404`, or `405` during listing are skipped silently. Any other error surfaces to the user with the list error attached.

## Classification Rules

Classification is intentionally conservative and first-match wins. The rules are evaluated top to bottom.

| Order | Rule | Result |
|-------|------|--------|
| 1 | `apiVersion` starts with `gitops.stakkr.io/` (internal control-plane objects) | `exclude` |
| 2 | `metadata.ownerReferences` is non-empty (controller-owned object) | `exclude` |
| 3 | Label `app.kubernetes.io/managed-by=helm` | `review` |
| 4 | OpenShift namespace scaffolding (see below) | `exclude` |
| 5 | Runtime or cluster-owned kind: `Pod`, `ReplicaSet`, `EndpointSlice`, `Endpoints`, `Event`, `ControllerRevision`, `Lease`, `TokenReview`, `SubjectAccessReview`, `Node`, `PersistentVolume` | `exclude` |
| 6 | Sensitive or context-heavy kind: `Secret`, `PodDisruptionBudget`, `ResourceQuota`, `LimitRange`, `DeploymentConfig` | `review` |
| 7 | Environment-specific kind: `PersistentVolumeClaim`, `ImageStream`, `ImageStreamTag` | `cleanup` |
| 8 | `Service` of type `LoadBalancer` | `cleanup` |
| 9 | Other declarative workloads/config: `Deployment`, `StatefulSet`, `DaemonSet`, `Job`, `CronJob`, `Service` (non-LoadBalancer), `ConfigMap`, `ServiceAccount`, `Role`, `RoleBinding`, `NetworkPolicy`, `HorizontalPodAutoscaler`, `Route`, `BuildConfig` | `include` |
| 10 | Unknown or unhandled kind | `review` |

### OpenShift Scaffolding That Is Excluded

OpenShift automatically injects a handful of namespace-level objects that should never be committed to Git. The tool excludes them by name.

| Kind | Exact names | Name substrings |
|------|-------------|-----------------|
| `ConfigMap` | `kube-root-ca.crt`, `openshift-service-ca.crt` | `service-cabundle`, `trusted-cabundle`, `ca-bundle` |
| `ServiceAccount` | `default`, `builder`, `deployer`, `pipeline` | (none) |
| `RoleBinding` | `system:deployers`, `system:image-builders`, `system:image-pullers`, `openshift-pipelines-edit`, `pipelines-scc-rolebinding` | (none) |

## Curated Resource Set

GitOps Export operates on a fixed list of 18 namespaced kinds. 14 are selected by default; 4 are opt-in. Kinds outside the curated set are rejected with `kind not in curated resource set`.

| Kind | API group / version | Default? |
|------|---------------------|----------|
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

## Sanitization Pipeline

Every non-excluded resource runs through the same pipeline. The order matters: each stage operates on the output of the previous one.

### 1. Deep-clone

The live object is deep-cloned before any mutation, so the caller's original data is never modified.

### 2. Metadata strip

These fields are removed from `metadata`:

- `uid`
- `resourceVersion`
- `generation`
- `creationTimestamp`
- `managedFields`
- `selfLink`
- `ownerReferences`

### 3. Annotation prune

These annotations are removed by exact key:

- `kubectl.kubernetes.io/last-applied-configuration`
- `deployment.kubernetes.io/revision`
- `openshift.io/generated-by`
- `openshift.io/host.generated`

These annotation **prefixes** are stripped:

- `pv.kubernetes.io/`
- `operator.openshift.io/`
- `openshift.io/build.`

If the `metadata.annotations` map becomes empty, it is deleted entirely.

### 4. System finalizer prune

Finalizers whose keys start with any of these prefixes are removed:

- `kubernetes.io/`
- `openshift.io/`
- `operator.openshift.io/`

If the `metadata.finalizers` list becomes empty, it is deleted entirely.

### 5. Top-level defaults strip

- `status` is deleted.
- `spec.nodeName` is deleted.
- `spec.schedulerName` is deleted if its value is `default-scheduler`.

### 6. Pod-template defaults strip

For any kind that carries a pod template (`Deployment`, `StatefulSet`, `DaemonSet`, `Job`, `CronJob`, `DeploymentConfig`), the tool prunes the embedded `spec.template` (or `spec.jobTemplate.spec.template` for CronJobs):

- `metadata.creationTimestamp` removed
- `spec.schedulerName` removed if `default-scheduler`
- `spec.dnsPolicy` removed if `ClusterFirst`
- `spec.restartPolicy` removed if `Always`
- `spec.securityContext` removed if empty
- For each container: `terminationMessagePath` removed if `/dev/termination-log`, `terminationMessagePolicy` removed if `File`

### 7. Kind-specific cleanup

| Kind | Rule |
|------|------|
| `Deployment` | Drop `spec.progressDeadlineSeconds=600`, `spec.revisionHistoryLimit=10`, `spec.minReadySeconds=0`, and the default rolling-update strategy (`maxSurge=25%` and `maxUnavailable=25%`) |
| `Secret` | Redact `data` and `stringData` values with `<REDACTED>` unless secret handling is `include`. When secret handling is `omit`, the Secret is dropped earlier in the pipeline before sanitization and never appears in output |
| `PersistentVolumeClaim` | Drop `spec.volumeName` (assigned by the cluster after binding) |
| `Service` | Drop `spec.clusterIP`, `spec.clusterIPs`, `spec.ipFamilies`, `spec.ipFamilyPolicy`, `spec.internalTrafficPolicy`; drop `spec.sessionAffinity` when value is `None` |
| `Service` (type `LoadBalancer`) | Additionally drop annotations with prefixes `service.beta.kubernetes.io/`, `service.kubernetes.io/`, `metallb.universe.tf/` |
| `ImageStream` | Drop `spec.dockerImageRepository` (populated from the registry) |

### 8. Secret-handling filter

Secrets follow the user-selected mode:

- `redact` (default): keys kept, values replaced with `<REDACTED>`
- `omit`: the Secret is removed from the scan result entirely and listed under "Skipped" in `WARNINGS.md`
- `include`: values are kept as-is (the tool warns on stderr; the console plugin renders a banner)

The goal of sanitization is not to perfectly normalize every Kubernetes object. It is to remove the common cluster-generated noise so the YAML looks closer to what a human would commit to Git.

## Downstream Outputs

The sanitized object is the single source for every output the tool produces.

### YAML preview

Serialization uses `js-yaml` (browser) or `sigs.k8s.io/yaml` (Go), both preserving key order and disabling YAML anchors.

The preview is capped at **16 KiB** (`MaxPreviewBytes = 16 * 1024`). If the serialized YAML is longer, the tool truncates to the last newline that fits and appends:

```
# Preview truncated
```

ZIP export and Argo CD Application generation always use the full sanitized content, never the truncated preview text.

### ZIP archive

Archive name: `gitops-export-<namespace>-<timestamp>.zip` (the timestamp has dashes, colons, and fractional seconds removed).

Layout:

```
gitops-export-<namespace>-<timestamp>.zip
├── README.md            # scan summary, classification legend, and scrubctl byline
├── WARNINGS.md          # present only when cleanup/review/skipped resources exist
└── manifests/
    ├── include/         # ready for Git
    ├── cleanup/         # exported but contains environment-specific values
    └── review/          # exported but needs a careful look
```

Each manifest file is named `<kind-kebab>-<name-sanitized>.yaml`. If two sanitized names would collide (rare; usually a cross-kind collision after normalization), the second file gets a numeric suffix (`-2`, `-3`, ...).

`WARNINGS.md` groups issues into three sections: `cleanup` (classified as `cleanup`), `review` (classified as `review`), and `skipped` (Secrets omitted by the `omit` secret-handling mode, which carry the message `Secret omitted by current secret handling`).

### Argo CD Application

The generator produces a single `Application` YAML document using the scan's namespace and sanitized summary. See the [scrubctl CLI Reference](https://turbra.github.io/scrubctl/cli.html#generate-an-argo-cd-application) for the example output and the [User Guide]({{ '/user-guide.html' | relative_url }}#argo-cd-application-defaults) for the pre-filled defaults.

## Worked Example

A live Deployment usually carries runtime metadata and defaulted values that are not useful in Git:

- `metadata.uid`, `metadata.resourceVersion`, `metadata.managedFields`
- `metadata.annotations."deployment.kubernetes.io/revision"`
- `status`
- `spec.template.spec.schedulerName: default-scheduler`
- `spec.template.spec.dnsPolicy: ClusterFirst`
- `spec.template.spec.containers[].terminationMessagePath: /dev/termination-log`
- `spec.template.spec.containers[].terminationMessagePolicy: File`
- `spec.progressDeadlineSeconds: 600`, `spec.revisionHistoryLimit: 10`

After sanitization, the preview and exported YAML keep only the declarative parts:

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

## Testing Parity

Fixture-based parity tests in `testdata/fixtures` compare the Go and TypeScript outputs for the same inputs. The TypeScript implementation is the oracle: `npm run generate-fixtures` regenerates the expected output from `src/scan-utils.ts` via `scripts/generate-fixtures.ts`. `npm run test:fixtures` validates the TypeScript output against the golden files.

The Go parity tests live in the [scrubctl repository](https://github.com/turbra/scrubctl) and read the same `testdata/fixtures/` directory. After updating fixtures here, copy them to the scrubctl repo and run `go test ./...` to confirm both implementations still match. Any new classification rule, annotation/finalizer prune, or kind-specific cleanup must preserve parity across both implementations.
