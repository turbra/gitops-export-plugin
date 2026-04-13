import { dump } from 'js-yaml';
import {
  GroupVersionKind,
  NamespaceScan,
  ResourceClassification,
  ResourceObject,
  ResourceSummary,
} from './types';

const MAX_PREVIEW_BYTES = 16 * 1024;

export type ResourceTypeOption = GroupVersionKind & {
  key: string;
  label: string;
  plural: string;
  selectedByDefault?: boolean;
};

export const RESOURCE_TYPE_OPTIONS: ResourceTypeOption[] = [
  { key: 'apps/v1/Deployment', label: 'Deployment', group: 'apps', version: 'v1', kind: 'Deployment', plural: 'deployments', selectedByDefault: true },
  { key: 'apps/v1/StatefulSet', label: 'StatefulSet', group: 'apps', version: 'v1', kind: 'StatefulSet', plural: 'statefulsets', selectedByDefault: true },
  { key: 'apps/v1/DaemonSet', label: 'DaemonSet', group: 'apps', version: 'v1', kind: 'DaemonSet', plural: 'daemonsets', selectedByDefault: true },
  { key: 'batch/v1/Job', label: 'Job', group: 'batch', version: 'v1', kind: 'Job', plural: 'jobs', selectedByDefault: true },
  { key: 'batch/v1/CronJob', label: 'CronJob', group: 'batch', version: 'v1', kind: 'CronJob', plural: 'cronjobs', selectedByDefault: true },
  { key: 'v1/Service', label: 'Service', version: 'v1', kind: 'Service', plural: 'services', selectedByDefault: true },
  { key: 'route.openshift.io/v1/Route', label: 'Route', group: 'route.openshift.io', version: 'v1', kind: 'Route', plural: 'routes', selectedByDefault: true },
  { key: 'v1/Secret', label: 'Secret', version: 'v1', kind: 'Secret', plural: 'secrets', selectedByDefault: true },
  { key: 'v1/ConfigMap', label: 'ConfigMap', version: 'v1', kind: 'ConfigMap', plural: 'configmaps', selectedByDefault: true },
  { key: 'v1/PersistentVolumeClaim', label: 'PersistentVolumeClaim', version: 'v1', kind: 'PersistentVolumeClaim', plural: 'persistentvolumeclaims', selectedByDefault: true },
  { key: 'networking.k8s.io/v1/NetworkPolicy', label: 'NetworkPolicy', group: 'networking.k8s.io', version: 'v1', kind: 'NetworkPolicy', plural: 'networkpolicies', selectedByDefault: true },
  { key: 'autoscaling/v2/HorizontalPodAutoscaler', label: 'HorizontalPodAutoscaler', group: 'autoscaling', version: 'v2', kind: 'HorizontalPodAutoscaler', plural: 'horizontalpodautoscalers', selectedByDefault: true },
  { key: 'build.openshift.io/v1/BuildConfig', label: 'BuildConfig', group: 'build.openshift.io', version: 'v1', kind: 'BuildConfig', plural: 'buildconfigs', selectedByDefault: true },
  { key: 'image.openshift.io/v1/ImageStream', label: 'ImageStream', group: 'image.openshift.io', version: 'v1', kind: 'ImageStream', plural: 'imagestreams', selectedByDefault: true },
  { key: 'image.openshift.io/v1/ImageStreamTag', label: 'ImageStreamTag', group: 'image.openshift.io', version: 'v1', kind: 'ImageStreamTag', plural: 'imagestreamtags' },
  { key: 'rbac.authorization.k8s.io/v1/Role', label: 'Role', group: 'rbac.authorization.k8s.io', version: 'v1', kind: 'Role', plural: 'roles' },
  { key: 'rbac.authorization.k8s.io/v1/RoleBinding', label: 'RoleBinding', group: 'rbac.authorization.k8s.io', version: 'v1', kind: 'RoleBinding', plural: 'rolebindings' },
  { key: 'v1/ServiceAccount', label: 'ServiceAccount', version: 'v1', kind: 'ServiceAccount', plural: 'serviceaccounts' },
];

