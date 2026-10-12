export function organizerReturnTo(value, fallback = '/library') {
  return typeof value === 'string' && /^\/(?:library|calendar)(?:\?|$)/.test(value) ? value : fallback;
}
