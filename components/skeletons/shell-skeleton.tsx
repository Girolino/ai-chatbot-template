export function ShellSkeleton() {
  return (
    <div className="flex h-screen w-full">
      <div className="hidden w-72 flex-shrink-0 border-r border-border bg-muted/40 md:block">
        <div className="space-y-4 p-6">
          <div className="h-6 w-24 rounded bg-muted-foreground/20" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-10 w-full rounded bg-muted-foreground/10" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="h-16 border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-full w-full max-w-3xl items-center gap-4 px-4">
            <div className="h-6 w-40 rounded bg-muted-foreground/20" />
            <div className="ml-auto flex items-center gap-2">
              <div className="h-8 w-36 rounded-full bg-muted-foreground/10" />
              <div className="h-8 w-8 rounded-full bg-muted-foreground/20" />
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="mx-auto w-full max-w-3xl px-4">
            <div className="h-32 rounded-lg border border-dashed border-muted-foreground/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
