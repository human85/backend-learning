import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { UserEntity } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let usersService: UsersService;
  const usersRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: usersRepository,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  it('should find a user by email', async () => {
    const user = { id: 1, email: 'user@example.com' };
    usersRepository.findOneBy.mockResolvedValue(user);

    await expect(usersService.findByEmail(user.email)).resolves.toEqual(user);
    expect(usersRepository.findOneBy).toHaveBeenCalledWith({
      email: user.email,
    });
  });

  it('should create and save a user', async () => {
    const unsavedUser = {
      email: 'user@example.com',
      passwordHash: 'password-hash',
    };
    const savedUser = { id: 1, ...unsavedUser };
    usersRepository.create.mockReturnValue(unsavedUser);
    usersRepository.save.mockResolvedValue(savedUser);

    await expect(
      usersService.create(unsavedUser.email, unsavedUser.passwordHash),
    ).resolves.toEqual(savedUser);
    expect(usersRepository.create).toHaveBeenCalledWith(unsavedUser);
    expect(usersRepository.save).toHaveBeenCalledWith(unsavedUser);
  });
});
