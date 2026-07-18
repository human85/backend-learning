import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  const appService = {
    getHello: jest.fn().mockReturnValue('Hello World!'),
    getHealth: jest.fn().mockReturnValue({ status: 'ok' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
      expect(appService.getHello).toHaveBeenCalledTimes(1);
    });
  });

  describe('health', () => {
    it('should return an ok status', () => {
      expect(appController.getHealth()).toEqual({ status: 'ok' });
      expect(appService.getHealth).toHaveBeenCalledTimes(1);
    });
  });
});
