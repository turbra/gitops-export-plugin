---
title: Architecture
description: Runtime components, namespace model, deployment topology, and scan flow.
---

# Architecture

GitOps Export has a small runtime footprint: a static plugin backend and browser-side scan logic.

## Runtime Components

| Component | Description |
| --- | --- |
| Plugin backend | nginx pod in `gitops-export-console`, serving the compiled plugin bundle over TLS. |
| ConsolePlugin | OpenShift resource that tells the console how to load the plugin. |
| Browser plugin | JavaScript loaded by the OpenShift console. It performs scans, sanitization, ZIP creation, and Argo CD YAML generation. |
| Console proxy | Existing OpenShift console path used by `k8sList` with the current user's session. |

## Namespace Model

| Namespace | Role |
| --- | --- |
| `gitops-export-console` | Hosts the plugin deployment, service, config, and install patcher resources. |
| Target namespace | Namespace currently viewed by the user and scanned by the plugin. |

The plugin only lists resources in the target namespace. It does not create, update, patch, or delete target namespace resources.

## Scan Flow

```text
User opens GitOps Export tab on a namespace
  -> plugin reads namespace context
  -> user selects resource kinds and Secret handling
  -> browser calls k8sList for each selected kind
  -> Kubernetes API applies current user RBAC
  -> plugin classifies each returned resource
  -> plugin sanitizes non-excluded resources
  -> plugin renders preview, ZIP archive, or Application YAML
```

## Deployment Topology

```text
OpenShift cluster
  gitops-export-console namespace
    Deployment: nginx serving plugin bundle
    Service: port 9443 with service serving certificate
    ConsolePlugin: console registration
    Job: one-time console operator patch

User browser
  OpenShift console loads plugin bundle
  Plugin calls Kubernetes APIs through console proxy
  Classification and sanitization run in browser
```

## Related CLI

The [`scrubctl`](https://github.com/turbra/scrubctl) CLI lives in its own repository. It is the terminal and pipeline counterpart to this console plugin.
