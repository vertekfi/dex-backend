import { Logger, CacheModule, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { loggingMiddleware, PrismaModule } from 'nestjs-prisma';
import type { ClientOpts } from 'redis';
import * as redisStore from 'cache-manager-redis-store';
import { PoolModule } from './modules/pool/pool.module';
import { join } from 'path';
import { SubgraphModule } from './modules/subgraphs/subgraph.module';
import { CommonModule } from './modules/common/common.module';
import { TokenModule } from './modules/token/token.module';
import { CacheService } from './modules/common/cache.service';

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

console.log(process.env.REDIS_URL);

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
  ],
  providers: [],
})
export class AppModule {}
