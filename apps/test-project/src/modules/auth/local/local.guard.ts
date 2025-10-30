import {
  ExecutionContext,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from '../dto/auth.dto';

/**
 *
1. **🔑 请求到达**
   ```typescript
    POST /v1/auth/login
   Body: { "username": "张三", "password": "xxx" }
   ```

2. **🛡️ Guard执行 (LocalAuthGuard.canActivate)**
   ```typescript
   // 第1步：Guard预验证
   - 记录日志：'LocalAuthGuard:canActivate'
   - 验证DTO：检查username和password是否存在
   - 如果DTO验证失败：抛出BadRequestException("密码不能为空")
   ```

3. **🔄 调用父类 (super.canActivate)**
   ```typescript
   // 第2步：触发Passport认证
   - 调用Passport.authenticate('local')
   - Passport从请求体提取username和password字段
   - 调用LocalStrategy的validate方法
   ```

4. **🔐 Strategy执行 (LocalStrategy.validate)**
   ```typescript
   // 第3步：认证逻辑
   - 记录日志：'LocalStrategy:validate 张三 xxx'
   - 调用authService.validateUser(username, password)
   - 如果用户不存在：抛出UnauthorizedException("账号或密码错误")
   - 如果验证成功：返回user对象
   ```

5. **✅ 认证成功**
   ```typescript
   // 第4步：用户信息绑定
   - Passport将用户信息添加到request.user
   - Guard返回true，允许访问
   - 执行控制器方法：login(request)
   ```
 * **/

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  constructor(private readonly logger: Logger) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.log('LocalAuthGuard:canActivate');

    // ===== Guard职责：访问控制 =====
    // 1. 可以在控制器方法执行前进行预检查
    // 2. 可以访问ExecutionContext，获取请求/响应信息
    // 3. 可以进行自定义的业务验证

    // 先验证DTO（Guard的扩展功能）
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    const dto = plainToClass(LoginDto, body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const firstError = errors[0];
      const message = Object.values(firstError.constraints)[0];
      throw new BadRequestException(message);
    }

    // ===== 调用父类方法，触发Passport认证 =====
    // super.canActivate() 会：
    // 1. 调用Passport.authenticate()
    // 2. Passport会调用LocalStrategy的validate方法
    // 3. 如果认证成功，用户信息会被添加到request.user
    // 4. 如果认证失败，会抛出异常，阻止控制器方法执行
    return super.canActivate(context) as boolean;
  }
}
