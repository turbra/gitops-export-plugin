---
title: Export ZIP
description: Download sanitized namespace manifests as a GitOps-ready archive.
---

# Export ZIP

After a scan completes, download the sanitized manifests as a ZIP archive.

## Download the Archive

1. Run a scan from the **GitOps Export** tab.
2. Review `cleanup` and `review` classifications.
3. Click **Download ZIP**.
4. Extract the archive into a working branch of your GitOps repository.
5. Commit only the manifests you have reviewed.

## Archive Layout

```text
gitops-export-my-app-20260506T140000Z.zip
├── README.md
├── WARNINGS.md
└── manifests/
    ├── include/
    │   ├── deployment-web.yaml
    │   └── service-web.yaml
    ├── cleanup/
    │   └── persistentvolumeclaim-data.yaml
    └── review/
        └── secret-web-config.yaml
```

`WARNINGS.md` is present when the export contains cleanup, review, or skipped resources.

## Review Warnings

Example warning content:

```md
# Warnings

## cleanup

- PersistentVolumeClaim/data: PVC may contain cluster-specific binding details

## review

- Secret/web-config: Secret values were redacted

## skipped

- Secret/private-token: Secret omitted by current secret handling
```

Treat the archive as a starting point. The classification folders make the review work explicit, but they do not replace human review.

## Commit the Output

A typical GitOps repository path might look like this after review:

```text
manifests/
└── overlays/
    └── install/
        ├── deployment-web.yaml
        ├── service-web.yaml
        └── persistentvolumeclaim-data.yaml
```

Do not commit `review/` resources until the sensitive or context-heavy content has been checked.
