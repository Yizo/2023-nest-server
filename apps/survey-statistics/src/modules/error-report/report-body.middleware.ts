import type { INestApplication } from "@nestjs/common";
import { json, text, urlencoded } from "express";
import { parseReportBodyString } from "./coerce-report-body";

/**
 * 注册请求体解析。
 * - application/json：fetch / sendBeacon(Blob) 标准路径
 * - text/plain：兼容旧 sendBeacon(url, JSON.stringify(...)) 写法
 */
export function useReportBodyParsers(app: INestApplication, bodyLimit = "100kb") {
	const express = app.getHttpAdapter().getInstance();
	express.use(json({ limit: bodyLimit }));
	express.use(urlencoded({ extended: true, limit: bodyLimit }));
	express.use(text({ type: "text/plain", limit: bodyLimit }));
	express.use((req: { body?: unknown }, _res: unknown, next: (err?: unknown) => void) => {
		if (typeof req.body === "string") {
			try {
				req.body = parseReportBodyString(req.body);
			} catch (error) {
				next(error);
				return;
			}
		}
		next();
	});
}
