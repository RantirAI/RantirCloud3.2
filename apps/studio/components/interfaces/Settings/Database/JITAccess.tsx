import { UserPlus } from 'lucide-react'
import { useState } from 'react'

import { DocsButton } from 'components/ui/DocsButton'
import { DOCS_URL } from 'lib/constants'
import {
  Button,
  Card,
  CardContent,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'ui'
import {
  PageSection,
  PageSectionContent,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from 'ui-patterns'
import { FormLayout } from 'ui-patterns/form/Layout/FormLayout'

// Prototype: mock user type and initial list
type JITUser = { id: string; email: string; addedAt: string }
const MOCK_USERS: JITUser[] = [
  { id: '1', email: 'alice@example.com', addedAt: '2025-02-10' },
  { id: '2', email: 'bob@example.com', addedAt: '2025-02-12' },
]

export const JITAccess = () => {
  const [enabled, setEnabled] = useState(false)
  const [users, setUsers] = useState<JITUser[]>(MOCK_USERS)

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
              <div className="flex items-center justify-end mt-2.5">
                <Switch
                  size="large"
                  checked={enabled}
                  onCheckedChange={(checked) => setEnabled(checked)}
                />
              </div>
            </FormLayout>
          </CardContent>

          {enabled && (
            <CardContent className="space-y-4 p-0">
              <div className="flex items-center justify-between pt-6 pb-2 px-4">
                <div>
                  <h3 className="text-foreground text-sm">User rules</h3>
                  <p className="text-foreground-light text-sm">
                    Users listed below have time-limited access to the database.
                  </p>
                </div>
                <Button type="default" icon={<UserPlus size={14} />}>
                  Add user
                </Button>
              </div>
              <Table className="border-t">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Email</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-24">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-foreground-light text-sm py-8">
                        No users added yet. Add a user to allow them to request JIT access.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-sm">{user.email}</TableCell>
                        <TableCell className="text-foreground-light text-sm">
                          {user.addedAt}
                        </TableCell>
                        <TableCell>
                          <Button type="default" variant="ghost" className="text-foreground-light">
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

            </CardContent>
          )}
        </Card>
      </PageSectionContent>
    </PageSection>
  )
}
