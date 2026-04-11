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
      clientID: configService.get<string>('MICROSOFT_CLIENT_ID'),
      clientSecret: configService.get<string>('MICROSOFT_CLIENT_SECRET'),
      callbackURL: configService.get<string>('MICROSOFT_CALLBACK_URL'),
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
      throw new UnauthorizedException('Microsoft account has no email associated');
    }

    const email = emails[0].value;

    // Validate or create the user in our database via SSO and assign 'STUDENT' role by default
    const user = await this.authService.validateMicrosoftUser({
      email,
      displayName,
      microsoftId: id,
    });

    if (!user) {
      throw new UnauthorizedException('Authentication failed');
    }

    return user;
  }
}
