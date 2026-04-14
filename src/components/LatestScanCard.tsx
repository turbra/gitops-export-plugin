import * as React from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DataList,
  DataListCell,
  DataListContent,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Spinner,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import {
  countExportableResources,
  countWarningResources,
  downloadScanArchive,
} from '../export-archive';
import { NamespaceScan, ResourceClassification } from '../types';
import {
  resourceKey,
  scanKey,
  summarizeCounts,
} from '../scan-utils';
import { YamlPreview } from './YamlPreview';

type LatestScanCardProps = {
  namespace: string;
  scanning: boolean;
  scan?: NamespaceScan;
  expandedScan: string;
  expandedPreview: string;
  onExpandedScanChange: (value: string) => void;
  onExpandedPreviewChange: (value: string) => void;
};

type ResourceDetailsListProps = {
  scan: NamespaceScan;
  expandedPreview: string;
  onExpandedPreviewChange: (value: string) => void;
};

function ResourceDetailsList({
  scan,
  expandedPreview,
  onExpandedPreviewChange,
}: ResourceDetailsListProps) {
  const { t } = useTranslation('plugin__gitops-export-console');

  if (!scan.status.resourceDetails.length) {
    return (
      <p className="gitops-export-console__subtle">
        {t('No matching resources were found for the selected kinds.')}
      </p>
    );
  }

  return (
    <DataList aria-label={t('Scanned resource details')} className="gitops-export-console__resourceList">
      {scan.status.resourceDetails.map((resource) => {
        const currentResourceKey = resourceKey(scan, resource);
        const previewExpanded =
          expandedPreview === currentResourceKey && Boolean(resource.preview);

        return (
          <ResourceDetailsItem
            key={currentResourceKey}
            scan={scan}
            resource={resource}
            previewExpanded={previewExpanded}
            onExpandedPreviewChange={onExpandedPreviewChange}
          />
        );
      })}
    </DataList>
  );
}

type ResourceDetailsItemProps = {
  scan: NamespaceScan;
  resource: ResourceClassification;
  previewExpanded: boolean;
  onExpandedPreviewChange: (value: string) => void;
};

function ResourceDetailsItem({
  scan,
  resource,
  previewExpanded,
  onExpandedPreviewChange,
}: ResourceDetailsItemProps) {
  const { t } = useTranslation('plugin__gitops-export-console');
  const currentResourceKey = resourceKey(scan, resource);
  const previewId = `${currentResourceKey}/preview`;

  return (
    <DataListItem id={currentResourceKey} isExpanded={previewExpanded}>
      <DataListItemRow>
        <DataListItemCells
          dataListCells={[
            <DataListCell key={`${currentResourceKey}-kind`} width={1}>
              <span className="gitops-export-console__label">{resource.kind}</span>
            </DataListCell>,
            <DataListCell key={`${currentResourceKey}-name`} width={2}>
              <div>{resource.name}</div>
              <div className="gitops-export-console__resourceVersion">{resource.apiVersion}</div>
            </DataListCell>,
            <DataListCell key={`${currentResourceKey}-classification`} width={1}>
              {resource.classification}
            </DataListCell>,
            <DataListCell key={`${currentResourceKey}-reason`} width={3}>
              {resource.reason}
            </DataListCell>,
            <DataListCell key={`${currentResourceKey}-preview`} width={1} alignRight>
              {resource.preview ? (
                <Button
                  variant="link"
                  isInline
                  onClick={() =>
                    onExpandedPreviewChange(previewExpanded ? '' : currentResourceKey)
                  }
                  aria-controls={previewId}
                  aria-expanded={previewExpanded}
                >
                  {previewExpanded ? t('Hide YAML') : t('Show YAML')}
                </Button>
              ) : (
                <span className="gitops-export-console__subtle">{t('n/a')}</span>
              )}
            </DataListCell>,
          ]}
        />
      </DataListItemRow>
      {resource.preview ? (
        <DataListContent
          id={previewId}
          aria-label={t('YAML preview for {{kind}} {{name}}', {
            kind: resource.kind,
            name: resource.name,
          })}
          isHidden={!previewExpanded}
          hasNoPadding
        >
          <YamlPreview value={resource.preview ?? ''} />
        </DataListContent>
      ) : null}
    </DataListItem>
  );
}

function ScanSummary({ scan }: { scan: NamespaceScan }) {
  const { t } = useTranslation('plugin__gitops-export-console');

  return (
    <DescriptionList
      columnModifier={{ default: '2Col', md: '3Col' }}
      className="gitops-export-console__summaryList"
    >
      <DescriptionListGroup>
        <DescriptionListTerm>{t('Target')}</DescriptionListTerm>
        <DescriptionListDescription>{scan.spec.namespace}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('Kinds')}</DescriptionListTerm>
        <DescriptionListDescription>{scan.spec.includeResourceTypes?.length ?? 0}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('Secrets')}</DescriptionListTerm>
        <DescriptionListDescription>{scan.spec.secretHandling || 'redact'}</DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
}

