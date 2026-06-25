// タブ遷移時に即座に表示される軽量スケルトン。
// 各ルートの loading.tsx から呼ばれ、ヘッダー＋数行のプレースホルダを出す。
export default function PageSkeleton({ title }: { title: string }) {
  return (
    <div className="animate-pulse">
      <div className="sticky top-0 z-10 border-b border-border/60 bg-[#FAFAF9]/80 px-4 py-3 backdrop-blur">
        <div className="h-5 w-32 rounded bg-muted" aria-hidden />
        <span className="sr-only">{title}を読み込み中</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border/50 bg-white p-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-muted" aria-hidden />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 rounded bg-muted" aria-hidden />
              <div className="h-3 w-1/3 rounded bg-muted/70" aria-hidden />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
