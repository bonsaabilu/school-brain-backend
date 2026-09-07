/*
  Warnings:

  - You are about to drop the column `subjectId` on the `Attendance` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentId,classSubjectId,date]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `classSubjectId` to the `Attendance` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_subjectId_fkey";

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "subjectId",
ADD COLUMN     "classSubjectId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_classSubjectId_date_key" ON "Attendance"("studentId", "classSubjectId", "date");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
