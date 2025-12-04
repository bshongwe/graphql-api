import { PrismaClient } from '@prisma/client';

interface Context {
  prisma: PrismaClient;
  req?: any;
}

interface CreateContextParams {
  req?: any;
  prisma: PrismaClient;
}

export function createContext({ req, prisma }: CreateContextParams): Context {
  return {
    prisma,
    req,
  };
}
