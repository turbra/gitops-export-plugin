---
title: Sanitization
description: Fields and defaults removed before YAML preview and export.
---

# Sanitization

Sanitization removes cluster-generated noise from non-excluded resources so the exported YAML is closer to something a human would commit.

## Pipeline

1. Deep-clone the live object.
2. Remove server-assigned metadata.
3. Remove noisy annotations.
4. Remove system finalizers.
5. Remove top-level runtime fields and common defaults.
6. Remove pod-template defaults.
7. Apply kind-specific cleanup.
8. Apply the selected Secret handling mode.

The original object returned by the console SDK is not modified.

## Metadata Removed

These fields are removed from `metadata`:

- `uid`
- `resourceVersion`
- `generation`
- `creationTimestamp`
- `managedFields`
- `selfLink`
- `ownerReferences`

## Annotation Cleanup

Exact annotation keys removed:

| Annotation | Why removed |
| --- | --- |
| `kubectl.kubernetes.io/last-applied-configuration` | Client-side apply bookkeeping |
| `deployment.kubernetes.io/revision` | Runtime rollout state |
| `openshift.io/generated-by` | Generated object marker |
| `openshift.io/host.generated` | Route host generation marker |

Annotation prefixes removed:

- `pv.kubernetes.io/`
- `operator.openshift.io/`
- `openshift.io/build.`

If `metadata.annotations` becomes empty, it is removed.

## Runtime and Default Fields

The plugin removes `status`, `spec.nodeName`, and `spec.schedulerName: default-scheduler`.

For pod templates, it removes common Kubernetes defaults such as `dnsPolicy: ClusterFirst`, `restartPolicy: Always`, empty `securityContext`, and default container termination message fields.

## Kind-specific Cleanup

| Kind | Cleanup |
| --- | --- |
| `Deployment` | Drops default progress deadline, revision history, minimum ready seconds, and default rolling update strategy values. |
| `Secret` | Redacts values by default, omits the resource when Secret handling is `omit`, or keeps values when Secret handling is `include`. |
| `PersistentVolumeClaim` | Drops `spec.volumeName`. |
| `Service` | Drops cluster-assigned IP fields and default session affinity. |
| `Service` type `LoadBalancer` | Also drops load balancer implementation annotations. |
| `ImageStream` | Drops `spec.dockerImageRepository`. |

Sanitization is intentionally practical, not exhaustive. The goal is to remove common cluster-generated drift while leaving enough context for review.
