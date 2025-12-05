import { userResolver } from '../../src/graphql/resolvers/userResolver.js';

describe('UserResolver Integration', () => {
  test('should be defined', () => {
    expect(userResolver).toBeDefined();
    expect(userResolver.Query).toBeDefined();
    expect(userResolver.Mutation).toBeDefined();
  });
});
