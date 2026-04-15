---
title: CLI
description: >-
  scrubctl is a standalone Go CLI for namespace scan, export, and sanitization.
---

# scrubctl

`scrubctl` is a standalone Go CLI for namespace scan, resource classification, manifest sanitization, ZIP export, and Argo CD Application generation. It works anywhere you have `kubectl` or `oc` — no OpenShift console required.

## Install

Three methods are available. Choose the one that fits your situation.

---

### Method 1: Download a release archive (recommended for most users)

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

**Step 3 — Place the binary on your PATH**

To run `scrubctl` from any directory, move or copy the binary into a directory that is already on your `PATH`. `/usr/local/bin` is the standard choice on Linux and macOS:

```sh
sudo mv scrubctl /usr/local/bin/
```

If you do not have sudo access, move it to a user-writable directory instead and add that directory to your `PATH`:

```sh
mkdir -p ~/.local/bin
mv scrubctl ~/.local/bin/
```

Then add the following line to your shell profile (`~/.bashrc`, `~/.zshrc`, or equivalent) so the directory is on your `PATH` in every new terminal session:

```sh
export PATH="$PATH:$HOME/.local/bin"
```

Reload the profile to apply the change in your current session:

```sh
source ~/.bashrc   # or source ~/.zshrc
```

**Step 4 — Verify**

```sh
scrubctl version
```

You should see the version string printed. If you see `command not found`, the binary is not on your `PATH` — re-check step 3.

---

### Method 2: Install with Go (no local clone required)

This method requires Go 1.21 or later. It downloads, builds, and installs `scrubctl` in one command.

```sh
go install github.com/turbra/gitops-export-plugin/cmd/scrubctl@latest
```

**Where the binary is placed**

`go install` places the binary in the Go binary directory. To see that path:

```sh
go env GOPATH
```

The binary will be at `$(go env GOPATH)/bin/scrubctl`. On most systems this is `~/go/bin/scrubctl`.

**Add the Go binary directory to your PATH**

If `~/go/bin` is not already on your `PATH`, add it:

```sh
export PATH="$PATH:$(go env GOPATH)/bin"
```

Add that line to your shell profile (`~/.bashrc`, `~/.zshrc`, or equivalent) to make it permanent, then reload:

```sh
source ~/.bashrc   # or source ~/.zshrc
```

**Verify**

```sh
scrubctl version
```

---

### Method 3: Build from a local clone

Use this method when developing or testing changes from a cloned copy of the repository.

**Option A — Build into `./bin/` (run from the repo directory)**

```sh
make build
```

The binary is placed at `./bin/scrubctl` inside the repository. Run it directly from that path:

```sh
./bin/scrubctl version
```

To run it from any directory without a path prefix, copy it somewhere on your `PATH`:

```sh
sudo cp ./bin/scrubctl /usr/local/bin/
```

**Option B — Install into your Go binary directory**

```sh
make install
```

This is equivalent to `go install ./cmd/scrubctl`. The binary is placed in `$(go env GOPATH)/bin/scrubctl` (typically `~/go/bin/scrubctl`). See Method 2 above for `PATH` setup instructions.

**Verify**

```sh
scrubctl version
```

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
