/**
 * Service Classification Helper:
 * Distinguishes INTERNAL SERVICE from EXTERNAL API / THIRD-PARTY SERVICE
 */
export function classifyService(serviceName = '') {
  const name = serviceName.toLowerCase();

  const isExternal =
    name.includes('flipkart') ||
    name.includes('gateway') ||
    name.includes('external') ||
    name.includes('thirdparty') ||
    name.includes('cdn') ||
    name.includes('stripe') ||
    name.includes('twilio') ||
    name.includes('sendgrid') ||
    name.includes('.com') ||
    name.includes('.org') ||
    name.includes('.net') ||
    name.includes('http');

  return {
    isExternal,
    typeLabel: isExternal ? 'EXTERNAL API' : 'INTERNAL SERVICE',
    badgeStyle: isExternal
      ? 'bg-amber-950/70 text-amber-300 border-amber-800/60 ring-amber-500/20'
      : 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60 ring-cyan-500/20'
  };
}
