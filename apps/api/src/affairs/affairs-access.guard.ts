import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// صلاحية دخول وحدة شؤون الطلاب لمشرف أكاديمي (ADVISOR): لا يدخلها إلا إذا أضافه مدير النظام كموظف فعّال في «الموظفون وتوزيع المهام».
// بقية الأدوار يحدّدها @Roles على المسارات (مدير النظام، المسجّل، موظف الشؤون، والطالب لمساراته).
@Injectable()
export class AffairsAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest<{ user?: { id: string; role: string } }>().user;
    if (user?.role !== 'ADVISOR') return true;
    const staff = await this.prisma.affairsStaff.findFirst({ where: { userId: user.id, isActive: true }, select: { id: true } });
    if (!staff) throw new ForbiddenException('لا تملك صلاحية الدخول إلى شؤون الطلاب. يمنحها مدير النظام بإضافتك كموظف فيها.');
    return true;
  }
}
