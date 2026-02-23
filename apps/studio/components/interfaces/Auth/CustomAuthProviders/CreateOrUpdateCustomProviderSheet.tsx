import { zodResolver } from '@hookform/resolvers/zod'
import { useParams } from 'common'
import { Radio, RefreshCcw, Signal, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  Accordion_Shadcn_,
  AccordionContent_Shadcn_,
  AccordionItem_Shadcn_,
  AccordionTrigger_Shadcn_,
  Button,
  cn,
  Form_Shadcn_,
  FormControl_Shadcn_,
  FormField_Shadcn_,
  FormItem_Shadcn_,
  Input,
  Input_Shadcn_,
  RadioGroupCard,
  RadioGroupCardItem,
  Separator,
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetSection,
  SheetTitle,
} from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import * as z from 'zod'

import { FormSectionLabel } from '../../../ui/Forms/FormSection'
import type { CustomProvider } from './customProviders.types'

interface CreateOrUpdateCustomProviderSheetProps {
  visible: boolean
  providerToEdit?: CustomProvider
  onSuccess: (provider: CustomProvider) => void
  onCancel: () => void
}

const FormSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Please provide an identifier')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Identifier can only contain letters, numbers, hyphens, and underscores'
    ),
  name: z
    .string()
    .min(1, 'Please provide a name for your custom provider')
    .max(100, 'Name must be less than 100 characters'),
  provider_type: z.enum(['oidc', 'oauth2']).default('oidc'),
  client_id: z.string().min(1, 'Client ID is required'),
  client_secret: z.string().min(1, 'Client secret is required'),
  issuer: z.string().url('Please provide a valid URL'),
  authorization_url: z.string().url('Please provide a valid URL'),
  token_url: z.string().url('Please provide a valid URL'),
  userinfo_url: z.string().url('Please provide a valid URL'),
  jwks_uri: z.string().url('Please provide a valid URL'),
  discovery_url: z.string().url('Please provide a valid URL'),
  scopes: z.string(),
  callback_url: z.string().url('Please provide a valid URL'),
})

const FORM_ID = 'create-or-update-custom-provider-form'

const initialValues = {
  name: '',
  identifier: '',
  provider_type: 'oidc' as const,
  issuer: '',
  authorization_url: '',
  token_url: '',
  userinfo_url: '',
  jwks_uri: '',
  discovery_url: '',
  scopes: '',
  callback_url: '',
  client_id: '',
  client_secret: '',
}

