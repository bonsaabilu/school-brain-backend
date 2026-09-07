import { Controller, Post, Get, Param } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  getAiServiceStatus() {
    return this.aiService.getStatus();
  }

  @Post('evaluate-all')
  evaluateAllStudents() {
    return this.aiService.evaluateAllStudents();
  }

  @Post('evaluate-student/:id')
  evaluateStudentRisk(@Param('id') id: string) {
    return this.aiService.evaluateStudentRisk(id);
  }
}
