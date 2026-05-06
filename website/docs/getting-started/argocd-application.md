---
title: Argo CD Application
description: Generate Argo CD Application YAML from the latest sanitized export.
---

# Argo CD Application

The GitOps definition form generates an Argo CD `Application` manifest from the latest sanitized scan result. It does not create cluster resources directly.

## Generate the Manifest

1. Run a scan from the **GitOps Export** tab.
2. Open the **GitOps definition** section.
3. Enter the Git repository URL, revision, path, and Application name.
4. Review the generated YAML.
5. Commit the Application YAML alongside the exported manifests, or apply it directly if that is how your environment manages Argo CD resources.

## Defaults

| Field | Default |
| --- | --- |
| Argo CD namespace | `openshift-gitops` |
| Argo CD project | `default` |
| Destination server | `https://kubernetes.default.svc` |
| Destination namespace | The namespace scanned by the plugin |
| Sync mode | Manual |

Review these values before using the manifest. In particular, confirm that the repository path points at the directory where you committed the exported manifests.

## Private Repository Setup

If the Git repository is private, create an Argo CD repository secret before applying the Application.

```sh
oc create secret generic repo-my-app \
  --from-literal=type=git \
  --from-literal=url=https://github.com/example/my-app.git \
  --from-literal=username=<token-username> \
  --from-literal=password=<token> \
  -n openshift-gitops

oc label secret repo-my-app \
  argocd.argoproj.io/secret-type=repository \
  -n openshift-gitops
```

Then apply the generated Application manifest.

```sh
oc apply -f my-app-application.yaml
```

If sync mode is manual, open the Argo CD UI and trigger the first sync after reviewing the generated manifest and exported resources.
