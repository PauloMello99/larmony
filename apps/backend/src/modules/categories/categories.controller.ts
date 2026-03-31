import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard'
import { ReqSupabase } from '../auth/decorators/supabase-client.decorator'
import { CategoriesService } from './categories.service'

@Controller('api/categories')
@UseGuards(SupabaseAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@ReqSupabase() supabase: SupabaseClient, @Query('householdId') householdId: string) {
    return this.categoriesService.findAll(supabase, householdId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @ReqSupabase() supabase: SupabaseClient,
    @Body() body: { householdId: string } & Record<string, unknown>,
  ) {
    const { householdId, ...payload } = body
    return this.categoriesService.create(supabase, householdId, payload)
  }

  @Put(':id')
  update(
    @ReqSupabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.categoriesService.update(supabase, id, payload)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@ReqSupabase() supabase: SupabaseClient, @Param('id') id: string) {
    return this.categoriesService.remove(supabase, id)
  }
}
