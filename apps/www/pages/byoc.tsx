import { useRouter } from 'next/router'
import { NextSeo } from 'next-seo'
import { Cloud, Server, Wallet, Wrench } from 'lucide-react'
import { cn } from 'ui'

import DefaultLayout from '~/components/Layouts/Default'
import SectionContainer from '~/components/Layouts/SectionContainer'
import BYOCEarlyAccessForm from '~/components/Forms/BYOCEarlyAccessForm'

const meta = {
  title: 'Bring Your Own Cloud (BYOC) for Supabase | Early Access',
  description:
    'Deploy Supabase in your own AWS account. Meet strict data residency and compliance requirements while Supabase handles operations, upgrades and monitoring.',
}

const valueProps = [
  {
    icon: Cloud,
    title: 'Control where your data goes',
    description:
      'Meet data residency and compliance requirements. Your data stays in your infrastructure and in your region.',
  },
  {
    icon: Server,
    title: 'Deploy the infrastructure you want',
    description:
      'Choose instance sizes and volumes for your use case. No project size constraints.',
  },
  {
    icon: Wallet,
    title: 'Leverage your cloud costs',
    description:
      'Apply pre-negotiated discounts and cloud credits to your Supabase deployment.',
  },
  {
    icon: Wrench,
    title: 'Let Supabase manage operations',
    description:
      'Supabase handles deployments, upgrades, monitoring and support. No Ops overhead.',
  },
]

