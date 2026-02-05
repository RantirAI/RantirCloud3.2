import { FC, useEffect, useState } from 'react'
import Link from 'next/link'
import { CircleAlert } from 'lucide-react'
import { Button, cn, Input_Shadcn_, Label_Shadcn_, Separator } from 'ui'
import { Alert } from 'ui/src/components/shadcn/ui/alert'
import { useSendTelemetryEvent } from '~/lib/telemetry'
import { isValidEmail, isCompanyEmail } from '~/lib/email-validation'

interface FormData {
  firstName: string
  lastName: string
  companyName: string
  supabaseOrgName: string
  email: string
}

interface FormItem {
  type: 'text' | 'email'
  label: string
  placeholder: string
  required: boolean
  className?: string
}

type FormConfig = {
  [K in keyof FormData]: FormItem
}

interface Props {
  className?: string
}

const formConfig: FormConfig = {
  firstName: {
    type: 'text',
    label: 'First Name',
    placeholder: 'First Name',
    required: true,
    className: 'md:col-span-1',
  },
  lastName: {
    type: 'text',
    label: 'Last Name',
    placeholder: 'Last Name',
    required: true,
    className: 'md:col-span-1',
  },
  companyName: {
    type: 'text',
    label: 'Company Name',
    placeholder: 'Company Name',
    required: true,
    className: 'col-span-full',
  },
  supabaseOrgName: {
    type: 'text',
    label: 'Supabase Organization Name',
    placeholder: 'Supabase Organization Name (if applicable)',
    required: false,
    className: 'col-span-full',
  },
  email: {
    type: 'email',
    label: 'Email Address',
    placeholder: 'Work email address',
    required: true,
    className: 'col-span-full',
  },
}

const defaultFormValue: FormData = {
  firstName: '',
  lastName: '',
  companyName: '',
  supabaseOrgName: '',
  email: '',
}

const BYOCEarlyAccessForm: FC<Props> = ({ className }) => {
  const [formData, setFormData] = useState<FormData>(defaultFormValue)
  const [honeypot, setHoneypot] = useState<string>('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  const sendTelemetryEvent = useSendTelemetryEvent()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setErrors({})
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleReset = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    setFormData(defaultFormValue)
    setSuccess(null)
    setErrors({})
  }

  const validate = (): boolean => {
    const newErrors: { [key in keyof FormData]?: string } = {}

    for (const key in formConfig) {
      if (formConfig[key as keyof FormData].required && !formData[key as keyof FormData]) {
        newErrors[key as keyof FormData] = 'This field is required'
      }
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    if (formData.email && !isCompanyEmail(formData.email)) {
      newErrors.email = 'Please use a company email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0 && honeypot === ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const currentTime = Date.now()
    const timeElapsed = (currentTime - startTime) / 1000

    if (timeElapsed < 3) {
      setErrors({ general: 'Submission too fast. Please fill the form correctly.' })
      return
    }

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    setSuccess(null)

    try {
      const response = await fetch('/api-v2/submit-form-byoc-early-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSuccess(
          "Thank you for your interest in BYOC! We'll reach out if you've been selected for early access."
        )
        setFormData(defaultFormValue)
      } else {
        const errorData = await response.json()
        setErrors({ general: `Submission failed: ${errorData.message}` })
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    setStartTime(Date.now())
  }, [])

  return (
    <div
      className={cn(
        'flex flex-col gap-4 w-full items-center justify-center min-h-[300px]',
        className
      )}
    >
      <div className="border rounded-xl bg-surface-75 p-4 md:p-6 w-full lg:max-w-lg min-h-[200px]">
        {success ? (
          <div className="flex flex-col h-full w-full min-w-[300px] gap-4 items-center justify-center opacity-0 transition-opacity animate-fade-in scale-1">
            <p className="text-center text-sm">{success}</p>
            <Button onClick={handleReset}>Submit Another</Button>
          </div>
        ) : (
          <form
            id="byoc-early-access-form"
            className={cn('flex flex-col lg:grid lg:grid-cols-2 gap-4')}
            onSubmit={handleSubmit}
          >
            {Object.entries(formConfig).map(([key, fieldValue]) => {
              const fieldKey = key as keyof FormData

              return (
                <div key={key} className={cn('flex flex-col col-span-full gap-y-2', fieldValue.className)}>
                  <Label_Shadcn_
                    htmlFor={fieldKey}
                    className="text-foreground-light flex justify-between"
                  >
                    {fieldValue.label}
                    {!fieldValue.required && (
                      <span className="text-foreground-muted text-xs">Optional</span>
                    )}
                  </Label_Shadcn_>
                  <Input_Shadcn_
                    type={fieldValue.type}
                    id={fieldKey}
                    name={fieldKey}
                    value={formData[fieldKey]}
                    onChange={handleChange}
                    placeholder={fieldValue.placeholder}
                  />
                  {errors[fieldKey] && (
                    <span className="text-xs text-destructive-600 animate-fade-in">
                      {errors[fieldKey]}
                    </span>
                  )}
                </div>
              )
            })}

            {/* Spam prevention */}
            <input
              type="text"
              name="honeypot"
              value={honeypot}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHoneypot(e.target.value)}
              style={{ display: 'none' }}
              aria-hidden="true"
            />

            <Separator className="col-span-full" />
            <Button
              block
              htmlType="submit"
              size="small"
              className="col-span-full"
              disabled={isSubmitting}
              loading={isSubmitting}
              onClick={() =>
                sendTelemetryEvent({
                  action: 'byoc_early_access_button_clicked',
                  properties: { buttonLocation: 'BYOC Early Access Form' },
                })
              }
            >
              Request Early Access
            </Button>
            <p className="text-foreground-lighter text-sm col-span-full">
              By submitting this form, I confirm that I have read and understood the{' '}
              <Link href="/privacy" className="text-foreground hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
            {errors.general && (
              <Alert className="flex gap-2 text-foreground text-sm col-span-full">
                <CircleAlert className="w-3 h-3" /> <span>{errors.general}</span>
              </Alert>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

export default BYOCEarlyAccessForm
