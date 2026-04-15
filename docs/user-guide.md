---
title: User Guide
description: >-
  Install, use, and understand GitOps Export in one page.
---

# GitOps Export User Guide

GitOps Export is an OpenShift console plugin that helps you move resources already running in a namespace into Git. It scans the namespace, cleans up cluster-generated noise from each manifest, and gives you a downloadable ZIP of Git-ready YAML. It can also generate an Argo CD Application so you can start managing those resources through GitOps.

Everything runs in your browser. The plugin never modifies resources in your namespace; it only reads them.

## Prerequisites

- OpenShift 4.18 or later
- `oc` CLI logged in to the cluster
- `cluster-admin` (or equivalent permissions to create the install resources)

## Install

```sh
oc apply -k manifests/overlays/install
```

Wait for the deployment to roll out:

```sh
oc -n gitops-export-console rollout status deployment/gitops-export-console
```

Wait for the patcher Job to finish enabling the plugin:

```sh
oc wait --for=condition=complete job/gitops-export-console-install-patcher \
  -n gitops-export-console --timeout=120s
```

Refresh the OpenShift console. A **GitOps Export** tab now appears on every Project and Namespace details page.

## Use

1. Open a **Project** or **Namespace** in the OpenShift console.
2. Click the **GitOps Export** tab.
3. Choose how to handle Secrets (**redact**, **omit**, or **include**) and which resource kinds to scan.
4. Click **Export**.

The scan result shows every resource classified into one of four categories:

| Category | Meaning |
|----------|---------|
| **include** | Ready for Git as-is after sanitization |
| **cleanup** | Exported, but contains environment-specific values you should review (e.g. PVC bindings, LoadBalancer settings) |
| **review** | Exported, but needs attention before committing (e.g. Secrets, Helm-managed resources) |
| **exclude** | Not exported: controller-owned, runtime-generated, or OpenShift scaffolding |

From the result you can:

- **Show YAML** on any non-excluded resource to see the cleaned manifest
- **Download ZIP** to get all exportable manifests in a single archive
- **Generate an Argo CD Application** to create the YAML you'd commit alongside the manifests

### What the plugin cleans up

The plugin strips fields that the cluster adds at runtime so the exported YAML looks like something a human would write. This includes:

- Server-assigned metadata (`uid`, `resourceVersion`, `managedFields`, `creationTimestamp`, etc.)
- Controller ownership references and system finalizers
- Noisy annotations (`kubectl.kubernetes.io/last-applied-configuration`, `deployment.kubernetes.io/revision`, etc.)
- Runtime state (`status`, `spec.nodeName`)
- Kubernetes defaults that don't need to be declared (`dnsPolicy: ClusterFirst`, `restartPolicy: Always`, default rolling-update strategy values, etc.)
- Cluster-assigned networking fields on Services (`clusterIP`, `ipFamilies`, etc.)

### What the ZIP contains

```
gitops-export-<namespace>-<timestamp>.zip
├── README.md
├── WARNINGS.md          (if cleanup or review resources exist)
└── manifests/
    ├── include/          (ready for Git)
    ├── cleanup/          (needs environment-specific review)
    └── review/           (needs careful review)
```

### Argo CD Application defaults

The GitOps definition form pre-fills common values. Review them before using the generated YAML:

| Field | Default |
|-------|---------|
| Argo CD namespace | `openshift-gitops` |
| Argo CD project | `default` |
| Destination server | `https://kubernetes.default.svc` (in-cluster) |
| Destination namespace | The namespace you scanned |
| Sync mode | Manual |

## RBAC

The plugin respects your existing OpenShift permissions. It lists resources using your session through the console proxy; if you can't `list` a resource kind in that namespace, the plugin silently skips it.

- **`admin` role**: Full access to all 18 scannable resource kinds
- **`edit` role**: Everything except Role and RoleBinding (not selected by default, so most scans are unaffected)
- **`view` role**: Cannot list Secrets, Roles, or RoleBindings

If a scan is missing expected resources, check your permissions:

```sh
oc auth can-i list <resource> -n <namespace>
```

## Connect your Git repository to Argo CD

This section assumes **OpenShift GitOps (Argo CD)** is already installed on the cluster and that the `Application` CRD is available. If your cluster does not already have Argo CD, install that first.

After downloading the ZIP and generating the Application YAML, push the manifests to a Git repository and connect that repository to Argo CD.

> If your repository is public, skip straight to step 3.

### Step 1: Create a deploy token

In your Git hosting provider (GitHub, GitLab, etc.), create a deploy token or personal access token with read-only repository access. In GitLab this is the `read_repository` scope.

### Step 2: Create a repository secret in Argo CD

Create a secret in the `openshift-gitops` namespace using the deploy token credentials:

```sh
oc create secret generic repo-<your-app> \
  --from-literal=type=git \
  --from-literal=url=https://<your-git-host>/<org>/<repo>.git \
  --from-literal=username=<token-username> \
  --from-literal=password=<token> \
  -n openshift-gitops
```

Label the secret so Argo CD picks it up:

```sh
oc label secret repo-<your-app> \
  argocd.argoproj.io/secret-type=repository \
  -n openshift-gitops
```

### Step 3: Apply the Application

Commit the generated Application YAML to your repository (or apply it directly):

```sh
oc apply -f <application-name>.yaml
```

Argo CD will now sync the exported manifests from Git to the destination namespace. If you chose **manual** sync mode, open the Argo CD UI and click **Sync** to trigger the first deployment.

## Prefer a terminal or pipeline?

`scrubctl` is a standalone CLI that runs the same scan, classification, sanitization, and export flow without the OpenShift console. Use it to pipe resources directly, run scans in CI, or work on clusters where you have no console access.

See [CLI Reference]({{ '/cli.html' | relative_url }}) for install instructions and the full command reference.

## How it works (briefly)

The plugin is a static JavaScript bundle served by an nginx pod in the `gitops-export-console` namespace. The console loads the bundle, but all scan logic (listing resources, classifying them, sanitizing manifests, building ZIP archives) runs in your browser. The nginx pod never makes Kubernetes API calls; it only serves files.

For deeper technical detail, see [Architecture and Deployment]({{ '/architecture-and-deployment.html' | relative_url }}) and [Manifest Parsing and Pruning]({{ '/manifest-parsing-and-pruning.html' | relative_url }}).

## Remove

```sh
oc delete -k manifests/overlays/install
```

Refresh the console. The **GitOps Export** tab will no longer appear.
