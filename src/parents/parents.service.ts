import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createParentDto: CreateParentDto) {
    return 'This action adds a new parent';
  }

  findAll() {
    return this.prisma.parent.findMany({
      include: {
        user: true,
      },
      orderBy: {
        lastName: 'asc',
      },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} parent`;
  }

  update(id: number, updateParentDto: UpdateParentDto) {
    return `This action updates a #${id} parent`;
  }

  remove(id: number) {
    return `This action removes a #${id} parent`;
  }
}
