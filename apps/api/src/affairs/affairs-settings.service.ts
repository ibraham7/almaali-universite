import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AffairsUser } from './affairs.service.js';
import { SETTING_DEFS, SettingValue, defaultsOf, validateSetting } from './affairs-settings.defs.js';

const CACHE_MS = 10_000;

@Injectable()
export class AffairsSettingsService {
  private cache: { at: number; values: Record<string, SettingValue> } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  // Defaults overlaid with whatever an admin saved. Cached briefly so permission checks do not hit the database every time.
  async all(): Promise<Record<string, SettingValue>> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.values;
    const rows = await this.prisma.affairsSetting.findMany();
    const values = defaultsOf();
    for (const row of rows) {
      if (row.key in values && validateSetting(row.key, row.value) === null) values[row.key] = row.value as SettingValue;
    }
    this.cache = { at: Date.now(), values };
    return values;
  }

  async get<T extends SettingValue>(key: string): Promise<T> {
    return (await this.all())[key] as T;
  }

  // A system admin is never restricted; a registrar needs the switch to be on.
  async assertCapability(user: AffairsUser, key: string, message = 'هذا الإجراء غير مفعّل لدورك. راجع مدير النظام.') {
    if (user.role === 'SYSTEM_ADMIN') return;
    if (user.role === 'REGISTRAR' && (await this.get<boolean>(key))) return;
    throw new ForbiddenException(message);
  }

  async view() {
    return { definitions: SETTING_DEFS, values: await this.all() };
  }

  async update(values: Record<string, unknown>, user: AffairsUser) {
    const entries = Object.entries(values ?? {});
    if (entries.length === 0) throw new BadRequestException('لا توجد تغييرات.');
    for (const [key, value] of entries) {
      const problem = validateSetting(key, value);
      if (problem) throw new BadRequestException(problem);
    }
    const current = await this.all();
    const changes: Record<string, { from: SettingValue; to: SettingValue }> = {};
    await this.prisma.$transaction(async (tx) => {
      for (const [key, value] of entries) {
        if (current[key] === value) continue;
        changes[key] = { from: current[key], to: value as SettingValue };
        await tx.affairsSetting.upsert({ where: { key }, create: { key, value: value as never, updatedByUserId: user.id }, update: { value: value as never, updatedByUserId: user.id } });
      }
      if (Object.keys(changes).length > 0) {
        await tx.auditLog.create({ data: { action: 'AFFAIRS_SETTINGS_UPDATED', entity: 'AffairsSetting', userId: user.id, details: JSON.stringify(changes) } });
      }
    });
    this.cache = null;
    return this.view();
  }
}
