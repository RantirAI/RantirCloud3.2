import { useParams } from 'common'
import PartnerIcon from 'components/ui/PartnerIcon'
import { useOrganizationsQuery } from 'data/organizations/organizations-query'
import { useIsFeatureEnabled } from 'hooks/misc/useIsFeatureEnabled'
import { useSelectedOrganizationQuery } from 'hooks/misc/useSelectedOrganization'
import { AlertCircle, Boxes, Check, ChevronsUpDown, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import {
  Badge,
  Button,
  cn,
  Command_Shadcn_,
  CommandEmpty_Shadcn_,
  CommandGroup_Shadcn_,
  CommandInput_Shadcn_,
  CommandItem_Shadcn_,
  CommandList_Shadcn_,
  CommandSeparator_Shadcn_,
  Popover_Shadcn_,
  PopoverContent_Shadcn_,
  PopoverTrigger_Shadcn_,
  ScrollArea,
} from 'ui'
import { ShimmeringLoader } from 'ui-patterns/ShimmeringLoader'

interface OrganizationDropdownProps {
  /** When true, render only the command list (no link/trigger). For use inside sheet or popover. */
  embedded?: boolean
  /** Applied to the root when embedded. Use e.g. "bg-transparent" to inherit sheet background. */
  className?: string
  /** When embedded, called when selection should close the parent (e.g. sheet). */
  onClose?: () => void
}

export const OrganizationDropdown = ({
  embedded = false,
  className,
  onClose,
}: OrganizationDropdownProps = {}) => {
  const router = useRouter()
  const { slug: routeSlug } = useParams()
  const { data: selectedOrganization } = useSelectedOrganizationQuery()
  const {
    data: organizations,
    isPending: isLoadingOrganizations,
    isError,
  } = useOrganizationsQuery()

  const organizationCreationEnabled = useIsFeatureEnabled('organizations:create')

  const slug = selectedOrganization?.slug
  const orgName = selectedOrganization?.name

  const [open, setOpen] = useState(false)
  const close = embedded ? onClose ?? (() => {}) : () => setOpen(false)

  if (isLoadingOrganizations && !embedded) {
    return <ShimmeringLoader className="w-[90px]" />
  }

  if (isError) {
    return (
      <div className="flex items-center space-x-2 text-amber-900">
        <AlertCircle strokeWidth={1.5} />
        <p className="text-sm">Failed to load organizations</p>
      </div>
    )
  }

  const commandContent = (
    <Command_Shadcn_
      className={cn(className, embedded && 'flex flex-col flex-1 min-h-0 overflow-hidden')}
    >
      <CommandInput_Shadcn_
        placeholder="Find organization..."
        wrapperClassName={embedded ? 'shrink-0' : undefined}
      />
      <CommandList_Shadcn_
        className={embedded ? 'flex-1 min-h-0 overflow-y-auto !max-h-none' : undefined}
      >
        <CommandEmpty_Shadcn_>No organizations found</CommandEmpty_Shadcn_>
        <CommandGroup_Shadcn_ className={embedded ? 'min-h-0' : undefined}>
          {embedded ? (
            <>
              {organizations?.map((org) => {
                const href = !!routeSlug
                  ? router.pathname.replace('[slug]', org.slug)
                  : `/org/${org.slug}`

                return (
                  <CommandItem_Shadcn_
                    key={org.slug}
                    value={`${org.name.replaceAll('"', '')} - ${org.slug}`}
                    className="cursor-pointer w-full"
                    onSelect={() => {
                      close()
                      router.push(href)
                    }}
                    onClick={() => close()}
                  >
                    <Link href={href} className="w-full flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{org.name}</span>
                        <PartnerIcon organization={org} />
                      </div>
                      {org.slug === slug && <Check size={16} />}
                    </Link>
                  </CommandItem_Shadcn_>
                )
              })}
            </>
          ) : (
            <ScrollArea className={(organizations || []).length > 7 ? 'h-[210px]' : ''}>
            {organizations?.map((org) => {
              const href = !!routeSlug
                ? router.pathname.replace('[slug]', org.slug)
                : `/org/${org.slug}`

              return (
                <CommandItem_Shadcn_
                  key={org.slug}
                  value={`${org.name.replaceAll('"', '')} - ${org.slug}`}
                  className="cursor-pointer w-full"
                  onSelect={() => {
                    close()
                    router.push(href)
                  }}
                  onClick={() => close()}
                >
                  <Link href={href} className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{org.name}</span>
                      <PartnerIcon organization={org} />
                    </div>
                    {org.slug === slug && <Check size={16} />}
                  </Link>
                </CommandItem_Shadcn_>
              )
            })}
          </ScrollArea>
          )}
        </CommandGroup_Shadcn_>
        <CommandSeparator_Shadcn_ className={embedded ? 'shrink-0' : undefined} />
        <CommandGroup_Shadcn_>
          <CommandItem_Shadcn_
            className="cursor-pointer w-full"
            onSelect={() => {
              close()
              router.push(`/organizations`)
            }}
            onClick={() => close()}
          >
            <Link href="/organizations" className="flex items-center gap-2 w-full">
              <p>All Organizations</p>
            </Link>
          </CommandItem_Shadcn_>
        </CommandGroup_Shadcn_>
        {organizationCreationEnabled && (
          <>
            <CommandSeparator_Shadcn_ />
            <CommandGroup_Shadcn_>
              <CommandItem_Shadcn_
                className="cursor-pointer w-full"
                onSelect={() => {
                  close()
                  router.push(`/new`)
                }}
                onClick={() => close()}
              >
                <Link href="/new" className="flex items-center gap-2 w-full">
                  <Plus size={14} strokeWidth={1.5} />
                  <p>New organization</p>
                </Link>
              </CommandItem_Shadcn_>
            </CommandGroup_Shadcn_>
          </>
        )}
      </CommandList_Shadcn_>
    </Command_Shadcn_>
  )

  if (embedded) {
    return isLoadingOrganizations ? (
      <div className="space-y-1 p-2">
        <ShimmeringLoader className="py-2" />
        <ShimmeringLoader className="py-2 w-4/5" />
      </div>
    ) : (
      commandContent
    )
  }

  return (
    <>
      <Link
        href={slug ? `/org/${slug}` : '/organizations'}
        className="flex items-center gap-2 flex-shrink-0 text-sm"
      >
        <Boxes size={14} strokeWidth={1.5} className="text-foreground-lighter" />
        <span
          className={cn(
            'max-w-32 lg:max-w-none truncate hidden md:block',
            !!selectedOrganization ? 'text-foreground' : 'text-foreground-lighter'
          )}
        >
          {orgName ?? 'Select an organization'}
        </span>
        {!!selectedOrganization && (
          <Badge variant="default">{selectedOrganization?.plan.name}</Badge>
        )}
      </Link>
      <Popover_Shadcn_ open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger_Shadcn_ asChild>
          <Button
            type="text"
            className={cn('px-1.5 py-4 [&_svg]:w-5 [&_svg]:h-5 ml-1')}
            iconRight={<ChevronsUpDown strokeWidth={1.5} />}
          />
        </PopoverTrigger_Shadcn_>
        <PopoverContent_Shadcn_ className="p-0" side="bottom" align="start">
          {commandContent}
        </PopoverContent_Shadcn_>
      </Popover_Shadcn_>
    </>
  )
}
