// import { applyDecorators } from '@nestjs/common';
// import {
//   ApiBadRequestResponse,
//   ApiBearerAuth,
//   ApiBody,
//   ApiExtraModels,
//   ApiOkResponse,
//   ApiUnauthorizedResponse,
//   getSchemaPath,
// } from '@nestjs/swagger';
// import { ResponseWrapperDto } from 'src/common/dto/response-wrapper.dto';

// import { ClaimReferralDto, ClaimReferralDtoResponse } from './dto/claim-referral.dto';
// import { GetUserLimitResponseDto } from './dto/get-user-limit.dto';
// import { GetUserDto } from './dto/get-user.dto';
// import { ReferralCodeResponseDto } from './dto/referral-code.dto';

// export function SwaggerGetCurrentUser() {
//   return applyDecorators(
//     ApiExtraModels(ResponseWrapperDto, GetUserDto),
//     ApiOkResponse({
//       description: 'Get the current authenticated user profile!.',
//       schema: {
//         allOf: [
//           { $ref: getSchemaPath(ResponseWrapperDto) },
//           {
//             properties: {
//               data: { $ref: getSchemaPath(GetUserDto) },
//             },
//           },
//         ],
//       },
//     }),
//   );
// }

// export function SwaggerGetUserLimits() {
//   return applyDecorators(
//     ApiExtraModels(ResponseWrapperDto, GetUserLimitResponseDto),
//     ApiOkResponse({
//       description: 'Get the current authenticated user limits.',
//       schema: {
//         allOf: [
//           { $ref: getSchemaPath(ResponseWrapperDto) },
//           {
//             properties: {
//               data: { $ref: getSchemaPath(GetUserLimitResponseDto) },
//             },
//           },
//         ],
//       },
//     }),
//   );
// }

// export const SwaggerGetReferralCode = () =>
//   applyDecorators(
//     ApiBearerAuth(),
//     ApiExtraModels(ResponseWrapperDto, ReferralCodeResponseDto),
//     ApiOkResponse({
//       description: 'Returns the referral code of the current user.',
//       schema: {
//         allOf: [
//           { $ref: getSchemaPath(ResponseWrapperDto) },
//           {
//             properties: {
//               data: { $ref: getSchemaPath(ReferralCodeResponseDto) },
//             },
//           },
//         ],
//       },
//     }),
//     ApiUnauthorizedResponse({ description: 'No or invalid Bearer token (Clerk)' }),
//   );

// export const SwaggerClaimReferral = () =>
//   applyDecorators(
//     ApiBearerAuth(),
//     ApiExtraModels(ResponseWrapperDto, ClaimReferralDtoResponse, ClaimReferralDto),
//     ApiBody({ type: ClaimReferralDto }),
//     ApiOkResponse({
//       description: 'Link a referral code and award bonuses to both users',
//       schema: {
//         allOf: [
//           { $ref: getSchemaPath(ResponseWrapperDto) },
//           {
//             properties: {
//               data: { $ref: getSchemaPath(ClaimReferralDtoResponse) },
//             },
//           },
//         ],
//       },
//     }),
//     ApiBadRequestResponse({ description: 'Invalid code / self-referral / validation error' }),
//     ApiUnauthorizedResponse({ description: 'No or invalid Clerk token' }),
//   );

// //route for testing mails
// // export const SwaggerSendMessage = () =>
// //   applyDecorators(
// //     ApiBearerAuth(),
// //     ApiExtraModels(ResponseWrapperDto, ClaimReferralDtoResponse),
// //     ApiOkResponse({
// //       description: 'Link a referral code and award bonuses to both users',
// //       schema: {
// //         allOf: [{ $ref: getSchemaPath(ResponseWrapperDto) }],
// //       },
// //     }),
// //     ApiBadRequestResponse({ description: 'Invalid code / self-referral / validation error' }),
// //     ApiUnauthorizedResponse({ description: 'No or invalid Clerk token' }),
// //   );
