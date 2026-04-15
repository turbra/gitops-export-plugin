---
title: Getting Started
description: >-
  Deploy the GitOps Export console plugin to an OpenShift cluster.
---

# Getting Started

This guide has two parts. The first covers the console plugin: deploying it to an OpenShift cluster, using it, setting up a local development environment, and removing it. The second is a short standalone-CLI quickstart for `scrubctl`, which runs on its own and does not require the plugin. Skip to [Get started with `scrubctl`](#get-started-with-scrubctl) if you only need the CLI.

## Prerequisites

### For cluster deployment

- **OpenShift 4.18 or later** with the console operator enabled (the default)
- **`oc` CLI** authenticated to the target cluster
- **`cluster-admin`** role, or permissions to create a Namespace, Deployment, Service, ConfigMap, ConsolePlugin, Job, ServiceAccount, ClusterRole, and ClusterRoleBinding (the install overlay includes a Job that patches `consoles.operator.openshift.io/cluster` using its own dedicated ClusterRole; the installer does not need that permission directly). See the [RBAC Reference]({{ '/rbac-reference.html' | relative_url }}) for details.

### For building images

- **`podman`** or **`docker`**

### For local development

- **Node.js 22** (matches the UBI build image)
- **`yarn`** or **`npm`**
- **`oc` CLI** authenticated to a cluster (the local console bridge connects to this cluster)
- **`podman`** or **`docker`** (to run the local console bridge container)

### For `scrubctl`

- **Go 1.21+** (only if you are building from source; the release archive has no Go dependency)
- **`kubectl`** or **`oc`** CLI with a working kubeconfig (only for the cluster-facing `scan`, `export`, and `generate argocd` subcommands; the `scrub` subcommand and stdin-pipe mode need no cluster access)

## Deploy the Console Plugin

### Step 1: Apply the install overlay

```sh
oc apply -k manifests/overlays/install
```

This creates the following resources:

| Resource | Name | Purpose |
|----------|------|---------|
| Namespace | `gitops-export-console` | Hosts the plugin deployment |
| Deployment | `gitops-export-console` | Runs the nginx container that serves the plugin bundle over TLS |
| Service | `gitops-export-console` | Exposes the deployment on port 9443; requests a serving cert via the `service.alpha.openshift.io/serving-cert-secret-name` annotation |
| ConfigMap | `gitops-export-console` | Contains the nginx configuration (TLS listener, cert paths) |
| ConsolePlugin | `gitops-export-console` | Registers the plugin with the OpenShift console |
| Job | `gitops-export-console-install-patcher` | One-time Job that patches `consoles.operator.openshift.io/cluster` to enable the plugin |
| ServiceAccount | `gitops-export-console-patcher` | Identity for the patcher Job |
| ClusterRole | `gitops-export-console-patcher` | Grants get/list/patch/update on `consoles.operator.openshift.io` |
| ClusterRoleBinding | `gitops-export-console-patcher` | Binds the ClusterRole to the patcher ServiceAccount |

### Step 2: Wait for the plugin to become available

```sh
oc -n gitops-export-console rollout status deployment/gitops-export-console
```

The patcher Job runs after the resources are created and typically completes within a few seconds. Once both the Deployment is ready and the Job has completed, refresh the OpenShift console.

If you re-run `oc apply -k manifests/overlays/install` within 300 seconds of a previous install or upgrade, the existing `gitops-export-console-install-patcher` Job may still be present because it uses `ttlSecondsAfterFinished: 300`. In that case, delete the old Job first and then re-apply:

```sh
oc delete job/gitops-export-console-install-patcher -n gitops-export-console
oc apply -k manifests/overlays/install
```

### Step 3: Verify

Open any **Project** or **Namespace** in the OpenShift console. A new **GitOps Export** tab should appear on the details page.

## Use the Plugin

1. Navigate to a **Project** or **Namespace** details page in the OpenShift console.
2. Click the **GitOps Export** tab.
3. Under **Secret handling**, choose how Secrets should appear in the preview:
   - **redact** (default): Secret keys are shown, but all values are replaced with `<REDACTED>`
   - **omit**: Secrets are excluded entirely from the scan result
   - **include**: Secret values are shown as-is (use with caution)
4. Under **Resource kinds**, select which kinds to scan. All common workload and configuration kinds are selected by default.
5. Click **Export**.
6. Review the scan result:
   - Each resource is classified as **include**, **cleanup**, **review**, or **exclude** with an explanation.
   - Click **Show YAML** on any non-excluded resource to see the sanitized YAML preview.
   - Click **Download ZIP** to save the sanitized manifests as a local archive.
     The archive contains `README.md`, optional `WARNINGS.md`, and manifest files organized under `manifests/include/`, `manifests/cleanup/`, and `manifests/review/`.
   - Use the **GitOps definition** section to generate Argo CD Application YAML for Git.
     The form pre-populates common defaults such as the in-cluster destination server (`https://kubernetes.default.svc`), the scanned namespace as the destination namespace, the Argo CD namespace (`openshift-gitops`), the Argo CD project (`default`), and manual sync mode. Review these values before committing the generated YAML to your repository.

## Build and Publish the Plugin Image

If you need to build and publish your own image (for example, to test changes or run a custom build):

```sh
VERSION="$(./hack/version.sh)"
IMAGE_TAG="$(./hack/image-tag.sh)"
podman build --build-arg GITOPS_EXPORT_VERSION="${VERSION}" \
  -t docker.io/<your-org>/gitops-export-console:"${IMAGE_TAG}" .
podman push docker.io/<your-org>/gitops-export-console:"${IMAGE_TAG}"
```

After pushing, update the image reference in `manifests/base/kustomization.yaml`:

```yaml
images:
  - name: gitops-export-console-image
    newName: docker.io/<your-org>/gitops-export-console
    newTag: "<IMAGE_TAG>"
```

Then re-apply the overlay:

```sh
oc apply -k manifests/overlays/install
```

If the previous `gitops-export-console-install-patcher` Job has not yet been removed by its 300-second TTL, delete it first:

```sh
oc delete job/gitops-export-console-install-patcher -n gitops-export-console
oc apply -k manifests/overlays/install
```

`hack/image-tag.sh` converts the build version into a registry-safe tag. For feature branches, prefix it so the build does not replace the tags used by `main`:

```sh
GITOPS_EXPORT_IMAGE_TAG_PREFIX=pf-i18n- ./hack/image-tag.sh
```

## Local Plugin Development

Use the same split-terminal workflow described in the OpenShift dynamic-plugin getting started guide to run the plugin locally against a real cluster.

### Terminal 1: Start the plugin dev server

```sh
yarn install
yarn start
```

This starts the webpack dev server on `http://localhost:9001`, serving the plugin bundle with hot reload.

If you prefer `npm`, the equivalent commands are:

```sh
npm install
npm run start
```

### Terminal 2: Start the local console bridge

```sh
oc login <cluster-url>
yarn start-console
```

This runs a containerized OpenShift console that connects to the cluster you logged into and loads the plugin from the local dev server. Open `http://localhost:9000` to use the console.

If you prefer `npm`, use `npm run start-console`.

The `start-console` script requires `podman` or `docker` and an active `oc` login session.

### Refresh localization catalogs

When you add or change translated UI text, regenerate the English catalog before committing:

```sh
npm run i18n
```

## Remove the Plugin

```sh
oc delete -k manifests/overlays/install
```

This removes all resources created by the install overlay, including the namespace, deployment, console plugin registration, and the patcher Job's RBAC resources.

After deletion, refresh the OpenShift console. The **GitOps Export** tab will no longer appear.

## Get started with `scrubctl`

`scrubctl` is a standalone Go CLI that does not require the console plugin. For now, build it from source in a local clone. This is the fastest path today because tagged releases are not published yet; the release-archive flow will work once a `v*.*.*` tag ships.

### Build from source

Place the resulting binary on your `PATH` and verify it with `scrubctl version`:

```sh
go build -o scrubctl ./cmd/scrubctl
sudo mv scrubctl /usr/local/bin/
scrubctl version
```

### Learn the CLI

See [CLI Reference]({{ '/cli.html' | relative_url }}) for the release-archive install path, `go install` notes, commands, global flags, and usage examples.
