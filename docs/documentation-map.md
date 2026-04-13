---
title: Documentation Map
description: >-
  Navigation map for the GitOps Export documentation set, organized by user
  intent, deployment path, and technical depth.
---

# Documentation Map

Use this page when you know the problem category but do not yet know which page
should be your first stop.

## Reading Model

The docs are separated on purpose:

- read the user guide when you want the shortest path from plugin install to
  GitOps-ready output
- read the getting-started guide when you are operating the deployment, building
  images, or re-applying the install overlay
- read architecture and parsing pages when you need to understand how the plugin
  behaves internally
- read the RBAC reference when the question is about installer privileges or
  missing resources during a scan

That keeps the task pages from becoming reference dumps and keeps the reference
pages from drifting into operator instructions.

## First Route By Intent

### I am new to the plugin and want the fastest path

1. <a href="{{ '/user-guide.html' | relative_url }}"><kbd>USER GUIDE</kbd></a>
2. return to <a href="{{ '/' | relative_url }}"><kbd>DOCS HOME</kbd></a> if you need screenshots or repo links

### I need to deploy, upgrade, or rebuild the plugin

1. <a href="{{ '/getting-started.html' | relative_url }}"><kbd>GETTING STARTED</kbd></a>
2. <a href="{{ '/rbac-reference.html' | relative_url }}"><kbd>RBAC REFERENCE</kbd></a> if install permissions are unclear

### I need to understand what the plugin actually does to manifests

1. <a href="{{ '/manifest-parsing-and-pruning.html' | relative_url }}"><kbd>PARSING AND PRUNING</kbd></a>
2. <a href="{{ '/architecture-and-deployment.html' | relative_url }}"><kbd>ARCHITECTURE</kbd></a>

### I think RBAC is hiding resources from the scan

1. <a href="{{ '/rbac-reference.html' | relative_url }}"><kbd>RBAC REFERENCE</kbd></a>
2. return to <a href="{{ '/user-guide.html' | relative_url }}"><kbd>USER GUIDE</kbd></a> for the end-user scan flow

## Main Workflow Paths

- Fast end-user path:
  <a href="{{ '/user-guide.html' | relative_url }}">User Guide</a> for install,
  export, ZIP contents, and Argo CD Application generation
- Operator deployment path:
  <a href="{{ '/getting-started.html' | relative_url }}">Getting Started</a>
  for install, re-apply behavior, local development, and image publication
- Runtime and security model:
  <a href="{{ '/architecture-and-deployment.html' | relative_url }}">Architecture and Deployment</a>
  for browser-side execution, plugin registration, and security boundaries
- Sanitization and export behavior:
  <a href="{{ '/manifest-parsing-and-pruning.html' | relative_url }}">Manifest Parsing and Pruning</a>
  for classifier behavior, cleanup rules, and preview/export semantics
- Permissions model:
  <a href="{{ '/rbac-reference.html' | relative_url }}">RBAC Reference</a>
  for installer, runtime, and end-user access expectations

## Choose By Problem

### I need to install or remove the plugin

- [Getting Started]({{ '/getting-started.html' | relative_url }})

### I need to use the plugin from the console

- [User Guide]({{ '/user-guide.html' | relative_url }})

### I need to understand the browser-side execution model

- [Architecture and Deployment]({{ '/architecture-and-deployment.html' | relative_url }})

### I need to understand why a resource was included, cleaned up, reviewed, or excluded

- [Manifest Parsing and Pruning]({{ '/manifest-parsing-and-pruning.html' | relative_url }})

### I need to understand permissions or missing scan results

- [RBAC Reference]({{ '/rbac-reference.html' | relative_url }})
