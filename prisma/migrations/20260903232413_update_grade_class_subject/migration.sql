/*
  Warnings:

  - You are about to drop the column `subjectId` on the `Grade` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentId,classSubjectId,term]` on the table `Grade` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `classSubjectId` to the `Grade` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_subjectId_fkey";

-- AlterTable
ALTER TABLE "Grade" DROP COLUMN "subjectId",
ADD COLUMN     "classSubjectId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Grade_studentId_classSubjectId_term_key" ON "Grade"("studentId", "classSubjectId", "term");

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_classSubjectId_fkey" FOREIGN KEY ("classSubjectId") REFERENCES "ClassSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
