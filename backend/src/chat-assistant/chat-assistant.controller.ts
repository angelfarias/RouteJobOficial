// chat-assistant.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatAssistantService } from './chat-assistant.service';

@Controller('chat-assistant')
export class ChatAssistantController {
  constructor(private readonly service: ChatAssistantService) {}

  @Post('respuesta')
  async guardar(
    @Body('userId') userId: string,
    @Body('paso') paso: number,
    @Body('pregunta') pregunta: string,
    @Body('respuesta') respuesta: string,
  ) {
    await this.service.guardarRespuesta({ userId, paso, pregunta, respuesta });
    return { ok: true };
  }

  @Get('perfil')
  async perfil(@Query('userId') userId: string) {
    const perfil = await this.service.obtenerPerfil(userId);
    return { ok: true, perfil };
  }

  @Post('sincronizar-perfil')
  async sincronizarPerfil(@Body('userId') userId: string) {
    await this.service.sincronizarPerfilDesdeSession(userId);
    return { ok: true };
  }

  // NUEVO: guardar audio de un paso
  @Post('audio')
  @UseInterceptors(FileInterceptor('audio'))
  async guardarAudio(
    @UploadedFile() file: any, // ← aquí ya NO usamos Express.Multer.File
    @Body('userId') userId: string,
    @Body('paso') paso: string,
  ) {
    await this.service.guardarAudio({
      userId,
      paso: Number(paso),
      file,
    });
    return { ok: true };
  }

  // Enhanced profile analysis endpoints
  @Get('analyze-profile')
  async analyzeProfile(@Query('userId') userId: string) {
    const analysis = await this.service.analyzeProfileData(userId);
    return { ok: true, analysis };
  }

  @Get('smart-questions')
  async getSmartQuestions(@Query('userId') userId: string) {
    const questions = await this.service.generateSmartQuestions(userId);
    return { ok: true, questions };
  }

  // Audio response endpoints
  @Get('audio-responses')
  async getAudioResponses(@Query('userId') userId: string) {
    const audioResponses = await this.service.getAudioResponses(userId);
    return { ok: true, audioResponses };
  }

  @Get('enhanced-profile')
  async getEnhancedProfile(@Query('userId') userId: string) {
    const profileData = await this.service.getEnhancedProfileData(userId);
    return { ok: true, profileData };
  }

  @Post('delete-audio')
  async deleteAudio(
    @Body('userId') userId: string,
    @Body('stepNumber') stepNumber: number,
  ) {
    await this.service.deleteAudioForStep(userId, stepNumber);
    return { ok: true };
  }

  @Get('has-audio')
  async hasAudio(
    @Query('userId') userId: string,
    @Query('stepNumber') stepNumber: string,
  ) {
    const hasAudio = await this.service.hasAudioForStep(userId, parseInt(stepNumber, 10));
    return { ok: true, hasAudio };
  }
}
