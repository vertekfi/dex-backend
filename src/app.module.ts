import { Logger, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { loggingMiddleware, PrismaModule } from 'nestjs-prisma';
import { PoolModule } from './modules/pool/pool.module';
import { join } from 'path';
import { SubgraphModule } from './modules/subgraphs/subgraph.module';
import { CommonModule } from './modules/common/common.module';
import { TokenModule } from './modules/token/token.module';
import { UserModule } from './modules/user/user.module';

const gqlConfig: ApolloDriverConfig = {
  driver: ApolloDriver,
  typePaths: ['./**/*.gql'],
  cache: 'bounded',
  playground: true,
};

if (process.env.NODE_ENV === 'production') {
  gqlConfig.definitions = {
    path: join(process.cwd(), 'src/graphql.ts'), // Need for prod. Generate manually during dev for quicker startup using --watch
    emitTypenameField: true,
  };
}

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>(gqlConfig),
    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: {
        // configure your prisma middleware
        middlewares: [
          loggingMiddleware({
            logger: new Logger('PrismaMiddleware'),
            logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'log',
          }),
        ],
      },
    }),

    PoolModule,
    SubgraphModule,
    CommonModule,
    TokenModule,
    UserModule,
  ],
  providers: [],
})
export class AppModule {}
