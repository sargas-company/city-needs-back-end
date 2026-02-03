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
      return dto.actionType !== undefined && dto.actionType !== null;
    }

    if (dto.type === AnalyticsEventType.PROFILE_VIEW) {
      return dto.actionType === undefined || dto.actionType === null;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const dto = args.object as any;

    if (dto.type === AnalyticsEventType.USER_ACTION) {
      return 'actionType is required when type is USER_ACTION';
    }

    if (dto.type === AnalyticsEventType.PROFILE_VIEW) {
      return 'actionType must not be provided when type is PROFILE_VIEW';
    }

    return 'Invalid analytics event';
  }
}
