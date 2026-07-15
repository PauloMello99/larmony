import { Body, Controller, Get, HttpCode, HttpStatus, Put, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetNotificationPreferencesUseCase } from "../application/use-cases/get-notification-preferences.use-case";
import { UpdateNotificationPreferenceUseCase } from "../application/use-cases/update-notification-preference.use-case";
import { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto";

@Controller("me/notification-preferences")
@UseGuards(AuthGuard)
export class NotificationPreferencesController {
  constructor(
    private readonly getPreferences: GetNotificationPreferencesUseCase,
    private readonly updatePreference: UpdateNotificationPreferenceUseCase,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.getPreferences.execute(user.id);
  }

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    await this.updatePreference.execute(user.id, dto.eventType, dto.channel, dto.enabled);
  }
}
