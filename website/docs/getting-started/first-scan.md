---
title: First Scan
description: Run a namespace scan and review resource classifications.
---

# First Scan

Use the first scan workflow to confirm the plugin is installed and to understand what GitOps Export sees in a namespace.

## Run the Scan

1. Open a **Project** or **Namespace** in the OpenShift console.
2. Select the **GitOps Export** tab.
3. Choose a Secret handling mode.
4. Choose the resource kinds to scan.
5. Click **Export**.

Secret handling modes:

| Mode | Behavior |
| --- | --- |
| `redact` | Default. Secret keys are shown, but values are replaced with `<REDACTED>`. |
| `omit` | Secrets are excluded from the scan result and listed as skipped in `WARNINGS.md`. |
| `include` | Secret values are shown as-is in the browser. Use only when that output is safe to handle. |

## Read the Classification Table

The scan classifies each resource:

| Category | Meaning |
| --- | --- |
| `include` | Ready for Git after sanitization. |
| `cleanup` | Exported, but contains environment-specific values to review. |
| `review` | Exported, but needs careful review before commit. |
| `exclude` | Not exported because it is controller-owned, runtime-generated, or OpenShift scaffolding. |

Click **Show YAML** on any non-excluded resource to inspect the sanitized manifest before downloading the archive.

## Check Missing Resources

The plugin respects the current user's OpenShift RBAC. If a scan is missing expected resources, check whether the user can list that resource in the target namespace.

```sh
oc auth can-i list deployments -n my-app
oc auth can-i list secrets -n my-app
oc auth can-i list routes.route.openshift.io -n my-app
```

Kinds that return `401`, `403`, `404`, or `405` are skipped. Other API errors are surfaced in the scan result.
