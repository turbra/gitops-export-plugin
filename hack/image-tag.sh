#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="$("${SCRIPT_DIR}/version.sh")"
SANITIZED_VERSION="${VERSION//+/-}"
PREFIX="${GITOPS_EXPORT_IMAGE_TAG_PREFIX:-}"
TAG_OVERRIDE="${GITOPS_EXPORT_IMAGE_TAG:-}"

if [[ -n "${TAG_OVERRIDE}" ]]; then
  echo "${TAG_OVERRIDE}"
  exit 0
fi

if [[ -n "${PREFIX}" ]]; then
  echo "${PREFIX}${SANITIZED_VERSION}"
  exit 0
fi

echo "${SANITIZED_VERSION}"
