interface Context {
  prisma: any;
  authService: any;
  currentUser?: any;
}

export const resolvers = {
  Query: {
    users: async (_parent: any, _args: any, context: Context) => {
      // Return users without sensitive data
      const users = await context.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
      return users;
    },
    me: async (_parent: any, _args: any, context: Context) => {
      if (!context.currentUser) {
        throw new Error('Not authenticated');
      }
      return context.currentUser;
    },
  },
  Mutation: {
    signUp: async (_parent: any, args: any, context: Context) => {
      const { name, email, password } = args;
      return context.authService.signUp(name, email, password);
    },
    signIn: async (_parent: any, args: any, context: Context) => {
      const { email, password } = args;
      return context.authService.signIn(email, password);
    },
  },
};