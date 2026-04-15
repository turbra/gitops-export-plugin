---
title: CLI
description: >-
  scrubctl is a standalone Go CLI for namespace scan, export, and sanitization.
---

# scrubctl

`scrubctl` is a standalone Go CLI for namespace scan, resource classification, manifest sanitization, ZIP export, and Argo CD Application generation. It works anywhere you have `kubectl` or `oc` — no OpenShift console required.

## Install

No tagged releases have been published yet, so pre-built binary archives are not available today. The two working install paths are:

1. **Install with Go** — recommended if you have Go 1.21+ and just want the CLI.
2. **Build from a local clone** — recommended if you are developing or testing changes from this repository.

A third method, **Download a release archive**, is documented at the end for when releases are published.

---

### Method 1: Install with Go (recommended)

This method requires Go 1.21 or later. It downloads, builds, and installs `scrubctl` in one command.

**Step 1 — Run `go install`**

```sh
go install github.com/turbra/gitops-export-plugin/cmd/scrubctl@latest
```

`go install` places the binary in the Go binary directory. To see that path:

```sh
go env GOPATH
```

The binary will be at `$(go env GOPATH)/bin/scrubctl`. On most systems this resolves to `~/go/bin/scrubctl`.

**Step 2 — Check whether the Go binary directory is already on your PATH**

Print the current `PATH` and look for the Go binary directory (`~/go/bin` or the output of `go env GOPATH`/`bin`):

```sh
echo $PATH
```

If you see `~/go/bin` (or the equivalent `$(go env GOPATH)/bin`) in the output, you are done — skip to Step 4.

**Step 3 — Add the Go binary directory to your PATH (only if missing)**

Append this line to your shell profile (`~/.bashrc`, `~/.zshrc`, or equivalent) so the directory is on your `PATH` in every new terminal session:

```sh
export PATH="$PATH:$(go env GOPATH)/bin"
```

Reload the profile to apply the change in your current session:

```sh
source ~/.bashrc   # or source ~/.zshrc
```

**Step 4 — Verify**

```sh
scrubctl version
```

You should see the version string printed. If you see `command not found`, the Go binary directory is not on your `PATH` — re-check Steps 2 and 3.

---

### Method 2: Build from a local clone

Use this method when developing or testing changes from a cloned copy of the repository, or when you do not want to pull from a module proxy.

**Option A — Build into `./bin/` (run from the repo directory)**

```sh
make build
```

The binary is placed at `./bin/scrubctl` inside the repository. Run it directly from that path:

```sh
./bin/scrubctl version
```

To run it from any directory without the `./bin/` prefix, place the `scrubctl` binary in a directory that is already on your `PATH`.

First, print your current `PATH`:

```sh
echo $PATH
```

Pick one of the directories you see in the output and copy the binary there. `/usr/local/bin` is the standard choice on Linux and macOS if it appears in your `PATH`:

```sh
sudo cp ./bin/scrubctl /usr/local/bin/
```

If you do not have sudo access, use a user-writable directory that is already on your `PATH`. If none of your PATH entries are user-writable, create `~/.local/bin`, copy the binary there, and add that directory to your `PATH`:

```sh
mkdir -p ~/.local/bin
cp ./bin/scrubctl ~/.local/bin/
```

Then append this line to your shell profile (`~/.bashrc`, `~/.zshrc`, or equivalent):

```sh
export PATH="$PATH:$HOME/.local/bin"
```

Reload the profile:

```sh
source ~/.bashrc   # or source ~/.zshrc
```

**Option B — Install into your Go binary directory**

```sh
make install
```

This is equivalent to `go install ./cmd/scrubctl`. The binary is placed in `$(go env GOPATH)/bin/scrubctl` (typically `~/go/bin/scrubctl`). Follow Method 1, Steps 2–4 for `PATH` setup and verification.

**Verify**

```sh
scrubctl version
```

---

### Method 3: Download a release archive (not yet available)

> **Status:** no release archives have been published yet. Once `v*.*.*` tags are cut and the `cli-release` GitHub Actions workflow publishes artifacts, the steps below will apply. Until then, use Method 1 or Method 2.

This method does not require Go to be installed.

**Step 1 — Download the archive for your platform**

