// backend/src/candidates/candidates.controller.ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CandidatesService } from './candidates.service';

@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) { }

  @Get('perfil')
  async getPerfil(@Query('uid') uid: string) {
    if (!uid) return { ok: false, error: 'uid requerido' };

    const candidato = await this.candidatesService.obtenerCandidato(uid);

    if (!candidato) {
      return { ok: true, candidato: null, profileCompleted: false };
    }

    const hasExperience =
      Array.isArray(candidato.experience) && candidato.experience.length > 0;

    // por ahora, considerar completo solo con experiencia
    const profileCompleted = hasExperience;

    return { ok: true, candidato, profileCompleted };
  }

  // guardar experiencia completa (por ejemplo al sincronizar desde assistant)
  @Post('experience')
  async setExperience(
    @Body('uid') uid: string,
    @Body('experience') experience: string[],
  ) {
    if (!uid) return { ok: false, error: 'uid requerido' };
    await this.candidatesService.actualizarExperience(uid, experience || []);
    return { ok: true };
  }

  // guardar ubicación + radio
  @Post('location')
  async setLocation(
    @Body('uid') uid: string,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
    @Body('radioKm') radioKm: number,
  ) {
    if (!uid) return { ok: false, error: 'uid requerido' };
    await this.candidatesService.actualizarLocation(
      uid,
      { latitude: Number(latitude), longitude: Number(longitude) },
      Number(radioKm) || 5,
    );
    return { ok: true };
  }

  // guardar skills
  @Post('skills')
  async setSkills(
    @Body('uid') uid: string,
    @Body('skills') skills: string[],
  ) {
    if (!uid) return { ok: false, error: 'uid requerido' };
    await this.candidatesService.actualizarSkills(uid, skills || []);
    return { ok: true };
  }

  // guardar preferencias de categorías
  @Post('category-preferences')
  async setCategoryPreferences(
    @Body('uid') uid: string,
    @Body('preferredCategories') preferredCategories: string[],
    @Body('categoryWeights') categoryWeights?: { [categoryId: string]: number },
  ) {
    if (!uid) return { ok: false, error: 'uid requerido' };
    await this.candidatesService.actualizarCategoryPreferences(
      uid, 
      preferredCategories || [],
      categoryWeights
    );
    return { ok: true };
  }

  // actualizar pesos de matching
  @Post('match-weights')
  async setMatchWeights(
    @Body('uid') uid: string,
    @Body('weights') weights: {
      location?: number;
      category?: number;
      experience?: number;
      skills?: number;
    },
  ) {
    if (!uid) return { ok: false, error: 'uid requerido' };
    await this.candidatesService.actualizarMatchWeights(uid, weights);
    return { ok: true };
  }
}
