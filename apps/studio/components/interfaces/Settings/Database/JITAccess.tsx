import { useParams } from 'common'
import { DatePicker } from 'components/ui/DatePicker'
import { DocsButton } from 'components/ui/DocsButton'
import { InlineLink } from 'components/ui/InlineLink'
import { DOCS_URL } from 'lib/constants'
import { Calendar, EllipsisVertical, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox_Shadcn_,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input_Shadcn_,
  ScrollArea,
  Select_Shadcn_,
  SelectContent_Shadcn_,
  SelectItem_Shadcn_,
  SelectTrigger_Shadcn_,
  SelectValue_Shadcn_,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'ui'
import {
  PageSection,
  PageSectionContent,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from 'ui-patterns'
import { Admonition } from 'ui-patterns/admonition'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import { FormLayout } from 'ui-patterns/form/Layout/FormLayout'

type JitStatus = {
  active: number
  expired: number
  activeIp: number
  expiredIp: number
}

type JITMember = { id: string; email: string; name?: string }

type JITRoleOption = {
  id: string
  label: string
  description?: string
}

type JITRoleGrantDraft = {
  roleId: string
  enabled: boolean
  expiryMode: '1h' | '1d' | '7d' | '30d' | 'custom' | 'never'
  hasExpiry: boolean
  expiry: string
  hasIpRestriction: boolean
  ipRanges: string
}

type JITUserRuleDraft = {
  memberId: string
  grants: JITRoleGrantDraft[]
}

type JITUserRule = {
  id: string
  memberId: string
  email: string
  name?: string
  grants: JITRoleGrantDraft[]
  status: JitStatus
}

type SheetMode = 'add' | 'edit'

const AVAILABLE_ROLES: JITRoleOption[] = [
  {
    id: 'supabase_read_only_user',
    label: 'supabase_read_only_user',
    description: 'Read-only access to all schemas',
  },
  {
    id: 'postgres',
    label: 'postgres',
    description: 'Full database superuser access',
  },
  {
    id: 'custom_role_a',
    label: 'custom_role_a',
  },
  {
    id: 'custom_role_b',
    label: 'custom_role_b',
  },
  {
    id: 'custom_role_c',
    label: 'custom_role_c',
  },
]

const MOCK_MEMBERS: JITMember[] = [
  { id: 'member-1', name: 'Alice', email: 'alice@example.com' },
  { id: 'member-2', name: 'Bob', email: 'bob@example.com' },
  { id: 'member-3', name: 'Carol', email: 'carol@example.com' },
  { id: 'member-4', name: 'Dave', email: 'dave@example.com' },
  { id: 'member-5', name: 'Eve', email: 'eve@example.com' },
  { id: 'member-6', name: 'Frank', email: 'frank@example.com' },
]

// Prototype: mock Postgres version
const isPostgresVersionOutdated = false

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toDatetimeLocalValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function relativeDatetimeLocal(hoursDelta: number) {
  const date = new Date()
  date.setHours(date.getHours() + hoursDelta)
  return toDatetimeLocalValue(date)
}

function getRelativeDatetimeByMode(mode: JITRoleGrantDraft['expiryMode']) {
  if (mode === '1h') return relativeDatetimeLocal(1)
  if (mode === '1d') return relativeDatetimeLocal(24)
  if (mode === '7d') return relativeDatetimeLocal(24 * 7)
  if (mode === '30d') return relativeDatetimeLocal(24 * 30)
  return ''
}

function inferExpiryMode(grant: JITRoleGrantDraft): JITRoleGrantDraft['expiryMode'] {
  if (!grant.hasExpiry) return 'never'
  return 'custom'
}

function createEmptyGrant(roleId: string): JITRoleGrantDraft {
  return {
    roleId,
    enabled: false,
    expiryMode: '30d',
    hasExpiry: false,
    expiry: '',
    hasIpRestriction: false,
    ipRanges: '',
  }
}

function createEmptyGrants(): JITRoleGrantDraft[] {
  return AVAILABLE_ROLES.map((role) => createEmptyGrant(role.id))
}

function cloneGrants(grants: JITRoleGrantDraft[]) {
  return grants.map((grant) => ({ ...grant }))
}

function createDraft(): JITUserRuleDraft {
  return { memberId: '', grants: createEmptyGrants() }
}

function withGrantOverrides(
  overrides: Array<Partial<JITRoleGrantDraft> & { roleId: string }>
): JITRoleGrantDraft[] {
  const byRoleId = new Map(overrides.map((override) => [override.roleId, override]))

  return AVAILABLE_ROLES.map((role) => ({
    ...createEmptyGrant(role.id),
    ...(byRoleId.get(role.id) ?? {}),
    roleId: role.id,
  }))
}

function computeStatusFromGrants(grants: JITRoleGrantDraft[]): JitStatus {
  const enabled = grants.filter((grant) => grant.enabled)
  let active = 0
  let expired = 0
  let activeIp = 0
  let expiredIp = 0

  enabled.forEach((grant) => {
    const hasIp = grant.hasIpRestriction && grant.ipRanges.trim().length > 0
    if (!grant.hasExpiry || !grant.expiry) {
      active += 1
      if (hasIp) activeIp += 1
      return
    }
    const expiryMs = new Date(grant.expiry).getTime()
    if (Number.isNaN(expiryMs) || expiryMs >= Date.now()) {
      active += 1
      if (hasIp) activeIp += 1
    } else {
      expired += 1
      if (hasIp) expiredIp += 1
    }
  })

  return { active, expired, activeIp, expiredIp }
}

type JitStatusBadge = { label: string; variant: 'default' | 'success' | 'warning' }

function getJitStatusDisplay(status: JitStatus): { badges: JitStatusBadge[] } {
  const { active, expired, activeIp } = status
  const badges: JitStatusBadge[] = []

  if (active > 0) {
    const label = activeIp > 0 ? `${active} active · ${activeIp} IP` : `${active} active`
    badges.push({ label, variant: 'success' })
  }
  if (expired > 0) {
    badges.push({ label: `${expired} expired`, variant: 'default' })
  }
  // 0 active + 0 expired is defensive only (e.g. role deleted elsewhere); don't show a badge
  return { badges }
}

function createRuleFromMember(
  id: string,
  memberId: string,
  grants: JITRoleGrantDraft[],
  members: JITMember[]
): JITUserRule {
  const member = members.find((m) => m.id === memberId)
  const nextGrants = cloneGrants(grants)

  return {
    id,
    memberId,
    email: member?.email ?? 'unknown@example.com',
    name: member?.name,
    grants: nextGrants,
    status: computeStatusFromGrants(nextGrants),
  }
}

function draftFromRule(rule: JITUserRule): JITUserRuleDraft {
  const byRoleId = new Map(rule.grants.map((grant) => [grant.roleId, grant]))
  return {
    memberId: rule.memberId,
    grants: AVAILABLE_ROLES.map((role) => {
      const nextGrant = {
        ...createEmptyGrant(role.id),
        ...(byRoleId.get(role.id) ?? {}),
      }
      return {
        ...nextGrant,
        expiryMode: inferExpiryMode(nextGrant),
      }
    }),
  }
}

const MOCK_USERS: JITUserRule[] = [
  createRuleFromMember(
    'rule-1',
    'member-1',
    withGrantOverrides([
      {
        roleId: 'supabase_read_only_user',
        enabled: true,
        expiryMode: '30d',
        hasIpRestriction: true,
        ipRanges: '192.0.2.0/24',
      },
      {
        roleId: 'postgres',
        enabled: true,
        hasExpiry: true,
        expiryMode: 'custom',
        expiry: relativeDatetimeLocal(-12),
      },
    ]),
    MOCK_MEMBERS
  ),
  createRuleFromMember(
    'rule-2',
    'member-2',
    withGrantOverrides([
      {
        roleId: 'supabase_read_only_user',
        enabled: true,
        hasExpiry: true,
        expiryMode: 'custom',
        expiry: relativeDatetimeLocal(-4),
      },
    ]),
    MOCK_MEMBERS
  ),
  createRuleFromMember(
    'rule-3',
    'member-3',
    withGrantOverrides([
      {
        roleId: 'postgres',
        enabled: true,
        expiryMode: '30d',
        hasIpRestriction: true,
        ipRanges: '203.0.113.0/24',
      },
    ]),
    MOCK_MEMBERS
  ),
  createRuleFromMember(
    'rule-4',
    'member-4',
    withGrantOverrides([
      {
        roleId: 'custom_role_b',
        enabled: true,
        expiryMode: '30d',
        hasIpRestriction: true,
        ipRanges: '198.51.100.0/24',
      },
      {
        roleId: 'postgres',
        enabled: true,
        hasExpiry: true,
        expiryMode: 'custom',
        expiry: relativeDatetimeLocal(6),
      },
    ]),
    MOCK_MEMBERS
  ),
  createRuleFromMember('rule-5', 'member-5', createEmptyGrants(), MOCK_MEMBERS),
]

function RoleRuleEditor({
  role,
  grant,
  onChange,
}: {
  role: JITRoleOption
  grant: JITRoleGrantDraft
  onChange: (next: JITRoleGrantDraft) => void
}) {
  const isSuperuserRole = role.id === 'postgres'
  const showIpEditor = grant.hasIpRestriction || grant.ipRanges.trim().length > 0

  return (
    <div className={`px-4 py-3 ${grant.enabled ? 'bg-surface-100' : 'bg-background'}`}>
      <div className="flex items-start gap-3">
        <Checkbox_Shadcn_
          checked={grant.enabled}
          onCheckedChange={(value) => onChange({ ...grant, enabled: value === true })}
          aria-label={`Enable ${role.label}`}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono text-foreground-light bg-surface-200">
            {role.label}
          </div>
          {role.description && (
            <p className="text-xs text-foreground-lighter mt-1 leading-normal">
              {role.description}
            </p>
          )}
        </div>
      </div>

      {grant.enabled && (
        <div className="space-y-4 pl-7 pt-3">
          {isSuperuserRole && (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-4">
              <p className="text-sm font-medium text-foreground">
                Superuser access grants full database control
              </p>
              <p className="text-sm text-foreground-light mt-1 leading-relaxed">
                <code className="text-code-inline">postgres</code> has full administrative access
                and bypasses row-level security. Even temporary access can modify or delete any
                data. Consider using a custom Postgres role with only the permissions required.
              </p>
              <div className="mt-3">
                <Button type="default" size="tiny" asChild>
                  <Link href={`${DOCS_URL}/guides/platform/jit-access`} target="_blank">
                    Learn more
                  </Link>
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-foreground">Expires in</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select_Shadcn_
                  value={grant.expiryMode}
                  onValueChange={(value) => {
                    const nextMode = value as JITRoleGrantDraft['expiryMode']

                    if (nextMode === 'never') {
                      onChange({
                        ...grant,
                        expiryMode: nextMode,
                        hasExpiry: false,
                        expiry: '',
                      })
                      return
                    }

                    if (nextMode === 'custom') {
                      onChange({
                        ...grant,
                        expiryMode: nextMode,
                        hasExpiry: true,
                        expiry: grant.expiry || relativeDatetimeLocal(24),
                      })
                      return
                    }

                    onChange({
                      ...grant,
                      expiryMode: nextMode,
                      hasExpiry: true,
                      expiry: getRelativeDatetimeByMode(nextMode),
                    })
                  }}
                >
                  <SelectTrigger_Shadcn_>
                    <SelectValue_Shadcn_ placeholder="Expires in" />
                  </SelectTrigger_Shadcn_>
                  <SelectContent_Shadcn_>
                    <SelectItem_Shadcn_ value="1h">1 hour</SelectItem_Shadcn_>
                    <SelectItem_Shadcn_ value="1d">1 day</SelectItem_Shadcn_>
                    <SelectItem_Shadcn_ value="7d">7 days</SelectItem_Shadcn_>
                    <SelectItem_Shadcn_ value="30d">30 days</SelectItem_Shadcn_>
                    <SelectItem_Shadcn_ value="custom">Custom</SelectItem_Shadcn_>
                    <SelectItem_Shadcn_ value="never">No expiry</SelectItem_Shadcn_>
                  </SelectContent_Shadcn_>
                </Select_Shadcn_>
              </div>

              {grant.expiryMode === 'custom' && (
                <DatePicker
                  selectsRange={false}
                  triggerButtonSize="small"
                  contentSide="top"
                  minDate={new Date()}
                  onChange={(date) => {
                    const selectedDate = date.to || date.from
                    onChange({
                      ...grant,
                      hasExpiry: true,
                      expiry: selectedDate ? toDatetimeLocalValue(new Date(selectedDate)) : '',
                    })
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Calendar size={14} />
                    Select date
                  </span>
                </DatePicker>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-foreground">
              Restricted IP addresses{' '}
              <span className="text-foreground-lighter font-normal">(optional)</span>
            </p>

            {showIpEditor ? (
              <div className="flex gap-2">
                <Input_Shadcn_
                  className="flex-1"
                  value={grant.ipRanges}
                  onChange={(event) =>
                    onChange({
                      ...grant,
                      hasIpRestriction: event.target.value.trim().length > 0,
                      ipRanges: event.target.value,
                    })
                  }
                  placeholder="e.g 192.168.0.0/24"
                />
                <Button
                  type="default"
                  icon={<Plus size={14} />}
                  onClick={() =>
                    onChange({
                      ...grant,
                      hasIpRestriction: true,
                      ipRanges:
                        grant.ipRanges.trim().length === 0 || grant.ipRanges.trim().endsWith(',')
                          ? grant.ipRanges
                          : `${grant.ipRanges}, `,
                    })
                  }
                >
                  Add another
                </Button>
              </div>
            ) : (
              <div className="rounded border bg-background/80 p-4 flex justify-center">
                <Button
                  type="default"
                  icon={<Plus size={14} />}
                  onClick={() => onChange({ ...grant, hasIpRestriction: true })}
                >
                  Add IP range
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const JITAccess = () => {
  const { ref: projectRef } = useParams()

  const [enabled, setEnabled] = useState(false)
  const [users, setUsers] = useState<JITUserRule[]>(MOCK_USERS)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<SheetMode>('add')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [draft, setDraft] = useState<JITUserRuleDraft>(() => createDraft())

  const enabledRoleCount = useMemo(
    () => draft.grants.filter((grant) => grant.enabled).length,
    [draft.grants]
  )
  const canSave = Boolean(draft.memberId) && enabledRoleCount > 0

  const closeSheet = () => {
    setSheetOpen(false)
  }

  const openAddUserSheet = () => {
    setSheetMode('add')
    setEditingUserId(null)
    setDraft(createDraft())
    setSheetOpen(true)
  }

  const openEditUserSheet = (user: JITUserRule) => {
    setSheetMode('edit')
    setEditingUserId(user.id)
    setDraft(draftFromRule(user))
    setSheetOpen(true)
  }

  const updateGrant = (
    roleId: string,
    updater: (grant: JITRoleGrantDraft) => JITRoleGrantDraft
  ) => {
    setDraft((prev) => ({
      ...prev,
      grants: prev.grants.map((grant) => (grant.roleId === roleId ? updater(grant) : grant)),
    }))
  }

  const handleSave = () => {
    if (!canSave) return

    const ruleId = sheetMode === 'edit' && editingUserId ? editingUserId : `rule-${Date.now()}`
    const nextRule = createRuleFromMember(ruleId, draft.memberId, draft.grants, MOCK_MEMBERS)

    setUsers((prev) => {
      if (sheetMode === 'edit' && editingUserId) {
        return prev.map((user) => (user.id === editingUserId ? nextRule : user))
      }
      return [...prev, nextRule]
    })

    closeSheet()
  }

  return (
    <PageSection id="jit-access">
      <PageSectionMeta>
        <PageSectionSummary>
          <PageSectionTitle>Just-in-Time (JIT)</PageSectionTitle>
        </PageSectionSummary>
        <DocsButton href={`${DOCS_URL}/guides/platform/jit-access`} />
      </PageSectionMeta>
      <PageSectionContent>
        <Card>
          <CardContent className="space-y-4">
            <FormLayout
              layout="flex-row-reverse"
              label="JIT access"
              description="Allow time-limited database access to specific project members."
            >
              <div className="flex items-center justify-end w-fit flex-shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Switch
                        size="large"
                        checked={enabled}
                        onCheckedChange={(checked) => setEnabled(checked)}
                        disabled={isPostgresVersionOutdated}
                      />
                    </div>
                  </TooltipTrigger>
                  {isPostgresVersionOutdated && (
                    <TooltipContent side="bottom">Upgrade Postgres to use JIT</TooltipContent>
                  )}
                </Tooltip>
              </div>
            </FormLayout>
          </CardContent>

          {!enabled && !users?.length && isPostgresVersionOutdated && (
            <Admonition
              type="note"
              layout="horizontal"
              title="Postgres upgrade required"
              description="Just-in-time access requires a newer Postgres version. Upgrade your project to enable JIT."
              className="mb-0 rounded-none border-0"
              actions={
                projectRef ? (
                  <Button type="default" asChild>
                    <Link href={`/project/${projectRef}/settings/infrastructure`}>
                      Upgrade Postgres
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          )}

          {enabled && (
            <CardContent className="space-y-4 p-0">
              <div className="flex items-center justify-between pt-6 pb-2 px-4">
                <div>
                  <h3 className="text-foreground text-sm">User rules</h3>
                  <p className="text-foreground-light text-sm">
                    Define which members can receive temporary database access.
                  </p>
                </div>
                <Button type="default" icon={<UserPlus size={14} />} onClick={openAddUserSheet}>
                  Add user
                </Button>
              </div>
              <Table className="border-t">
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-1">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow className="[&>td]:hover:bg-inherit">
                      <TableCell colSpan={4}>
                        <p className="text-sm text-foreground">No users yet</p>
                        <p className="text-sm text-foreground-lighter">
                          Add a user above to allow JIT access.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => {
                      const statusDisplay = getJitStatusDisplay(user.status)
                      const enabledGrants = user.grants.filter((grant) => grant.enabled)

                      return (
                        <TableRow
                          key={user.id}
                          className="relative cursor-pointer inset-focus"
                          onClick={(event) => {
                            if ((event.target as HTMLElement).closest('button')) return
                            openEditUserSheet(user)
                          }}
                          onKeyDown={(event) => {
                            if ((event.target as HTMLElement).closest('button')) return
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              openEditUserSheet(user)
                            }
                          }}
                          tabIndex={0}
                        >
                          <TableCell className="text-sm">
                            {user.name && <p>{user.name}</p>}
                            <p className="text-foreground-lighter">{user.email}</p>
                          </TableCell>
                          <TableCell className="text-foreground-light text-sm">
                            {enabledGrants.length} role{enabledGrants.length === 1 ? '' : 's'}
                          </TableCell>
                          <TableCell className="text-foreground-light text-sm">
                            {statusDisplay.badges.length > 0 ? (
                              <span className="flex flex-wrap gap-1.5">
                                {statusDisplay.badges.map((badge) => (
                                  <Badge key={badge.label} variant={badge.variant}>
                                    {badge.label}
                                  </Badge>
                                ))}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  icon={<EllipsisVertical />}
                                  aria-label="More actions"
                                  type="default"
                                  size="tiny"
                                  className="w-7"
                                />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" side="bottom" className="w-40">
                                <DropdownMenuItem
                                  className="gap-x-2"
                                  onClick={() => openEditUserSheet(user)}
                                >
                                  <Pencil size={14} className="text-foreground-lighter" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-x-2" onClick={() => { }}>
                                  <Trash2 size={14} className="text-foreground-lighter" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>

        <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeSheet()}>
          <SheetContent size="default" className="!min-w-[560px] flex flex-col h-full gap-0">
            <SheetHeader>
              <SheetTitle>
                {sheetMode === 'edit' ? 'Edit JIT access' : 'Grant JIT access'}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Configure user role grants and restrictions for JIT database access.
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 max-h-[calc(100vh-116px)]">
              <div className="px-5 sm:px-6 py-6 space-y-8">
                <FormItemLayout layout="vertical" isReactForm={false} label="User">
                  <Select_Shadcn_
                    value={draft.memberId}
                    onValueChange={(value) => setDraft((prev) => ({ ...prev, memberId: value }))}
                  >
                    <SelectTrigger_Shadcn_>
                      <SelectValue_Shadcn_ placeholder="Select a member" />
                    </SelectTrigger_Shadcn_>
                    <SelectContent_Shadcn_>
                      {MOCK_MEMBERS.map((member) => (
                        <SelectItem_Shadcn_ key={member.id} value={member.id}>
                          {member.name ? `${member.name} (${member.email})` : member.email}
                        </SelectItem_Shadcn_>
                      ))}
                    </SelectContent_Shadcn_>
                  </Select_Shadcn_>
                </FormItemLayout>

                <FormItemLayout layout="vertical" isReactForm={false} label="Roles and settings">
                  <div className="rounded-md border overflow-hidden">
                    {AVAILABLE_ROLES.map((role, index) => {
                      const grant =
                        draft.grants.find((draftGrant) => draftGrant.roleId === role.id) ??
                        createEmptyGrant(role.id)

                      return (
                        <div key={role.id} className={index > 0 ? 'border-t' : ''}>
                          <RoleRuleEditor
                            role={role}
                            grant={grant}
                            onChange={(next) => updateGrant(role.id, () => next)}
                          />
                        </div>
                      )
                    })}
                  </div>

                  <p className="text-xs text-foreground-lighter mt-2 leading-normal">
                    Use custom{' '}
                    <InlineLink href={`${DOCS_URL}/guides/database/postgres/roles`}>
                      Postgres roles
                    </InlineLink>{' '}
                    to enforce least-privilege access when enabling JIT.
                  </p>
                </FormItemLayout>
              </div>
            </ScrollArea>

            <SheetFooter className="!justify-between w-full mt-auto py-4 border-t">
              <Button type="default" onClick={closeSheet}>
                Cancel
              </Button>
              <Button type="primary" onClick={handleSave} disabled={!canSave}>
                {sheetMode === 'edit' ? 'Update access' : 'Grant access'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </PageSectionContent>
    </PageSection>
  )
}
