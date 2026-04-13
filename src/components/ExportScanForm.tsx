import * as React from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Checkbox,
  Content,
} from '@patternfly/react-core';
import { RESOURCE_TYPE_OPTIONS } from '../scan-utils';

type ExportScanFormProps = {
  namespace: string;
  scanning: boolean;
  selectedResourceTypeKeys: string[];
  secretHandling: string;
  onSubmit: (event: React.FormEvent) => void;
  onSecretHandlingChange: (value: string) => void;
  onSelectedResourceTypeKeysChange: (keys: string[]) => void;
};

export function ExportScanForm({
  namespace,
  scanning,
  selectedResourceTypeKeys,
  secretHandling,
  onSubmit,
  onSecretHandlingChange,
  onSelectedResourceTypeKeysChange,
}: ExportScanFormProps) {
  const selectAll = React.useCallback(() => {
    onSelectedResourceTypeKeysChange(RESOURCE_TYPE_OPTIONS.map((option) => option.key));
  }, [onSelectedResourceTypeKeysChange]);

  const selectNone = React.useCallback(() => {
    onSelectedResourceTypeKeysChange([]);
  }, [onSelectedResourceTypeKeysChange]);

  const onCheckedChange = React.useCallback(
    (key: string, checked: boolean) => {
      onSelectedResourceTypeKeysChange(
        checked
          ? [...selectedResourceTypeKeys, key]
          : selectedResourceTypeKeys.filter((value) => value !== key),
      );
    },
    [onSelectedResourceTypeKeysChange, selectedResourceTypeKeys],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export</CardTitle>
      </CardHeader>
      <CardBody>
        {!namespace ? (
          <Alert isInline variant="warning" title="Namespace context unavailable">
            Open this plugin from a namespace details page.
          </Alert>
        ) : (
          <form onSubmit={onSubmit} className="gitops-export-console__controls">
            <label className="gitops-export-console__field">
              <span className="gitops-export-console__label">Secret handling</span>
              <select
                className="gitops-export-console__select"
                value={secretHandling}
                onChange={(event) => onSecretHandlingChange(event.currentTarget.value)}
              >
                <option value="redact">redact</option>
                <option value="omit">omit</option>
                <option value="include">include</option>
              </select>
            </label>

            <div className="gitops-export-console__field">
              <div className="gitops-export-console__fieldHeader">
                <span className="gitops-export-console__label">Resource kinds</span>
                <div className="gitops-export-console__inlineActions">
                  <Button variant="link" isInline onClick={selectAll}>
                    Select all
                  </Button>
                  <Button variant="link" isInline onClick={selectNone}>
                    Select none
                  </Button>
                </div>
              </div>
              <Content component="p" className="gitops-export-console__subtle">
                Only selected kinds are scanned and previewed in the result.
              </Content>
              <div className="gitops-export-console__checkboxGrid">
                {RESOURCE_TYPE_OPTIONS.map((option) => (
                  <Checkbox
                    key={option.key}
                    id={`resource-kind-${option.key.replace(/\//g, '-')}`}
                    label={option.label}
                    isChecked={selectedResourceTypeKeys.includes(option.key)}
                    onChange={(_, checked) => onCheckedChange(option.key, checked)}
                  />
                ))}
              </div>
            </div>

            <Button isDisabled={scanning || selectedResourceTypeKeys.length === 0} type="submit">
              {scanning ? 'Exporting...' : 'Export'}
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
