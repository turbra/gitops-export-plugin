import * as React from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Checkbox,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('plugin__gitops-export-console');
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
        <CardTitle>{t('Export')}</CardTitle>
      </CardHeader>
      <CardBody>
        {!namespace ? (
          <Alert isInline variant="warning" title={t('Namespace context unavailable')}>
            {t('Open this plugin from a namespace details page.')}
          </Alert>
        ) : (
          <Form onSubmit={onSubmit} className="gitops-export-console__controls" isWidthLimited>
            <FormGroup
              label={t('Secret handling')}
              fieldId="gitops-export-secret-handling"
            >
              <FormSelect
                id="gitops-export-secret-handling"
                value={secretHandling}
                onChange={(_, value) => onSecretHandlingChange(value)}
                aria-label={t('Secret handling')}
              >
                <FormSelectOption value="redact" label={t('redact')} />
                <FormSelectOption value="omit" label={t('omit')} />
                <FormSelectOption value="include" label={t('include')} />
              </FormSelect>
            </FormGroup>

            <FormGroup
              label={t('Resource kinds')}
              fieldId="gitops-export-resource-kinds"
            >
              <div className="gitops-export-console__fieldHeader">
                <div className="gitops-export-console__inlineActions">
                  <Button variant="link" isInline type="button" onClick={selectAll}>
                    {t('Select all')}
                  </Button>
                  <Button variant="link" isInline type="button" onClick={selectNone}>
                    {t('Select none')}
                  </Button>
                </div>
              </div>
              <p className="gitops-export-console__subtle">
                {t('Only selected kinds are scanned and previewed in the result.')}
              </p>
              <div className="gitops-export-console__checkboxGrid" id="gitops-export-resource-kinds">
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
            </FormGroup>

            <Button isDisabled={scanning || selectedResourceTypeKeys.length === 0} type="submit">
              {scanning ? t('Exporting...') : t('Export')}
            </Button>
          </Form>
        )}
      </CardBody>
    </Card>
  );
}
