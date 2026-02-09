import { zodResolver } from '@hookform/resolvers/zod'
import { useTemplateComponentSourcesQuery } from 'data/templates/template-component-sources-query'
import { useTemplateInstallMutation } from 'data/templates/template-install-mutation'
import { parseTemplateStructure, parseTemplateVariables } from 'lib/cookbook/template-parser'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { TemplateRegistryInput, TemplateRegistryItem } from 'types/cookbook'
import {
  Button,
  cn,
  CodeBlock,
  Form_Shadcn_,
  FormControl_Shadcn_,
  FormField_Shadcn_,
  FormMessage_Shadcn_,
  Input_Shadcn_,
  Select_Shadcn_,
  SelectContent_Shadcn_,
  SelectItem_Shadcn_,
  SelectTrigger_Shadcn_,
  SelectValue_Shadcn_,
} from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import { PageContainer } from 'ui-patterns/PageContainer'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderMeta,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'
import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from 'ui-patterns/PageSection'
import * as z from 'zod'

interface TemplateInstallProps {
  template: TemplateRegistryItem
  templateUrl: string
  projectRef: string
}

type TemplateInputValues = Record<string, string>

export function TemplateInstall({ template, templateUrl, projectRef }: TemplateInstallProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [inputValues, setInputValues] = useState<TemplateInputValues>({})
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})

  const inputEntries = useMemo(() => Object.entries(template.inputs ?? {}), [template.inputs])

  const formSchema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {}

    inputEntries.forEach(([fieldName, field]) => {
      if (field.type === 'number') {
        const numericError = `${field.label} must be a number`
        if (field.required) {
          shape[fieldName] = z
            .string()
            .trim()
            .min(1, `${field.label} is required`)
            .refine((value) => !Number.isNaN(Number(value)), numericError)
        } else {
          shape[fieldName] = z
            .string()
            .optional()
            .refine(
              (value) =>
                value === undefined || value.trim().length === 0 || !Number.isNaN(Number(value)),
              numericError
            )
        }
      } else if (field.required) {
        shape[fieldName] = z.string().trim().min(1, `${field.label} is required`)
      } else {
        shape[fieldName] = z.string().optional()
      }
    })

    return z.object(shape)
  }, [inputEntries])

  const defaultValues = useMemo(() => {
    const defaults: TemplateInputValues = {}

    inputEntries.forEach(([fieldName, field]) => {
      defaults[fieldName] = field.default === undefined ? '' : String(field.default)
    })

    return defaults
  }, [inputEntries])

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  useEffect(() => {
    form.reset(defaultValues)
    setInputValues(defaultValues)
    setCurrentStepIndex(0)
  }, [defaultValues, form])

  const componentPaths = useMemo(
    () =>
      [
        ...new Set(
          template.steps.flatMap((step) => step.components.map((component) => component.path))
        ),
      ].filter((path): path is string => typeof path === 'string' && path.length > 0),
    [template.steps]
  )

  const {
    data: componentSources = [],
    isLoading: isLoadingComponentSources,
    isFetching: isFetchingComponentSources,
  } = useTemplateComponentSourcesQuery(
    { templateUrl, paths: componentPaths },
    { enabled: currentStepIndex >= 1 && componentPaths.length > 0 }
  )

  const componentSourcesByPath = useMemo(
    () =>
      new Map(componentSources.map((componentSource) => [componentSource.path, componentSource])),
    [componentSources]
  )

  const {
    mutate: install,
    isPending: isInstalling,
    isSuccess: isInstallSuccess,
  } = useTemplateInstallMutation({
    onSuccess: () => {
      toast.success('Template installation started')
    },
  })

  const onSubmitInputs = (values: Record<string, string>) => {
    setInputValues(values)
    setCurrentStepIndex(1)
  }

  const handleInstall = () => {
    install({
      projectRef,
      templateUrl,
      payload: {
        inputs: inputValues,
      },
    })
  }

  const hasCompletedInputs = currentStepIndex >= 1
  const showLoadingSources =
    hasCompletedInputs && (isLoadingComponentSources || isFetchingComponentSources)

  return (
    <div className="w-full">
      <PageHeader size="small">
        <PageHeaderMeta>
          <PageHeaderSummary>
            <PageHeaderTitle>{template.title}</PageHeaderTitle>
            <PageHeaderDescription>{template.description}</PageHeaderDescription>
          </PageHeaderSummary>
        </PageHeaderMeta>
      </PageHeader>

      <PageContainer size="small">
        <PageSection>
          <PageSectionMeta>
            <PageSectionSummary>
              <PageSectionTitle>Inputs</PageSectionTitle>
              <PageSectionDescription className="text-sm text-foreground-light">
                Provide values that will be interpolated into template configuration and component
                source files.
              </PageSectionDescription>
            </PageSectionSummary>
          </PageSectionMeta>
          <PageSectionContent>
            <Form_Shadcn_ {...form}>
              <form onSubmit={form.handleSubmit(onSubmitInputs)} className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  {inputEntries.map(([fieldName, field]) => (
                    <FormField_Shadcn_
                      key={fieldName}
                      control={form.control}
                      name={fieldName}
                      render={({ field: formField }) => (
                        <FormItemLayout
                          label={field.label}
                          description={getInputDescription(field)}
                        >
                          <FormControl_Shadcn_>
                            {field.type === 'password' ? (
                              <div className="relative">
                                <Input_Shadcn_
                                  type={showValues[fieldName] ? 'text' : 'password'}
                                  placeholder={
                                    field.default === undefined ? '' : String(field.default)
                                  }
                                  {...formField}
                                  className="pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowValues((previous) => ({
                                      ...previous,
                                      [fieldName]: !previous[fieldName],
                                    }))
                                  }
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                                >
                                  {showValues[fieldName] ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            ) : field.type === 'select' ? (
                              <Select_Shadcn_
                                value={formField.value}
                                onValueChange={formField.onChange}
                              >
                                <SelectTrigger_Shadcn_>
                                  <SelectValue_Shadcn_
                                    placeholder={`Select ${field.label.toLowerCase()}`}
                                  />
                                </SelectTrigger_Shadcn_>
                                <SelectContent_Shadcn_>
                                  {(field.options ?? []).map((option) => (
                                    <SelectItem_Shadcn_ key={option} value={option}>
                                      {option}
                                    </SelectItem_Shadcn_>
                                  ))}
                                </SelectContent_Shadcn_>
                              </Select_Shadcn_>
                            ) : (
                              <Input_Shadcn_
                                type={field.type === 'number' ? 'number' : 'text'}
                                placeholder={
                                  field.default === undefined ? '' : String(field.default)
                                }
                                {...formField}
                              />
                            )}
                          </FormControl_Shadcn_>
                          <FormMessage_Shadcn_ />
                        </FormItemLayout>
                      )}
                    />
                  ))}
                </div>

                <div>
                  <Button type="primary" htmlType="submit">
                    Continue
                  </Button>
                </div>
              </form>
            </Form_Shadcn_>
          </PageSectionContent>
        </PageSection>

        <PageSection className={cn(!hasCompletedInputs && 'opacity-50 pointer-events-none')}>
          <PageSectionMeta>
            <PageSectionSummary>
              <PageSectionTitle>What will be installed</PageSectionTitle>
              <PageSectionDescription className="text-sm text-foreground-light">
                Preview of component details and source files based on your inputs.
              </PageSectionDescription>
            </PageSectionSummary>
          </PageSectionMeta>
          <PageSectionContent>
            {showLoadingSources && (
              <div className="flex items-center gap-2 text-sm text-foreground-light">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading component sources...
              </div>
            )}
            <div className="space-y-8">
            {template.steps.map((step, stepIndex) => (
              <div key={`${step.name}-${stepIndex}`}>
                <div>
                  <h4 className="heading-default">{step.title}</h4>
                  <p className="text-sm text-foreground-light">{step.description}</p>
                </div>

                <div className="space-y-6 mt-4">
                  {step.components.map((component, componentIndex) => {
                    const parsedComponent = parseTemplateStructure(
                      component,
                      inputValues,
                      inputValues
                    )
                    const componentType = String(parsedComponent.type ?? '').toLowerCase()
                    const isSecretOrVault = componentType === 'secret' || componentType === 'vault'
                    const componentTitle = isSecretOrVault
                      ? String(parsedComponent.key ?? parsedComponent.name)
                      : String(parsedComponent.name)
                    const componentPath =
                      typeof component.path === 'string' && component.path.length > 0
                        ? component.path
                        : undefined
                    const componentSource = componentPath
                      ? componentSourcesByPath.get(componentPath)
                      : undefined
                    const parsedSource =
                      componentSource?.content === undefined
                        ? undefined
                        : parseTemplateVariables(componentSource.content, inputValues, inputValues)

                    return (
                      <div
                        key={`${component.name}-${componentIndex}`}
                      >
                        <div className="flex items-center gap-2 justify-between mb-2">
                          <p className="heading-default">{componentTitle}</p>
                          <p className="heading-meta text-light">{componentType}</p>
                        </div>

                        {isSecretOrVault && (
                          <Input_Shadcn_
                            type="password"
                            value={String(parsedComponent.value ?? '')}
                            readOnly
                          />
                        )}

                        {componentPath && (
                          <div className="space-y-2">
                            {componentSource?.error ? (
                              <div className="rounded-md border border-warning bg-warning/5 p-3">
                                <p className="text-sm text-foreground-light">
                                  {componentSource.error}
                                </p>
                              </div>
                            ) : (
                              <CodeBlock
                                value={parsedSource ?? '// Unable to load file content'}
                                language={getCodeLanguageForPath(componentPath)}
                                hideLineNumbers
                                className="max-h-96 overflow-auto"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  </div>
              </div>
            ))}
            </div>

          </PageSectionContent>
        </PageSection>
      </PageContainer>

      <div className="sticky bottom-0 z-10 border-t bg-surface-100/95 backdrop-blur">
        <PageContainer size="small">
          <div className="flex items-center justify-between py-4">
            <p className="text-sm text-foreground-light">
              Install this template's components to your project
            </p>
            <Button
              type="primary"
              size="large"
              loading={isInstalling}
              disabled={!hasCompletedInputs}
              onClick={handleInstall}
            >
              Install
            </Button>
          </div>
        </PageContainer>
      </div>
    </div>
  )
}

function getInputDescription(field: TemplateRegistryInput) {
  if (field.description) return field.description
  return field.required ? 'Required field' : undefined
}

function getCodeLanguageForPath(path: string) {
  const normalized = path.toLowerCase()
  if (normalized.endsWith('.sql')) return 'sql'
  if (normalized.endsWith('.ts')) return 'ts'
  if (normalized.endsWith('.tsx')) return 'ts'
  if (normalized.endsWith('.js')) return 'js'
  if (normalized.endsWith('.json')) return 'json'
  if (normalized.endsWith('.yaml') || normalized.endsWith('.yml')) return 'yaml'
  return 'js'
}
