import { AnalyticsEventType } from '@prisma/client';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'AnalyticsEventValidator', async: false })
export class AnalyticsEventValidator implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments): boolean {
    const dto = args.object as any;

    if (dto.type === AnalyticsEventType.USER_ACTION) {
      const hasActionType = dto.actionType !== undefined && dto.actionType !== null;
      const noSource = dto.source === undefined || dto.source === null;
      return hasActionType && noSource;
    }

    if (dto.type === AnalyticsEventType.PROFILE_VIEW) {
      const noActionType = dto.actionType === undefined || dto.actionType === null;
      const hasSource = dto.source !== undefined && dto.source !== null;
      return noActionType && hasSource;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const dto = args.object as any;

    if (dto.type === AnalyticsEventType.USER_ACTION) {
      if (!dto.actionType) {
        return 'actionType is required when type is USER_ACTION';
      }
      return 'source must not be provided when type is USER_ACTION';
    }

    if (dto.type === AnalyticsEventType.PROFILE_VIEW) {
      if (dto.actionType) {
        return 'actionType must not be provided when type is PROFILE_VIEW';
      }
      return 'source is required when type is PROFILE_VIEW';
    }

    return 'Invalid analytics event';
  }
}
