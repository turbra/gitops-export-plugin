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
  Form,
  FormGroup,
  Grid,
  GridItem,
  Radio,
  TextInput,
  TextInputTypes,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { NamespaceScan } from '../types';
import {
  createDefaultGitOpsDefinitionForm,
  generateGitOpsDefinition,
  getSuggestedSourcePath,
  GitOpsDefinitionFormData,
  GitOpsDefinitionResult,
  hasGeneratedReviewResources,
  summarizeExportContext,
  validateGitOpsDefinitionForm,
} from '../gitops-definition-utils';
import { YamlPreview } from './YamlPreview';

type GitOpsDefinitionGeneratorProps = {
  namespace: string;
  scan?: NamespaceScan;
};

export function GitOpsDefinitionGenerator({
  namespace,
  scan,
}: GitOpsDefinitionGeneratorProps) {
  const { t } = useTranslation('plugin__gitops-export-console');
  const [form, setForm] = React.useState<GitOpsDefinitionFormData>();
  const [generated, setGenerated] = React.useState<GitOpsDefinitionResult>();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [statusError, setStatusError] = React.useState('');
  const [statusSuccess, setStatusSuccess] = React.useState('');

  React.useEffect(() => {
    setForm(scan ? createDefaultGitOpsDefinitionForm(scan) : undefined);
    setGenerated(undefined);
    setErrors({});
    setStatusError('');
    setStatusSuccess('');
  }, [scan]);

  const definitionTitle = namespace
    ? t('GitOps definition for {{namespace}}', { namespace })
    : t('GitOps definition for current namespace');

  if (!scan || !form) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{definitionTitle}</CardTitle>
        </CardHeader>
        <CardBody>
          <Content component="p" className="gitops-export-console__subtle">
            {t('No GitOps definition is shown yet.')}
          </Content>
          <Content component="p" className="gitops-export-console__subtle">
            {t('Run an export to generate an Argo CD Application YAML definition for this namespace.')}
          </Content>
        </CardBody>
      </Card>
    );
  }

  const suggestedPath = getSuggestedSourcePath(scan);
  const hasReviewResources = hasGeneratedReviewResources(scan);

  const updateForm = <K extends keyof GitOpsDefinitionFormData>(
    key: K,
    value: GitOpsDefinitionFormData[K],
  ) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setGenerated(undefined);
    setStatusError('');
    setStatusSuccess('');
    setErrors((current) => {
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  const onGenerate = () => {
    const validationErrors = validateGitOpsDefinitionForm(form);
    setErrors(validationErrors);
    setStatusError('');
    setStatusSuccess('');

    if (Object.keys(validationErrors).length > 0) {
      setGenerated(undefined);
      setStatusError(t('Fill in the required Git source fields before generating YAML.'));
      return;
    }

    try {
      const result = generateGitOpsDefinition(form, scan);
      setGenerated(result);
      setStatusSuccess(t('Application YAML generated and ready to copy or download.'));
    } catch (error) {
      setGenerated(undefined);
      setStatusError(
        error instanceof Error ? error.message : t('Failed to generate GitOps definition YAML'),
      );
    }
  };

  const onCopy = async () => {
    if (!generated) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generated.yaml);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = generated.yaml;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      setStatusSuccess(t('Application YAML copied to the clipboard.'));
      setStatusError('');
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : t('Failed to copy YAML to the clipboard'),
      );
    }
  };

  const onDownload = () => {
    if (!generated) {
      return;
    }

    const blob = new Blob([generated.yaml], { type: 'application/yaml;charset=utf-8' });
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = objectUrl;
    anchor.download = generated.fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(objectUrl);

    setStatusSuccess(t('{{fileName}} downloaded.', { fileName: generated.fileName }));
    setStatusError('');
  };

  return (
    <Card isFullHeight>
      <CardHeader>
        <div className="gitops-export-console__flowHeader">
          <div className="gitops-export-console__introSummary">
            <CardTitle>{definitionTitle}</CardTitle>
            <p className="gitops-export-console__introLead gitops-export-console__subtle">
              {t('Generate an Argo CD Application YAML definition from the latest sanitized export.')}
            </p>
          </div>
          <div className="gitops-export-console__inlineList">
            <span>
              <span className="gitops-export-console__label">{t('Export context:')}</span>{' '}
              {summarizeExportContext(scan)}
            </span>
            <span>
              <span className="gitops-export-console__label">{t('Suggested path:')}</span>{' '}
              {suggestedPath}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <Grid hasGutter className="gitops-export-console__definitionGrid">
          <GridItem xl={7} lg={7} md={12} span={12}>
            <div className="gitops-export-console__definitionSections">
              <SectionCard
                title={t('General')}
                description={t('Review the Argo CD metadata defaults for a single application in this namespace.')}
              >
                <Form isWidthLimited>
                <Field
                  fieldId="gitops-definition-application-type"
                  label={t('Application type')}
                  helperText={t('This workflow is scoped to a single Argo CD Application.')}
                >
                  <TextInput
                    id="gitops-definition-application-type"
                    value="Application"
                    readOnly
                    readOnlyVariant="default"
                    aria-label={t('Application type')}
                  />
                </Field>
                <Field
                  fieldId="gitops-definition-application-name"
                  label={t('Application name')}
                  required
                  error={errors.applicationName}
                  helperText={t('Suggested from the export context and used as the Argo CD resource name.')}
                >
                  <TextInput
                    id="gitops-definition-application-name"
                    validated={validatedState(errors.applicationName)}
                    value={form.applicationName}
                    onChange={(_, value) => updateForm('applicationName', value)}
                    aria-label={t('Application name')}
                  />
                </Field>
                <Field
                  fieldId="gitops-definition-project-name"
                  label={t('Project name')}
                  required
                  error={errors.projectName}
                  helperText={t('Defaults to the standard Argo CD project.')}
                >
                  <TextInput
                    id="gitops-definition-project-name"
                    validated={validatedState(errors.projectName)}
                    value={form.projectName}
                    onChange={(_, value) => updateForm('projectName', value)}
                    aria-label={t('Project name')}
                  />
                </Field>
                <Field
                  fieldId="gitops-definition-argo-namespace"
                  label={t('Argo CD namespace')}
                  required
                  error={errors.argoNamespace}
                  helperText={t('Namespace where the Application resource will live.')}
                >
                  <TextInput
                    id="gitops-definition-argo-namespace"
                    validated={validatedState(errors.argoNamespace)}
                    value={form.argoNamespace}
                    onChange={(_, value) => updateForm('argoNamespace', value)}
                    aria-label={t('Argo CD namespace')}
                  />
                </Field>
                </Form>
              </SectionCard>

              <SectionCard
                title={t('Source')}
                description={t('These Git source fields are the primary values the user must provide.')}
              >
                <Form isWidthLimited>
                <Field
                  fieldId="gitops-definition-repository-url"
                  label={t('Repository URL')}
                  required
                  error={errors.repositoryUrl}
                >
                  <TextInput
                    id="gitops-definition-repository-url"
                    validated={validatedState(errors.repositoryUrl)}
                    type={TextInputTypes.url}
                    placeholder="https://github.com/your-org/your-repo.git"
                    value={form.repositoryUrl}
                    onChange={(_, value) => updateForm('repositoryUrl', value)}
                    aria-label={t('Repository URL')}
                  />
                </Field>
                <Field
                  fieldId="gitops-definition-revision"
                  label={t('Revision')}
                  required
                  error={errors.revision}
                  helperText={t('Branch, tag, or commit that Argo CD should track.')}
                >
                  <TextInput
                    id="gitops-definition-revision"
                    validated={validatedState(errors.revision)}
                    placeholder="main"
                    value={form.revision}
                    onChange={(_, value) => updateForm('revision', value)}
                    aria-label={t('Revision')}
                  />
                </Field>
                <Field
                  fieldId="gitops-definition-source-path"
                  label={t('Path')}
                  required
                  error={errors.sourcePath}
                  helperText={t('Point this at the directory you commit to Git. The exported archive structure suggests the path below.')}
                >
                  <div className="gitops-export-console__fieldWithAction">
                    <TextInput
                      id="gitops-definition-source-path"
                      validated={validatedState(errors.sourcePath)}
                      placeholder={suggestedPath}
                      value={form.sourcePath}
                      onChange={(_, value) => updateForm('sourcePath', value)}
                      aria-label={t('Path')}
                    />
                    <Button
                      variant="link"
                      isInline
                      type="button"
                      onClick={() => updateForm('sourcePath', suggestedPath)}
                    >
                      {t('Use suggestion')}
                    </Button>
                  </div>
                </Field>
                </Form>
              </SectionCard>

              <SectionCard
                title={t('Destination')}
                description={t('Review the destination defaults derived from the export context and in-cluster Argo CD conventions.')}
              >
                <Form isWidthLimited>
                <Field
                  fieldId="gitops-definition-destination-server"
                  label={t('Cluster URL')}
                  required
                  error={errors.destinationServer}
                  helperText={t('Defaults to the standard in-cluster Kubernetes API server used by Argo CD.')}
                >
                  <TextInput
                    id="gitops-definition-destination-server"
                    validated={validatedState(errors.destinationServer)}
                    type={TextInputTypes.url}
                    value={form.destinationServer}
                    onChange={(_, value) => updateForm('destinationServer', value)}
                    aria-label={t('Cluster URL')}
                  />
                </Field>
                <Field
                  fieldId="gitops-definition-destination-namespace"
                  label={t('Namespace')}
                  required
                  error={errors.destinationNamespace}
                  helperText={t('Pre-populated from the namespace you exported.')}
                >
                  <TextInput
                    id="gitops-definition-destination-namespace"
                    validated={validatedState(errors.destinationNamespace)}
                    value={form.destinationNamespace}
                    onChange={(_, value) => updateForm('destinationNamespace', value)}
                    aria-label={t('Namespace')}
                  />
                </Field>
                </Form>
              </SectionCard>

              <SectionCard
                title={t('Sync policy')}
                description={t('Keep this simple. Manual is the safest default for first-time GitOps adoption.')}
              >
                <Form isWidthLimited>
                  <FormGroup
                    label={t('Sync mode')}
                    fieldId="gitops-definition-sync-mode-manual"
                    role="radiogroup"
                  >
                    <div className="gitops-export-console__radioGroup">
                      <Radio
                        id="gitops-definition-sync-mode-manual"
                        name="gitops-sync-mode"
                        label={t('Manual')}
                        description={t('Generate YAML without automated sync.')}
                        isChecked={form.syncMode === 'manual'}
                        onChange={(_, checked) => checked && updateForm('syncMode', 'manual')}
                      />
                      <Radio
                        id="gitops-definition-sync-mode-automated"
                        name="gitops-sync-mode"
                        label={t('Automated')}
                        description={t('Include automated sync policy in the generated YAML.')}
                        isChecked={form.syncMode === 'automated'}
                        onChange={(_, checked) => checked && updateForm('syncMode', 'automated')}
                      />
                    </div>
                  </FormGroup>
                  <FormGroup
                    label={t('Sync options')}
                    fieldId="gitops-definition-sync-options"
                  >
                    <div className="gitops-export-console__checkboxStack" id="gitops-definition-sync-options">
                      <Checkbox
                        id="gitops-definition-prune"
                        label={t('Prune resources during automated sync')}
                        isChecked={form.prune}
                        onChange={(_, checked) => updateForm('prune', checked)}
                        isDisabled={form.syncMode !== 'automated'}
                      />
                      <Checkbox
                        id="gitops-definition-self-heal"
                        label={t('Self-heal drift during automated sync')}
                        isChecked={form.selfHeal}
                        onChange={(_, checked) => updateForm('selfHeal', checked)}
                        isDisabled={form.syncMode !== 'automated'}
                      />
                      <Checkbox
                        id="gitops-definition-create-namespace"
                        label={t('Create destination namespace if it does not exist')}
                        isChecked={form.createNamespace}
                        onChange={(_, checked) => updateForm('createNamespace', checked)}
                      />
                    </div>
                  </FormGroup>
                </Form>
              </SectionCard>
            </div>
          </GridItem>

          <GridItem xl={5} lg={5} md={12} span={12}>
            <div className="gitops-export-console__definitionReview">
              <SectionCard
                title={t('YAML review')}
                description={t('Generate YAML, inspect the final manifest, then copy or download it for Git.')}
              >
                <div className="gitops-export-console__inlineActions">
                  <Button onClick={onGenerate}>{t('Generate YAML')}</Button>
                  <Button variant="secondary" onClick={onCopy} isDisabled={!generated}>
                    {t('Copy YAML')}
                  </Button>
                  <Button variant="secondary" onClick={onDownload} isDisabled={!generated}>
                    {t('Download YAML')}
                  </Button>
                </div>

                {statusError ? (
                  <Alert isInline variant="danger" title={t('Generation failed')}>
                    {statusError}
                  </Alert>
                ) : null}
                {statusSuccess ? (
                  <Alert isInline variant="success" title={t('YAML ready')}>
                    {statusSuccess}
                  </Alert>
                ) : null}
                {hasReviewResources ? (
                  <Alert isInline variant="warning" title={t('Review resources are present')}>
                    {t('The current export includes resources classified as review. Inspect the generated source path and commit only what you intend to manage with Argo CD.')}
                  </Alert>
                ) : null}

                <Content component="p" className="gitops-export-console__subtle">
                  {generated
                    ? t('Application {{resourceName}} is ready for Git review.', {
                        resourceName: generated.resourceName,
                      })
                    : t('No GitOps definition has been generated yet.')}
                </Content>

                {generated ? (
                  <YamlPreview value={generated.yaml} />
                ) : (
                  <div className="gitops-export-console__emptyReview">
                    <Content component="h3">{t('Generate YAML to review the Application manifest')}</Content>
                    <Content component="p" className="gitops-export-console__subtle">
                      {t('The generated Application YAML will appear here after you run export and then generate the definition.')}
                    </Content>
                  </div>
                )}
              </SectionCard>
            </div>
          </GridItem>
        </Grid>
      </CardBody>
    </Card>
  );
}

type SectionCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="gitops-export-console__sectionCard">
      <div className="gitops-export-console__sectionHead">
        <h3>{title}</h3>
        <p className="gitops-export-console__subtle">{description}</p>
      </div>
      <div className="gitops-export-console__sectionBody">{children}</div>
    </section>
  );
}

type FieldProps = {
  fieldId: string;
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
};

function Field({ fieldId, label, required, error, helperText, children }: FieldProps) {
  return (
    <FormGroup
      fieldId={fieldId}
      label={label}
      isRequired={required}
      className="gitops-export-console__field"
    >
      {children}
      {helperText ? (
        <span className="gitops-export-console__subtle">{helperText}</span>
      ) : null}
      {error ? <span className="gitops-export-console__fieldError">{error}</span> : null}
    </FormGroup>
  );
}

function validatedState(error?: string): 'default' | 'error' {
  return error ? 'error' : 'default';
}
