---
title: First Export
description: Run the first namespace scan and download Git-ready manifests.
---

# First Export

Use the first export workflow to confirm the plugin is installed and to produce a ZIP archive from a namespace.

## Run a Scan

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

## Read the Result

The scan classifies each resource:

| Category | Meaning |
| --- | --- |
| `include` | Ready for Git after sanitization. |
| `cleanup` | Exported, but contains environment-specific values to review. |
| `review` | Exported, but needs careful review before commit. |
| `exclude` | Not exported because it is controller-owned, runtime-generated, or OpenShift scaffolding. |

Click **Show YAML** on any non-excluded resource to inspect the sanitized manifest before downloading the archive.

## Download the ZIP

Click **Download ZIP** after a scan completes.

```text
gitops-export-<namespace>-<timestamp>.zip
├── README.md
├── WARNINGS.md
└── manifests/
    ├── include/
    ├── cleanup/
    └── review/
```

`WARNINGS.md` is present when the export contains cleanup, review, or skipped resources. Commit only the manifests you have reviewed.

## Check Missing Resources

The plugin respects the current user's OpenShift RBAC. If a scan is missing expected resources, check whether the user can list that resource in the target namespace.

```sh
oc auth can-i list deployments -n my-app
oc auth can-i list secrets -n my-app
oc auth can-i list routes.route.openshift.io -n my-app
```
