import { Controller, Post, Patch, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ElectionService } from './election.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('elections')
export class ElectionController {
  constructor(private readonly electionService: ElectionService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async createElection(@Body() body: { electionId: number; title: string; description: string; startTime: string; endTime: string }) {
    return this.electionService.createElection(body);
  }

  @Patch(':id/contract')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async updateContract(@Param('id') id: string, @Body('contractAddress') contractAddress: string) {
    return this.electionService.updateContractAddress(Number(id), contractAddress);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.electionService.updateStatus(Number(id), status);
  }

  @Get()
  async getAllElections() {
    return this.electionService.getAllElections();
  }
}
