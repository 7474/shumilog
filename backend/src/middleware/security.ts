/**
 * CDNキャッシュ制御ミドルウェア
 * GETかつ認証不要APIの応答にCache-Control, SWRヘッダを付与
 * Cloudflare Workers組み込みCDNで5分キャッシュ、SWR対応
 */
export const cdnCacheControl = () => {
  return async (c: Context, next: Next) => {
    await next();
    // GETかつ認証不要APIのみ対象
    if (c.req.method !== 'GET') return;
    // 認証クッキーやAuthorizationヘッダが無い場合のみ
    const hasSession = !!(c.req.header('authorization') || getCookie(c, 'session') || getCookie(c, 'session_id'));
    if (hasSession) return;
    // APIパスのみ対象
    const url = new URL(c.req.url, 'http://dummy');
    if (!url.pathname.startsWith('/api/')) return;
    // CDNキャッシュ制御
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=300, immutable');
    c.header('CDN-Cache-Control', 'public, max-age=300, stale-while-revalidate=300, immutable');
    c.header('Vary', 'Accept-Encoding, Origin, Cookie, Authorization');
  };
};
import { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';

/**
 * Security headers middleware
 * Adds security headers to all responses
 */
export const securityHeaders = () => {
  return async (c: Context, next: Next) => {
    await next();
    
    // Add security headers
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  c.header('Cross-Origin-Opener-Policy', 'same-origin');
  c.header('Cross-Origin-Embedder-Policy', 'require-corp');
    
    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Allow inline scripts for frontend
      "style-src 'self' 'unsafe-inline'",  // Allow inline styles
      "img-src 'self' data: https:",       // Allow images from self, data URLs, and HTTPS
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'"
    ].join('; ');
    
    c.header('Content-Security-Policy', csp);
    
    // HSTS for HTTPS in production
    if (c.req.header('x-forwarded-proto') === 'https' || c.req.url.startsWith('https://')) {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  };
};

/**
 * Basic CSRF protection middleware
 * For state-changing operations, validate CSRF token
 */
export const csrfProtection = () => {
  return async (c: Context, next: Next) => {
    const method = c.req.method;
    
    // Only check CSRF for state-changing operations
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      await next();
      return;
    }
    
    // Skip CSRF for auth endpoints (they use other protections)
    if (c.req.url.includes('/auth/')) {
      await next();
      return;
    }
    
    const expectedToken = getCookie(c, 'csrf_token');

    // If we have not issued a CSRF cookie yet, skip validation
    if (!expectedToken) {
      await next();
      return;
    }

    const token = c.req.header('X-CSRF-Token');

    if (!token || token !== expectedToken) {
      throw new HTTPException(403, { message: 'CSRF token missing or invalid' });
    }

    await next();
  };
};

/**
 * Generate and set CSRF token
 */
export const generateCSRFToken = (c: Context): string => {
  const token = generateRandomToken(32);
  setCookie(c, 'csrf_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 hours
  });
  return token;
};

/**
 * Request logging middleware with rate limiting info
 */
export const requestLogger = () => {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const method = c.req.method;
    const url = c.req.url;
    const userAgent = c.req.header('user-agent') || 'unknown';
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    
    console.log(`[${new Date().toISOString()}] ${method} ${url} - IP: ${ip} - UA: ${userAgent}`);
    
    await next();
    
    const duration = Date.now() - start;
    const status = c.res.status;
    
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${status} - ${duration}ms`);
  };
};

/**
 * Simple rate limiting middleware using in-memory store
 * For production, this should use Redis or Cloudflare's built-in rate limiting
 */
export const rateLimiter = (windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return async (c: Context, next: Next) => {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of requests.entries()) {
      if (now > value.resetTime) {
        requests.delete(key);
      }
    }
    
    const current = requests.get(ip);
    
    if (!current) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
    } else if (now > current.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
    } else if (current.count >= maxRequests) {
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', current.resetTime.toString());
      
      return c.json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      }, 429);
    } else {
      current.count++;
    }
    
    const requestsLeft = maxRequests - (requests.get(ip)?.count || 0);
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, requestsLeft).toString());
    c.header('X-RateLimit-Reset', (requests.get(ip)?.resetTime || now).toString());
    
    await next();
  };
};

/**
 * Generate a random token for CSRF protection
 */
function generateRandomToken(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomValues[i] % chars.length);
  }
  return result;
}