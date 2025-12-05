import 'dotenv/config';
import Fastify from 'fastify';
import { ApolloServer } from '@apollo/server';
import fastifyApollo from '@as-integrations/fastify';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { resolvers } from './resolvers';

const typeDefs = readFileSync(resolve(__dirname, 'schema.graphql'), 'utf8');

async function start() {
    const fastify = Fastify();

    const apollo = new ApolloServer({
        typeDefs,
        resolvers,
    });

    await apollo.start();

    await fastify.register(fastifyApollo(apollo));

    await fastify.listen({ port: 4000 });
    console.log('Server is running on http://localhost:4000/graphql');
}

start();
