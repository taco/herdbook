import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    overwrite: true,
    schema: '../api/src/schema.graphql',
    documents: ['src/**/*.tsx'],
    generates: {
        'src/generated/graphql.ts': {
            plugins: ['typescript', 'typescript-operations'],
            config: {
                avoidOptionals: true,
            },
        },
    },
};

export default config;
