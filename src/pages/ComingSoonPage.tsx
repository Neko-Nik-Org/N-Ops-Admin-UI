export const ComingSoonPage = ({ title }: { title: string }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
    <h1 className="text-xl font-semibold text-text">{title}</h1>
    <p className="max-w-sm text-sm text-text-muted">This section isn't built yet — it's reserved in the nav for where it'll live.</p>
  </div>
)
