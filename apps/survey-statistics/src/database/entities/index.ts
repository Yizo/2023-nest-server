import { User, UserProfile, Role, Permission, UserRole, RolePermission } from "./identity.entities";
import { DictionaryType, DictionaryItem, Menu, SystemConfig } from "./system.entities";
import { Survey, SurveyQuestion, SurveyOption, SurveyResponse, SurveyAnswer } from "./survey.entities";
import { MonitorApp, ClientError, ClientErrorGroup, Notification, NotificationRecipient } from "./monitoring.entities";

// MikroORM 从这个数组发现所有实体；新增实体后必须同时加入这里和 migration。
export * from "./identity.entities";
export * from "./system.entities";
export * from "./survey.entities";
export * from "./monitoring.entities";

export const ENTITIES = [
  User,
  UserProfile,
  Role,
  Permission,
  UserRole,
  RolePermission,
  DictionaryType,
  DictionaryItem,
  Menu,
  SystemConfig,
  Survey,
  SurveyQuestion,
  SurveyOption,
  SurveyResponse,
  SurveyAnswer,
  MonitorApp,
  ClientError,
  ClientErrorGroup,
  Notification,
  NotificationRecipient,
] as const;
