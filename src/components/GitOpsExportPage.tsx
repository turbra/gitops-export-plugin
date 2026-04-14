import * as React from 'react';
import {
  Alert,
  Grid,
  GridItem,
  PageSection,
} from '@patternfly/react-core';
import {
  ListPageHeader,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import './gitops-export.css';
import { ExportScanForm } from './ExportScanForm';
import {
  DEFAULT_RESOURCE_TYPE_KEYS,
  selectedResourceTypes,
} from '../scan-utils';
import { LatestScanCard } from './LatestScanCard';
import { GitOpsExportIntroCard } from './GitOpsExportIntroCard';
import { useNamespaceScan } from '../hooks/useNamespaceScan';
import { GitOpsDefinitionGenerator } from './GitOpsDefinitionGenerator';

type GitOpsExportPageProps = {
  obj?: {
    metadata?: {
      name?: string;
    };
  };
};

export default function GitOpsExportPage({ obj }: GitOpsExportPageProps) {
  const { t } = useTranslation('plugin__gitops-export-console');
  const namespace = obj?.metadata?.name ?? '';
  const [selectedResourceTypeKeys, setSelectedResourceTypeKeys] = React.useState<string[]>(
    DEFAULT_RESOURCE_TYPE_KEYS,
  );
  const [secretHandling, setSecretHandling] = React.useState('redact');
  const [expandedScan, setExpandedScan] = React.useState('');
  const [expandedPreview, setExpandedPreview] = React.useState('');
  const { error, scan, scanning, success, submitScan } = useNamespaceScan(namespace);

  React.useEffect(() => {
    setExpandedScan('');
    setExpandedPreview('');
  }, [namespace]);

  React.useEffect(() => {
    document.title = t('GitOps Export UI');
  }, [t]);

  React.useEffect(() => {
    if (!scan) {
      setExpandedScan('');
      setExpandedPreview('');
      return;
    }

    const latestScanKey = `${scan.metadata.namespace}/${scan.metadata.scannedAt}`;
    if (expandedScan && expandedScan !== latestScanKey) {
      setExpandedScan('');
      setExpandedPreview('');
    }

    if (
      expandedPreview &&
      !scan.status.resourceDetails.some(
        (resource) =>
          `${latestScanKey}/${resource.apiVersion}/${resource.kind}/${resource.name}` === expandedPreview,
      )
    ) {
      setExpandedPreview('');
    }
  }, [expandedPreview, expandedScan, scan]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    await submitScan({
      includeResourceTypes: selectedResourceTypes(selectedResourceTypeKeys),
      secretHandling,
    });
  };

  return (
    <>
      <ListPageHeader
        title={
          namespace
            ? t('GitOps Export: {{namespace}}', { namespace })
            : t('GitOps Export: Namespace')
        }
      />
      <PageSection isFilled>
        <Grid hasGutter className="gitops-export-console__grid">
          {error ? (
            <GridItem span={12}>
              <Alert isInline variant="danger" title={t('Plugin request failed')}>
                {error}
              </Alert>
            </GridItem>
          ) : null}

          {success ? (
            <GridItem span={12}>
              <Alert isInline variant="success" title={t('Namespace scan completed')}>
                {success}
              </Alert>
            </GridItem>
          ) : null}

          <GridItem lg={4} md={6} span={12}>
            <div className="gitops-export-console__column">
              <GitOpsExportIntroCard />
              <ExportScanForm
                namespace={namespace}
                scanning={scanning}
                selectedResourceTypeKeys={selectedResourceTypeKeys}
                secretHandling={secretHandling}
                onSubmit={submit}
                onSecretHandlingChange={setSecretHandling}
                onSelectedResourceTypeKeysChange={setSelectedResourceTypeKeys}
              />
            </div>
          </GridItem>

          <GridItem lg={8} md={6} span={12}>
            <LatestScanCard
              namespace={namespace}
              scanning={scanning}
              scan={scan}
              expandedScan={expandedScan}
              expandedPreview={expandedPreview}
              onExpandedScanChange={setExpandedScan}
              onExpandedPreviewChange={setExpandedPreview}
            />
          </GridItem>

          <GridItem span={12}>
            <GitOpsDefinitionGenerator namespace={namespace} scan={scan} />
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
}
