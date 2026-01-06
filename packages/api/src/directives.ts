import { defaultFieldResolver, GraphQLError, GraphQLSchema } from 'graphql';
import { Kind } from 'graphql/language';
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';

export const secureByDefaultTransformer = (schema: GraphQLSchema) => {
    return mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfg, fieldName) => {
            if (fieldName.startsWith('__')) return fieldConfg;

            const isPublic = getDirective(schema, fieldConfg, 'public')?.[0];

            const { resolve = defaultFieldResolver } = fieldConfg;

            fieldConfg.resolve = async function (source, args, context, info) {
                if (isPublic) {
                    return resolve(source, args, context, info);
                }
                if (!context.rider) {
                    throw new GraphQLError(
                        'Your session has expired or is invalid.',
                        {
                            extensions: {
                                code: 'UNAUTHENTICATED',
                                http: { status: 401 },
                            },
                        }
                    );
                }
                return resolve(source, args, context, info);
            };
            return fieldConfg;
        },
    });
};
