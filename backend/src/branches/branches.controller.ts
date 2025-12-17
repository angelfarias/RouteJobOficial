// src/branches/branches.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BranchesService } from './branches.service';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  // crear sucursal: POST /branches/:companyId
  @Post(':companyId')
  async create(
    @Param('companyId') companyId: string,
    @Body() body: any,
  ) {
    return this.branchesService.createBranch(companyId, body);
  }

  // listar sucursales por empresa: GET /branches/company/:companyId
  @Get('company/:companyId')
  async listByCompany(@Param('companyId') companyId: string) {
    return this.branchesService.listByCompany(companyId);
  }

  // obtener sucursal por id: GET /branches/:branchId
  @Get(':branchId')
  async getById(@Param('branchId') branchId: string) {
    return this.branchesService.getById(branchId);
  }
}
