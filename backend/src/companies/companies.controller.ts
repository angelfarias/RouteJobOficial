
// companies.controller.ts
import { Body, Controller, Get, Post, Put, Param, Req, BadRequestException } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  private getUid(req: any): string {
    const uid = (req.headers['x-user-uid'] as string) || '';
    if (!uid) {
      throw new BadRequestException('Missing x-user-uid header');
    }
    return uid;
  }

  @Post()
  async create(@Req() req, @Body() body: any) {
    const uid = this.getUid(req);
    return this.companiesService.createCompany(uid, body);
  }

  @Get('me')
  async getMine(@Req() req) {
    const uid = this.getUid(req);
    return this.companiesService.getCompanyByOwner(uid);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Req() req, @Body() body: any) {
    const uid = this.getUid(req);
    return this.companiesService.updateCompany(id, uid, body);
  }
}
