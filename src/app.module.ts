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
import { ProtocolModule } from './modules/protocol/protocol.module';
import { GaugeModule } from './modules/gauge/gauge.module';
import { WorkerModule } from './modules/worker/worker.module';
import { ScheduledJobService } from './modules/worker/scheduled-job.service';
import { BalancerSdkModule } from './modules/balancer-sdk/balancer-sdk.module';
import { RewardPoolModule } from './modules/reward-pools/reward-pool.module';

const gqlConfig: ApolloDriverConfig = {
  driver: ApolloDriver,
  typePaths: ['./**/*.gql'],
  cache: 'bounded',
  playground: true,
  introspection: true,
  context: ({ req }) => req.context,
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
    ProtocolModule,
    GaugeModule,
    WorkerModule,
    BalancerSdkModule,
    RewardPoolModule,
  ],
  providers: [],
})
export class AppModule {
  constructor(jobs: ScheduledJobService) {
    // jobs.init();
  }
}
