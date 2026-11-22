'use client'

import { useEffect, useState } from 'react'
import { useSdk } from '@/contexts/sdk-context'
import { ARCHIVE_CONTRACT, readArchivedPolls, type ArchivedPoll } from '@/lib/services/archive-service'
import { Button } from '@/components/ui/button'

export function RecordedPolls({ all }: { all: boolean }) {
  const { isReady } = useSdk()
  const [polls, setPolls] = useState<ArchivedPoll[]>([])
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [readAt, setReadAt] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!isReady) return
    let cancelled = false
    setError(false)
    void readArchivedPolls().then(rows => { if (!cancelled) { setPolls(rows); setLoaded(true); setReadAt(Date.now()) } }).catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [isReady, attempt])
  return <section aria-label="Recorded polls" className="space-y-4">
    <h2 className="dh-section__title">Recorded on Platform</h2>
    <p className="text-sm text-[var(--dh-ink-2)]">Real questions and ballots from Pollr’s original Testnet contract. This retired version is read-only here; its results are kept separate from today’s polls.</p>
    {error && <p role="status">Couldn’t read the archive. <Button variant="outline" onClick={() => setAttempt(n => n + 1)}>Try again</Button></p>}
    {!loaded && !error && <p role="status">Reading the original polls…</p>}
    {loaded && polls.length === 0 && <p>No readable polls remain in the original contract. Try the browser example above.</p>}
    {(all ? polls : polls.slice(0, 1)).map(({ poll, counts, ballots }) => <article id={`recorded-${poll.$id}`} key={poll.$id} className="dh-card space-y-3">
      <p className="text-sm text-[var(--dh-ink-2)]">Read-only archive · <time dateTime={new Date(poll.$createdAt).toISOString()}>{new Date(poll.$createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</time></p>
      <h3 className="dh-card__title"><a className="dh-link" href={`#recorded-${poll.$id}`}>{poll.question}</a></h3>
      <ul className="space-y-2">{poll.options.map((option, i) => <li key={i} className="flex justify-between gap-4 rounded-md bg-[var(--dh-sunken)] px-3 py-2"><span>{option}</span><span className="font-mono">{counts?.[i] ?? '—'}</span></li>)}</ul>
      <p className="text-sm text-[var(--dh-ink-2)]">{ballots === null ? 'Ballot totals unavailable.' : `${ballots} recorded ${ballots === 1 ? 'ballot' : 'ballots'}.`} {poll.multiChoice ? 'Multiple choices per ballot.' : 'Single choice per ballot.'}</p>
      <a className="dh-link text-sm" href={`https://explorer.dashhq.org/contract/document/?id=${ARCHIVE_CONTRACT}&type=poll&docId=${poll.$id}&network=testnet`} data-family="explorer" data-network="testnet" data-path={`/contract/document/?id=${ARCHIVE_CONTRACT}&type=poll&docId=${poll.$id}`}>Inspect source record in Explorer →</a>
      <details className="text-sm text-[var(--dh-ink-2)]"><summary className="cursor-pointer">Sources and record details</summary><p className="mt-2">Reported by Dash Platform Testnet; this browser does not verify a proof. Counts include valid selections from the original vote documents, not a measure of unique people.{readAt && <> Read {new Date(readAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC.</>}</p><dl className="dh-kv mt-2"><div><dt>Poll ID</dt><dd className="break-all">{poll.$id}</dd></div><div><dt>Contract</dt><dd className="break-all">{ARCHIVE_CONTRACT}</dd></div><div><dt>Author identity</dt><dd className="break-all">{poll.$ownerId}</dd></div></dl></details>
    </article>)}
  </section>
}
