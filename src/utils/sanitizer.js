/**
 * Security Sanitization Helper:
 * Strips authentication headers, bearer tokens, API keys, cookies,
 * and JSON request payloads (-d '{...}' / --data '...') replacing them with [REDACTED].
 */
export function sanitizeLogContent(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  
  let sanitized = rawText;

  // 1. Redact Authorization / Token Headers (Bearer, Basic, API keys)
  sanitized = sanitized.replace(/(Authorization:\s*)(Bearer\s+[A-Za-z0-9._\--]+|[^\r\n"']+)/gi, '$1[REDACTED]');
  sanitized = sanitized.replace(/(X-API-Key:\s*)[^\r\n"']+/gi, '$1[REDACTED]');
  sanitized = sanitized.replace(/(Cookie:\s*)[^\r\n"']+/gi, '$1[REDACTED]');
  sanitized = sanitized.replace(/(api[_-]?key|secret|token|password)=["']?[^"'\s&]+["']?/gi, '$1=[REDACTED]');

  // 2. Redact JSON request payloads in cURL (-d '{...}', --data '{...}', --data-raw '{...}')
  sanitized = sanitized.replace(/(-d|--data|--data-raw|--data-binary)\s+(['"])\s*\{[\s\S]*?\}\s*\2/gi, '$1 $2[REDACTED]$2');
  sanitized = sanitized.replace(/(-d|--data|--data-raw|--data-binary)\s+['"]?\{[\s\S]*?\}['"]?/gi, '$1 "[REDACTED]"');

  return sanitized;
}
