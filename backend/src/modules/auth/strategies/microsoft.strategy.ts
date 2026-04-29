import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-microsoft';
import { AuthService } from '../auth.service';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('MICROSOFT_CLIENT_ID') as string,
      clientSecret: configService.get<string>('MICROSOFT_CLIENT_SECRET') as string,
      callbackURL: configService.get<string>('MICROSOFT_CALLBACK_URL') as string,
      tenant: configService.get<string>('MICROSOFT_TENANT_ID') || 'common',
      scope: ['user.read'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const { id, emails, displayName } = profile;

    if (!emails || emails.length === 0) {
      throw new UnauthorizedException('La cuenta de Microsoft no tiene un correo asociado');
    }

    const email = emails[0].value;

    // Obtener el dominio permitido desde las variables de entorno (opcional pero recomendado)
    const allowedDomain = this.configService.get<string>('ALLOWED_EMAIL_DOMAIN');
    
    if (allowedDomain) {
      const emailDomain = email.split('@')[1];
      if (!emailDomain || emailDomain.toLowerCase() !== allowedDomain.toLowerCase()) {
        throw new UnauthorizedException(
          `Solo se permiten correos institucionales terminados en @${allowedDomain}`
        );
      }
    }

    // Validate or create the user in our database via SSO and assign 'STUDENT' role by default
    const user = await this.authService.validateMicrosoftUser({
      email,
      displayName,
      microsoftId: id,
    });

    if (!user) {
      throw new UnauthorizedException('Error de autenticación con la cuenta institucional');
    }

    return user;
  }
}
