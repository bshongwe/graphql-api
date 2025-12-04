import { PrismaClient } from '@prisma/client';
import { AuthService } from './application/authService.js';
import { UserService } from './application/userService.js';
import { UserRepository } from './infrastructure/userRepository.js';

interface User {
  id: number | null;
  name: string;
  email: string;
  role: string;
}

interface Context {
  prisma: PrismaClient;
  authService: AuthService;
  userService: UserService;
  currentUser?: User | null;
  req?: any;
}

interface CreateContextParams {
  req?: any;
  prisma: PrismaClient;
}

export async function createContext({ req, prisma }: CreateContextParams): Promise<Context> {
  // Create repository and services with proper dependency injection
  const userRepository = new UserRepository(prisma);
  const userService = new UserService(userRepository);
  const authService = new AuthService(userService);
  
  // Extract token from Authorization header
  let currentUser: User | null = null;
  if (req?.headers?.authorization) {
    const token = req.headers.authorization.replace('Bearer ', '');
    currentUser = await authService.getUserFromToken(token);
  }

  return {
    prisma,
    authService,
    userService,
    currentUser,
    req,
  };
}
