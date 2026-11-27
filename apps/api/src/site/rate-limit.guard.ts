import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

// حد الطلبات لنقاط الموقع العامة (بلا تسجيل دخول). في الذاكرة لكل عنوان: يكفي للحماية من الإغراق، ويُصفَّر عند إعادة تشغيل الخادم.
export const RATE_LIMIT_KEY = 'site:rate-limit';
export const RateLimit = (limit: number, windowMs: number) => SetMetadata(RATE_LIMIT_KEY, { limit, windowMs });

const DEFAULT = { limit: 240, windowMs: 60_000 };

function isPrivate(address: string) {
  return /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|::ffff:(127|10|192\.168|172\.(1[6-9]|2\d|3[01]))\.)/i.test(address);
}

// عنوان صاحب الطلب: إن جاء الطلب من وكيل داخلي (nginx/proxy) نأخذ أول عنوان من X-Forwarded-For، وإلا عنوان الاتصال المباشر.
export function clientIp(request: Request) {
  const direct = request.socket?.remoteAddress ?? request.ip ?? 'unknown';
  const forwarded = request.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return isPrivate(direct) && first ? first : direct;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const rule = this.reflector.getAllAndOverride<{ limit: number; windowMs: number } | undefined>(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]) ?? DEFAULT;
    const now = Date.now();
    const key = `${context.getHandler().name}:${clientIp(request)}`;
    const recent = (this.hits.get(key) ?? []).filter((time) => now - time < rule.windowMs);
    if (recent.length >= rule.limit) throw new HttpException('طلبات كثيرة. حاول لاحقًا.', HttpStatus.TOO_MANY_REQUESTS);
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) for (const [stored, times] of this.hits) if (!times.some((time) => now - time < rule.windowMs)) this.hits.delete(stored);
    return true;
  }
}
