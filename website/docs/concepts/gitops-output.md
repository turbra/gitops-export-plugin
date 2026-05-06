---
title: GitOps-ready Output
description: YAML previews, ZIP archives, warnings, and Argo CD output.
---

# GitOps-ready Output

The sanitized object is the source for every downstream output: YAML preview, ZIP archive, and generated Argo CD Application YAML.

## YAML Preview

The browser serializes sanitized resources with `js-yaml`. Previews are capped at 16 KiB. If a resource is larger than that limit, the preview is truncated and ends with:

```yaml
# Preview truncated
```

ZIP export and Argo CD Application generation use the full sanitized object, not the truncated preview text.

## ZIP Archive

Archive name:

```text
gitops-export-<namespace>-<timestamp>.zip
```

Archive layout:

```text
gitops-export-<namespace>-<timestamp>.zip
├── README.md
├── WARNINGS.md
└── manifests/
    ├── include/
    ├── cleanup/
    └── review/
```

`WARNINGS.md` is present when the scan has `cleanup`, `review`, or skipped resources. Secrets omitted by Secret handling mode appear in the skipped section.

Each manifest filename uses this pattern:

```text
<kind-kebab>-<name-sanitized>.yaml
```

If two filenames collide after sanitization, the second and later files receive numeric suffixes such as `-2` or `-3`.

## Example Warning File

`WARNINGS.md` groups resources that need attention before they are treated as desired state.

```md
# Warnings

## cleanup

- Service/web: LoadBalancer service may contain environment-specific settings
- PersistentVolumeClaim/data: PVC may contain cluster-specific binding details

## review

- Secret/web-config: Secret values were redacted
- ConfigMap/app-settings: Resource is Helm-managed

## skipped

- Secret/private-token: Secret omitted by current secret handling
```

## Argo CD Application

The Application generator produces a single `Application` YAML document. It uses the scanned namespace and the Git repository fields entered in the console form.

Default values:

| Field | Default |
| --- | --- |
| Argo CD namespace | `openshift-gitops` |
| Argo CD project | `default` |
| Destination server | `https://kubernetes.default.svc` |
| Destination namespace | Scanned namespace |
| Sync mode | Manual |

Example output shape:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: openshift-gitops
spec:
  project: default
  source:
    repoURL: https://github.com/example/my-app.git
    targetRevision: main
    path: manifests/overlays/install
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy: {}
```
