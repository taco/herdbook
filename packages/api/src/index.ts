import Koa from 'koa';
import Router from '@koa/router';
import { ApolloServer } from '@apollo/server';
import { koaMiddleware } from '@as-integrations/koa';
import { typeDefs, resolvers } from './graphql/schema';

async function startServer() {
  const app = new Koa();
  const router = new Router();

  // Create Apollo Server
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  // Start Apollo Server
  await apolloServer.start();

  // Apply Apollo GraphQL middleware
  router.post('/graphql', koaMiddleware(apolloServer));
  router.get('/graphql', koaMiddleware(apolloServer));

  app.use(router.routes());
  app.use(router.allowedMethods());

  const PORT = process.env.PORT || 4000;

  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

