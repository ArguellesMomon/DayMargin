export default function BrandMark({ size = 31 }) {
  return <svg className="brand-mark" width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
    <rect width="512" height="512" rx="114" fill="var(--accent-fill)" />
    <path d="M162 142v228M216 156h60c79 0 111 46 111 100s-32 100-111 100h-60" stroke="var(--accent-ink)" strokeWidth="26" strokeLinecap="round" fill="none" />
    <path d="M118 198h28" stroke="var(--accent)" strokeWidth="14" strokeLinecap="round" />
  </svg>;
}