function EmptyScanState({ title, body }: { title: string; body: string }) {
  return (
    <div className="gitops-export-console__emptyState">
      <h2>{title}</h2>
      <p className="gitops-export-console__subtle">
        {body}
      </p>
    </div>
  );
}

export function LatestScanCard({
  namespace,
  scanning,
  scan,
  expandedScan,
  expandedPreview,
  onExpandedScanChange,
  onExpandedPreviewChange,
}: LatestScanCardProps) {
  const { t } = useTranslation('plugin__gitops-export-console');
  const [downloadError, setDownloadError] = React.useState('');
  const [downloadSuccess, setDownloadSuccess] = React.useState('');
  const [downloadingArchive, setDownloadingArchive] = React.useState(false);

  React.useEffect(() => {
    setDownloadError('');
    setDownloadSuccess('');
    setDownloadingArchive(false);
  }, [namespace, scan?.metadata.scannedAt]);

  const scanTitle = namespace
    ? t('Latest scan in {{namespace}}', { namespace })
    : t('Latest scan in current namespace');

  if (scanning) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{scanTitle}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="gitops-export-console__emptyState">
            <Spinner size="lg" />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!scan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{scanTitle}</CardTitle>
        </CardHeader>
        <CardBody>
          <EmptyScanState
            title={t('No scan result is shown yet.')}
            body={t('Run an export to review resource classifications and sanitized YAML.')}
          />
        </CardBody>
      </Card>
    );
  }

  const currentScanKey = scanKey(scan);
  const scanExpanded = expandedScan === currentScanKey;
  const exportableResourceCount = countExportableResources(scan);
  const warningCount = countWarningResources(scan);

  const onDownloadArchive = async () => {
    setDownloadError('');
    setDownloadSuccess('');
    setDownloadingArchive(true);

    try {
      const result = await downloadScanArchive(scan);
      setDownloadSuccess(
        t('Downloaded {{count}} manifest files as {{archiveName}}.', {
          count: result.manifestCount,
          archiveName: result.archiveName,
        }),
      );
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : t('Failed to generate the ZIP archive'),
      );
    } finally {
      setDownloadingArchive(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{scanTitle}</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="gitops-export-console__requestList">
          <div className="gitops-export-console__requestItem">
            <div className="gitops-export-console__requestHead">
              <strong>{new Date(scan.metadata.scannedAt).toLocaleString()}</strong>
              <span>{scan.status.phase}</span>
            </div>
            <ScanSummary scan={scan} />
            <p className="gitops-export-console__subtle">
              {scan.status.conditions?.[0]?.message ?? t('Namespace scan completed locally.')}
            </p>
            <p className="gitops-export-console__subtle">
              {summarizeCounts(scan)}
            </p>
            <p className="gitops-export-console__subtle">
              {exportableResourceCount > 0
                ? warningCount > 0
                  ? t(
                      'ZIP export will write {{count}} manifest files from this scan. Review, cleanup, and skipped resources are summarized in WARNINGS.md.',
                      { count: exportableResourceCount },
                    )
                  : t('ZIP export will write {{count}} manifest files from this scan.', {
                      count: exportableResourceCount,
                    })
                : t('No exportable resources are available for this scan.')}
            </p>
            <div className="gitops-export-console__inlineActions">
              <Button
                variant="secondary"
                onClick={onDownloadArchive}
                isDisabled={downloadingArchive || exportableResourceCount === 0}
              >
                {downloadingArchive ? t('Preparing ZIP...') : t('Download ZIP')}
              </Button>
              <Button
                variant="link"
                isInline
                onClick={() =>
                  onExpandedScanChange(scanExpanded ? '' : currentScanKey)
                }
              >
                {scanExpanded ? t('Hide details') : t('Show details')}
              </Button>
            </div>
            {warningCount > 0 ? (
              <p className="gitops-export-console__subtle">
                {t('The archive adds a `WARNINGS.md` file for review, cleanup, or skipped resources.')}
              </p>
            ) : null}
            {downloadError ? (
              <Alert isInline variant="danger" title={t('ZIP export failed')}>
                {downloadError}
              </Alert>
            ) : null}
            {downloadSuccess ? (
              <Alert isInline variant="success" title={t('ZIP archive ready')}>
                {downloadSuccess}
              </Alert>
            ) : null}
            {scanExpanded ? (
              <ResourceDetailsList
                scan={scan}
                expandedPreview={expandedPreview}
                onExpandedPreviewChange={onExpandedPreviewChange}
              />
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