export const DEFAULT_RESOURCE_TYPE_KEYS = RESOURCE_TYPE_OPTIONS.filter((option) => option.selectedByDefault).map(
  (option) => option.key,
);

export function selectedResourceTypes(keys: string[]): ResourceTypeOption[] {
  const selected = new Set(keys);
  return RESOURCE_TYPE_OPTIONS.filter((option) => selected.has(option.key));
}

export function summarizeCounts(scan?: NamespaceScan): string {
  const summary = scan?.status.resourceSummary;
  if (!summary || summary.total === undefined) {
    return 'No scan summary reported yet';
  }

  return `${summary.total} total | ${summary.included ?? 0} included | ${summary.includedWithCleanup ?? 0} cleanup | ${summary.needsReview ?? 0} review | ${summary.excluded ?? 0} excluded`;
}

export function scanKey(scan: NamespaceScan): string {
  return `${scan.metadata.namespace}/${scan.metadata.scannedAt}`;
}

export function resourceKey(scan: NamespaceScan, resource: ResourceClassification): string {
  return `${scanKey(scan)}/${resource.apiVersion}/${resource.kind}/${resource.name}`;
}

export function classifyResource(resource: ResourceObject): ResourceClassification {
  if (resource.apiVersion === 'gitops.stakkr.io/v1alpha1') {
    return newClassification(resource, 'exclude', 'GitOps Exporter control-plane resource');
  }

  if (resource.metadata.ownerReferences?.length) {
    return newClassification(resource, 'exclude', 'Controller-owned resource');
  }

  if (isOpenShiftScaffoldingResource(resource)) {
    return newClassification(resource, 'exclude', 'OpenShift-injected namespace scaffolding');
  }

  if (resource.metadata.labels?.['app.kubernetes.io/managed-by']?.toLowerCase() === 'helm') {
    return newClassification(resource, 'review', 'Helm-managed lifecycle detected');
  }

  switch (resource.kind) {
    case 'Pod':
    case 'ReplicaSet':
    case 'EndpointSlice':
    case 'Endpoints':
    case 'Event':
    case 'ControllerRevision':
    case 'Lease':
    case 'TokenReview':
    case 'SubjectAccessReview':
    case 'Node':
    case 'PersistentVolume':
      return newClassification(resource, 'exclude', 'Runtime-generated or cluster-owned resource');
    case 'Secret':
    case 'PodDisruptionBudget':
    case 'ResourceQuota':
    case 'LimitRange':
    case 'DeploymentConfig':
      return newClassification(resource, 'review', reviewReasonForKind(resource.kind));
    case 'PersistentVolumeClaim':
    case 'ImageStream':
    case 'ImageStreamTag':
      return newClassification(resource, 'cleanup', cleanupReasonForKind(resource.kind));
    case 'Service':
      if (resource.spec?.type === 'LoadBalancer') {
        return newClassification(resource, 'cleanup', 'LoadBalancer service needs environment-specific cleanup');
      }
      return newClassification(resource, 'include', 'Declarative service resource');
    case 'Deployment':
    case 'StatefulSet':
    case 'DaemonSet':
    case 'Job':
    case 'CronJob':
    case 'ConfigMap':
    case 'ServiceAccount':
    case 'Role':
    case 'RoleBinding':
    case 'NetworkPolicy':
    case 'HorizontalPodAutoscaler':
    case 'Route':
    case 'BuildConfig':
      return newClassification(resource, 'include', includeReasonForKind(resource.kind));
    default:
      return newClassification(resource, 'review', 'No explicit classifier yet; review before export');
  }
}

export function buildPreview(
  resource: ResourceObject,
  classification: ResourceClassification['classification'],
  secretHandling: string,
): string {
  return buildPreviewFromSanitized(
    sanitizeResource(resource, classification, secretHandling),
  );
}

export function sanitizeResource(
  resource: ResourceObject,
  classification: ResourceClassification['classification'],
  secretHandling: string,
): ResourceObject | undefined {
  if (classification === 'exclude') {
    return undefined;
  }

  return sanitizeForExport(resource, secretHandling);
}

