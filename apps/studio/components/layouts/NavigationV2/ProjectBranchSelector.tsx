import { ParsedUrlQuery } from 'querystring'
import { keepPreviousData } from '@tanstack/react-query'
import { useDebounce, useIntersectionObserver } from '@uidotdev/usehooks'
import {
  Check,
  ChevronsUpDown,
  GitBranch,
  ListTree,
  Plus,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useParams } from 'common'
import { Branch, useBranchesQuery } from 'data/branches/branches-query'
import { OrgProject, useOrgProjectsInfiniteQuery } from 'data/projects/org-projects-infinite-query'
import { useProjectDetailQuery } from 'data/projects/project-detail-query'
import { useIsFeatureEnabled } from 'hooks/misc/useIsFeatureEnabled'
import { useSelectedOrganizationQuery } from 'hooks/misc/useSelectedOrganization'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { IS_PLATFORM } from 'lib/constants'
import { useAppStateSnapshot } from 'state/app-state'
import {
  Badge,
  cn,
  PopoverContent_Shadcn_,
  PopoverTrigger_Shadcn_,
  Popover_Shadcn_,
  ScrollArea,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from 'ui'
import { ShimmeringLoader } from 'ui-patterns/ShimmeringLoader'

function sanitizeRoute(route: string, routerQueries: ParsedUrlQuery) {
  const queryArray = Object.entries(routerQueries)
  if (queryArray.length > 1) {
    const isStorageBucketRoute = 'bucketId' in routerQueries
    const isSecurityAdvisorRoute = 'preset' in routerQueries
    return route
      .split('/')
      .slice(0, isStorageBucketRoute || isSecurityAdvisorRoute ? 5 : 4)
      .join('/')
  }
  return route
}

export function ProjectBranchSelector() {
  const router = useRouter()
  const { ref } = useParams()
  const snap = useAppStateSnapshot()
  const { data: selectedOrganization } = useSelectedOrganizationQuery()
  const { data: project, isPending: isLoadingProject } = useSelectedProjectQuery()
  const projectCreationEnabled = useIsFeatureEnabled('projects:create')

  const isBranch = project?.parentRef !== project?.ref
  const { data: parentProject } = useProjectDetailQuery(
    { ref: project?.parent_project_ref },
    { enabled: isBranch }
  )
  const displayProject = parentProject ?? project
  const parentRef = project?.parent_project_ref || ref

  const [open, setOpen] = useState(false)

  // Branch data
  const {
    data: branches,
    isSuccess: isBranchesSuccess,
  } = useBranchesQuery({ projectRef: parentRef }, { enabled: open && Boolean(project) })

  const isBranchingEnabled = project?.is_branch_enabled === true
  const selectedBranch = branches?.find((b) => b.project_ref === ref)

  const mainBranch = branches?.find((b) => b.is_default)
  const restOfBranches = branches
    ?.filter((b) => !b.is_default)
    ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const defaultMainBranch = {
    id: 'main',
    name: 'main',
    project_ref: parentRef ?? ref ?? '',
    is_default: true,
  } as unknown as Branch

  const sortedBranches =
    branches && branches.length > 0
      ? mainBranch
        ? [mainBranch].concat(restOfBranches ?? [])
        : restOfBranches ?? []
      : [defaultMainBranch]
  const branchList = isBranchingEnabled ? sortedBranches : [defaultMainBranch]

  const branchDisplayName = isBranchingEnabled ? selectedBranch?.name ?? 'main' : 'main'

  if (isLoadingProject || !displayProject) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="px-2 py-2">
            <ShimmeringLoader className="w-full py-3" />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!IS_PLATFORM) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="gap-3">
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayProject.name}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover_Shadcn_ open={open} onOpenChange={setOpen} modal={false}>
          <PopoverTrigger_Shadcn_ asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground gap-3"
            >
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayProject.name}</span>
                <span className="text-foreground-muted flex items-center gap-1 truncate text-xs">
                  <GitBranch size={10} />
                  {branchDisplayName}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-foreground-lighter" />
            </SidebarMenuButton>
          </PopoverTrigger_Shadcn_>
          <PopoverContent_Shadcn_
            className="p-0 w-[540px]"
            side="bottom"
            align="start"
          >
            <div className="flex divide-x h-[320px]">
              <ProjectColumn
                selectedRef={ref}
                onSelect={(project) => {
                  const sanitizedRoute = sanitizeRoute(router.route, router.query)
                  const href =
                    sanitizedRoute?.replace('[ref]', project.ref) ?? `/project/${project.ref}`
                  setOpen(false)
                  router.push(href)
                }}
                onClose={() => setOpen(false)}
                organizationSlug={selectedOrganization?.slug}
                projectCreationEnabled={projectCreationEnabled}
              />
              <BranchColumn
                projectRef={ref}
                branches={branchList}
                selectedBranch={selectedBranch}
                isBranchingEnabled={isBranchingEnabled}
                isBranchesLoaded={isBranchesSuccess}
                onSelect={(branch) => {
                  const sanitizedRoute = sanitizeRoute(router.route, router.query)
                  const href =
                    sanitizedRoute?.replace('[ref]', branch.project_ref) ??
                    `/project/${branch.project_ref}`
                  setOpen(false)
                  router.push(href)
                }}
                onCreateBranch={() => {
                  setOpen(false)
                  snap.setShowCreateBranchModal(true)
                }}
                onManageBranches={() => {
                  setOpen(false)
                  router.push(`/project/${ref}/branches`)
                }}
              />
            </div>
          </PopoverContent_Shadcn_>
        </Popover_Shadcn_>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

