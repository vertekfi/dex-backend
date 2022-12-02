import { Logger, CacheModule, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { loggingMiddleware, PrismaModule } from 'nestjs-prisma';
import type { ClientOpts } from 'redis';
import * as redisStore from 'cache-manager-redis-store';
import { PoolModule } from './modules/pool/pool.module';
import { join } from 'path';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ['./**/*.gql'],
      definitions: {
        path: join(process.cwd(), 'src/graphql.ts'), // Need for prod
        emitTypenameField: true,
      },
      cache: 'bounded',
      playground: true,
    }),
    CacheModule.register<ClientOpts>({
      store: redisStore,
      // Store-specific configuration:
      host: process.env.REDIS_URL,
    }),
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
