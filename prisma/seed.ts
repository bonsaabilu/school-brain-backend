import {
    PrismaClient,
    Role,
    Permission,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Permissions assigned to each role.
 */
const rolePermissions: Record<Role, Permission[]> = {
    SUPER_ADMIN: Object.values(Permission),

    ADMIN: [
        Permission.USER_READ,
        Permission.USER_UPDATE,

        Permission.TEACHER_CREATE,
        Permission.TEACHER_READ,
        Permission.TEACHER_UPDATE,

        Permission.STUDENT_CREATE,
        Permission.STUDENT_READ,
        Permission.STUDENT_UPDATE,

        Permission.PARENT_CREATE,
        Permission.PARENT_READ,
        Permission.PARENT_UPDATE,

        Permission.CLASS_CREATE,
        Permission.CLASS_READ,
        Permission.CLASS_UPDATE,

        Permission.SUBJECT_CREATE,
        Permission.SUBJECT_READ,
        Permission.SUBJECT_UPDATE,

        Permission.ATTENDANCE_CREATE,
        Permission.ATTENDANCE_READ,
        Permission.ATTENDANCE_UPDATE,
        Permission.ATTENDANCE_DELETE,

        Permission.GRADE_CREATE,
        Permission.GRADE_READ,
        Permission.GRADE_UPDATE,
        Permission.GRADE_DELETE,

        Permission.NOTE_CREATE,
        Permission.NOTE_READ,
        Permission.NOTE_UPDATE,

        Permission.REPORT_READ,
    ],

    TEACHER: [
        Permission.STUDENT_CREATE,
        Permission.STUDENT_READ,
        Permission.STUDENT_UPDATE,

        Permission.ATTENDANCE_CREATE,
        Permission.ATTENDANCE_READ,
        Permission.ATTENDANCE_UPDATE,
        Permission.ATTENDANCE_DELETE,

        Permission.GRADE_CREATE,
        Permission.GRADE_READ,
        Permission.GRADE_UPDATE,
        Permission.GRADE_DELETE,

        Permission.NOTE_CREATE,
        Permission.NOTE_READ,
        Permission.NOTE_UPDATE,

        Permission.CLASS_READ,
        Permission.SUBJECT_READ,

        Permission.REPORT_READ,
    ],

    STUDENT: [
        Permission.STUDENT_READ,
        Permission.ATTENDANCE_READ,
        Permission.GRADE_READ,
        Permission.NOTE_READ,
    ],

    PARENT: [
        Permission.STUDENT_READ,
        Permission.ATTENDANCE_READ,
        Permission.GRADE_READ,
        Permission.NOTE_READ,
    ],
};

/**
 * Seed role-permission relationships.
 */
async function seedRolePermissions() {
    for (const [role, permissions] of Object.entries(
        rolePermissions,
    )) {
        for (const permission of permissions) {
            await prisma.rolePermission.upsert({
                where: {
                    role_permission: {
                        role: role as Role,
                        permission,
                    },
                },
                update: {},
                create: {
                    role: role as Role,
                    permission,
                },
            });
        }
    }

    console.log('Role permissions seeded successfully.');
}

/**
 * Main seed function.
 */
async function main() {
    /*
     * 1. Create the default Super Admin.
     */
    const passwordHash = await bcrypt.hash(
        'SuperAdmin123!',
        12,
    );

    const superAdmin = await prisma.user.upsert({
        where: {
            email: 'superadmin@example.com',
        },
        update: {},
        create: {
            email: 'superadmin@example.com',
            passwordHash,
            firstName: 'Super',
            lastName: 'Admin',
            role: Role.SUPER_ADMIN,
            isActive: true,
        },
    });

    console.log(
        'Super Admin created:',
        superAdmin.email,
    );

    /*
     * 2. Seed permissions for every role.
     */
    await seedRolePermissions();

    console.log('Database seeding completed successfully.');
}

main()
    .catch((error) => {
        console.error('Seeding failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

