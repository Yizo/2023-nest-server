import { Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  login(createAuthDto: CreateAuthDto) {
    return 'This action logs in a user';
  }
}
