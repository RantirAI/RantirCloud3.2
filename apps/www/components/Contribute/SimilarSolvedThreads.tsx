'use client'

import { useState } from 'react'
import { Badge, Card, CardContent, CardFooter, CardHeader, cn } from 'ui'
import { ChevronDown } from 'lucide-react'
import type {
  SimilarSolvedThread,
  SimilarThreadFeedbackSubmission,
  SimilarThreadFeedbackResult,
  ThreadSource,
} from '~/types/contribute'
import { ChannelIcon } from './Icons'

function getChannelFromUrl(url: string): ThreadSource {
  const u = url.toLowerCase()
  if (u.includes('discord')) return 'discord'
  if (u.includes('reddit')) return 'reddit'
  if (u.includes('github')) return 'github'
  return 'github'
}

/**
 * Placeholder -- will be replaced with a real API call that inserts into
 * the similar_thread_feedback table
 * (parent_thread_id, similar_thread_key, reaction, feedback, created_at).
 */
export const submitSimilarThreadFeedback = async (
  submission: SimilarThreadFeedbackSubmission
): Promise<SimilarThreadFeedbackResult> => {
  console.log('[SimilarThreadFeedback] submitting:', {
    ...submission,
    created_at: new Date().toISOString(),
  })
  await new Promise((resolve) => setTimeout(resolve, 800))
  return { success: true }
}

interface SimilarSolvedThreadsProps {
  threads: SimilarSolvedThread[]
}

const SimilarThreadCard = ({
  thread,
  className,
}: {
  thread: SimilarSolvedThread
  className?: string
}) => {
  const channel = getChannelFromUrl(thread.external_activity_url || '')
  const filteredStack = thread.stack?.filter((s) => s !== 'Other') ?? []
  const hasStack = filteredStack.length > 0

  const url = thread.external_activity_url || null

  return (
    <div
      className={cn(
        'border-b border-border px-6 py-4 flex items-center gap-3 overflow-hidden',
        className
      )}
    >
      <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center bg-surface-200 h-10 w-10 rounded-md shrink-0 hover:opacity-80 transition-opacity"
            aria-label={`View thread: ${thread.subject}`}
          >
            <ChannelIcon channel={channel} />
          </a>
        ) : (
          <div className="flex items-center justify-center bg-surface-200 h-10 w-10 rounded-md shrink-0">
            <ChannelIcon channel={channel} />
          </div>
        )}
        <div className="min-w-0 flex-1 flex flex-col gap-y-0.5">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base text-foreground truncate transition-[text-decoration] duration-100 underline-offset-2 hover:underline w-fit"
            >
              {thread.subject}
            </a>
          ) : (
            <span className="text-base text-foreground truncate">{thread.subject}</span>
          )}
          {thread.problem_description ? (
            <p className="text-sm text-foreground-lighter leading-relaxed line-clamp-2">
              {thread.problem_description}
            </p>
          ) : null}
          {hasStack ? (
            <div className="flex flex-wrap gap-x-1.5 gap-y-1 overflow-hidden pt-0.5">
              {filteredStack.map((tech) => (
                <Badge key={tech} variant="default">
                  {tech}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export const SimilarSolvedThreads = ({ threads }: SimilarSolvedThreadsProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className={cn('relative')}>
      <CardHeader className={cn('p-0', !isExpanded && 'border-b-0')}>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center gap-1.5 px-[var(--card-padding-x)] py-4 text-left text-xs font-mono uppercase text-card-foreground"
        >
          Related solved threads
          <span className="text-foreground-muted tabular-nums font-normal">({threads.length})</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-foreground-lighter transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'
              }`}
          />
        </button>
      </CardHeader>
      {isExpanded && (
        <>
          <CardContent className="p-0">
            {threads.map((thread, idx) => (
              <SimilarThreadCard
                key={thread.thread_key || idx}
                thread={thread}
                className={idx === threads.length - 1 ? 'border-b-0' : undefined}
              />
            ))}
          </CardContent>
          <CardFooter>
            <p className="text-xs text-foreground-muted">Collected from community discussions</p>
          </CardFooter>
        </>
      )}
    </Card>
  )
}