export function buildPreviewFromSanitized(sanitized?: ResourceObject): string {
  if (!sanitized) {
    return '';
  }

  const yaml = serializeResource(sanitized);
  if (yaml.length <= MAX_PREVIEW_BYTES) {
    return yaml;
  }

  let truncated = yaml.slice(0, MAX_PREVIEW_BYTES);
  const newline = truncated.lastIndexOf('\n');
  if (newline > 0) {
    truncated = truncated.slice(0, newline);
  }

  return `${truncated}\n# Preview truncated\n`;
}

export function serializeResource(resource: ResourceObject): string {
  return dump(resource, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
}

export function sortResourceDetails(resources: ResourceClassification[]): ResourceClassification[] {
  return [...resources].sort((left, right) => {
    if (classificationRank(left.classification) !== classificationRank(right.classification)) {
      return classificationRank(left.classification) - classificationRank(right.classification);
    }
    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }
    return left.name.localeCompare(right.name);
  });
}

export function summarizeResourceDetails(resources: ResourceClassification[]): ResourceSummary {
  return resources.reduce<ResourceSummary>(
    (summary, resource) => {
      summary.total = (summary.total ?? 0) + 1;

      switch (resource.classification) {
        case 'include':
          summary.included = (summary.included ?? 0) + 1;
          break;
        case 'cleanup':
          summary.includedWithCleanup = (summary.includedWithCleanup ?? 0) + 1;
          break;
        case 'review':
          summary.needsReview = (summary.needsReview ?? 0) + 1;
          break;
        default:
          summary.excluded = (summary.excluded ?? 0) + 1;
          break;
      }

      return summary;
    },
    {},
  );
}

function newClassification(
  resource: ResourceObject,
  classification: ResourceClassification['classification'],
  reason: string,
): ResourceClassification {
  return {
    apiVersion: resource.apiVersion,
    kind: resource.kind,
    name: resource.metadata.name,
    namespace: resource.metadata.namespace,
    classification,
    reason,
  };
}

function includeReasonForKind(kind: string): string {
  switch (kind) {
    case 'Route':
      return 'OpenShift route can be declared directly';
    case 'BuildConfig':
      return 'OpenShift build configuration can be declared directly';
    case 'ConfigMap':
      return 'Configuration resource is declarative';
    case 'ServiceAccount':
    case 'Role':
    case 'RoleBinding':
    case 'NetworkPolicy':
      return 'Namespaced access or policy resource is declarative';
    case 'HorizontalPodAutoscaler':
      return 'Scaling policy resource is declarative';
    default:
      return 'Workload resource is declarative';
  }
}

function cleanupReasonForKind(kind: string): string {
  switch (kind) {
    case 'PersistentVolumeClaim':
      return 'Persistent volume binding details need cleanup';
    case 'ImageStream':
    case 'ImageStreamTag':
      return 'OpenShift image references need cleanup before export';
    default:
      return 'Resource needs cleanup before export';
  }
}

function reviewReasonForKind(kind: string): string {
  switch (kind) {
    case 'Secret':
      return 'Secret values require review or redaction';
    case 'PodDisruptionBudget':
      return 'Availability policy should be reviewed in context';
    case 'ResourceQuota':
    case 'LimitRange':
      return 'Namespace policy resource may not belong in app manifests';
    case 'DeploymentConfig':
      return 'Legacy OpenShift deployment API should be reviewed before export';
    default:
      return 'Resource should be reviewed before export';
  }
}

function classificationRank(classification: ResourceClassification['classification']): number {
  switch (classification) {
    case 'include':
      return 0;
    case 'cleanup':
      return 1;
    case 'review':
      return 2;
    default:
      return 3;
  }
}

function isOpenShiftScaffoldingResource(resource: ResourceObject): boolean {
  switch (resource.kind) {
    case 'ConfigMap':
      return isInjectedConfigMap(resource.metadata.name);
    case 'ServiceAccount':
      return ['default', 'builder', 'deployer', 'pipeline'].includes(resource.metadata.name);
    case 'RoleBinding':
      return [
        'system:deployers',
        'system:image-builders',
        'system:image-pullers',
        'openshift-pipelines-edit',
        'pipelines-scc-rolebinding',
      ].includes(resource.metadata.name);
    default:
      return false;
  }
}

