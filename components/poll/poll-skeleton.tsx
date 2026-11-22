import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'

export function PollSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {/* Avatar placeholder */}
          <div className="h-8 w-8 dh-skel rounded-full bg-[var(--dh-line)]" />
          <div className="flex-1 space-y-1.5">
            {/* Name placeholder */}
            <div className="h-4 w-24 dh-skel rounded bg-[var(--dh-line)]" />
            {/* Time placeholder */}
            <div className="h-3 w-16 dh-skel rounded bg-[var(--dh-line)]" />
          </div>
          {/* Badge placeholder */}
          <div className="h-5 w-20 dh-skel rounded-full bg-[var(--dh-line)]" />
        </div>
        {/* Question placeholder */}
        <div className="mt-3 h-6 w-3/4 dh-skel rounded bg-[var(--dh-line)]" />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Option placeholders */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 w-full dh-skel rounded-xl bg-[var(--dh-line)]"
          />
        ))}
      </CardContent>
      <CardFooter>
        <div className="h-4 w-20 dh-skel rounded bg-[var(--dh-line)]" />
      </CardFooter>
    </Card>
  )
}
