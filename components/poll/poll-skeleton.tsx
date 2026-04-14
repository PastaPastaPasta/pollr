import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'

export function PollSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {/* Avatar placeholder */}
          <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-1.5">
            {/* Name placeholder */}
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            {/* Time placeholder */}
            <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          {/* Badge placeholder */}
          <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
        {/* Question placeholder */}
        <div className="mt-3 h-6 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Option placeholders */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </CardContent>
      <CardFooter>
        <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </CardFooter>
    </Card>
  )
}
