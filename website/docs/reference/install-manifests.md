---
title: Install Manifests
description: Resources created by the GitOps Export install overlay.
---

# Install Manifests

The install overlay is the source of truth for cluster deployment.

```sh
oc apply -k manifests/overlays/install
```

## Runtime Resources

| Resource | Name | Purpose |
| --- | --- | --- |
| Namespace | `gitops-export-console` | Hosts the plugin deployment. |
| Deployment | `gitops-export-console` | Runs nginx to serve the plugin bundle over TLS. |
| Service | `gitops-export-console` | Exposes the deployment on port 9443. |
| ConfigMap | `gitops-export-console` | Provides nginx TLS listener configuration. |
| ConsolePlugin | `gitops-export-console` | Registers the plugin with the OpenShift console. |

The Service uses the `service.alpha.openshift.io/serving-cert-secret-name` annotation so OpenShift generates and mounts a serving certificate.

## Patcher Job Resources

| Resource | Name | Purpose |
| --- | --- | --- |
| Job | `gitops-export-console-install-patcher` | Enables the plugin in `consoles.operator.openshift.io/cluster`. |
| ServiceAccount | `gitops-export-console-patcher` | Identity for the patcher Job. |
| ClusterRole | `gitops-export-console-patcher` | Grants access to patch console operator config. |
| ClusterRoleBinding | `gitops-export-console-patcher` | Binds the ClusterRole to the ServiceAccount. |

## Re-apply After a Recent Install

```sh
oc delete job/gitops-export-console-install-patcher -n gitops-export-console
oc apply -k manifests/overlays/install
```

Use this when a recent completed patcher Job still exists and blocks a rapid re-apply.
