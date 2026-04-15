package argocd

import (
	"strconv"
	"strings"

	"sigs.k8s.io/yaml"

	"github.com/turbra/gitops-export-plugin/internal/types"
)

type SyncMode string

const (
	SyncModeManual    SyncMode = "manual"
	SyncModeAutomated SyncMode = "automated"
)

type DefinitionFormData struct {
	ApplicationName      string   `json:"applicationName"`
	ProjectName          string   `json:"projectName"`
	ArgoNamespace        string   `json:"argoNamespace"`
	RepositoryURL        string   `json:"repositoryUrl"`
	Revision             string   `json:"revision"`
	SourcePath           string   `json:"sourcePath"`
	DestinationServer    string   `json:"destinationServer"`
	DestinationNamespace string   `json:"destinationNamespace"`
	SyncMode             SyncMode `json:"syncMode"`
	Prune                bool     `json:"prune"`
	SelfHeal             bool     `json:"selfHeal"`
	CreateNamespace      bool     `json:"createNamespace"`
}

type ValidationErrors map[string]string

type DefinitionResult struct {
	FileName     string `json:"fileName"`
	Kind         string `json:"kind"`
	ResourceName string `json:"resourceName"`
	YAML         string `json:"yaml"`
}

const (
	InClusterDestinationServer = "https://kubernetes.default.svc"
	DefaultArgoNamespace       = "openshift-gitops"
	DefaultArgoProject         = "default"
)

func CreateDefaultForm(scan types.NamespaceScan) DefinitionFormData {
	namespace := scan.Spec.Namespace
	if namespace == "" {
		namespace = scan.Metadata.Namespace
	}
	if namespace == "" {
		namespace = "application"
	}
	return DefinitionFormData{
		ApplicationName:      suggestApplicationName(scan),
		ProjectName:          DefaultArgoProject,
		ArgoNamespace:        DefaultArgoNamespace,
		RepositoryURL:        "",
		Revision:             "",
		SourcePath:           "",
		DestinationServer:    InClusterDestinationServer,
		DestinationNamespace: namespace,
		SyncMode:             SyncModeManual,
		Prune:                true,
		SelfHeal:             true,
		CreateNamespace:      false,
	}
}

func SuggestedSourcePath(scan types.NamespaceScan) string {
	namespace := scan.Spec.Namespace
	if namespace == "" {
		namespace = scan.Metadata.Namespace
	}
	return "gitops-export/" + namespace + "/manifests"
}

func ValidateForm(form DefinitionFormData) ValidationErrors {
	errors := ValidationErrors{}
	if strings.TrimSpace(form.ApplicationName) == "" {
		errors["applicationName"] = "Application name is required"
	}
	if strings.TrimSpace(form.ProjectName) == "" {
		errors["projectName"] = "Project name is required"
	}
	if strings.TrimSpace(form.ArgoNamespace) == "" {
		errors["argoNamespace"] = "Argo CD namespace is required"
	}
	if strings.TrimSpace(form.RepositoryURL) == "" {
		errors["repositoryUrl"] = "Repository URL is required"
	}
	if strings.TrimSpace(form.Revision) == "" {
		errors["revision"] = "Revision is required"
	}
	if strings.TrimSpace(form.SourcePath) == "" {
		errors["sourcePath"] = "Path is required"
	}
	if strings.TrimSpace(form.DestinationServer) == "" {
		errors["destinationServer"] = "Cluster URL is required"
	}
	if strings.TrimSpace(form.DestinationNamespace) == "" {
		errors["destinationNamespace"] = "Destination namespace is required"
	}
	return errors
}

