import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

const registrationRules: Record<Role, Role[]> = {
  SUPER_ADMIN: [Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT],

  ADMIN: [Role.TEACHER, Role.STUDENT],

  TEACHER: [Role.STUDENT],

  STUDENT: [],

  PARENT: [],
};

export function canRegisterRole(
  requesterRole: Role,
  requestedRole: Role,
): boolean {
  return registrationRules[requesterRole]?.includes(requestedRole) ?? false;
}

export function assertCanRegisterRole(
  requesterRole: Role,
  requestedRole: Role,
): void {
  if (!canRegisterRole(requesterRole, requestedRole)) {
    throw new ForbiddenException(
      `${requesterRole} cannot register ${requestedRole}`,
    );
  }
}
