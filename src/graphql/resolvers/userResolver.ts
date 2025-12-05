import { UserService } from "../../application/userService.js";
import { AuthService } from "../../application/authService.js";
import { createLoaders } from "../dataloaders.js";
import { GraphQLError } from "graphql";
import { AppError } from "../../utils/errorHandler.js";
import { DateUtils } from "../../utils/dateUtils.js";

interface Context {
  authService: AuthService;
  userService: UserService;
  currentUser?: any;
  loaders: ReturnType<typeof createLoaders>;
}

// Helper function to handle errors and convert them to GraphQL errors
function handleResolverError(error: unknown): never {
  if (error instanceof AppError) {
    throw new GraphQLError(error.message, {
      extensions: {
        code: error.code,
        httpStatus: error.httpStatus,
      },
    });
  }
  
  if (error instanceof Error) {
    throw new GraphQLError(error.message);
  }
  
  throw new GraphQLError('An unexpected error occurred');
}

export const userResolver = {
  Query: {
    users: async (_: any, __: any, context: Context) => {
      // example of authorization: only admins can list all users
      if (!context.currentUser?.role || context.currentUser.role !== "ADMIN") {
        throw new Error("Unauthorized");
      }
      const users = await context.userService.findAll();
      return users.map(user => ({
        ...user.toPublic(),
        createdAt: new Date().toISOString(), // Add createdAt field
      }));
    },
    me: async (_: any, __: any, context: Context) => {
      if (!context.currentUser?.id) return null;
      
      // Option 1: Use DataLoader for potential caching/batching benefits
      const user = await context.loaders.userLoader.load(context.currentUser.id);
      if (!user) return null;
      
      // Convert Prisma result to domain model and return public data
      const { password, ...publicData } = user;
      return {
        ...publicData,
        createdAt: new Date().toISOString(), // Add createdAt field
      };
      
      // Option 2: Use service layer (uncomment if you prefer domain model approach)
      // const user = await context.userService.findById(context.currentUser.id);
      // return user.toPublic();
    }
  },
  Mutation: {
    signUp: async (_: any, { name, email, password }: any, context: Context) => {
      try {
        const result = await context.authService.signUp({ name, email, password });
        return { 
          token: result.token, 
          user: {
            ...result.user,
            createdAt: new Date().toISOString(),
          }
        };
      } catch (error) {
        handleResolverError(error);
      }
    },
    signIn: async (_: any, { email, password }: any, context: Context) => {
      try {
        const result = await context.authService.signIn({ email, password });
        return { 
          token: result.token, 
          user: {
            ...result.user,
            createdAt: new Date().toISOString(),
          }
        };
      } catch (error) {
        handleResolverError(error);
      }
    }
  },
  
  // Federation reference resolvers
  User: {
    __resolveReference: async (reference: { id?: string; email?: string }, context: Context) => {
      if (reference.id) {
        try {
          const user = await context.userService.findById(Number.parseInt(reference.id));
          return {
            ...user.toPublic(),
            createdAt: new Date().toISOString(),
          };
        } catch {
          return null;
        }
      }
      
      if (reference.email) {
        const user = await context.userService.findByEmail(reference.email);
        if (user) {
          return {
            ...user.toPublic(),
            createdAt: new Date().toISOString(),
          };
        }
      }
      
      return null;
    },
  },
};