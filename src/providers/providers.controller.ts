import {
  Body,
  Controller,
  Delete,
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
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CreateProviderEventDto } from './dto/create-provider-event.dto';
import {
  AddProviderShortlistDto,
  PatchProviderShortlistDto,
} from './dto/provider-shortlist.dto';

@UseGuards(JwtAuthGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  list(@Query() query: ListProvidersQueryDto) {
    return this.providersService.listProviders(query);
  }

  @Get('import/lotes')
  listProviderImportLotes() {
    return this.providersService.listProviderImportLotes();
  }

  @Get('prompts/scraping')
  getScrapingPrompts() {
    return this.providersService.getScrapingPromptTemplates();
  }

  @Get('prompts/research')
  getResearchPrompt() {
    return this.providersService.getResearchPromptTemplate();
  }

  @Delete('import/lotes/:loteId')
  revertProviderImportLote(@Param('loteId') loteId: string, @Req() req: any) {
    return this.providersService.revertProviderImportLote(loteId, req.user.sub);
  }

  @Post('import/validate')
  validateImport(@Body() dto: ImportProvidersDto) {
    return this.providersService.validateImport(dto);
  }

  @Post('import')
  importProviders(@Body() dto: ImportProvidersDto, @Req() req: any) {
    return this.providersService.importProviders(dto, req.user.sub);
  }

  @Get('shortlist/ids')
  listShortlistIds(@Req() req: { user: { accountId: string } }) {
    return this.providersService
      .providerShortlistIds(req.user.accountId)
      .then((providerIds) => ({ providerIds }));
  }

  @Get('shortlist')
  listShortlist(@Req() req: { user: { accountId: string } }) {
    return this.providersService.listProviderShortlist(req.user.accountId);
  }

  @Post('shortlist')
  addShortlist(@Body() dto: AddProviderShortlistDto, @Req() req: any) {
    return this.providersService.addProviderShortlist(req.user.accountId, req.user.sub, dto);
  }

  @Patch('shortlist/:providerId')
  patchShortlist(
    @Param('providerId') providerId: string,
    @Body() dto: PatchProviderShortlistDto,
    @Req() req: any,
  ) {
    return this.providersService.patchProviderShortlistNote(
      req.user.accountId,
      req.user.sub,
      providerId,
      dto.note,
    );
  }

  @Delete('shortlist/:providerId')
  removeShortlist(@Param('providerId') providerId: string, @Req() req: any) {
    return this.providersService.removeProviderShortlist(req.user.accountId, providerId);
  }

  @Get(':providerId')
  getById(@Param('providerId') providerId: string, @Req() req: any) {
    return this.providersService.getProviderById(providerId, req.user.accountId);
  }

  @Patch(':providerId')
  updateProvider(
    @Param('providerId') providerId: string,
    @Body() dto: UpdateProviderDto,
    @Req() req: any,
  ) {
    return this.providersService.updateProviderMetadata(providerId, dto, req.user.sub);
  }

  @Post(':providerId/events')
  createProviderEvent(
    @Param('providerId') providerId: string,
    @Body() dto: CreateProviderEventDto,
    @Req() req: any,
  ) {
    return this.providersService.createProviderEvent(providerId, dto, req.user.sub);
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
