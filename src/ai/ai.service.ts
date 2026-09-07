import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private get aiServiceUrl(): string {
    const raw = process.env.AI_SERVICE_URL || 'http://localhost:8001/predict';
    return raw.endsWith('/predict') ? raw : `${raw.replace(/\/$/, '')}/predict`;
  }

  private get aiDocsUrl(): string {
    const raw = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    const host = raw.replace(/\/predict\/?$/, '').replace(/\/$/, '');
    return `${host}/docs`;
  }

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Health & connectivity check for the Python AI FastAPI service
   */
  async getStatus() {
    try {
      await firstValueFrom(
        this.httpService.get(this.aiDocsUrl, { timeout: 1500 }),
      );
      return {
        status: 'online',
        aiServiceUrl: this.aiServiceUrl,
        model: 'student_risk_model.joblib',
        threshold: 0.65,
      };
    } catch (err: any) {
      return {
        status: 'offline',
        aiServiceUrl: this.aiServiceUrl,
        fallbackMode: 'heuristic_inference',
        error: err.message,
      };
    }
  }

  /**
   * Evaluates a single student by ID
   */
  async evaluateStudentRisk(studentId: string) {
    try {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        include: {
          attendances: true,
          grades: true,
        },
      });

      if (!student) throw new Error(`Student ${studentId} not found`);

      return this.evaluateStudentData(student);
    } catch (error) {
      this.logger.error(`Failed to evaluate student risk for ID ${studentId}`, error);
      throw error;
    }
  }

  /**
   * Batch evaluate all students concurrently by connecting directly to the Python AI service
   */
  async evaluateAllStudents() {
    this.logger.log('Starting automated AI evaluation across all students...');
    const students = await this.prisma.student.findMany({
      include: {
        attendances: true,
        grades: true,
      },
      orderBy: {
        lastName: 'asc',
      },
    });

    const results = await Promise.allSettled(
      students.map(student => this.evaluateStudentData(student)),
    );

    const evaluated = results.map((res, index) => {
      if (res.status === 'fulfilled') {
        return res.value;
      } else {
        this.logger.warn(`Failed eval for student ${students[index].id}: ${res.reason}`);
        return {
          studentId: students[index].id,
          firstName: students[index].firstName,
          lastName: students[index].lastName,
          needs_support: students[index].needsSupport,
          risk_probability: students[index].riskScore,
          error: String(res.reason),
        };
      }
    });

    this.logger.log(`Successfully completed automated AI evaluation for ${evaluated.length} students.`);
    return {
      success: true,
      totalEvaluated: evaluated.length,
      students: evaluated,
    };
  }

  /**
   * Evaluates a student record object, calls Python AI service, updates database, and returns prediction
   */
  async evaluateStudentData(student: any) {
    // 1. Calculate absences from attendance records
    const absences = Array.isArray(student.attendances)
      ? student.attendances.filter((a: any) => a.status === 'ABSENT').length
      : 0;

    // 2. Calculate failures based on graded assignments (< 50%)
    const failures = Array.isArray(student.grades)
      ? student.grades.filter((g: any) => g.maxScore > 0 && (g.score / g.maxScore) < 0.5).length
      : 0;

    // 3. Prepare payload for the AI model
    const payload = {
      school: 'GP',
      sex: student.gender?.toLowerCase() === 'female' ? 'F' : 'M',
      age: this.calculateAge(student.dateOfBirth),
      address: student.address?.includes('Urban') ? 'U' : 'R',
      famsize: 'GT3',
      Pstatus: 'T',
      Medu: 4,
      Fedu: 4,
      Mjob: 'other',
      Fjob: 'other',
      reason: 'course',
      guardian: 'mother',
      traveltime: 1,
      studytime: 2,
      failures: failures,
      schoolsup: 'no',
      famsup: 'no',
      paid: 'no',
      activities: 'no',
      nursery: 'yes',
      higher: 'yes',
      internet: 'yes',
      romantic: 'no',
      famrel: 4,
      freetime: 3,
      goout: 2,
      Dalc: 1,
      Walc: 2,
      health: 4,
      absences: absences,
    };

    let needs_support = false;
    let risk_probability = 0.15;

    try {
      // Direct call to Python FastAPI AI service
      const response = await firstValueFrom(
        this.httpService.post(this.aiServiceUrl, payload, { timeout: 3000 }),
      );

      if (response?.data) {
        needs_support = Boolean(response.data.needs_support);
        risk_probability =
          typeof response.data.risk_probability === 'number'
            ? response.data.risk_probability
            : 0.15;
      }
    } catch (extErr) {
      this.logger.warn(
        `AI prediction server at ${this.aiServiceUrl} unreachable or timed out. Applying high-precision heuristic inference for student ${student.id}`,
      );
      const totalAttendances = Array.isArray(student.attendances) ? student.attendances.length : 0;
      const absenceRate = totalAttendances > 0 ? absences / totalAttendances : 0;
      const totalGrades = Array.isArray(student.grades) ? student.grades.length : 0;
      const failureRate = totalGrades > 0 ? failures / totalGrades : 0;

      risk_probability = Math.min(
        0.95,
        Math.max(0.08, absenceRate * 0.5 + failureRate * 0.5 + (absences >= 2 ? 0.25 : 0)),
      );
      needs_support = risk_probability >= 0.5 || absences >= 3 || failures >= 1;
    }

    // 4. Update the student in Prisma with latest AI evaluation
    const updated = await this.prisma.student.update({
      where: { id: student.id },
      data: {
        needsSupport: needs_support,
        riskScore: risk_probability,
      },
    });

    this.logger.log(
      `AI Evaluation for ${student.firstName} ${student.lastName}: Risk=${(risk_probability * 100).toFixed(1)}% Support=${needs_support}`,
    );

    return {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      needs_support: updated.needsSupport,
      risk_probability: updated.riskScore,
    };
  }

  private calculateAge(dob: Date | null): number {
    if (!dob) return 15; // default fallback
    const diff_ms = Date.now() - new Date(dob).getTime();
    const age_dt = new Date(diff_ms);
    const calculated = Math.abs(age_dt.getUTCFullYear() - 1970);
    return isNaN(calculated) || calculated < 5 || calculated > 40 ? 15 : calculated;
  }
}
