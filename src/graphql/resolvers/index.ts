export const resolvers = {
  Query: {
    hello: () => 'Hello from GraphQL Enterprise Demo!',
    users: async (_parent: any, _args: any, context: any) => {
      return context.prisma.user.findMany({
        include: { posts: true }
      });
    },
    posts: async (_parent: any, _args: any, context: any) => {
      return context.prisma.post.findMany({
        include: { author: true }
      });
    },
    user: async (_parent: any, args: any, context: any) => {
      return context.prisma.user.findUnique({
        where: { id: args.id },
        include: { posts: true }
      });
    },
    post: async (_parent: any, args: any, context: any) => {
      return context.prisma.post.findUnique({
        where: { id: args.id },
        include: { author: true }
      });
    },
  },
  Mutation: {
    createUser: async (_parent: any, args: any, context: any) => {
      return context.prisma.user.create({
        data: {
          name: args.name,
          email: args.email,
          password: args.password,
          role: args.role || 'USER',
        },
        include: { posts: true }
      });
    },
    createPost: async (_parent: any, args: any, context: any) => {
      return context.prisma.post.create({
        data: {
          title: args.title,
          content: args.content,
          authorId: args.authorId,
        },
        include: { author: true }
      });
    },
  },
};