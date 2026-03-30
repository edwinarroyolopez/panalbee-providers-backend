import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ExportsService } from './exports.service';
import { CreateProductExportDto } from './dto/create-product-export.dto';

@UseGuards(JwtAuthGuard)
@Controller('providers/:providerId/exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get()
  list(@Param('providerId') providerId: string) {
    return this.exportsService.listExports(providerId);
  }

  @Post()
  async createExport(
    @Param('providerId') providerId: string,
    @Body() dto: CreateProductExportDto,
    @Req() req: { user: { sub: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, filename, mimeType, exportId, exportedCount } =
      await this.exportsService.runExport(providerId, dto, req.user.sub);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Export-Id', exportId);
    res.setHeader('X-Exported-Count', String(exportedCount));

    return new StreamableFile(buffer);
  }
}
