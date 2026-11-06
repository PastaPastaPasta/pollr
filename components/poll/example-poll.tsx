'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PollOption } from './poll-option'
import { scopedKey } from '@/lib/storage-scope'

const OPTIONS = ['Saturday morning', 'Sunday afternoon']
const STORAGE_KEY = scopedKey('example-ballot-v1')

function readChoice(): number | null {
  const value = localStorage.getItem(STORAGE_KEY)
  return value === '0' || value === '1' ? Number(value) : null
}

export function ExamplePoll() {
  const [choice, setChoice] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    const sync = () => {
      try { setChoice(readChoice()) } catch { setSaved(false) }
    }
    sync()
    setReady(true)
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const vote = (index: number) => {
    if (choice !== null) return
    try {
      const existing = readChoice()
      if (existing !== null) { setChoice(existing); return }
      localStorage.setItem(STORAGE_KEY, String(index))
    } catch { setSaved(false) }
    setChoice(index)
  }

  const reset = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { setSaved(false) }
    setChoice(null)
  }

  return (
    <section className="dh-card" aria-labelledby="demo-title">
      <p className="dh-badge dh-badge--outline mb-3">Example — not on Platform</p>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 id="demo-title" className="dh-section__title">Which day works for our meetup?</h2>
          <p className="text-sm text-[var(--dh-ink-2)] my-3">Try it: choose one option to see the result. No sign-in, credits or network write.</p>
          <div className="space-y-2">
            {OPTIONS.map((text, index) => <PollOption key={text} index={index} text={text}
              voteCount={choice === index ? 1 : 0} totalVotes={choice === null ? 0 : 1}
              isSelected={choice === index} isUserPick={choice === index} showResults={choice !== null}
              disabled={!ready || choice !== null} multiChoice={false} onChange={vote} />)}
          </div>
          <p className="mt-3 text-sm" role="status">{choice === null ? 'No example vote yet. Yours will be the only vote.' : `Your example vote is recorded${saved ? ' in this browser' : ' for this visit'}. One vote; no other participants.`}</p>
          {choice !== null && <button type="button" className="dh-btn dh-btn--link mt-2" onClick={reset}>Reset browser example</button>}
        </div>
        <div className="text-sm text-[var(--dh-ink-2)] space-y-3">
          <details><summary className="cursor-pointer dh-card__title text-[var(--dh-ink)]">How real votes work</summary><div className="mt-3 space-y-3">
          <p>In a real single-choice poll, your Testnet identity signs a vote. Platform’s unique index allows one vote per identity per poll and rejects a second vote, even from another device.</p>
          <p>This example simulates one identity with browser storage. Clearing it resets the example; it cannot reset a real Platform vote. An identity is an account, not proof of a unique person.</p>
          <p>Multiple-choice polls allow one vote per identity for each option. Close times are advisory and enforced by Pollr’s interface.</p>
          </div></details>
          <Link href="/create" className="dh-btn dh-btn--secondary">Write your first poll →</Link>
        </div>
      </div>
    </section>
  )
}