function isInjectedConfigMap(name: string): boolean {
  return (
    name === 'kube-root-ca.crt' ||
    name === 'openshift-service-ca.crt' ||
    name.includes('service-cabundle') ||
    name.includes('trusted-cabundle') ||
    name.includes('ca-bundle')
  );
}

function sanitizeForExport(resource: ResourceObject, secretHandling: string): ResourceObject | undefined {
  if (resource.kind === 'Secret' && secretHandling === 'omit') {
    return undefined;
  }

  const sanitized = JSON.parse(JSON.stringify(resource)) as ResourceObject;

  sanitizeMetadata(sanitized);
  sanitizeTopLevelDefaults(sanitized);
  sanitizeKindSpecificFields(sanitized, secretHandling);

  return sanitized;
}

function sanitizeMetadata(resource: ResourceObject): void {
  const metadata = resource.metadata;

  delete (metadata as Record<string, unknown>).uid;
  delete (metadata as Record<string, unknown>).resourceVersion;
  delete (metadata as Record<string, unknown>).generation;
  delete (metadata as Record<string, unknown>).creationTimestamp;
  delete (metadata as Record<string, unknown>).managedFields;
  delete (metadata as Record<string, unknown>).selfLink;
  delete (metadata as Record<string, unknown>).ownerReferences;

  if (metadata.annotations) {
    Object.keys(metadata.annotations).forEach((key) => {
      if (shouldStripAnnotation(key)) {
        delete metadata.annotations?.[key];
      }
    });

    if (Object.keys(metadata.annotations).length === 0) {
      delete metadata.annotations;
    }
  }

  if (metadata.finalizers?.length) {
    metadata.finalizers = metadata.finalizers.filter((finalizer) => !isSystemFinalizer(finalizer));
    if (metadata.finalizers.length === 0) {
      delete metadata.finalizers;
    }
  }
}

function sanitizeTopLevelDefaults(resource: ResourceObject): void {
  delete resource.status;

  if (resource.spec && typeof resource.spec === 'object') {
    delete resource.spec.nodeName;
    if (resource.spec.schedulerName === 'default-scheduler') {
      delete resource.spec.schedulerName;
    }
  }

  sanitizePodTemplate(resource);
}

function sanitizeKindSpecificFields(resource: ResourceObject, secretHandling: string): void {
  switch (resource.kind) {
    case 'Deployment':
      sanitizeDeploymentDefaults(resource);
      break;
    case 'Secret':
      sanitizeSecret(resource, secretHandling);
      break;
    case 'PersistentVolumeClaim':
      if (resource.spec) {
        delete resource.spec.volumeName;
      }
      break;
    case 'Service':
      if (resource.spec) {
        delete resource.spec.clusterIP;
        delete resource.spec.clusterIPs;
        delete resource.spec.ipFamilies;
        delete resource.spec.ipFamilyPolicy;
        delete resource.spec.internalTrafficPolicy;
        if (resource.spec.sessionAffinity === 'None') {
          delete resource.spec.sessionAffinity;
        }
        if (resource.spec.type === 'LoadBalancer') {
          sanitizeServiceAnnotations(resource);
        }
      }
      break;
    case 'ImageStream':
      if (resource.spec) {
        delete resource.spec.dockerImageRepository;
      }
      break;
    default:
      break;
  }
}

function sanitizeDeploymentDefaults(resource: ResourceObject): void {
  if (!resource.spec) {
    return;
  }

  if (resource.spec.progressDeadlineSeconds === 600) {
    delete resource.spec.progressDeadlineSeconds;
  }

  if (resource.spec.revisionHistoryLimit === 10) {
    delete resource.spec.revisionHistoryLimit;
  }

  if (resource.spec.minReadySeconds === 0) {
    delete resource.spec.minReadySeconds;
  }

  const strategy = resource.spec.strategy;
  if (!strategy || typeof strategy !== 'object' || Array.isArray(strategy)) {
    return;
  }

  const strategyRecord = strategy as Record<string, unknown>;
  const rollingUpdate = strategyRecord.rollingUpdate;
  const hasDefaultType = strategyRecord.type === 'RollingUpdate';
  const hasDefaultRollingUpdate =
    rollingUpdate &&
    typeof rollingUpdate === 'object' &&
    !Array.isArray(rollingUpdate) &&
    (rollingUpdate as Record<string, unknown>).maxSurge === '25%' &&
    (rollingUpdate as Record<string, unknown>).maxUnavailable === '25%';

  if (hasDefaultType && hasDefaultRollingUpdate) {
    delete resource.spec.strategy;
  }
}

