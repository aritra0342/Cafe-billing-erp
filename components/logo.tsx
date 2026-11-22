/** Wordmark, set in condensed Anek like a shop-front sign. The mark is a kulhad (clay chai cup) seen from the side. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 24 24" className="size-6 text-accent" aria-hidden>
        <path d="M4.5 7h15l-1.9 11.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8Z" fill="currentColor" />
        <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 11.5h10" stroke="var(--bg)" strokeWidth="1.25" opacity="0.6" />
      </svg>
      <span className="text-[1.3125rem] leading-none font-[750] [font-stretch:75%]">Chai &amp; Change</span>
    </span>
  );
}
