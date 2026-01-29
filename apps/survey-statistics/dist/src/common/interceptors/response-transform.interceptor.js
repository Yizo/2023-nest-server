"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseTransformInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const metaKeys = ["total", "page", "pageSize"];
let ResponseTransformInterceptor = class ResponseTransformInterceptor {
    intercept(context, next) {
        return next.handle().pipe((0, operators_1.map)((result) => this.formatResponse(result)));
    }
    formatResponse(payload) {
        const { data, meta } = this.extractPayload(payload);
        return {
            code: 0,
            message: "success",
            data,
            ...(meta ?? {}),
        };
    }
    extractPayload(payload) {
        if (payload && Array.isArray(payload)) {
            return {
                data: payload,
                meta: null,
            };
        }
        if (payload && typeof payload === "object") {
            const clone = { ...payload };
            const meta = {};
            for (const key of metaKeys) {
                if (key in clone) {
                    meta[key] = clone[key];
                    delete clone[key];
                }
            }
            const extractedData = "data" in clone ? clone.data : clone;
            if ("data" in clone) {
                delete clone.data;
            }
            return {
                data: extractedData ?? null,
                meta: Object.keys(meta).length ? meta : null,
            };
        }
        return {
            data: payload ?? null,
            meta: null,
        };
    }
};
ResponseTransformInterceptor = __decorate([
    (0, common_1.Injectable)()
], ResponseTransformInterceptor);
exports.ResponseTransformInterceptor = ResponseTransformInterceptor;
