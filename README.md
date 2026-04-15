# GitOps Export Plugin

An OpenShift console [plugin](https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/web_console/dynamic-plugins#overview-of-dynamic-plugins_customizing-web-console) that helps teams move from cluster-first resource management to GitOps. It scans a namespace, classifies each resource, strips cluster-generated noise from live manifests, produces clean YAML previews, downloads the result as a ZIP archive, and generates Argo CD Application YAML for Git-based rollout.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-2C7A7B?style=flat-square)](https://www.apache.org/licenses/LICENSE-2.0)
![OpenShift Console Plugin](https://img.shields.io/badge/OpenShift-console%20plugin-EE0000?style=flat-square)

This repository contains two separate tools that share the same curated resource set and sanitization logic:

- **`gitops-export-plugin`** — the OpenShift console plugin. Runs entirely in your browser. Install it once per cluster; every user who can access the console can use it with no extra tooling.
- **`scrubctl`** — a standalone Go CLI. Works anywhere you have `kubectl` or `oc`. No cluster-side install required. Built for pipes, CI pipelines, and terminal-first workflows.

## What The Console Plugin Does

- Scans selected resource kinds in a namespace directly from the OpenShift console
- Classifies each resource as **include**, **cleanup**, **review**, or **exclude** with an explanation of why
- Strips cluster-injected metadata, runtime defaults, and controller-owned fields from live manifests
- Renders a sanitized YAML preview for each resource so you can see what a clean export would look like
- Downloads a ZIP archive of the sanitized manifests directly from the browser
- Generates Argo CD Application YAML from the latest sanitized export
- Respects OpenShift RBAC: the plugin only shows resources the current user can list in that namespace
- Offers three secret handling modes: **redact** (default), **omit**, or **include**

## What It Does Not Do Yet

- Push manifests to GitHub or GitLab

## Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| [User Guide](./docs/user-guide.md) | New users | Install, use, and understand GitOps Export in one page |
| [Getting Started](./docs/getting-started.md) | Operators and contributors | Full deployment reference, local development, and image builds |
| [CLI](./docs/cli.md) | Pipeline users, contributors, and operators | `scrubctl` standalone CLI — install, commands, and usage reference |
| [Architecture](./docs/architecture-and-deployment.md) | Operators and contributors | Runtime components, namespace model, scan flow, and security model |
| [Manifest Parsing and Pruning](./docs/manifest-parsing-and-pruning.md) | Contributors and advanced users | How the plugin classifies resources, sanitizes metadata, and builds YAML previews from live objects |
| [RBAC Reference](./docs/rbac-reference.md) | Operators and security teams | Permissions required to install, run, and use the plugin |

## Quick Start

### Prerequisites

- OpenShift 4.18 or later
- `oc` CLI authenticated to the target cluster with `cluster-admin` (for initial install) or permission to create the resources in the install overlay

### Install

```sh
oc apply -k manifests/overlays/install
```

This creates the `gitops-export-console` namespace, deploys the plugin, and runs a one-time Job that registers the plugin with the OpenShift console operator. After the Job completes, refresh the console to see the new **GitOps Export** tab on Project and Namespace detail pages.

### Use

1. Open a **Project** or **Namespace** in the OpenShift console.
2. Select the **GitOps Export** tab.
3. Choose which resource kinds to scan and how to handle Secrets.
4. Click **Export**.
5. Expand the scan result to review classifications and YAML previews, download a ZIP archive of the sanitized manifests, or generate Argo CD Application YAML for Git.
   The ZIP includes `README.md`, optional `WARNINGS.md`, and manifests grouped into `manifests/include/`, `manifests/cleanup/`, and `manifests/review/`. The Application form pre-populates the in-cluster destination server, scanned namespace, `openshift-gitops` namespace, `default` project, and manual sync mode so you can adjust only the Git-specific inputs.

### Screenshots

<p>
  <a href="./docs/gitops-export-result.png">
    <img src="./docs/gitops-export-result.png" alt="GitOps Export scan results" width="48%" />
  </a>
  <a href="./docs/gitops-export-argocd.png">
    <img src="./docs/gitops-export-argocd.png" alt="GitOps Export Argo CD application generator" width="48%" />
  </a>
</p>

### Remove

```sh
oc delete -k manifests/overlays/install
```

## Building and Publishing the Plugin Image

```sh
VERSION="$(./hack/version.sh)"
IMAGE_TAG="$(./hack/image-tag.sh)"
podman build --build-arg GITOPS_EXPORT_VERSION="${VERSION}" \
  -t docker.io/<your-org>/gitops-export-console:"${IMAGE_TAG}" .
podman push docker.io/<your-org>/gitops-export-console:"${IMAGE_TAG}"
```

After pushing, update the image reference in `manifests/base/kustomization.yaml` and re-apply the overlay. If the previous `gitops-export-console-install-patcher` Job is still present, delete it first or wait for its 300-second TTL cleanup window to expire.

`hack/image-tag.sh` converts the build version into a registry-safe image tag and can also prefix feature-branch builds so they do not replace the mainline tags:

```sh
GITOPS_EXPORT_IMAGE_TAG_PREFIX=pf-i18n- ./hack/image-tag.sh
```

## Local Development

Use the standard OpenShift dynamic-plugin split-terminal workflow.

Terminal 1:

```sh
yarn install
yarn start
```

Terminal 2:

```sh
oc login <cluster-url>
yarn start-console
```

If you prefer `npm`, this repo keeps equivalent commands available: `npm install`, `npm run start`, and `npm run start-console`.

When UI text changes, refresh the English message catalog before committing:

```sh
npm run i18n
```

## Versioning

Release versions are derived from git tags. Create tags in `vX.Y.Z` format.

| Checkout state | Resulting version |
|---|---|
| Exactly on a `vX.Y.Z` tag | `X.Y.Z` |
| N commits after a tag | `X.Y.Z-dev.N+<sha>` |
| No release tags exist | `0.0.0-dev+<sha>` |

Use `hack/version.sh` (shell) or the `version.ts` module (webpack build) to compute the version from a checkout.

## scrubctl CLI

`scrubctl` is a standalone Go CLI that scans a namespace, classifies resources, sanitizes live manifests, and exports GitOps-ready artifacts for Kubernetes and OpenShift. Use it in terminal workflows or CI/CD pipelines where the web console is not available.

Install in three steps: build or download the binary, place it in a directory on your `PATH`, and verify with `scrubctl version`. Build from source in a local clone (no tagged releases have been published yet):

```sh
go build -o scrubctl ./cmd/scrubctl
sudo mv scrubctl /usr/local/bin/
scrubctl version
```

```sh
# Pipe a live resource directly
oc get deploy/<name> -n <namespace> -o yaml | scrubctl
kubectl get deploy/<name> -n <namespace> -o yaml | scrubctl

# Scan and export a whole namespace
scrubctl scan <namespace>
scrubctl export <namespace> -o .

# Scrub a single resource file
scrubctl scrub -f deployment.yaml

# Generate an Argo CD Application manifest
scrubctl generate argocd <namespace> \
  --repo-url https://github.com/example/repo.git \
  --revision main \
  --path manifests/overlays/install
```

When invoked with no subcommand and YAML on stdin, `scrubctl` scrubs the resource directly.

See [docs/cli.md](./docs/cli.md) for the release-archive install path, `go install` notes, and the full command reference.

## License

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
