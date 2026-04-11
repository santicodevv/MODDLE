import {
  Controller,
  Post,
  Body,
  Get,
  Request,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registrar un nuevo usuario
   */
  @Public()
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  /**
   * Iniciar sesión
   */
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Obtener perfil del usuario autenticado
   */
  @Get('me')
  async getProfile(@Request() req) {
    return req.user;
  }

  /**
   * SSO: Iniciar sesión con Microsoft
   */
  @Public()
  @UseGuards(AuthGuard('microsoft'))
  @Get('microsoft')
  async microsoftAuth() {
    // Passport redirects directly to Microsoft
  }

  /**
   * SSO: Callback desde Microsoft
   */
  @Public()
  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftAuthRedirect(@Request() req, @Res() res: Response) {
    // req.user has been populated by the Microsoft Strategy validate function
    const { accessToken, user } = await this.authService.loginSSO(req.user);
    
    // Configura la respuesta como quieras. Usualmente se redirige al frontend
    // pasando el token, por ejemplo como una cookie o en la query (solo en desarrollo)
    // Redirige al frontend (ajusta la URL según tu puerto de Vite)
    const frontendUrl = 'http://localhost:5173/auth/callback';
    return res.redirect(`${frontendUrl}?token=${accessToken}`);
  }
}
