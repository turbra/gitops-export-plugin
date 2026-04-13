import * as React from 'react';
import { k8sList, K8sModel } from '@openshift-console/dynamic-plugin-sdk';
import { NamespaceScan, ResourceObject } from '../types';
import {
  buildPreviewFromSanitized,
  classifyResource,
  ResourceTypeOption,
  sanitizeResource,
  sortResourceDetails,
  summarizeResourceDetails,
} from '../scan-utils';

type SubmitScanParams = {
  includeResourceTypes: ResourceTypeOption[];
  secretHandling: string;
};

type UseNamespaceScanResult = {
  error: string;
  scan?: NamespaceScan;
  scanning: boolean;
  success: string;
  submitScan: (params: SubmitScanParams) => Promise<NamespaceScan | undefined>;
};

const IGNORED_LIST_ERROR_CODES = new Set([401, 403, 404, 405]);

export function useNamespaceScan(namespace: string): UseNamespaceScanResult {
  const [scan, setScan] = React.useState<NamespaceScan>();
  const [scanning, setScanning] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  React.useEffect(() => {
    setScan(undefined);
    setScanning(false);
    setError('');
    setSuccess('');
  }, [namespace]);

  const submitScan = React.useCallback(
    async ({ includeResourceTypes, secretHandling }: SubmitScanParams) => {
      setScanning(true);
      setError('');
      setSuccess('');

      try {
        if (!namespace) {
          throw new Error('Namespace context is not available');
        }

        const resourceDetails = sortResourceDetails(
          (
            await Promise.all(
              includeResourceTypes.map(async (resourceType) => {
                const model: K8sModel = {
                  abbr: resourceType.kind.slice(0, 3).toUpperCase(),
                  apiGroup: resourceType.group || 'core',
                  apiVersion: resourceType.version ?? 'v1',
                  kind: resourceType.kind,
                  label: resourceType.kind,
                  labelPlural: resourceType.label,
                  namespaced: true,
                  plural: resourceType.plural,
                };

                try {
                  const resources = (await k8sList({
                    model,
                    queryParams: { ns: namespace },
                  })) as ResourceObject[];

                  return resources.map((resource) => {
                    const classification = classifyResource(resource);
                    const sanitizedResource = sanitizeResource(
                      resource,
                      classification.classification,
                      secretHandling,
                    );
                    return {
                      ...classification,
                      preview: buildPreviewFromSanitized(sanitizedResource),
                      sanitizedResource,
                    };
                  });
                } catch (listError) {
                  const code = typeof listError === 'object' && listError && 'code' in listError
                    ? Number((listError as { code?: unknown }).code)
                    : Number.NaN;

                  if (IGNORED_LIST_ERROR_CODES.has(code)) {
                    return [];
                  }

                  throw listError;
                }
              }),
            )
          ).flat(),
        );

        const nextScan: NamespaceScan = {
          metadata: {
            namespace,
            scannedAt: new Date().toISOString(),
          },
          spec: {
            namespace,
            includeResourceTypes: includeResourceTypes.map(({ group, version, kind }) => ({
              group,
              version,
              kind,
            })),
            secretHandling,
          },
          status: {
            phase: 'Completed',
            resourceSummary: summarizeResourceDetails(resourceDetails),
            resourceDetails,
            conditions: [
              {
                type: 'Completed',
                status: 'True',
                reason: 'LocalNamespaceScanCompleted',
                message: `Scanned ${includeResourceTypes.length} selected resource kinds in ${namespace}.`,
              },
            ],
          },
        };

        setScan(nextScan);
        setSuccess(`Scanned ${includeResourceTypes.length} resource kinds in namespace ${namespace}.`);
        return nextScan;
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Failed to scan namespace');
        return undefined;
      } finally {
        setScanning(false);
      }
    },
    [namespace],
  );

  return {
    error,
    scan,
    scanning,
    success,
    submitScan,
  };
}
