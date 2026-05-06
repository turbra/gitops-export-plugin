---
title: Overview
description: How GitOps Export turns live namespace state into GitOps-ready artifacts.
---

# Overview

GitOps Export runs as an OpenShift console plugin. Users open it from a Project or Namespace details page, scan selected namespaced resource kinds, review the classified output, and download sanitized manifests.

## Core Flow

```text
User opens GitOps Export tab
  -> plugin reads the namespace from console page context
  -> user selects resource kinds and Secret handling
  -> browser calls k8sList through the OpenShift console proxy
  -> browser classifies resources
  -> browser sanitizes non-excluded resources
  -> browser renders YAML previews
  -> browser builds a ZIP archive or Argo CD Application YAML
```

The nginx pod that serves the plugin bundle does not call the Kubernetes API. All scan logic runs in the user's browser through the OpenShift console session.

## What the Plugin Does

- Lists selected namespaced resource kinds through the console proxy.
- Classifies each resource as `include`, `cleanup`, `review`, or `exclude`.
- Removes server-assigned metadata, runtime state, controller-owned fields, and common Kubernetes defaults.
- Renders YAML previews for non-excluded resources.
- Downloads a ZIP archive grouped by classification.
- Generates Argo CD `Application` YAML from the latest sanitized export.

## What It Does Not Do

- It does not push manifests to Git.
- It does not install OpenShift GitOps or Argo CD.
- It does not create, update, patch, or delete resources in the target namespace.
- It does not run a backend API or controller.

## Relationship to scrubctl

The standalone [`scrubctl`](https://github.com/turbra/scrubctl) CLI implements the same curated resource set, classification rules, sanitization behavior, archive layout, and Argo CD Application defaults. The TypeScript plugin and Go CLI are kept aligned with fixture-based parity tests.
