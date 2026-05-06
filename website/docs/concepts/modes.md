---
title: Operating Modes
description: Console workflow and scrubctl CLI relationship.
---

# Operating Modes

GitOps Export is primarily a browser-side OpenShift console workflow. The related CLI workflow lives in `scrubctl`.

## Console Plugin Workflow

Use this mode when a user wants to inspect a namespace from the OpenShift console and download Git-ready output without installing local tools.

```text
OpenShift console
  -> Project or Namespace details
  -> GitOps Export tab
  -> scan selected resource kinds
  -> review classifications and YAML
  -> download ZIP or generate Argo CD Application YAML
```

The scan uses the current console session and namespace RBAC. The plugin backend only serves static files.

## CLI and Pipeline Workflow

Use [`scrubctl`](https://github.com/turbra/scrubctl) when the same classification and sanitization behavior is needed from a terminal or CI pipeline.

```sh
scrubctl scan my-app
scrubctl export my-app -o ./out
```

The console plugin and scrubctl are separate implementations kept aligned by shared fixture expectations. Use GitOps Export for browser-based review and scrubctl for local, scripted, or pipeline workflows.
