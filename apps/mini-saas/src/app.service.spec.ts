import { AppService } from './app.service';

describe('AppService', () => {
  let appService: AppService;

  beforeEach(() => {
    appService = new AppService();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(appService.getHello()).toBe('Hello World!');
    });
  });

  describe('getHealth', () => {
    it('should return an ok status', () => {
      expect(appService.getHealth()).toEqual({ status: 'ok' });
    });
  });
});
