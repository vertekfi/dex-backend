import { CacheModule, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import type { ClientOpts } from 'redis';
import * as redisStore from 'cache-manager-redis-store';
import { PoolModule } from './modules/pool/pool.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ['./**/*.gql'],
      definitions: {
        path: join(process.cwd(), 'src/graphql.ts'),
      },
      cache: 'bounded',
      playground: true,
    }),
    CacheModule.register<ClientOpts>({
      store: redisStore,
      // Store-specific configuration:
      host: process.env.REDIS_URL,
    }),

    PoolModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
