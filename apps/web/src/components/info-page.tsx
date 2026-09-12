export function InfoPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container-glido py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">{title}</h1>
      <div className="prose prose-sm max-w-none text-[var(--glido-ink)] space-y-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_p]:text-sm [&_p]:text-[var(--glido-muted)] [&_li]:text-sm [&_li]:text-[var(--glido-muted)] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}
