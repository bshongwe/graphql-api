import { UserService } from '../../application/userService.js';
import { AuthService } from '../../application/authService.js';
import { createLoaders } from '../dataloaders.js';
import { GraphQLError } from 'graphql';
import { AppError } from '../../utils/errorHandler.js';
import { UserEventPublisher } from '../../infrastructure/pubsub.js';
import { JobService, JOB_TYPES } from '../../infrastructure/jobQueue.js';

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
      if (!context.currentUser?.role || context.currentUser.role !== 'ADMIN') {
        throw new Error('Unauthorized');
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
      const user = await context.loaders.userLoader.load(
        context.currentUser.id
      );
      if (!user) return null;

      // Convert Prisma result to domain model and return public data
      const { password, ...publicData } = user;
      return {
        ...publicData,
        createdAt: new Date().toISOString(), // Add createdAt field
      };

      // Option 2: Use service layer
      // (uncomment if you prefer domain model approach)
      // const user = await context.userService
      //   .findById(context.currentUser.id);
      // return user.toPublic();
    },
  },
  Mutation: {
    signUp: async (
      _: any,
      { name, email, password }: any,
      context: Context
    ) => {
      try {
        const result = await context.authService.signUp({
          name,
          email,
          password,
        });
        const userPayload = {
          ...result.user,
          createdAt: new Date().toISOString(),
        };

        // Publish subscription event
        await UserEventPublisher.publishUserCreated(userPayload);

        // Queue background jobs for user processing
        await JobService.addUserJob({
          type: JOB_TYPES.PROCESS_USER_SIGNUP,
          userId: userPayload.id?.toString() || 'unknown',
          email: userPayload.email,
          metadata: { source: 'graphql_signup' },
        });

        // Queue welcome email
        await JobService.addEmailJob({
          type: JOB_TYPES.SEND_WELCOME_EMAIL,
          to: userPayload.email,
          subject: 'Welcome to our platform!',
          template: 'welcome',
          variables: { name: userPayload.name },
        });

        return {
          token: result.token,
          user: userPayload,
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
          },
        };
      } catch (error) {
        handleResolverError(error);
      }
    },

    updateUserProfile: async (
      _: any,
      { name, email }: any,
      context: Context
    ) => {
      if (!context.currentUser?.id) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      try {
        // Get previous user data for subscription
        const previousUser = await context.userService.findById(
          context.currentUser.id
        );
        const previousValues = previousUser
          ? {
              ...previousUser.toPublic(),
              createdAt: new Date().toISOString(),
            }
          : null;

        // Update user
        const updatedUser = await context.userService.update(
          context.currentUser.id,
          { name, email }
        );

        const userPayload = {
          ...updatedUser.toPublic(),
          createdAt: new Date().toISOString(),
        };

        // Publish subscription event
        await UserEventPublisher.publishUserUpdated(
          userPayload,
          previousValues
        );

        return userPayload;
      } catch (error) {
        handleResolverError(error);
      }
    },

    deleteUser: async (_: any, { id }: any, context: Context) => {
      if (!context.currentUser?.role || context.currentUser.role !== 'ADMIN') {
        throw new GraphQLError('Admin access required', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      try {
        // Get user data before deletion for subscription
        const userToDelete = await context.userService.findById(
          Number.parseInt(id, 10)
        );
        if (!userToDelete) {
          throw new GraphQLError('User not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }

        await context.userService.delete(Number.parseInt(id, 10));

        // Publish subscription event
        await UserEventPublisher.publishUserDeleted({
          id: userToDelete.id?.toString() || id,
          email: userToDelete.email,
        });

        // Queue user deletion processing job
        await JobService.addUserJob({
          type: JOB_TYPES.PROCESS_USER_DELETION,
          userId: userToDelete.id?.toString() || id,
          email: userToDelete.email,
          metadata: { deletedBy: context.currentUser?.id },
        });

        return true;
      } catch (error) {
        handleResolverError(error);
      }
    },
  },

  // Federation reference resolvers
  User: {
    __resolveReference: async (
      reference: { id?: string; email?: string },
      context: Context
    ) => {
      if (reference.id) {
        try {
          const user = await context.userService.findById(
            Number.parseInt(reference.id)
          );
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
