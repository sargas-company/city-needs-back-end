import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessServiceStatus, Prisma, User } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessService } from '../business.service';

@Injectable()
export class BusinessServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessService: BusinessService,
  ) {}

  async createService(
    user: User,
    data: {
      name: string;
      price: number;
      duration: number;
      position?: number;
    },
  ) {
    const business = await this.businessService.getBusinessOrThrow(user);
    const { name, price, duration, position } = data;

    if (!name || !name.trim()) {
      throw new BadRequestException('Bad Request: service name is required');
    }

    if (!Number.isInteger(price) || price <= 0) {
      throw new BadRequestException('Bad Request: invalid price');
    }

    if (!Number.isInteger(duration) || duration <= 0) {
      throw new BadRequestException('Bad Request: invalid duration');
    }

    let finalPosition = position;

    if (finalPosition === undefined) {
      const last = await this.prisma.businessService.findFirst({
        where: { businessId: business.id },
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      finalPosition = last ? last.position + 1 : 0;
    }

    return this.prisma.businessService.create({
      data: {
        businessId: business.id,
        name: name.trim(),
        price,
        duration,
        position: finalPosition,
      },
    });
  }

  async updateService(
    user: User,
    serviceId: string,
    data: {
      name?: string;
      price?: number;
      duration?: number;
      status?: BusinessServiceStatus;
      position?: number;
    },
  ) {
    const business = await this.businessService.getBusinessOrThrow(user);

    const service = await this.prisma.businessService.findFirst({
      where: { id: serviceId, businessId: business.id },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestException('Bad Request: at least one field must be provided');
    }

    const updateData: Prisma.BusinessServiceUpdateInput = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new BadRequestException('Bad Request: invalid service name');
      }
      updateData.name = data.name.trim();
    }

    if (data.price !== undefined) {
      if (!Number.isInteger(data.price) || data.price <= 0) {
        throw new BadRequestException('Bad Request: invalid price');
      }
      updateData.price = data.price;
    }

    if (data.duration !== undefined) {
      if (!Number.isInteger(data.duration) || data.duration <= 0) {
        throw new BadRequestException('Bad Request: invalid duration');
      }
      updateData.duration = data.duration;
    }

    if (data.position !== undefined) {
      if (!Number.isInteger(data.position) || data.position < 0) {
        throw new BadRequestException('Bad Request: invalid position');
      }
      updateData.position = data.position;
    }

    if (data.status !== undefined) {
      if (!Object.values(BusinessServiceStatus).includes(data.status)) {
        throw new BadRequestException('Bad Request: invalid status');
      }
      updateData.status = data.status;
    }

    return this.prisma.businessService.update({
      where: { id: service.id },
      data: updateData,
    });
  }

  async deleteService(user: User, serviceId: string) {
    const business = await this.businessService.getBusinessOrThrow(user);

    const service = await this.prisma.businessService.findFirst({
      where: { id: serviceId, businessId: business.id },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    await this.prisma.businessService.delete({
      where: { id: service.id },
    });
  }

  async listServices(user: User, params: { cursor?: string; limit?: number }) {
    const business = await this.businessService.getBusinessOrThrow(user);
    return this.listByBusinessId(business.id, params);
  }

  async listPublicServices(businessId: string, params: { cursor?: string; limit?: number }) {
    const businessExists = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });

    if (!businessExists) {
      throw new NotFoundException('Business not found');
    }

    return this.listByBusinessId(businessId, {
      ...params,
      onlyActive: true,
    });
  }

  private async listByBusinessId(
    businessId: string,
    params: {
      cursor?: string;
      limit?: number;
      onlyActive?: boolean;
    },
  ) {
    const limit = Math.min(params.limit ?? 10, 50);

    const baseWhere: Prisma.BusinessServiceWhereInput = {
      businessId,
      ...(params.onlyActive && { status: BusinessServiceStatus.ACTIVE }),
    };

    const where: Prisma.BusinessServiceWhereInput = { ...baseWhere };

    if (params.cursor) {
      const [positionRaw, id] = params.cursor.split(':');
      const position = Number(positionRaw);

      if (Number.isNaN(position) || !id) {
        throw new BadRequestException('Invalid cursor');
      }

      where.OR = [{ position: { gt: position } }, { position, id: { gt: id } }];
    }

    const items = await this.prisma.businessService.findMany({
      where,
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const hasNextPage = items.length > limit;
    const data = hasNextPage ? items.slice(0, limit) : items;

    const lastItem = data[data.length - 1];
    const nextCursor = hasNextPage ? `${lastItem.position}:${lastItem.id}` : null;

    const totalCount = await this.prisma.businessService.count({
      where: baseWhere,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      meta: {
        nextCursor,
        totalCount,
        totalPages,
        hasNextPage,
      },
    };
  }
}
