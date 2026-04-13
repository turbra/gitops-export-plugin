---
title: GitOps Export
description: >-
  Documentation home for the GitOps Export OpenShift console plugin.
---

<div class="gxp-badge-row">
  <a href="https://github.com/turbra/gitops-export-plugin/blob/main/LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/github/license/turbra/gitops-export-plugin" /></a>
  <img alt="OpenShift console plugin" src="https://img.shields.io/badge/OpenShift-console%20plugin-EE0000" />
  <img alt="Argo CD application YAML" src="https://img.shields.io/badge/Argo%20CD-Application%20YAML-005f60" />
  <img alt="Namespace export flow" src="https://img.shields.io/badge/Workflow-cluster%20to%20GitOps-blue" />
</div>

<div class="gxp-hero">
  <p class="gxp-inline-eyebrow">Cluster-First To GitOps</p>

  <h1>GitOps Export</h1>

  <p class="gxp-hero-lead">
    GitOps Export is an OpenShift console plugin for teams that already built in-cluster
    and now want a clean handoff into Git. It scans a namespace, classifies each live
    resource, strips cluster-generated noise from the manifests, packages the export as a
    ZIP archive, and generates Argo CD Application YAML from that same export context.
  </p>

  <div class="gxp-cta-row">
    <a href="{{ '/user-guide.html' | relative_url }}"><kbd>OPEN THE USER GUIDE</kbd></a>
    <a href="{{ '/getting-started.html' | relative_url }}"><kbd>DEPLOY THE PLUGIN</kbd></a>
    <a href="https://github.com/turbra/gitops-export-plugin"><kbd>VIEW REPOSITORY</kbd></a>
  </div>
</div>

## Start Here

Use these pages in this order when you are orienting yourself:

- <a href="{{ '/user-guide.html' | relative_url }}"><kbd>USER GUIDE</kbd></a>
  for the shortest install-to-export-to-Argo CD path
- <a href="{{ '/getting-started.html' | relative_url }}"><kbd>GETTING STARTED</kbd></a>
  for deployment details, image builds, and local development
- <a href="{{ '/architecture-and-deployment.html' | relative_url }}"><kbd>ARCHITECTURE</kbd></a>
  for the runtime model, browser-side execution, and install topology
- <a href="{{ '/manifest-parsing-and-pruning.html' | relative_url }}"><kbd>PARSING AND PRUNING</kbd></a>
  for the classification and sanitization behavior behind the export
- <a href="{{ '/rbac-reference.html' | relative_url }}"><kbd>RBAC REFERENCE</kbd></a>
  for installer privileges, runtime constraints, and end-user access expectations

## What The Plugin Covers

<div class="gxp-card-grid">
  <div class="gxp-card">
    <h3>Namespace Scan</h3>
    <p>Lists selected namespaced resource kinds through the OpenShift console proxy using the current user's RBAC.</p>
  </div>
  <div class="gxp-card">
    <h3>Sanitized YAML</h3>
    <p>Removes server-assigned metadata, controller-owned state, and common runtime defaults before export.</p>
  </div>
  <div class="gxp-card">
    <h3>ZIP Archive</h3>
    <p>Writes exportable manifests into include, cleanup, and review directories with README and warning context.</p>
  </div>
  <div class="gxp-card">
    <h3>Argo CD Application</h3>
    <p>Generates a GitOps-ready Application definition from the latest sanitized export without creating cluster resources directly.</p>
  </div>
</div>

## Product Shape

The current operating model is intentionally narrow and explicit:

| Area | Current model |
|------|---------------|
| Scope | Single namespace, browser-side scan |
| Output | Sanitized YAML previews, ZIP archive, Argo CD `Application` YAML |
| Auth model | OpenShift console session and namespace RBAC |
| Runtime | Static plugin served by nginx, no backend API |
| Install path | Kustomize overlay plus one-time console patcher Job |

That shape is deliberate. The plugin is not trying to replace Argo CD or become a general Kubernetes export utility. It exists to help a user move from live namespace state to Git-managed manifests with as little ceremony as possible.

## Screenshots

<div class="gxp-screenshot-grid">
  <a class="gxp-shot" href="{{ '/gitops-export-result.png' | relative_url }}">
    <img src="{{ '/gitops-export-result.png' | relative_url }}" alt="GitOps Export scan result view" />
    <div class="gxp-shot-copy">
      <span class="gxp-shot-title">Export Review</span>
      <span>Scan summary, classification labels, and per-resource YAML previews inside the OpenShift console.</span>
    </div>
  </a>
  <a class="gxp-shot" href="{{ '/gitops-export-argocd.png' | relative_url }}">
    <img src="{{ '/gitops-export-argocd.png' | relative_url }}" alt="GitOps Export Argo CD application form" />
    <div class="gxp-shot-copy">
      <span class="gxp-shot-title">GitOps Definition</span>
      <span>Application-focused Argo CD form with local defaults and generated YAML review before commit.</span>
    </div>
  </a>
</div>

## Documentation Paths

<div class="gxp-doc-list">
  <div class="gxp-doc-item">
    <strong><a href="{{ '/user-guide.html' | relative_url }}">User Guide</a></strong>
    <p>Fastest path for a new user: install the plugin, export a namespace, understand the ZIP layout, and generate the Argo CD Application YAML.</p>
  </div>
  <div class="gxp-doc-item">
    <strong><a href="{{ '/getting-started.html' | relative_url }}">Getting Started</a></strong>
    <p>Operational reference for install, re-apply behavior, image builds, local development, and removal.</p>
  </div>
  <div class="gxp-doc-item">
    <strong><a href="{{ '/architecture-and-deployment.html' | relative_url }}">Architecture and Deployment</a></strong>
    <p>Runtime components, browser execution model, install patcher Job, and security boundaries.</p>
  </div>
  <div class="gxp-doc-item">
    <strong><a href="{{ '/manifest-parsing-and-pruning.html' | relative_url }}">Manifest Parsing and Pruning</a></strong>
    <p>Classifier behavior, sanitization rules, preview truncation, and export semantics for contributors and advanced users.</p>
  </div>
  <div class="gxp-doc-item">
    <strong><a href="{{ '/rbac-reference.html' | relative_url }}">RBAC Reference</a></strong>
    <p>Which identities need which permissions: installer, runtime, and the end user scanning a namespace.</p>
  </div>
</div>

## Repository

- <a href="https://github.com/turbra/gitops-export-plugin"><kbd>REPOSITORY</kbd></a>
- <a href="https://github.com/turbra/gitops-export-plugin/blob/main/README.md"><kbd>TOP README</kbd></a>
- <a href="https://github.com/turbra/gitops-export-plugin/tree/main/docs"><kbd>DOCS SOURCE</kbd></a>
