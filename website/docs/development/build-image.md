---
title: Build an Image
description: Build and publish a custom GitOps Export plugin image for development or release testing.
---

# Build an Image

Build a custom image when you need to test local changes or publish a version under your own registry namespace.

## Build and Push

```sh
VERSION="$(./hack/version.sh)"
IMAGE_TAG="$(./hack/image-tag.sh)"

podman build --build-arg GITOPS_EXPORT_VERSION="${VERSION}" \
  -t docker.io/example/gitops-export-console:"${IMAGE_TAG}" .

podman push docker.io/example/gitops-export-console:"${IMAGE_TAG}"
```

Use `docker` instead of `podman` if that is the runtime available in your environment.

## Update the Install Overlay

After pushing, update `manifests/base/kustomization.yaml`.

```yaml
images:
  - name: gitops-export-console-image
    newName: docker.io/example/gitops-export-console
    newTag: "<IMAGE_TAG>"
```

Then re-apply the overlay.

```sh
oc apply -k manifests/overlays/install
```

If the previous patcher Job still exists, delete it first.

```sh
oc delete job/gitops-export-console-install-patcher -n gitops-export-console
oc apply -k manifests/overlays/install
```

## Prefix Feature Branch Tags

`hack/image-tag.sh` converts the build version into a registry-safe tag. Prefix feature-branch builds so they do not replace mainline tags.

```sh
GITOPS_EXPORT_IMAGE_TAG_PREFIX=pf-i18n- ./hack/image-tag.sh
```
