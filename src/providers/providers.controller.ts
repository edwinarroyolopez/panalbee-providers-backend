import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ProvidersService } from './providers.service';
import { ListProvidersQueryDto } from './dto/list-providers.dto';
import { ImportProvidersDto } from './dto/import-providers.dto';
import { ChangeProviderStateDto } from './dto/change-provider-state.dto';

@UseGuards(JwtAuthGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  list(@Query() query: ListProvidersQueryDto) {
    return this.providersService.listProviders(query);
  }

  @Get(':providerId')
  getById(@Param('providerId') providerId: string) {
    return this.providersService.getProviderById(providerId);
  }

  @Post('import/validate')
  validateImport(@Body() dto: ImportProvidersDto) {
    return this.providersService.validateImport(dto);
  }

  @Post('import')
  importProviders(@Body() dto: ImportProvidersDto, @Req() req: any) {
    return this.providersService.importProviders(dto, req.user.sub);
  }

  @Patch(':providerId/state')
  changeState(
    @Param('providerId') providerId: string,
    @Body() dto: ChangeProviderStateDto,
    @Req() req: any,
  ) {
    return this.providersService.changeProviderStatus(providerId, dto, req.user.sub);
  }
}
