import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Page not found · Pollr · dashhq' }

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <p>404</p>
      <h1 className="dh-page-header__title">Page not found</h1>
      <p>This address is not a page of Pollr.</p>
      <p><Link href="/">Open Pollr →</Link></p>
      <p><a href="https://dashhq.org" data-family="home">Find another tool →</a></p>
    </section>
  )
}
