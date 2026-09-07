import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Testing Class Subjects...');

  // Create Subject
  const subject = await prisma.subject.create({
    data: {
      name: 'Mathematics',
      code: 'MATH101',
    }
  });
  console.log('Created Subject:', subject);

  // Create Classes
  const classA = await prisma.class.create({
    data: {
      name: 'Grade 10-A',
      academicYear: '2023-2024'
    }
  });
  const classB = await prisma.class.create({
    data: {
      name: 'Grade 10-B',
      academicYear: '2023-2024'
    }
  });

  // Create Teachers
  const user1 = await prisma.user.create({
    data: { email: 'abebe@test.com', passwordHash: '123', firstName: 'Abebe', lastName: 'A', role: 'TEACHER' }
  });
  const teacherA = await prisma.teacher.create({
    data: { userId: user1.id, firstName: 'Abebe', lastName: 'A' }
  });

  const user2 = await prisma.user.create({
    data: { email: 'hana@test.com', passwordHash: '123', firstName: 'Hana', lastName: 'H', role: 'TEACHER' }
  });
  const teacherB = await prisma.teacher.create({
    data: { userId: user2.id, firstName: 'Hana', lastName: 'H' }
  });

  // 9. Test assigning same subject to multiple classes
  const cs1 = await prisma.classSubject.create({
    data: {
      classId: classA.id,
      subjectId: subject.id,
      teacherId: teacherA.id,
    }
  });
  console.log('Assigned Math to 10-A with teacher Abebe');

  const cs2 = await prisma.classSubject.create({
    data: {
      classId: classB.id,
      subjectId: subject.id,
      teacherId: teacherB.id, // 10. Different teachers to same subject
    }
  });
  console.log('Assigned Math to 10-B with teacher Hana');

  // Verify
  const results = await prisma.classSubject.findMany({
    where: { subjectId: subject.id },
    include: { class: true, teacher: true }
  });

  console.log('Final Assignments:', results.map(r => ({
    class: r.class.name,
    subject: 'Mathematics',
    teacher: r.teacher?.firstName
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
