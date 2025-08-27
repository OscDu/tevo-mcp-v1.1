import * as crypto from 'crypto';

export interface SignatureParams {
  method: string;
  host: string;
  path: string;
  query?: Record<string, string | number | boolean> | undefined;
  body?: string | undefined;
  secret: string;
}

export function generateXSignature(params: SignatureParams): string {
  const { method, host, path, query, body, secret } = params;
  
  const canonicalString = buildCanonicalString(method, host, path, query, body);
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(canonicalString);
  const signature = hmac.digest('base64');
  
  return signature;
}

export function buildCanonicalString(
  method: string,
  host: string,
  path: string,
  query?: Record<string, string | number | boolean> | undefined,
  body?: string | undefined
): string {
  let canonicalString = `${method.toUpperCase()} ${host}${path}`;
  
  if (method.toUpperCase() === 'GET' || !body) {
    canonicalString += '?';
    
    if (query && Object.keys(query).length > 0) {
      const sortedParams = Object.keys(query)
        .sort()
        .map(key => `${key}=${String(query[key])}`)
        .join('&');
      canonicalString += sortedParams;
    }
  } else {
    canonicalString += `?${body}`;
  }
  
  return canonicalString;
}

export function validateSignatureParams(params: SignatureParams): void {
  if (!params.method) {
    throw new Error('Method is required for signature generation');
  }
  if (!params.host) {
    throw new Error('Host is required for signature generation');
  }
  if (!params.path) {
    throw new Error('Path is required for signature generation');
  }
  if (!params.secret) {
    throw new Error('Secret is required for signature generation');
  }
}