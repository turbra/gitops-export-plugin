---
title: Architecture and Deployment
description: >-
  Runtime components, namespace model, deployment topology, and security model for GitOps Export.
---

# Architecture and Deployment

GitOps Export ships two independent tools that implement the same classification and sanitization behavior:

- **Console plugin (`gitops-export-console`)**: runs as an OpenShift console plugin. No server-side controller, no CRDs, no persistent storage. All plugin scan logic runs in the user's browser.
- **[`scrubctl` CLI](https://github.com/turbra/scrubctl)**: runs as a local Go binary on the user's workstation or CI runner. No cluster-side installation required. Now maintained in its own repository.

Both tools follow the same curated resource set and classification rules, and are expected to produce equivalent sanitized YAML. The logic is implemented twice (TypeScript in the plugin, Go in `scrubctl`) and kept aligned by a fixture-based parity test suite rather than shared runtime code. See [Manifest Parsing and Pruning]({{ '/manifest-parsing-and-pruning.html' | relative_url }}#shared-implementation) for the parity map.

## Console Plugin Architecture

### Runtime Components

#### Plugin backend (`gitops-export-console` namespace)

The plugin backend is a static-file nginx server. It serves the compiled JavaScript bundle and related assets to the OpenShift console over TLS on port 9443.

| Resource | Purpose |
|----------|---------|
| **Deployment** (`gitops-export-console`) | Two replicas of the nginx container, each mounting the TLS serving cert and the nginx ConfigMap |
| **Service** (`gitops-export-console`) | ClusterIP service on port 9443; the `service.alpha.openshift.io/serving-cert-secret-name` annotation causes OpenShift to generate and inject a TLS certificate |
| **ConfigMap** (`gitops-export-console`) | nginx configuration: TLS listener on 9443 with TLSv1.2/TLSv1.3, cert paths, and `html` root |
| **ConsolePlugin** (`gitops-export-console`) | Registers the plugin with the OpenShift console operator, pointing to the Service |

#### Plugin registration (install overlay)

The install overlay adds a one-time Job that patches `consoles.operator.openshift.io/cluster` to add `gitops-export-console` to the active plugin list.

| Resource | Purpose |
|----------|---------|
| **Job** (`gitops-export-console-install-patcher`) | Reads the current plugin list, merges in `gitops-export-console`, and patches the console operator config |
| **ServiceAccount** (`gitops-export-console-patcher`) | Identity for the Job |
| **ClusterRole** (`gitops-export-console-patcher`) | Grants get/list/patch/update on `consoles.operator.openshift.io` |
| **ClusterRoleBinding** (`gitops-export-console-patcher`) | Binds the ClusterRole to the ServiceAccount |

Because the Job name is fixed, a rapid re-apply can collide with a previous completed Job until its `ttlSecondsAfterFinished: 300` cleanup window expires. If `oc apply -k manifests/overlays/install` fails during an upgrade or image refresh, delete `job/gitops-export-console-install-patcher` in `gitops-export-console` and re-apply.

#### Plugin frontend (user's browser)

The scan logic (classification, metadata stripping, YAML preview generation, ZIP archive generation, and Argo CD Application generation) runs entirely in the browser. The plugin uses the OpenShift console SDK's `k8sList` function to query the Kubernetes API through the console's built-in proxy. No direct API calls leave the browser; the console proxy handles authentication and routing.

### Namespace Model

| Namespace | Role |
|-----------|------|
| `gitops-export-console` | Hosts the plugin deployment, service, and related resources. Created by the install overlay. |
| Target namespace (any) | The namespace the user is viewing when they open the GitOps Export tab. The plugin scans resources here using the current user's session. |

The plugin does not create, modify, or delete any resources in the target namespace. It only performs list operations.

### Scan Flow

```
User opens GitOps Export tab on a namespace
        |
        v
Plugin reads the namespace from the page context
        |
        v
User selects resource kinds and secret handling, clicks Export
        |
        v
Plugin calls k8sList for each selected kind via the console proxy
(uses the current user's OpenShift session and RBAC)
        |
        v
Plugin classifies each resource (include / cleanup / review / exclude)
        |
        v
Plugin strips cluster-injected metadata and runtime defaults
        |
        v
Plugin renders sanitized YAML preview (js-yaml)
        |
        v
Scan result displayed in the console UI
        |
        v
Optional ZIP archive generated in the browser
        |
        v
Optional Application YAML generated in the browser
```

### Deployment Topology

```
+-------------------------------------------+
|  OpenShift cluster                        |
|                                           |
|  +--- gitops-export-console namespace --+ |
|  |                                      | |
|  |  Deployment (2 replicas)             | |
|  |    nginx serving JS bundle on 9443   | |
|  |                                      | |
|  |  Service (ClusterIP, port 9443)      | |
|  |    with serving-cert annotation      | |
|  |                                      | |
|  |  ConsolePlugin registration          | |
|  +--------------------------------------+ |
|                                           |
|  Console operator                         |
|    loads plugin from Service endpoint     |
|                                           |
+-------------------------------------------+
        |
        v
  User's browser
    plugin JS executes here
    k8sList calls go through console proxy
    classification + sanitization runs here
    YAML preview rendered here
    ZIP archive generated here
    Application YAML generated here
```

### Security Model

- **RBAC-scoped**: The plugin lists resources using the current user's OpenShift session through the console proxy. If the user cannot list a resource kind in a namespace, the plugin will not see those resources. API errors with status codes 401, 403, 404, and 405 are silently skipped.
- **No elevated privileges at runtime**: The plugin deployment runs as a non-root nginx process serving static files. It does not make any Kubernetes API calls itself.
- **Elevated privileges at install time only**: The patcher Job requires `get`, `list`, `patch`, and `update` on `consoles.operator.openshift.io` to register the plugin. This Job runs once and is cleaned up after 300 seconds (`ttlSecondsAfterFinished`).
- **TLS**: The nginx server uses TLS certificates generated by the OpenShift service-cert signer. Traffic between the console and the plugin backend is encrypted within the cluster.
- **Secret handling**: Secrets are redacted by default. Even when the user selects "include", the secret values are only rendered in the browser; they are never sent to the plugin backend or any external service.
- **Pod security**: The deployment uses `runAsNonRoot`, `seccompProfile: RuntimeDefault`, drops all capabilities, and disables privilege escalation.

## `scrubctl` CLI Architecture

The `scrubctl` CLI has moved to its own repository: **[github.com/turbra/scrubctl](https://github.com/turbra/scrubctl)**

See the [scrubctl documentation](https://turbra.github.io/scrubctl/) for architecture details, source layout, security model, and the full command reference.
