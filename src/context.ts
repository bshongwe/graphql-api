import { AuthService } from './application/authService.js';
import { UserService } from './application/userService.js';
import { UserRepository } from './infrastructure/userRepository.js';
import { prisma } from './infrastructure/prismaClient.js';
import { createLoaders } from './graphql/dataloaders.js';

interface User {
  id: number | null;
  name: string;
  email: string;
  role: string;
}

interface Context {
  authService: AuthService;
  userService: UserService;
  currentUser?: User | null;
  loaders: ReturnType<typeof createLoaders>;
  req?: any;
}

interface CreateContextParams {
  req?: any;
}

export async function createContext({
  req,
}: CreateContextParams = {}): Promise<Context> {
  // Create repository and services with proper dependency injection
  // using centralized prisma client
  const userRepository = new UserRepository(prisma);
  const userService = new UserService(userRepository);
  const authService = new AuthService(userService);

  // Create DataLoaders for this request (prevents N+1 queries)
  const loaders = createLoaders();

  // Extract token from Authorization header
  let currentUser: User | null = null;
  if (req?.headers?.authorization) {
    const token = req.headers.authorization.replace('Bearer ', '');
    currentUser = await authService.getUserFromToken(token);
  }

  return {
    authService,
    userService,
    currentUser,
    loaders,
    req,
  };
}
