import * as React from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Grid,
  GridItem,
} from '@patternfly/react-core';
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

  if (!scan || !form) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitOps definition for {namespace || 'current namespace'}</CardTitle>
        </CardHeader>
        <CardBody>
          <Content component="p" className="gitops-export-console__subtle">
            No GitOps definition is shown yet.
          </Content>
          <Content component="p" className="gitops-export-console__subtle">
            Run an export to generate an Argo CD Application YAML definition for this namespace.
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
      setStatusError('Fill in the required Git source fields before generating YAML.');
      return;
    }

    try {
      const result = generateGitOpsDefinition(form, scan);
      setGenerated(result);
      setStatusSuccess('Application YAML generated and ready to copy or download.');
    } catch (error) {
      setGenerated(undefined);
      setStatusError(
        error instanceof Error ? error.message : 'Failed to generate GitOps definition YAML',
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

      setStatusSuccess('Application YAML copied to the clipboard.');
      setStatusError('');
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : 'Failed to copy YAML to the clipboard',
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

    setStatusSuccess(`${generated.fileName} downloaded.`);
    setStatusError('');
  };

  return (
    <Card isFullHeight>
      <CardHeader>
        <div className="gitops-export-console__flowHeader">
          <div className="gitops-export-console__introSummary">
            <CardTitle>GitOps definition for {namespace || 'current namespace'}</CardTitle>
            <p className="gitops-export-console__introLead gitops-export-console__subtle">
              Generate an Argo CD Application YAML definition from the latest sanitized export.
            </p>
          </div>
          <div className="gitops-export-console__inlineList">
            <span>
              <span className="gitops-export-console__label">Export context:</span>{' '}
              {summarizeExportContext(scan)}
            </span>
            <span>
              <span className="gitops-export-console__label">Suggested path:</span>{' '}
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
                title="General"
                description="Review the Argo CD metadata defaults for a single application in this namespace."
              >
                <Field
                  label="Application type"
                  helperText="This workflow is scoped to a single Argo CD Application."
                >
                  <input
                    className="gitops-export-console__input"
                    value="Application"
                    readOnly
                  />
                </Field>
                <Field
                  label="Application name"
                  required
                  error={errors.applicationName}
                  helperText="Suggested from the export context and used as the Argo CD resource name."
                >
                  <input
                    className={inputClass(errors.applicationName)}
                    value={form.applicationName}
                    onChange={(event) => updateForm('applicationName', event.currentTarget.value)}
                  />
                </Field>
                <Field
                  label="Project name"
                  required
                  error={errors.projectName}
                  helperText="Defaults to the standard Argo CD project."
                >
                  <input
                    className={inputClass(errors.projectName)}
                    value={form.projectName}
                    onChange={(event) => updateForm('projectName', event.currentTarget.value)}
                  />
                </Field>
                <Field
                  label="Argo CD namespace"
                  required
                  error={errors.argoNamespace}
                  helperText="Namespace where the Application resource will live."
                >
                  <input
                    className={inputClass(errors.argoNamespace)}
                    value={form.argoNamespace}
                    onChange={(event) => updateForm('argoNamespace', event.currentTarget.value)}
                  />
                </Field>
              </SectionCard>

              <SectionCard
                title="Source"
                description="These Git source fields are the primary values the user must provide."
              >
                <Field
                  label="Repository URL"
                  required
                  error={errors.repositoryUrl}
                >
                  <input
                    className={inputClass(errors.repositoryUrl)}
                    placeholder="https://github.com/your-org/your-repo.git"
                    value={form.repositoryUrl}
                    onChange={(event) => updateForm('repositoryUrl', event.currentTarget.value)}
                  />
                </Field>
                <Field
                  label="Revision"
                  required
                  error={errors.revision}
                  helperText="Branch, tag, or commit that Argo CD should track."
                >
                  <input
                    className={inputClass(errors.revision)}
                    placeholder="main"
                    value={form.revision}
                    onChange={(event) => updateForm('revision', event.currentTarget.value)}
                  />
                </Field>
                <Field
                  label="Path"
                  required
                  error={errors.sourcePath}
                  helperText="Point this at the directory you commit to Git. The exported archive structure suggests the path below."
                >
                  <div className="gitops-export-console__fieldWithAction">
                    <input
                      className={inputClass(errors.sourcePath)}
                      placeholder={suggestedPath}
                      value={form.sourcePath}
                      onChange={(event) => updateForm('sourcePath', event.currentTarget.value)}
                    />
                    <Button
                      variant="link"
                      isInline
                      onClick={() => updateForm('sourcePath', suggestedPath)}
                    >
                      Use suggestion
                    </Button>
                  </div>
                </Field>
              </SectionCard>

              <SectionCard
                title="Destination"
                description="Review the destination defaults derived from the export context and in-cluster Argo CD conventions."
              >
                <Field
                  label="Cluster URL"
                  required
                  error={errors.destinationServer}
                  helperText="Defaults to the standard in-cluster Kubernetes API server used by Argo CD."
                >
                  <input
                    className={inputClass(errors.destinationServer)}
                    value={form.destinationServer}
                    onChange={(event) => updateForm('destinationServer', event.currentTarget.value)}
                  />
                </Field>
                <Field
                  label="Namespace"
                  required
                  error={errors.destinationNamespace}
                  helperText="Pre-populated from the namespace you exported."
                >
                  <input
                    className={inputClass(errors.destinationNamespace)}
                    value={form.destinationNamespace}
                    onChange={(event) => updateForm('destinationNamespace', event.currentTarget.value)}
                  />
                </Field>
              </SectionCard>

              <SectionCard
                title="Sync policy"
                description="Keep this simple. Manual is the safest default for first-time GitOps adoption."
              >
                <div className="gitops-export-console__radioGroup">
                  <label className="gitops-export-console__radioOption">
                    <input
                      type="radio"
                      name="gitops-sync-mode"
                      checked={form.syncMode === 'manual'}
                      onChange={() => updateForm('syncMode', 'manual')}
                    />
                    <span>
                      <strong>Manual</strong>
                      <span className="gitops-export-console__subtle">
                        Generate YAML without automated sync.
                      </span>
                    </span>
                  </label>
                  <label className="gitops-export-console__radioOption">
                    <input
                      type="radio"
                      name="gitops-sync-mode"
                      checked={form.syncMode === 'automated'}
                      onChange={() => updateForm('syncMode', 'automated')}
                    />
                    <span>
                      <strong>Automated</strong>
                      <span className="gitops-export-console__subtle">
                        Include automated sync policy in the generated YAML.
                      </span>
                    </span>
                  </label>
                </div>
                <div className="gitops-export-console__checkboxStack">
                  <label className="gitops-export-console__checkOption">
                    <input
                      type="checkbox"
                      checked={form.prune}
                      onChange={(event) => updateForm('prune', event.currentTarget.checked)}
                      disabled={form.syncMode !== 'automated'}
                    />
                    <span>Prune resources during automated sync</span>
                  </label>
                  <label className="gitops-export-console__checkOption">
                    <input
                      type="checkbox"
                      checked={form.selfHeal}
                      onChange={(event) => updateForm('selfHeal', event.currentTarget.checked)}
                      disabled={form.syncMode !== 'automated'}
                    />
                    <span>Self-heal drift during automated sync</span>
                  </label>
                  <label className="gitops-export-console__checkOption">
                    <input
                      type="checkbox"
                      checked={form.createNamespace}
                      onChange={(event) => updateForm('createNamespace', event.currentTarget.checked)}
                    />
                    <span>Create destination namespace if it does not exist</span>
                  </label>
                </div>
              </SectionCard>
            </div>
          </GridItem>

          <GridItem xl={5} lg={5} md={12} span={12}>
            <div className="gitops-export-console__definitionReview">
              <SectionCard
                title="YAML review"
                description="Generate YAML, inspect the final manifest, then copy or download it for Git."
              >
                <div className="gitops-export-console__inlineActions">
                  <Button onClick={onGenerate}>Generate YAML</Button>
                  <Button variant="secondary" onClick={onCopy} isDisabled={!generated}>
                    Copy YAML
                  </Button>
                  <Button variant="secondary" onClick={onDownload} isDisabled={!generated}>
                    Download YAML
                  </Button>
                </div>

                {statusError ? (
                  <Alert isInline variant="danger" title="Generation failed">
                    {statusError}
                  </Alert>
                ) : null}
                {statusSuccess ? (
                  <Alert isInline variant="success" title="YAML ready">
                    {statusSuccess}
                  </Alert>
                ) : null}
                {hasReviewResources ? (
                  <Alert isInline variant="warning" title="Review resources are present">
                    The current export includes resources classified as review. Inspect the generated
                    source path and commit only what you intend to manage with Argo CD.
                  </Alert>
                ) : null}

                <Content component="p" className="gitops-export-console__subtle">
                  {generated
                    ? `Application ${generated.resourceName} is ready for Git review.`
                    : 'No GitOps definition has been generated yet.'}
                </Content>

                {generated ? (
                  <YamlPreview value={generated.yaml} />
                ) : (
                  <div className="gitops-export-console__emptyReview">
                    <Content component="p" className="gitops-export-console__subtle">
                      The generated Application YAML will appear here after you run export and then generate the definition.
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
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
};

function Field({ label, required, error, helperText, children }: FieldProps) {
  return (
    <label className="gitops-export-console__field">
      <span className="gitops-export-console__label">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
      {helperText ? (
        <span className="gitops-export-console__subtle">{helperText}</span>
      ) : null}
      {error ? <span className="gitops-export-console__fieldError">{error}</span> : null}
    </label>
  );
}

function inputClass(error?: string): string {
  return error
    ? 'gitops-export-console__input gitops-export-console__input--invalid'
    : 'gitops-export-console__input';
}
