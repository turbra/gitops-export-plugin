---
title: Security Model
description: Runtime boundaries, Secret handling, and RBAC behavior.
---

# Security Model

GitOps Export separates install-time permissions, runtime plugin hosting, and end-user scan permissions.

## Browser-side Execution

The scan runs in the user's browser. The plugin calls Kubernetes APIs through the OpenShift console proxy using the current console session.

The plugin backend is only an nginx static-file server. It serves the compiled JavaScript bundle over TLS and does not make Kubernetes API calls.

## RBAC Scope

End users need only `list` permission for the resource kinds they scan in the target namespace. If the API returns `401`, `403`, `404`, or `405` for a kind, the plugin skips that kind.

Check access with:

```sh
oc auth can-i list deployments -n my-app
oc auth can-i list secrets -n my-app
oc auth can-i list rolebindings.rbac.authorization.k8s.io -n my-app
```

## Secret Handling

Secrets are redacted by default. In `include` mode, Secret values are only rendered in the browser and are not sent to the plugin backend. Treat generated previews and ZIP archives as sensitive whenever Secret handling is `include`.

## Install-time Elevation

The install overlay includes a one-time Job that patches `consoles.operator.openshift.io/cluster` to enable the plugin. That Job uses a dedicated ServiceAccount, ClusterRole, and ClusterRoleBinding. Runtime plugin serving does not use that elevated permission.
