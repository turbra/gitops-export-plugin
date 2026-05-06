---
title: Related Projects
description: Related tools and source repositories.
---

# Related Projects

## scrubctl

[`scrubctl`](https://github.com/turbra/scrubctl) is the standalone Go CLI for terminal and pipeline workflows. It implements the same classification, sanitization, archive, and Argo CD Application behavior as the console plugin.

Use scrubctl when:

- you need a terminal or CI workflow
- you want to scrub local YAML without cluster access
- you want to scan or export a namespace outside the OpenShift console

Docs: [turbra.github.io/scrubctl](https://turbra.github.io/scrubctl/)

## OpenShift Dynamic Plugins

GitOps Export uses the OpenShift console dynamic plugin model. The plugin bundle is served by a cluster Service and loaded by the OpenShift console.

Reference: [OpenShift dynamic plugins](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/web_console/dynamic-plugins)

## Repository Links

| Link | Purpose |
| --- | --- |
| [Repository](https://github.com/turbra/gitops-export-plugin) | Source code and manifests. |
| [Issues](https://github.com/turbra/gitops-export-plugin/issues) | Bug reports and task tracking. |
| [Releases](https://github.com/turbra/gitops-export-plugin/releases) | Tagged releases. |
