#!/usr/bin/env bash

set -euo pipefail

PLUGIN_NAME="gitops-export-console"

CONSOLE_IMAGE=${CONSOLE_IMAGE:="quay.io/openshift/origin-console:latest"}
CONSOLE_PORT=${CONSOLE_PORT:=9000}
BRIDGE_K8S_MODE_OFF_CLUSTER_SKIP_VERIFY_TLS=${BRIDGE_K8S_MODE_OFF_CLUSTER_SKIP_VERIFY_TLS:=true}

echo "Starting local OpenShift console..."

BRIDGE_USER_AUTH="disabled"
BRIDGE_K8S_MODE="off-cluster"
BRIDGE_K8S_AUTH="bearer-token"
BRIDGE_K8S_MODE_OFF_CLUSTER_ENDPOINT=$(oc whoami --show-server)
BRIDGE_K8S_MODE_OFF_CLUSTER_THANOS=$(oc -n openshift-config-managed get configmap monitoring-shared-config -o jsonpath='{.data.thanosPublicURL}')
BRIDGE_K8S_MODE_OFF_CLUSTER_ALERTMANAGER=$(oc -n openshift-config-managed get configmap monitoring-shared-config -o jsonpath='{.data.alertmanagerPublicURL}')
BRIDGE_K8S_AUTH_BEARER_TOKEN=$(oc whoami --show-token 2>/dev/null)
BRIDGE_USER_SETTINGS_LOCATION="localstorage"

bridge_env_file="$(mktemp)"
trap 'rm -f "${bridge_env_file}"' EXIT

write_bridge_env_file() {
  local env_var

  : >"${bridge_env_file}"
  for env_var in \
    BRIDGE_USER_AUTH \
    BRIDGE_K8S_MODE \
    BRIDGE_K8S_AUTH \
    BRIDGE_K8S_MODE_OFF_CLUSTER_SKIP_VERIFY_TLS \
    BRIDGE_K8S_MODE_OFF_CLUSTER_ENDPOINT \
    BRIDGE_K8S_MODE_OFF_CLUSTER_THANOS \
    BRIDGE_K8S_MODE_OFF_CLUSTER_ALERTMANAGER \
    BRIDGE_K8S_AUTH_BEARER_TOKEN \
    BRIDGE_USER_SETTINGS_LOCATION \
    BRIDGE_PLUGINS; do
    printf '%s=%s\n' "${env_var}" "${!env_var}" >>"${bridge_env_file}"
  done
}

echo "API Server: $BRIDGE_K8S_MODE_OFF_CLUSTER_ENDPOINT"
echo "Console Image: $CONSOLE_IMAGE"
echo "Console URL: http://localhost:${CONSOLE_PORT}"
if [ "${BRIDGE_K8S_MODE_OFF_CLUSTER_SKIP_VERIFY_TLS}" = "true" ]; then
  echo "Bridge TLS verification is disabled for local development only."
fi

if [ -x "$(command -v podman)" ]; then
  if [ "$(uname -s)" = "Linux" ]; then
    BRIDGE_PLUGINS="${PLUGIN_NAME}=http://localhost:9001"
    write_bridge_env_file
    podman run --pull always --rm --network=host --env-file "${bridge_env_file}" "$CONSOLE_IMAGE"
  else
    BRIDGE_PLUGINS="${PLUGIN_NAME}=http://host.containers.internal:9001"
    write_bridge_env_file
    podman run --pull always --rm -p "${CONSOLE_PORT}:9000" --env-file "${bridge_env_file}" "$CONSOLE_IMAGE"
  fi
else
  BRIDGE_PLUGINS="${PLUGIN_NAME}=http://host.docker.internal:9001"
  write_bridge_env_file
  docker run --pull always --rm -p "${CONSOLE_PORT}:9000" --env-file "${bridge_env_file}" "$CONSOLE_IMAGE"
fi