Go to the [GitHub Releases page](https://github.com/turbra/gitops-export-plugin/releases) and download the archive that matches your operating system and CPU:

| Platform | Architecture | File to download |
|----------|-------------|-----------------|
| Linux | x86-64 | `scrubctl-<version>-linux-amd64.tar.gz` |
| Linux | ARM 64-bit | `scrubctl-<version>-linux-arm64.tar.gz` |
| macOS | Apple Silicon | `scrubctl-<version>-darwin-arm64.tar.gz` |
| macOS | Intel | `scrubctl-<version>-darwin-amd64.tar.gz` |
| Windows | x86-64 | `scrubctl-<version>-windows-amd64.zip` |

**Step 2 — Extract the archive**

```sh
tar -xzf scrubctl-<version>-linux-amd64.tar.gz
```

This produces a `scrubctl` binary (or `scrubctl.exe` on Windows) in the current directory.

**Step 3 — Inspect your current PATH**

Before moving the binary, print your current `PATH` so you can pick a destination directory that is already on it:

```sh
echo $PATH
```

**Step 4 — Place the `scrubctl` binary in a directory that is already on your PATH**

Pick one of the directories from the `echo $PATH` output and copy or move the binary there. `/usr/local/bin` is the standard choice on Linux and macOS if it appears in your `PATH`:

```sh
sudo mv scrubctl /usr/local/bin/
```

If you do not have sudo access, use a user-writable directory that is already on your `PATH`. If none of your PATH entries are user-writable, create `~/.local/bin`, move the binary there, and add that directory to your `PATH`:

```sh
mkdir -p ~/.local/bin
mv scrubctl ~/.local/bin/
```

Then append this line to your shell profile (`~/.bashrc`, `~/.zshrc`, or equivalent) so `~/.local/bin` is on your `PATH` in every new terminal session:

```sh
export PATH="$PATH:$HOME/.local/bin"
```

Reload the profile to apply the change in your current session:

```sh
source ~/.bashrc   # or source ~/.zshrc
```

Confirm the directory is now on your `PATH`:

```sh
echo $PATH
```

**Step 5 — Verify**

```sh
scrubctl version
```

You should see the version string printed. If you see `command not found`, the binary is not on your `PATH` — re-check Steps 3 and 4.

---

### First-run check

Once `scrubctl` is on your `PATH`, confirm it is working:

```sh
scrubctl version
scrubctl --help
```

`scrubctl version` prints the version, commit, and build date. `scrubctl --help` lists all available subcommands and global flags.

## Usage

```sh
scrubctl --help
```

```text
Sanitize live manifests and generate GitOps export artifacts

Usage:
  scrubctl [flags]
  scrubctl [command]

Available Commands:
  completion  Generate the autocompletion script for the specified shell
  export      Export a namespace scan as a ZIP archive
  generate    Generate GitOps manifests
  help        Help about any command
  scan        Scan a namespace and print the classification table
  scrub       Scrub a single YAML resource from file or stdin
  version     Print the CLI version

Flags:
      --context string           Kubeconfig context to use
      --exclude-kinds string     Comma-separated curated kinds or registry keys to exclude
  -h, --help                     help for scrubctl
      --include-kinds string     Comma-separated curated kinds or registry keys to include
      --kubeconfig string        Path to the kubeconfig file
      --log-level string         Log level (default "info")
  -n, --namespace string         Target namespace
  -q, --quiet                    Suppress non-essential output
      --secret-handling string   Secret handling mode: redact, omit, or include (default "redact")

Use "scrubctl [command] --help" for more information about a command.
```

## Commands

### Pipe a live resource

When invoked with no subcommand and YAML on stdin, `scrubctl` scrubs the resource directly:

```sh
oc get deploy/<name> -n <namespace> -o yaml | scrubctl
kubectl get deploy/<name> -n <namespace> -o yaml | scrubctl
```

### Scrub a resource file

```sh
scrubctl scrub -f deployment.yaml
scrubctl scrub -f resource.json
scrubctl scrub < resource.yaml
```

### Scan a namespace

Prints a classification table of every resource in the namespace:

```sh
scrubctl scan <namespace>
```

### Export a namespace to a ZIP archive

```sh
scrubctl export <namespace> -o <dir>
```

The archive contains `README.md`, optional `WARNINGS.md`, and manifest files organized under `manifests/include/`, `manifests/cleanup/`, and `manifests/review/`.

### Generate an Argo CD Application

```sh
scrubctl generate argocd <namespace> \
  --repo-url https://github.com/example/repo.git \
  --revision main \
  --path manifests/overlays/install
```

Example output:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  labels:
    app.kubernetes.io/managed-by: <application-name>
    gitops-export/namespace: <namespace>
    gitops-export/scanned-at: <timestamp>
  name: <application-name>
  namespace: openshift-gitops
spec:
  destination:
    namespace: <namespace>
    server: https://kubernetes.default.svc
  project: default
  source:
    directory:
      recurse: true
    path: manifests/overlays/install
    repoURL: https://github.com/example/repo.git
    targetRevision: main
```

### Print version

```sh
scrubctl version
```

## Global flags

- `--kubeconfig` — path to the kubeconfig file
- `--context` — kubeconfig context to use
- `-n, --namespace` — target namespace
- `--secret-handling redact|omit|include` — how to handle Secret values (default: `redact`)
- `--include-kinds` — comma-separated curated kinds to include
- `--exclude-kinds` — comma-separated curated kinds to exclude
- `-q, --quiet` — suppress non-essential output
- `--log-level` — log level (default: `info`)

If you do not pass a namespace argument, the CLI falls back to `-n/--namespace` and then the active kubeconfig context namespace.

## Resource scope

`scrubctl` supports a curated set of namespaced resource kinds:

- Kubernetes: Deployment, StatefulSet, DaemonSet, Job, CronJob, Service, Secret, ConfigMap, PersistentVolumeClaim, NetworkPolicy, HorizontalPodAutoscaler, Role, RoleBinding, ServiceAccount
- OpenShift: Route, BuildConfig, ImageStream, ImageStreamTag

Kinds outside that set are excluded with `kind not in curated resource set`.

## OpenShift and oc

`scrubctl` works naturally alongside `oc`. Pipe any resource fetched with `oc get` directly:

```sh
oc get deploy/<name> -n <namespace> -o yaml | scrubctl
oc get route/<name> -n <namespace> -o yaml | scrubctl
```

Use `-n` or `--namespace` to target a namespace directly when running `scan` or `export` against an OpenShift cluster with an active `oc` session. OpenShift resource kinds (Route, BuildConfig, ImageStream, ImageStreamTag) are first-class and handled identically to standard Kubernetes kinds.

## Local development

Use the CLI-only Make targets from the repo root:

| Target | What it does |
|--------|-------------|
| `make build` | Compiles `scrubctl` to `./bin/scrubctl` |
| `make install` | Installs `scrubctl` to `$(go env GOPATH)/bin` |
| `make test` | Runs Go unit tests and TypeScript fixture parity tests |
| `make fixtures` | Regenerates TypeScript fixture expectations |
