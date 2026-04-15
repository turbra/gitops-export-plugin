---
title: CLI
description: >-
  Install and use scrubctl outside the OpenShift console.
---

# scrubctl

`scrubctl` brings the same namespace scan, classification, sanitization, ZIP export, and Argo CD Application generation flow to terminal-first use cases.

## Install

### Direct binary

Download a release archive from GitHub Releases and place `scrubctl` on your `PATH`.

### From source

```sh
go install github.com/turbra/gitops-export-plugin/cmd/scrubctl@latest
```

## Commands

```sh
oc get deploy/green-cursor -o yaml | scrubctl
kubectl get deploy/green-cursor -o yaml | scrubctl
scrubctl scan <namespace>
scrubctl export <namespace> -o <dir>
scrubctl scrub -f resource.yaml
scrubctl scrub < resource.yaml
scrubctl generate argocd <namespace> --repo-url ... --revision ... --path ...
scrubctl version
```

When invoked with no subcommand and YAML on stdin, `scrubctl` scrubs the resource directly. That keeps pipe-based use natural.

## Global flags

- `--kubeconfig`
- `--context`
- `-n, --namespace`
- `--secret-handling redact|omit|include`
- `--include-kinds`
- `--exclude-kinds`
- `-q, --quiet`
- `--log-level`

If you do not pass a namespace argument, the CLI falls back to `-n/--namespace` and then the active kubeconfig context namespace.

## Resource scope

V1 intentionally supports the same curated resource set as the console plugin:

- Kubernetes: Deployment, StatefulSet, DaemonSet, Job, CronJob, Service, Secret, ConfigMap, PersistentVolumeClaim, NetworkPolicy, HorizontalPodAutoscaler, Role, RoleBinding, ServiceAccount
- OpenShift: Route, BuildConfig, ImageStream, ImageStreamTag

Kinds outside that set are excluded with `kind not in curated resource set`.

## OpenShift and oc

`scrubctl` works naturally alongside `oc`. Pipe any resource fetched with `oc get` directly into `scrubctl`:

```sh
oc get deploy/green-cursor -o yaml | scrubctl
oc get route/my-route -n demo -o yaml | scrubctl
```

Use `-n` or `--namespace` to target a namespace directly when running `scan` or `export` against an OpenShift cluster with an active `oc` session. OpenShift resource kinds (Route, BuildConfig, ImageStream, ImageStreamTag) are first-class and handled identically to standard Kubernetes kinds.

## Local development

Use the CLI-only Make targets from the repo root:

```sh
make build
make test
make fixtures
make install
```
