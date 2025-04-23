import { Injectable } from '@nestjs/common';
import { getUuid } from '../utils'

@Injectable()
export class UserService {
  login(user: string, password: string):any{
    if (!user || !password) {
      return {
        code: 498,
        data: null,
        message: '账号密码错误',
      };
    } else {
      const token = getUuid();
      return {
        code: 0,
        data: {
          userName: user,
          token,
        },
        message: '登录成功',
      };
    }
  }
}
