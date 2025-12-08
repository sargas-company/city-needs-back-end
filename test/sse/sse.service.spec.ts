import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';

import { SSEService } from '../../src/common/services/sse/sse.service';

describe('SSEService', () => {
  let service: SSEService;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SSEService],
    }).compile();

    service = module.get<SSEService>(SSEService);

    mockResponse = {
      writeHead: jest.fn(),
      write: jest.fn(),
      on: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should add client successfully', () => {
    const userId = 'test-user-id';

    service.addClient(userId, mockResponse as Response);

    expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    expect(mockResponse.write).toHaveBeenCalledWith(
      'data: {"type":"connection","data":{"status":"connected"}}\n\n',
    );
  });

  it('should send event to user', () => {
    const userId = 'test-user-id';
    const event = { type: 'test', data: { message: 'test' } };

    service.addClient(userId, mockResponse as Response);
    service.sendToUser(userId, event);

    expect(mockResponse.write).toHaveBeenCalledWith(
      'data: {"type":"test","data":{"message":"test"}}\n\n',
    );
  });

  it('should not send event to non-existent user', () => {
    const userId = 'non-existent-user';
    const event = { type: 'test', data: { message: 'test' } };

    service.sendToUser(userId, event);

    expect(mockResponse.write).not.toHaveBeenCalled();
  });

  it('should get correct connection counts', () => {
    const userId1 = 'user-1';
    const userId2 = 'user-2';

    service.addClient(userId1, mockResponse as Response);
    service.addClient(userId2, mockResponse as Response);

    expect(service.getConnectedUsersCount()).toBe(2);
    expect(service.getTotalConnectionsCount()).toBe(2);
  });
});
