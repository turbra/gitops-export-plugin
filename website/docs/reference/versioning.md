---
title: Versioning
description: Release version and image tag behavior.
---

# Versioning

Release versions are derived from git tags. Create tags in `vX.Y.Z` format.

| Checkout state | Resulting version |
| --- | --- |
| Exactly on a `vX.Y.Z` tag | `X.Y.Z` |
| N commits after a tag | `X.Y.Z-dev.N+<sha>` |
| No release tags exist | `0.0.0-dev+<sha>` |

Use `hack/version.sh` or the `version.ts` module to compute the version from a checkout.

```sh
./hack/version.sh
```

`hack/image-tag.sh` converts the version into a registry-safe image tag.

```sh
./hack/image-tag.sh
```

Prefix feature-branch image tags when publishing test builds.

```sh
GITOPS_EXPORT_IMAGE_TAG_PREFIX=pf-i18n- ./hack/image-tag.sh
```