// ─── Project column (left) ────────────────────────────────────────────────────

function ProjectColumn({
  selectedRef,
  onSelect,
  onClose,
  organizationSlug,
  projectCreationEnabled,
}: {
  selectedRef?: string
  onSelect: (project: OrgProject) => void
  onClose: () => void
  organizationSlug?: string
  projectCreationEnabled: boolean
}) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)

  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const [sentinelRef, entry] = useIntersectionObserver({
    root: scrollRootRef.current,
    threshold: 0,
    rootMargin: '0px',
  })

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
  } = useOrgProjectsInfiniteQuery(
    { slug: organizationSlug, search: search.length === 0 ? search : debouncedSearch },
    { placeholderData: keepPreviousData }
  )

  const projects = useMemo(() => data?.pages.flatMap((page) => page.projects), [data?.pages]) || []

  useEffect(() => {
    if (!isLoading && !isFetching && entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [entry?.isIntersecting, hasNextPage, isFetching, isFetchingNextPage, isLoading, fetchNextPage])

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="px-2 py-2 border-b">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find project..."
          className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground-muted outline-none"
        />
      </div>
      <ScrollArea className="flex-1" ref={scrollRootRef}>
        {isLoading ? (
          <div className="space-y-1 p-2">
            <ShimmeringLoader className="py-2" />
            <ShimmeringLoader className="py-2 w-4/5" />
          </div>
        ) : isError ? (
          <p className="text-xs text-center text-foreground-lighter py-4">
            Failed to load projects
          </p>
        ) : projects.length === 0 && search.length > 0 ? (
          <p className="text-xs text-center text-foreground-lighter py-4">No projects found</p>
        ) : (
          <>
            {projects.map((project) => {
              const isSelected = project.ref === selectedRef
              const isPaused = project.status === 'INACTIVE'

              return (
                <button
                  key={project.ref}
                  type="button"
                  onClick={() => onSelect(project)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer',
                    'hover:bg-surface-200 transition-colors',
                    isSelected && 'bg-surface-200'
                  )}
                >
                  <span className="truncate">
                    {project.name}
                    {isPaused && (
                      <Badge className="ml-2" variant="default">
                        Paused
                      </Badge>
                    )}
                  </span>
                  {isSelected && <Check size={14} className="shrink-0 ml-2" />}
                </button>
              )
            })}
            <div ref={sentinelRef} className="h-1 -mt-1" />
            {hasNextPage && (
              <div className="px-2 py-1">
                <ShimmeringLoader className="py-2" />
              </div>
            )}
          </>
        )}
      </ScrollArea>
      {projectCreationEnabled && organizationSlug && (
        <div className="border-t px-2 py-1.5">
          <Link
            href={`/new/${organizationSlug}`}
            onClick={() => onClose()}
            className="flex items-center gap-2 text-xs text-foreground-light hover:text-foreground transition-colors px-1 py-1"
          >
            <Plus size={12} strokeWidth={1.5} />
            New project
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Branch column (right) ────────────────────────────────────────────────────

function BranchColumn({
  projectRef,
  branches,
  selectedBranch,
  isBranchingEnabled,
  isBranchesLoaded,
  onSelect,
  onCreateBranch,
  onManageBranches,
}: {
  projectRef?: string
  branches: Branch[]
  selectedBranch?: Branch
  isBranchingEnabled: boolean
  isBranchesLoaded: boolean
  onSelect: (branch: Branch) => void
  onCreateBranch: () => void
  onManageBranches: () => void
}) {
  const [search, setSearch] = useState('')
  const lowerSearch = search.toLowerCase()

  const filteredBranches = branches.filter((b) => b.name.toLowerCase().includes(lowerSearch))

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="px-2 py-2 border-b">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find branch..."
          className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground-muted outline-none"
        />
      </div>
      <ScrollArea className="flex-1">
        {!isBranchesLoaded ? (
          <div className="space-y-1 p-2">
            <ShimmeringLoader className="py-2" />
            <ShimmeringLoader className="py-2 w-4/5" />
          </div>
        ) : filteredBranches.length === 0 ? (
          <p className="text-xs text-center text-foreground-lighter py-4">No branches found</p>
        ) : (
          filteredBranches.map((branch) => {
            const isSelected =
              branch.id === selectedBranch?.id || (!selectedBranch && branch.is_default)
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => onSelect(branch)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer',
                  'hover:bg-surface-200 transition-colors',
                  isSelected && 'bg-surface-200'
                )}
              >
                <span className="truncate flex items-center gap-1.5">
                  {branch.is_default && (
                    <Shield size={12} className="text-amber-900 shrink-0" />
                  )}
                  {branch.name}
                </span>
                {isSelected && <Check size={14} className="shrink-0 ml-2" />}
              </button>
            )
          })
        )}
      </ScrollArea>
      {isBranchingEnabled && (
        <div className="border-t px-2 py-1.5 space-y-0.5">
          <button
            type="button"
            onClick={onCreateBranch}
            className="flex items-center gap-2 text-xs text-foreground-light hover:text-foreground transition-colors px-1 py-1 w-full"
          >
            <Plus size={12} strokeWidth={1.5} />
            Create branch
          </button>
          <button
            type="button"
            onClick={onManageBranches}
            className="flex items-center gap-2 text-xs text-foreground-light hover:text-foreground transition-colors px-1 py-1 w-full"
          >
            <ListTree size={12} strokeWidth={1.5} />
            Manage branches
          </button>
        </div>
      )}
    </div>
  )
}
