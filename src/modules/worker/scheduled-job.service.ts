import * as cron from 'node-cron';
import { runWithMinimumInterval } from './scheduling';
import * as _ from 'lodash';
import { TokenService } from '../common/token/token.service';
import { PoolService } from '../pool/pool.service';
import { RPC } from '../common/web3/rpc.provider';
import { Inject } from '@nestjs/common';
import { AccountWeb3 } from '../common/types';
import { UserService } from '../user/user.service';
import { ProtocolService } from '../protocol/protocol.service';

const ONE_MINUTE_IN_MS = 60000;
const TWO_MINUTES_IN_MS = 120000;
const FIVE_MINUTES_IN_MS = 300000;
const TEN_MINUTES_IN_MS = 600000;

export class ScheduledJobService {
  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly tokenService: TokenService,
    private readonly poolService: PoolService,
    private readonly userService: UserService,
    private readonly protocolService: ProtocolService,
  ) {}

  init() {
    // if (process.env.NODE_ENV === 'production') {
    // this.scheduleLocalWorkerTasks();
    // }

    this.scheduleLocalWorkerTasks();
  }

  scheduleJob(
    cronExpression: string,
    taskName: string,
    timeout: number,
    func: () => Promise<void>,
    runOnStartup: boolean = false,
  ) {
    if (runOnStartup) {
      func().catch((error) => {
        console.log(`error on initial run ${taskName}`);
      });
    }

    let running = false;
    cron.schedule(cronExpression, async () => {
      if (running) {
        console.log(`${taskName} already running, skipping call...`);
        return;
      }

      // const transaction = Sentry.startTransaction({ name: taskName });
      // Sentry.configureScope((scope) => scope.setSpan(transaction));
      // // Sentry.withScope((scope) => {
      // //     scope.setSpan(transaction);
      // //     running = true;
      // //     console.log(`Start ${taskName}...`);
      // //     console.time(taskName);
      // asyncCallWithTimeout(func, timeout)
      //   .catch((error) => {
      //     console.log(`Error ${taskName}`, error);
      //     Sentry.captureException(error);
      //   })
      //   .finally(() => {
      //     running = false;
      //     transaction.finish();
      //     console.timeEnd(taskName);
      //     console.log(`${taskName} done`);
      //   });
      // });
    });
  }

  addRpcListener(
    taskName: string,
    eventType: string,
    timeout: number,
    listener: () => Promise<void>,
  ) {
    let running = false;

    this.rpc.provider.on(
      eventType,
      _.debounce(async () => {
        if (running) {
          console.log(`${taskName} already running, skipping call...`);
          return;
        }
        // const transaction = Sentry.startTransaction({ name: taskName });
        // Sentry.withScope((scope) => {
        //   scope.setSpan(transaction);

        //   running = true;
        //   console.log(`Start ${taskName}...`);
        //   console.time(taskName);
        //   asyncCallWithTimeout(listener, timeout)
        //     .catch((error) => {
        //       console.log(`Error ${taskName}`, error);
        //       Sentry.captureException(error);
        //     })
        //     .finally(() => {
        //       transaction.finish();
        //       running = false;
        //       console.timeEnd(taskName);
        //     });
        // });
      }, 1),
    );
  }

  scheduleLocalWorkerTasks() {
    //every 20 seconds
    this.scheduleJob('*/20 * * * * *', 'loadTokenPrices', ONE_MINUTE_IN_MS, async () => {
      await this.tokenService.loadTokenPrices();
    });

    // every 30 seconds
    // TODO: check this
    this.scheduleJob(
      '*/30 * * * * *',
      'poolUpdateLiquidityValuesForAllPools',
      TWO_MINUTES_IN_MS,
      async () => {
        await this.poolService.updateLiquidityValuesForPools();
        // await this.poolService.updatePoolAprs([]);
      },
    );

    //every 30 seconds
    this.scheduleJob(
      '*/30 * * * * *',
      'loadOnChainDataForPoolsWithActiveUpdates',
      TWO_MINUTES_IN_MS,
      async () => {
        await this.poolService.loadOnChainDataForPoolsWithActiveUpdates();
      },
    );

    //every 30 seconds
    this.scheduleJob('*/30 * * * * *', 'syncNewPoolsFromSubgraph', TWO_MINUTES_IN_MS, async () => {
      await this.poolService.syncNewPoolsFromSubgraph();
    });

    // //every 3 minutes
    // this.scheduleJob('*/3 * * * *', 'poolSyncSanityPoolData', FIVE_MINUTES_IN_MS, async () => {
    //   await this.poolService.syncSanityPoolData();
    // });

    // //every 5 minutes
    // this.scheduleJob('*/5 * * * *', 'syncTokensFromPoolTokens', TEN_MINUTES_IN_MS, async () => {
    //   await this.tokenService.syncSanityData();
    // });

    //every 5 minutes
    this.scheduleJob(
      '*/5 * * * *',
      'updateLiquidity24hAgoForAllPools',
      TEN_MINUTES_IN_MS,
      async () => {
        await this.poolService.updateLiquidity24hAgoForAllPools();
      },
    );

    // once a minute
    /*this.scheduleJob('* * * * *', 'sor-reload-graph', TWO_MINUTES_IN_MS, async () => {
          await balancerSdk.sor.reloadGraph();
      });*/

    // every minute
    this.scheduleJob('*/1 * * * *', 'syncTokenDynamicData', TEN_MINUTES_IN_MS, async () => {
      await this.tokenService.syncTokenDynamicData();
    });

    // every 5 minutes
    // TODO: check this
    this.scheduleJob('*/5 * * * *', 'syncStakingForPools', ONE_MINUTE_IN_MS, async () => {
      //  await this.poolService.syncStakingForPools([]);
    });

    this.scheduleJob('*/30 * * * * *', 'cache-protocol-data', TWO_MINUTES_IN_MS, async () => {
      await this.protocolService.cacheProtocolMetrics();
    });

    // once an hour at minute 1
    this.scheduleJob('1 * * * *', 'syncLatestSnapshotsForAllPools', TEN_MINUTES_IN_MS, async () => {
      await this.poolService.syncLatestSnapshotsForAllPools();
    });

    // every 20 minutes
    this.scheduleJob(
      '*/20 * * * *',
      'updateLifetimeValuesForAllPools',
      TEN_MINUTES_IN_MS,
      async () => {
        await this.poolService.updateLifetimeValuesForAllPools();
      },
    );

    /*
      //every five minutes
      this.scheduleJob(
          '*!/5 * * * *',
          'cache-historical-token-price',
          async () => {
              await tokenPriceService.cacheHistoricalTokenPrices();
          },
          true,
      );
  
      this.scheduleJob('*!/5 * * * *', 'cache-historical-nested-bpt-prices', async () => {
          await tokenPriceService.cacheHistoricalNestedBptPrices();
      });
  
  
      this.scheduleJob('*!/5 * * * *', 'cache-fbeets-apr', async () => {
          await beetsBarService.cacheFbeetsApr();
      });
  
      this.scheduleJob('*!/5 * * * *', 'cache-tokens', async () => {
          await tokenService.cacheTokenDefinitions();
      });
  
      //every 5 seconds
      this.scheduleJob('*!/5 * * * * *', 'cache-beets-farms', async () => {
          await beetsFarmService.cacheBeetsFarms();
      });
  
      this.scheduleJob('*!/30 * * * * *', 'cache-beets-farms', async () => {
          await beetsFarmService.cacheBeetsFarms();
      });
  
      //every 10 seconds
      this.scheduleJob('*!/10 * * * * *', 'cache-user-pool-shares', async () => {
          await balancerService.cacheUserPoolShares();
      });
  
      //every 30 seconds
      this.scheduleJob('*!/30 * * * * *', 'cache-beets-price', async () => {
          await tokenPriceService.cacheBeetsPrice();
      });
  
      this.scheduleJob('*!/10 * * * * *', 'cache-beets-farm-users', async () => {
          await beetsFarmService.cacheBeetsFarmUsers();
      });
  
      this.scheduleJob('*!/30 * * * * *', 'cache-past-pools', async () => {
          await balancerService.cachePastPools();
      });
  
      this.scheduleJob('*!/30 * * * * *', 'cache-portfolio-pools-data', async () => {
          const previousBlock = await blocksSubgraphService.getBlockFrom24HoursAgo();
          await balancerSubgraphService.cachePortfolioPoolsData(parseInt(previousBlock.number));
      });
  
      this.scheduleJob('5 0 * * *', 'cache-daily-data', async () => {
          console.log('Starting new cron to cache daily data.');
          const timestamp = moment.tz('GMT').startOf('day').unix();
  
          //retry loop in case of timeouts from the subgraph
          for (let i = 0; i < 10; i++) {
              try {
                  await portfolioService.cacheRawDataForTimestamp(timestamp);
                  console.log('Finished cron to cache daily data.');
                  break;
              } catch (e) {
                  console.log(
                      `Error happened during daily caching <${timestamp}>. Running again for the ${i}th time.`,
                      e,
                  );
                  await sleep(5000);
              }
          }
      });
  
      tokenPriceService
          .cacheBeetsPrice()
          .then(() =>
              beetsService
                  .cacheProtocolData()
                  .catch((error) => console.log('Error caching initial protocol data', error)),
          )
          .catch();
      beetsFarmService
          .cacheBeetsFarmUsers(true)
          .catch((error) => console.log('Error caching initial beets farm users', error));
  */
    console.log('scheduled cron jobs');

    console.log('start pool sync');

    runWithMinimumInterval(5000, async () => {
      await this.poolService.syncChangedPools();
    }).catch((error) => console.log('Error starting syncChangedPools...', error));

    this.addRpcListener(
      'userSyncWalletBalancesForAllPools',
      'block',
      ONE_MINUTE_IN_MS,
      async () => {
        await this.userService.syncChangedWalletBalancesForAllPools();
      },
    );

    this.addRpcListener('userSyncStakedBalances', 'block', ONE_MINUTE_IN_MS, async () => {
      await this.userService.syncChangedStakedBalances();
    });
  }
}