function sanitizeSecret(resource: ResourceObject, secretHandling: string): void {
  if (secretHandling === 'include') {
    return;
  }

  const redactStringMap = (value: unknown): void => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return;
    }

    Object.keys(value as Record<string, unknown>).forEach((key) => {
      (value as Record<string, unknown>)[key] = '<REDACTED>';
    });
  };

  redactStringMap(resource.data);
  redactStringMap(resource.stringData);
}

function sanitizeServiceAnnotations(resource: ResourceObject): void {
  if (!resource.metadata.annotations) {
    return;
  }

  Object.keys(resource.metadata.annotations).forEach((key) => {
    if (
      key.startsWith('service.beta.kubernetes.io/') ||
      key.startsWith('service.kubernetes.io/') ||
      key.startsWith('metallb.universe.tf/')
    ) {
      delete resource.metadata.annotations?.[key];
    }
  });

  if (Object.keys(resource.metadata.annotations).length === 0) {
    delete resource.metadata.annotations;
  }
}

function shouldStripAnnotation(key: string): boolean {
  const exactMatches = new Set([
    'kubectl.kubernetes.io/last-applied-configuration',
    'deployment.kubernetes.io/revision',
    'openshift.io/generated-by',
    'openshift.io/host.generated',
  ]);
  const prefixMatches = ['pv.kubernetes.io/', 'operator.openshift.io/', 'openshift.io/build.'];

  return exactMatches.has(key) || prefixMatches.some((prefix) => key.startsWith(prefix));
}

function sanitizePodTemplate(resource: ResourceObject): void {
  const template = resource.spec?.template;
  if (!template || typeof template !== 'object' || Array.isArray(template)) {
    return;
  }

  const metadata = (template as Record<string, unknown>).metadata;
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    delete (metadata as Record<string, unknown>).creationTimestamp;
    if (Object.keys(metadata as Record<string, unknown>).length === 0) {
      delete (template as Record<string, unknown>).metadata;
    }
  }

  const spec = (template as Record<string, unknown>).spec;
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    return;
  }

  if ((spec as Record<string, unknown>).schedulerName === 'default-scheduler') {
    delete (spec as Record<string, unknown>).schedulerName;
  }
  if ((spec as Record<string, unknown>).dnsPolicy === 'ClusterFirst') {
    delete (spec as Record<string, unknown>).dnsPolicy;
  }
  if ((spec as Record<string, unknown>).restartPolicy === 'Always') {
    delete (spec as Record<string, unknown>).restartPolicy;
  }

  const securityContext = (spec as Record<string, unknown>).securityContext;
  if (
    securityContext &&
    typeof securityContext === 'object' &&
    !Array.isArray(securityContext) &&
    Object.keys(securityContext as Record<string, unknown>).length === 0
  ) {
    delete (spec as Record<string, unknown>).securityContext;
  }

  const containers = (spec as Record<string, unknown>).containers;
  if (!Array.isArray(containers)) {
    return;
  }

  containers.forEach((container) => {
    if (!container || typeof container !== 'object' || Array.isArray(container)) {
      return;
    }

    if ((container as Record<string, unknown>).terminationMessagePath === '/dev/termination-log') {
      delete (container as Record<string, unknown>).terminationMessagePath;
    }
    if ((container as Record<string, unknown>).terminationMessagePolicy === 'File') {
      delete (container as Record<string, unknown>).terminationMessagePolicy;
    }
  });
}

function isSystemFinalizer(finalizer: string): boolean {
  return ['kubernetes.io/', 'openshift.io/', 'operator.openshift.io/'].some((prefix) =>
    finalizer.startsWith(prefix),
  );
}
