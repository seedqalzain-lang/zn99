export function TopBar({ text }: { text: string }) {
  return (
    <div className="w-full bg-[var(--color-gold)] text-[var(--color-ink)] overflow-hidden">
      <div className="whitespace-nowrap animate-marquee py-1.5 text-sm font-semibold">
        {text} &nbsp;&nbsp;•&nbsp;&nbsp; {text}
      </div>
    </div>
  );
}
