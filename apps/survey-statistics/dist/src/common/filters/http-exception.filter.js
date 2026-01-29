"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let HttpExceptionFilter = class HttpExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = "Internal server error";
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const errorBody = exception.getResponse();
            if (typeof errorBody === "string") {
                message = errorBody;
            }
            else if (errorBody) {
                if (Array.isArray(errorBody.message)) {
                    message = errorBody.message.join(", ");
                }
                else if (errorBody.message) {
                    message = errorBody.message;
                }
                else if (errorBody.error) {
                    message = errorBody.error;
                }
            }
        }
        else if (exception instanceof Error && exception.message) {
            message = exception.message;
        }
        response.status(status).json({
            code: status,
            message,
            data: null,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
};
HttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
exports.HttpExceptionFilter = HttpExceptionFilter;
