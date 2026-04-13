---
title: GitOps Export
description: >-
  Documentation home for the GitOps Export OpenShift console plugin.
---

# GitOps Export

GitOps Export is an OpenShift console plugin for teams that created resources directly in a cluster and now want to bring those resources under GitOps management. It scans a namespace, classifies each resource, strips cluster-generated noise from the live manifests, shows a clean YAML preview, packages the sanitized manifests into a downloadable ZIP archive, and generates Argo CD Application YAML from that export context.

## Documentation

- [User Guide](./user-guide.md) -- install, use, and understand GitOps Export in one page
- [Getting Started](./getting-started.md) -- full deployment reference, local development, and image builds
- [Architecture and Deployment](./architecture-and-deployment.md) -- runtime components, namespace model, scan flow, and security model
- [Manifest Parsing and Pruning](./manifest-parsing-and-pruning.md) -- how the plugin reads live objects, classifies them, strips cluster noise, and builds YAML previews
- [RBAC Reference](./rbac-reference.md) -- permissions required to install, run, and use the plugin

## How It Works (Overview)

1. Open the **GitOps Export** tab from a **Project** or **Namespace** details page in the OpenShift console.
2. Select which resource kinds to include in the scan and how Secrets should be handled (redact, omit, or include).
3. Click **Export**. The plugin lists the selected resource kinds in that namespace using the Kubernetes API through the console proxy, under the current user's RBAC.
4. Each resource is classified into one of four categories -- **include**, **cleanup**, **review**, or **exclude** -- with an explanation of why.
5. For non-excluded resources, the plugin strips cluster-injected metadata, runtime-defaulted fields, and controller-owned state from the live object, then renders a sanitized YAML preview.
6. The scan result is displayed in the console. You can expand individual resources to inspect their classification reasoning and preview the cleaned YAML, download a ZIP archive of the sanitized manifests, or generate Argo CD Application YAML.

## Current Limits

- No push to GitHub or GitLab yet

## Source Layout

| Path | Description |
|------|-------------|
| `src/` | Console plugin TypeScript/React source |
| `src/scan-utils.ts` | Classification rules, sanitization logic, and YAML serialization helpers |
| `src/export-archive.ts` | ZIP archive assembly and browser download helper |
| `src/gitops-definition-utils.ts` | Argo CD Application YAML generation helpers |
| `src/hooks/useNamespaceScan.ts` | React hook that orchestrates the scan lifecycle |
| `src/types.ts` | TypeScript type definitions for scan results |
| `manifests/base/` | Kustomize base: namespace, deployment, service, nginx config, ConsolePlugin registration |
| `manifests/overlays/install/` | Install overlay: adds the patcher Job, ClusterRole, and ServiceAccount for console registration |
| `plugin-metadata.ts` | Plugin name, version, and exposed modules |
| `version.ts` | Git-tag-based version derivation for webpack builds |
| `hack/version.sh` | Shell equivalent of `version.ts` for image tagging |
| `Dockerfile` | Multi-stage build: npm build, then copy dist into nginx |