func GenerateDefinition(form DefinitionFormData, scan types.NamespaceScan) (DefinitionResult, error) {
	document := map[string]any{
		"apiVersion": "argoproj.io/v1alpha1",
		"kind":       "Application",
		"metadata": map[string]any{
			"name":      strings.TrimSpace(form.ApplicationName),
			"namespace": strings.TrimSpace(form.ArgoNamespace),
			"labels":    buildCommonLabels(scan),
		},
		"spec": map[string]any{
			"project": strings.TrimSpace(form.ProjectName),
			"source": map[string]any{
				"repoURL":        strings.TrimSpace(form.RepositoryURL),
				"targetRevision": strings.TrimSpace(form.Revision),
				"path":           strings.TrimSpace(form.SourcePath),
				"directory": map[string]any{
					"recurse": true,
				},
			},
			"destination": map[string]any{
				"server":    strings.TrimSpace(form.DestinationServer),
				"namespace": strings.TrimSpace(form.DestinationNamespace),
			},
		},
	}
	for key, value := range buildSyncPolicy(form) {
		document["spec"].(map[string]any)[key] = value
	}
	data, err := yaml.Marshal(document)
	if err != nil {
		return DefinitionResult{}, err
	}
	applicationName := strings.TrimSpace(form.ApplicationName)
	return DefinitionResult{
		FileName:     toFileSafeName(applicationName) + ".yaml",
		Kind:         "Application",
		ResourceName: applicationName,
		YAML:         string(data),
	}, nil
}

func SummarizeExportContext(scan types.NamespaceScan) string {
	kinds := map[string]struct{}{}
	for _, resource := range scan.Status.ResourceDetails {
		if resource.Classification != types.ClassificationExclude {
			kinds[resource.Kind] = struct{}{}
		}
	}
	namespace := scan.Spec.Namespace
	if namespace == "" {
		namespace = scan.Metadata.Namespace
	}
	return strconv.Itoa(len(kinds)) + " exportable kinds from " + namespace
}

func HasGeneratedReviewResources(scan types.NamespaceScan) bool {
	for _, resource := range scan.Status.ResourceDetails {
		if resource.Classification == types.ClassificationReview {
			return true
		}
	}
	return false
}

func buildSyncPolicy(form DefinitionFormData) map[string]any {
	if form.SyncMode != SyncModeAutomated && !form.CreateNamespace {
		return map[string]any{}
	}
	syncPolicy := map[string]any{}
	if form.SyncMode == SyncModeAutomated {
		automated := map[string]any{}
		if form.Prune {
			automated["prune"] = true
		}
		if form.SelfHeal {
			automated["selfHeal"] = true
		}
		syncPolicy["automated"] = automated
	}
	if form.CreateNamespace {
		syncPolicy["syncOptions"] = []string{"CreateNamespace=true"}
	}
	return map[string]any{"syncPolicy": syncPolicy}
}

func buildCommonLabels(scan types.NamespaceScan) map[string]string {
	namespace := scan.Spec.Namespace
	if namespace == "" {
		namespace = scan.Metadata.Namespace
	}
	return map[string]string{
		"app.kubernetes.io/managed-by": "gitops-export-console",
		"gitops-export/namespace":      namespace,
		"gitops-export/scanned-at":     toLabelValue(scan.Metadata.ScannedAt),
	}
}

func suggestApplicationName(scan types.NamespaceScan) string {
	preferredKinds := map[string]struct{}{
		"Deployment":  {},
		"StatefulSet": {},
		"DaemonSet":   {},
		"Job":         {},
		"CronJob":     {},
		"BuildConfig": {},
	}
	for _, resource := range scan.Status.ResourceDetails {
		if resource.Classification == types.ClassificationInclude {
			if _, ok := preferredKinds[resource.Kind]; ok {
				return resource.Name
			}
		}
	}
	for _, resource := range scan.Status.ResourceDetails {
		if resource.Classification != types.ClassificationExclude {
			return resource.Name
		}
	}
	if scan.Spec.Namespace != "" {
		return scan.Spec.Namespace
	}
	return scan.Metadata.Namespace
}

func toFileSafeName(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	lastDash := false
	for _, r := range value {
		isAllowed := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '.' || r == '_' || r == '-'
		if isAllowed {
			builder.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			builder.WriteByte('-')
			lastDash = true
		}
	}
	return strings.Trim(builder.String(), "-")
}

func toLabelValue(value string) string {
	var builder strings.Builder
	lastDash := false
	for _, r := range value {
		isAllowed := (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '_' || r == '-'
		if isAllowed {
			builder.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			builder.WriteByte('-')
			lastDash = true
		}
	}
	result := strings.Trim(builder.String(), "-")
	if len(result) > 63 {
		result = result[:63]
	}
	if result == "" {
		return "scan"
	}
	return result
}
