import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  const appService = {
    getHello: jest.fn().mockReturnValue('Hello World!'),
    getHealth: jest.fn().mockReturnValue({ status: 'ok' }),
    createProject: jest.fn().mockImplementation((name: string) => ({ name })),
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

  describe('projects', () => {
    it('should delegate project creation to the service', () => {
      expect(appController.createProject({ name: 'My Project' })).toEqual({
        name: 'My Project',
      });
      expect(appService.createProject).toHaveBeenCalledWith('My Project');
    });
  });
});