const BYOCPage = () => {
  const router = useRouter()

  return (
    <>
      <NextSeo
        title={meta.title}
        description={meta.description}
        openGraph={{
          title: meta.title,
          description: meta.description,
          url: `https://supabase.com${router.pathname}`,
        }}
      />
      <DefaultLayout className="!min-h-fit">
        {/* Title + Form side by side */}
        <SectionContainer className="pt-8 md:pt-16 pb-16 md:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: Title and description only */}
            <div className="flex flex-col gap-6">
              {/* Logos above title */}
              <div className="flex items-center gap-4">
                {/* AWS Logo */}
                <svg
                  className="h-8 w-auto"
                  viewBox="0 0 256 153"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="xMidYMid"
                >
                  <path
                    d="M72.392 55.438c0 3.137.34 5.68.933 7.545a45.373 45.373 0 0 0 2.712 6.103c.424.678.593 1.356.593 1.95 0 .847-.508 1.695-1.61 2.543l-5.34 3.56c-.763.509-1.526.763-2.205.763-.847 0-1.695-.424-2.543-1.187a26.224 26.224 0 0 1-3.051-3.984c-.848-1.44-1.696-3.052-2.628-5.001-6.612 7.798-14.92 11.698-24.922 11.698-7.12 0-12.8-2.035-16.954-6.103-4.153-4.07-6.272-9.495-6.272-16.276 0-7.205 2.543-13.054 7.714-17.462 5.17-4.408 12.037-6.612 20.768-6.612 2.882 0 5.849.254 8.985.678 3.137.424 6.358 1.102 9.749 1.865V29.33c0-6.442-1.356-10.935-3.984-13.563-2.712-2.628-7.29-3.9-13.817-3.9-2.967 0-6.018.34-9.155 1.103-3.136.762-6.188 1.695-9.155 2.882-.848.339-1.78.593-2.543.763-.678.17-1.187.254-1.78.254-1.526 0-2.288-.763-2.288-2.543V9.495c0-1.271.17-2.204.593-2.797.424-.593 1.187-1.187 2.374-1.78 2.967-1.526 6.527-2.798 10.68-3.815C33.908.339 38.316 0 42.978 0c10.088 0 17.462 2.288 22.209 6.866 4.662 4.577 7.035 11.528 7.035 20.853v27.719h.17ZM37.976 68.323c2.797 0 5.68-.508 8.731-1.525 3.052-1.018 5.765-2.882 8.054-5.425 1.356-1.61 2.373-3.39 2.882-5.51.509-2.119.848-4.662.848-7.629v-3.646a70.298 70.298 0 0 0-7.799-1.441 63.567 63.567 0 0 0-7.968-.509c-5.68 0-9.833 1.102-12.63 3.391-2.798 2.289-4.154 5.51-4.154 9.749 0 3.984 1.017 6.951 3.136 8.986 2.035 2.119 5.002 3.136 8.9 3.136v-.577Zm68.069 9.155c-1.95 0-3.306-.34-4.153-1.102-.848-.678-1.61-2.119-2.204-4.069L79.174 6.613c-.594-2.035-.933-3.391-.933-4.154 0-1.61.763-2.543 2.289-2.543h8.308c2.035 0 3.475.339 4.238 1.102.848.678 1.526 2.12 2.12 4.069l14.749 58.122 13.732-58.122c.509-2.035 1.187-3.39 2.035-4.07.848-.678 2.373-1.101 4.323-1.101h6.781c2.035 0 3.475.339 4.323 1.102.848.678 1.61 2.035 2.035 4.069l13.902 58.8 15.172-58.8c.594-2.035 1.356-3.39 2.12-4.07.847-.678 2.288-1.101 4.238-1.101h7.883c1.61 0 2.458.848 2.458 2.543 0 .509-.085 1.018-.17 1.61-.085.594-.254 1.357-.593 2.29l-20.429 66.1c-.593 2.035-1.356 3.39-2.204 4.069-.848.678-2.288 1.102-4.154 1.102h-7.29c-2.034 0-3.474-.34-4.322-1.103-.848-.762-1.61-2.034-2.035-4.068l-13.647-56.581-13.563 56.496c-.508 2.035-1.186 3.391-2.034 4.07-.848.762-2.373 1.101-4.323 1.101h-7.29v.085Zm108.892 2.289c-4.408 0-8.816-.509-13.054-1.526-4.239-1.017-7.544-2.12-9.749-3.39-1.356-.763-2.289-1.611-2.628-2.374a5.983 5.983 0 0 1-.509-2.374V65.78c0-1.78.763-2.628 2.204-2.628.593 0 1.186.085 1.78.254.592.17 1.44.509 2.373.848a51.41 51.41 0 0 0 10.426 3.306c3.815.763 7.545 1.102 11.36 1.102 5.935 0 10.596-1.017 13.817-3.052 3.221-2.034 4.916-5.086 4.916-9.07 0-2.628-.848-4.832-2.543-6.612-1.695-1.78-4.916-3.39-9.494-4.916l-13.647-4.238c-6.866-2.12-11.953-5.256-15.088-9.41-3.136-4.069-4.746-8.562-4.746-13.224 0-3.815.848-7.205 2.543-10.088 1.695-2.882 3.984-5.425 6.781-7.459 2.797-2.119 5.933-3.646 9.578-4.747C218.07.678 221.97 0 226.124 0c2.034 0 4.153.085 6.188.339 2.119.254 4.069.593 6.018.933 1.865.424 3.645.848 5.34 1.356 1.695.509 3.051 1.018 4.069 1.526 1.356.678 2.373 1.356 2.967 2.12.594.678.848 1.61.848 2.797v4.916c0 1.78-.763 2.713-2.204 2.713-.763 0-1.95-.34-3.56-1.018-5.426-2.458-11.53-3.646-18.31-3.646-5.426 0-9.664.848-12.8 2.628-3.137 1.78-4.747 4.493-4.747 8.223 0 2.628.933 4.916 2.797 6.697 1.865 1.78 5.34 3.56 10.342 5.171l13.393 4.238c6.781 2.12 11.699 5.086 14.665 8.9 2.967 3.815 4.408 8.139 4.408 12.885 0 3.9-.848 7.46-2.458 10.596-1.695 3.136-3.984 5.849-6.866 8.053-2.882 2.289-6.358 3.984-10.342 5.171-4.153 1.272-8.562 1.865-13.308 1.865Z"
                    fill="#252F3E"
                    className="dark:fill-white"
                  />
                  <path
                    d="M230.993 120.964c-27.888 20.599-68.408 31.534-103.247 31.534-48.827 0-92.821-18.056-126.05-48.064-2.628-2.373-.254-5.594 2.881-3.73 35.942 20.854 80.276 33.483 126.135 33.483 30.94 0 64.932-6.442 96.212-19.666 4.662-2.12 8.646 3.052 4.069 6.443Z"
                    fill="#FF9900"
                  />
                  <path
                    d="M242.606 107.565c-3.56-4.577-23.566-2.204-32.636-1.102-2.713.339-3.136-2.034-.678-3.814 15.936-11.19 42.13-7.968 45.181-4.239 3.052 3.815-.848 30.008-15.767 42.554-2.288 1.95-4.492.933-3.475-1.61 3.39-8.393 10.935-27.296 7.375-31.789Z"
                    fill="#FF9900"
                  />
                </svg>
                <span className="text-foreground-muted">+</span>
                <div className="w-10 h-10 rounded-full bg-brand-400/10 flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-brand" strokeWidth={1.5} />
                </div>
                <span className="bg-brand-400/20 text-brand-600 text-xs font-medium px-2.5 py-1 rounded-full">
                  Early Access
                </span>
              </div>
              <div className="flex flex-col gap-4">
                <h1 className="h1 !m-0">Bring Your Own Cloud <span className="text-brand">(BYOC)</span></h1>
                <p className="text-foreground-lighter text-lg md:text-xl">
                  Deploy Supabase in your own AWS account. Meet strict data residency and compliance
                  requirements while Supabase handles operations, upgrades and monitoring.
                </p>
              </div>
            </div>

            {/* Right: Form */}
            <div>
              <div className="flex flex-col gap-4 mb-6">
                <h2 className="h3 !m-0">Request Early Access</h2>
                <p className="text-foreground-lighter text-sm">
                  If you are interested in participating in BYOC early access when it becomes
                  available later in 2026, please fill out the form below. A member of the Supabase
                  team will reach out if you've been selected.
                </p>
              </div>
              <BYOCEarlyAccessForm />
            </div>
          </div>
        </SectionContainer>

        {/* Value Props Section - separate at bottom */}
        <SectionContainer className="py-16 md:py-20 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
            {valueProps.map((prop, index) => (
              <div
                key={index}
                className={cn(
                  'flex flex-col gap-3 p-6 rounded-lg',
                  'border bg-surface-75/50 hover:bg-surface-100/50 transition-colors'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-400/10 flex items-center justify-center">
                    <prop.icon className="w-5 h-5 text-brand" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-foreground font-medium text-base">{prop.title}</h3>
                </div>
                <p className="text-foreground-lighter text-sm leading-relaxed">
                  {prop.description}
                </p>
              </div>
            ))}
          </div>
        </SectionContainer>
      </DefaultLayout>
    </>
  )
}

export default BYOCPage
