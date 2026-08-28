import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 sm:px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-9 rounded-md bg-primary/10 grid place-items-center animate-pulse">
              <span className="size-4 rounded bg-primary/30" />
            </span>
            <span className="h-5 w-28 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="size-9 rounded-full bg-muted animate-pulse" />
            <span className="h-9 w-20 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 sm:px-6 py-6">
        <LoadingSkeleton count={4} />
      </main>
    </div>
  );
}
