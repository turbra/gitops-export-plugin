import * as React from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Spinner,
} from '@patternfly/react-core';
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

type ResourceDetailsTableProps = {
  scan: NamespaceScan;
  expandedPreview: string;
  onExpandedPreviewChange: (value: string) => void;
};

function ResourceDetailsTable({
  scan,
  expandedPreview,
  onExpandedPreviewChange,
}: ResourceDetailsTableProps) {
  if (!scan.status.resourceDetails.length) {
    return (
      <Content component="p" className="gitops-export-console__subtle">
        No matching resources were found for the selected kinds.
      </Content>
    );
  }

  return (
    <div className="gitops-export-console__details">
      <table className="gitops-export-console__table">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Name</th>
            <th>Classification</th>
            <th>Reason</th>
            <th>Preview</th>
          </tr>
        </thead>
        <tbody>
          {scan.status.resourceDetails.flatMap((resource) => {
            const currentResourceKey = resourceKey(scan, resource);
            const previewExpanded =
              expandedPreview === currentResourceKey && Boolean(resource.preview);

            return [
              <ResourceDetailsRow
                key={currentResourceKey}
                scan={scan}
                resource={resource}
                previewExpanded={previewExpanded}
                onExpandedPreviewChange={onExpandedPreviewChange}
              />,
              ...(previewExpanded
                ? [
                    <tr key={`${currentResourceKey}/preview`}>
                      <td colSpan={5}>
                        <YamlPreview value={resource.preview ?? ''} />
                      </td>
                    </tr>,
                  ]
                : []),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

type ResourceDetailsRowProps = {
  scan: NamespaceScan;
  resource: ResourceClassification;
  previewExpanded: boolean;
  onExpandedPreviewChange: (value: string) => void;
};

function ResourceDetailsRow({
  scan,
  resource,
  previewExpanded,
  onExpandedPreviewChange,
}: ResourceDetailsRowProps) {
  const currentResourceKey = resourceKey(scan, resource);

  return (
    <tr>
      <td>{resource.kind}</td>
      <td className="gitops-export-console__nameCell">
        <div>{resource.name}</div>
        <div className="gitops-export-console__resourceVersion">{resource.apiVersion}</div>
      </td>
      <td>{resource.classification}</td>
      <td>{resource.reason}</td>
      <td>
        {resource.preview ? (
          <Button
            variant="link"
            isInline
            onClick={() =>
              onExpandedPreviewChange(previewExpanded ? '' : currentResourceKey)
            }
          >
            {previewExpanded ? 'Hide YAML' : 'Show YAML'}
          </Button>
        ) : (
          <span className="gitops-export-console__subtle">n/a</span>
        )}
      </td>
    </tr>
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
  const [downloadError, setDownloadError] = React.useState('');
  const [downloadSuccess, setDownloadSuccess] = React.useState('');
  const [downloadingArchive, setDownloadingArchive] = React.useState(false);

  React.useEffect(() => {
    setDownloadError('');
    setDownloadSuccess('');
    setDownloadingArchive(false);
  }, [namespace, scan?.metadata.scannedAt]);

  if (scanning) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latest scan in {namespace || 'current namespace'}</CardTitle>
        </CardHeader>
        <CardBody>
          <Spinner size="lg" />
        </CardBody>
      </Card>
    );
  }

  if (!scan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latest scan in {namespace || 'current namespace'}</CardTitle>
        </CardHeader>
        <CardBody>
          <Content component="p" className="gitops-export-console__subtle">
            No scan result is shown yet.
          </Content>
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
        `Downloaded ${result.manifestCount} manifest files as ${result.archiveName}.`,
      );
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : 'Failed to generate the ZIP archive',
      );
    } finally {
      setDownloadingArchive(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest scan in {namespace || 'current namespace'}</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="gitops-export-console__requestList">
          <div className="gitops-export-console__requestItem">
            <div className="gitops-export-console__requestHead">
              <strong>{new Date(scan.metadata.scannedAt).toLocaleString()}</strong>
              <span>{scan.status.phase}</span>
            </div>
            <div className="gitops-export-console__inlineList">
              <span>
                <span className="gitops-export-console__label">Target:</span>{' '}
                {scan.spec.namespace}
              </span>
              <span>
                <span className="gitops-export-console__label">Kinds:</span>{' '}
                {scan.spec.includeResourceTypes?.length ?? 0}
              </span>
              <span>
                <span className="gitops-export-console__label">Secrets:</span>{' '}
                {scan.spec.secretHandling || 'redact'}
              </span>
            </div>
            <Content component="p" className="gitops-export-console__subtle">
              {scan.status.conditions?.[0]?.message ?? 'Namespace scan completed locally.'}
            </Content>
            <Content component="p" className="gitops-export-console__subtle">
              {summarizeCounts(scan)}
            </Content>
            <Content component="p" className="gitops-export-console__subtle">
              {exportableResourceCount > 0
                ? warningCount > 0
                  ? `ZIP export will write ${exportableResourceCount} manifest files from this scan. Review, cleanup, and skipped resources are summarized in WARNINGS.md.`
                  : `ZIP export will write ${exportableResourceCount} manifest files from this scan.`
                : 'No exportable resources are available for this scan.'}
            </Content>
            <div className="gitops-export-console__inlineActions">
              <Button
                variant="secondary"
                onClick={onDownloadArchive}
                isDisabled={downloadingArchive || exportableResourceCount === 0}
              >
                {downloadingArchive ? 'Preparing ZIP...' : 'Download ZIP'}
              </Button>
              <Button
                variant="link"
                isInline
                onClick={() =>
                  onExpandedScanChange(scanExpanded ? '' : currentScanKey)
                }
              >
                {scanExpanded ? 'Hide details' : 'Show details'}
              </Button>
            </div>
            {warningCount > 0 ? (
              <Content component="p" className="gitops-export-console__subtle">
                The archive adds a `WARNINGS.md` file for review, cleanup, or skipped resources.
              </Content>
            ) : null}
            {downloadError ? (
              <Alert isInline variant="danger" title="ZIP export failed">
                {downloadError}
              </Alert>
            ) : null}
            {downloadSuccess ? (
              <Alert isInline variant="success" title="ZIP archive ready">
                {downloadSuccess}
              </Alert>
            ) : null}
            {scanExpanded ? (
              <ResourceDetailsTable
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