export const CreateOrUpdateCustomProviderSheet = ({
  visible,
  providerToEdit,
  onSuccess,
  onCancel,
}: CreateOrUpdateCustomProviderSheetProps) => {
  const isEditMode = !!providerToEdit
  const { ref: projectRef } = useParams()
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (visible) {
      if (providerToEdit) {
        form.reset({
          name: providerToEdit.name,
          identifier: providerToEdit.identifier.replace('custom:', ''),
          provider_type: providerToEdit.provider_type,
          client_id: providerToEdit.client_id,
          client_secret: '********',
        })
      } else {
        form.reset(initialValues)
      }
    }
  }, [visible, providerToEdit, form])

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    // Mock implementation - in real app this would call the API
    const mockProvider: CustomProvider = {
      id: providerToEdit?.id || `mock-${Date.now()}`,
      provider_type: data.provider_type,
      identifier: `custom:${data.identifier}`,
      name: data.name,
      client_id: data.client_id,
      scopes: '',
      issuer: data.issuer,
      pkce_enabled: true,
      enabled: true,
      email_optional: false,
      ...(data.provider_type === 'oidc' && {
        issuer: 'https://example.com',
        skip_nonce_check: false,
        discovery_url: data.discovery_url,
      }),
      ...(data.provider_type === 'oauth2' && {
        authorization_url: 'https://example.com/oauth/authorize',
        token_url: 'https://example.com/oauth/token',
        userinfo_url: 'https://example.com/oauth/userinfo',
      }),
      created_at: providerToEdit?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    toast.success(
      `Successfully ${isEditMode ? 'updated' : 'created'} custom provider "${data.name}"`
    )
    onSuccess(mockProvider)
  }

  const onClose = () => {
    form.reset(initialValues)
    onCancel()
  }

  const isManualConfiguration = form.watch('provider_type') === 'oauth2'

  return (
    <Sheet open={visible} onOpenChange={() => onCancel()}>
      <SheetContent
        size="lg"
        showClose={false}
        className="flex flex-col gap-0"
        tabIndex={undefined}
      >
        <SheetHeader>
          <div className="flex flex-row gap-3 items-center">
            <SheetClose
              className={cn(
                'text-muted hover:text ring-offset-background transition-opacity hover:opacity-100',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'disabled:pointer-events-none data-[state=open]:bg-secondary',
                'transition'
              )}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Close</span>
            </SheetClose>
            <SheetTitle className="truncate">
              {isEditMode ? 'Update Custom Auth Provider' : 'Create Custom Auth Provider'}
            </SheetTitle>
          </div>
        </SheetHeader>
        <Form_Shadcn_ {...form}>
          <form
            className="flex-grow overflow-auto"
            onSubmit={form.handleSubmit(onSubmit)}
            id={FORM_ID}
          >
            <SheetSection className="flex-grow px-5 space-y-4">
              <FormField_Shadcn_
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItemLayout
                    label="Provider Identifier"
                    description="Lowercase letters, numbers, and hyphens only. Used in SDK: signInWithOAuth({ provider: 'custom:my-company' })"
                  >
                    <FormControl_Shadcn_>
                      <Input_Shadcn_
                        {...field}
                        placeholder="custom:my-company"
                        disabled={isEditMode}
                      />
                    </FormControl_Shadcn_>
                  </FormItemLayout>
                )}
              />

              <FormField_Shadcn_
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItemLayout label="Display Name">
                    <FormControl_Shadcn_>
                      <Input_Shadcn_ {...field} placeholder="Provider name" />
                    </FormControl_Shadcn_>
                  </FormItemLayout>
                )}
              />

              <FormField_Shadcn_
                control={form.control}
                name="provider_type"
                render={({ field }) => (
                  <FormItemLayout label="Configuration Method">
                    <FormControl_Shadcn_>
                      <RadioGroupCard
                        className="flex items-stretch gap-2"
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormItem_Shadcn_ asChild>
                          <FormControl_Shadcn_ className="flex-1">
                            <RadioGroupCardItem
                              value="oidc"
                              label={
                                <div className="flex flex-col">
                                  <span className="text-foreground-light">
                                    Auto-discovery (Recommended)
                                  </span>
                                  <span className="text-foreground-lighter">
                                    Automatically fetch OAuth endpoints
                                  </span>
                                </div>
                              }
                            />
                          </FormControl_Shadcn_>
                        </FormItem_Shadcn_>
                        <FormItem_Shadcn_ asChild>
                          <FormControl_Shadcn_ className="flex-1">
                            <RadioGroupCardItem
                              value="oauth2"
                              label={
                                <div className="flex flex-col">
                                  <span className="text-foreground-light">
                                    Manual configuration
                                  </span>
                                  <span className="text-foreground-lighter">
                                    Enter endpoints myself
                                  </span>
                                </div>
                              }
                            />
                          </FormControl_Shadcn_>
                        </FormItem_Shadcn_>
                      </RadioGroupCard>
                    </FormControl_Shadcn_>
                  </FormItemLayout>
                )}
              />
            </SheetSection>
            <Separator />
            <SheetSection className="flex-grow px-5 space-y-4">
              <FormSectionLabel>OAuth Endpoints</FormSectionLabel>
              <FormField_Shadcn_
                control={form.control}
                name="issuer"
                render={({ field }) => (
                  <FormItemLayout label="Issuer URL" description="Base URL of your OAuth provider">
                    <FormControl_Shadcn_>
                      <div className="flex items-center gap-2">
                        <Input_Shadcn_ {...field} placeholder="https://auth.company.com" />
                        {!isManualConfiguration && (
                          <Button type="default" onClick={() => {}}>
                            Test
                          </Button>
                        )}
                      </div>
                    </FormControl_Shadcn_>
                  </FormItemLayout>
                )}
              />

              {isManualConfiguration ? (
                <>
                  <FormField_Shadcn_
                    control={form.control}
                    name="authorization_url"
                    render={({ field }) => (
                      <FormItemLayout label="Authorization URL">
                        <FormControl_Shadcn_>
                          <Input_Shadcn_
                            {...field}
                            placeholder="https://auth.company.com/oauth/authorize"
                          />
                        </FormControl_Shadcn_>
                      </FormItemLayout>
                    )}
                  />
                  <FormField_Shadcn_
                    control={form.control}
                    name="token_url"
                    render={({ field }) => (
                      <FormItemLayout label="Token URL">
                        <FormControl_Shadcn_>
                          <Input_Shadcn_
                            {...field}
                            placeholder="https://auth.company.com/oauth/token"
                          />
                        </FormControl_Shadcn_>
                      </FormItemLayout>
                    )}
                  />
                  <FormField_Shadcn_
                    control={form.control}
                    name="userinfo_url"
                    render={({ field }) => (
                      <FormItemLayout label="Userinfo URL">
                        <FormControl_Shadcn_>
                          <Input_Shadcn_
                            {...field}
                            placeholder="https://auth.company.com/oauth/userinfo"
                          />
                        </FormControl_Shadcn_>
                      </FormItemLayout>
                    )}
                  />
                  <FormField_Shadcn_
                    control={form.control}
                    name="jwks_uri"
                    render={({ field }) => (
                      <FormItemLayout
                        label="JWKS URI"
                        description="Required for ID token verification"
                      >
                        <FormControl_Shadcn_>
                          <Input_Shadcn_
                            {...field}
                            placeholder="https://auth.company.com/.well-known/jwks.json"
                          />
                        </FormControl_Shadcn_>
                      </FormItemLayout>
                    )}
                  />
                </>
              ) : (
                <Accordion_Shadcn_ type="single" collapsible>
                  <AccordionItem_Shadcn_ value="advanced-configuration" className="border-none">
                    <AccordionTrigger_Shadcn_ className="py-3 text-sm text-foreground-light hover:no-underline hover:text-foreground">
                      Advanced: Custom discovery URL
                    </AccordionTrigger_Shadcn_>
                    <AccordionContent_Shadcn_ className="py-1">
                      <FormField_Shadcn_
                        control={form.control}
                        name="discovery_url"
                        render={({ field }) => (
                          <FormItemLayout
                            label="Discovery URL"
                            description="Leave empty to use standard path: {issuer}/.well-known/openid-configuration. Only needed if your provider uses a non-standard discovery path."
                          >
                            <FormControl_Shadcn_>
                              <div className="flex items-center gap-2">
                                <Input_Shadcn_
                                  {...field}
                                  placeholder="https://github.company.com/.well-known/openid-configuration"
                                />
                                {!isManualConfiguration && (
                                  <Button type="default" onClick={() => {}}>
                                    Test
                                  </Button>
                                )}
                              </div>
                            </FormControl_Shadcn_>
                          </FormItemLayout>
                        )}
                      />
                    </AccordionContent_Shadcn_>
                  </AccordionItem_Shadcn_>
                </Accordion_Shadcn_>
              )}
            </SheetSection>
            <Separator />
            <SheetSection className="flex-grow px-5 space-y-6">
              <FormField_Shadcn_
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItemLayout label="Client ID">
                    <FormControl_Shadcn_>
                      <Input_Shadcn_ {...field} placeholder="Client ID" />
                    </FormControl_Shadcn_>
                  </FormItemLayout>
                )}
              />

              <FormField_Shadcn_
                control={form.control}
                name="client_secret"
                render={({ field }) => (
                  <FormItemLayout label="Client Secret">
                    <FormControl_Shadcn_>
                      <Input_Shadcn_ {...field} type="password" placeholder="Client secret" />
                    </FormControl_Shadcn_>
                  </FormItemLayout>
                )}
              />
            </SheetSection>
            <Separator />
            <SheetSection className="flex-grow px-5 space-y-6">
              <FormField_Shadcn_
                control={form.control}
                name="scopes"
                render={({ field }) => (
                  <FormItemLayout label="Scopes">
                    <FormControl_Shadcn_>
                      <Input_Shadcn_ {...field} placeholder="read:user, user:email" />
                    </FormControl_Shadcn_>
                  </FormItemLayout>
                )}
              />
            </SheetSection>
            <Separator />
            <SheetSection className="flex-grow px-5 space-y-6">
              <FormField_Shadcn_
                control={form.control}
                name="callback_url"
                render={({ field }) => (
                  <FormItemLayout
                    label="Callback URL"
                    description="Configure this in your OAuth provider's settings: (readonly field, existing)"
                  >
                    <FormControl_Shadcn_>
                      <Input
                        {...field}
                        copy
                        value={`https://${projectRef}.supabase.co/auth/v1/callback`}
                        placeholder={`https://${projectRef}.supabase.co/auth/v1/callback`}
                      />
                    </FormControl_Shadcn_>
                  </FormItemLayout>
                )}
              />
            </SheetSection>
          </form>
        </Form_Shadcn_>
        <SheetFooter>
          <Button type="default" onClick={onClose}>
            Cancel
          </Button>
          <Button htmlType="submit" form={FORM_ID}>
            {isEditMode ? 'Update provider' : 'Create and enable provider'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
