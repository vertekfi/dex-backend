import * as cron from 'node-cron';
import * as schedule from 'node-schedule';
import * as _ from 'lodash';
import { PoolService } from '../pool/pool.service';
import { RPC } from '../common/web3/rpc.provider';
import { Inject } from '@nestjs/common';
import { AccountWeb3 } from '../common/types';
import { ProtocolService } from '../protocol/protocol.service';
import { GaugeSyncService } from '../gauge/gauge-sync.service';
import { PoolDataLoaderService } from '../pool/lib/pool-data-loader.service';
import { TokenSyncService } from '../common/token/token-sync.service';
import { runWithMinimumInterval } from './scheduling';
import { UserSyncWalletBalanceService } from '../user/lib/user-sync-wallet-balance.service';
import { UserSyncGaugeBalanceService } from '../user/lib/user-sync-gauge-balance.service';
import { BlocksSubgraphService } from '../subgraphs/blocks-subgraph/blocks-subgraph.service';
import { ProtocoFeesService } from '../protocol/protocol-fees.service';

const ONE_MINUTE_IN_MS = 60000;
const TWO_MINUTES_IN_MS = 120000;
const FIVE_MINUTES_IN_MS = 300000;
const TEN_MINUTES_IN_MS = 600000;

const asyncCallWithTimeout = async (fn: () => Promise<any>, timeLimit: number) => {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise((_resolve, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('Call timed out!')), timeLimit);
  });

  return Promise.race([fn(), timeoutPromise]).then((result) => {
    clearTimeout(timeoutHandle);
    return result;
  });
};

export class ScheduledJobService {
  private _jobs: {
    [jobName: string]: {
      job: schedule.Job;
      running: boolean;
    };
  } = {};

  constructor(
    @Inject(RPC) private readonly rpc: AccountWeb3,
    private readonly poolService: PoolService,
    private readonly tokenSyncService: TokenSyncService,
    private readonly protocolFeeService: ProtocoFeesService,
    private readonly gaugeSyncService: GaugeSyncService,
    private readonly poolDataLoader: PoolDataLoaderService,
    private readonly userSyncService: UserSyncWalletBalanceService,
    private readonly userGaugeSyncService: UserSyncGaugeBalanceService,
    private readonly blocksSubgraphService: BlocksSubgraphService,
  ) {}

  init() {
    this.scheduleLocalWorkerTasks();
  }

  private createJobIfNeeded(taskName: string, job: schedule.Job) {
    if (!this._jobs[taskName]) {
      this._jobs[taskName] = {
        running: false,
        job,
      };
    }
    return this._jobs[taskName];
  }

  scheduleNodeJob(
    rule: schedule.RecurrenceRule,
    taskName: string,
    jobFunction: () => Promise<void | any>,
  ) {
    const job = this.createJobIfNeeded(taskName, null);

    const newJob = schedule.scheduleJob(taskName, rule, async () => {
      try {
        const jobCacheWrapper = (async () => {
          if (job.running) {
            return;
          }

          console.log(`Running job ${taskName}`);

          job.running = true;
          await jobFunction();
          job.running = false;
        }).bind(this);

        await jobCacheWrapper();
      } catch (error) {
        console.log(`$Scheduled work tasker ${taskName} failed. See logs.`);
        console.error(error);
        job.running = false;
      }
    });

    if (!job.job) {
      job.job = newJob;
    }
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

      running = true;
      console.time(taskName);
      asyncCallWithTimeout(func, timeout)
        .catch((error) => {
          console.log(`Error ${taskName}`, error);
        })
        .finally(() => {
          running = false;
          console.timeEnd(taskName);
          console.log(`${taskName} done`);
        });
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

        running = true;
        console.log(`Start ${taskName}...`);
        console.time(taskName);
        asyncCallWithTimeout(listener, timeout)
          .catch((error) => {
            console.log(`Error ${taskName}`, error);
          })
          .finally(() => {
            running = false;
            console.timeEnd(taskName);
          });
      }, 1),
    );
  }

  private getRule(second: number, minute = 0, hour = 0): schedule.RecurrenceRule {
    const rule = new schedule.RecurrenceRule();
    rule.second = second;

    if (minute > 0) rule.minute = hour;
    if (hour > 0) rule.hour = hour;

    return rule;
  }

  scheduleLocalWorkerTasks() {
    // every 1 minute
    this.scheduleJob(
      '*/1 * * * *',
      'loadTokenPrices',
      ONE_MINUTE_IN_MS,
      async () => {
        await this.tokenSyncService.syncTokenPrices();
      },
      true,
    );

    // every 30 seconds
    this.scheduleJob(
      '*/30 * * * * *',
      'poolUpdateLiquidityValuesForAllPools',
      TWO_MINUTES_IN_MS,
      async () => {
        await this.poolService.updateLiquidityValuesForPools();
        await this.poolService.updatePoolAprs();
      },
    );

    // every 30 seconds
    this.scheduleJob(
      '*/30 * * * * *',
      'loadOnChainDataForPoolsWithActiveUpdates',
      TWO_MINUTES_IN_MS,
      async () => {
        await this.poolService.loadOnChainDataForPoolsWithActiveUpdates();
      },
    );

    // every 5 minutes
    this.scheduleJob('*/5 * * * *', 'syncNewPoolsFromSubgraph', TWO_MINUTES_IN_MS, async () => {
      await this.poolService.syncNewPoolsFromSubgraph();
    });

    // every 3 minutes
    this.scheduleJob('*/3 * * * *', 'syncPoolConfigData', FIVE_MINUTES_IN_MS, async () => {
      await this.poolDataLoader.syncPoolConfigData();
    });

    // every 5 minutes
    this.scheduleJob('*/5 * * * *', 'syncTokensFromPoolTokens', TEN_MINUTES_IN_MS, async () => {
      await this.tokenSyncService.syncTokenDefinitions();
    });

    //  every 5 minutes
    this.scheduleJob(
      '*/5 * * * *',
      'updateLiquidity24hAgoForAllPools',
      TEN_MINUTES_IN_MS,
      async () => {
        await this.poolService.updateLiquidity24hAgoForAllPools();
      },
    );

    // // once a minute
    // this.scheduleJob('* * * * *', 'sor-reload-graph', TWO_MINUTES_IN_MS, async () => {
    //       await balancerSdk.sor.reloadGraph();
    //   });

    this.scheduleJob(
      '*/5 * * * *',
      'cacheAverageBlockTime',
      TEN_MINUTES_IN_MS,
      async () => {
        await this.blocksSubgraphService.cacheAverageBlockTime();
      },
      true,
    );

    // every minute
    this.scheduleJob('*/1 * * * *', 'syncTokenDynamicData', TEN_MINUTES_IN_MS, async () => {
      await this.tokenSyncService.syncTokenDynamicData();
    });

    // every 5 minutes
    this.scheduleJob('*/5 * * * *', 'syncGaugeData', ONE_MINUTE_IN_MS, async () => {
      await this.gaugeSyncService.reloadStakingForAllPools();
    });
    // this.scheduleNodeJob(this.getRule(0, 1), 'syncGaugeData', this.gaugeService.getAllGauges);

    // every 30 seconds
    this.scheduleJob('*/30 * * * * *', 'cache-protocol-data', TWO_MINUTES_IN_MS, async () => {
      await this.protocolFeeService.getMetrics();
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

    runWithMinimumInterval(5000, async () => {
      await this.poolService.syncChangedPools();
    }).catch((error) => console.log('Error starting syncChangedPools...', error));

    // this.addRpcListener(
    //   'userSyncWalletBalancesForAllPools',
    //   'block',
    //   ONE_MINUTE_IN_MS,
    //   async () => {
    //     try {
    //       await this.userSyncService.syncChangedBalancesForAllPools();
    //     } catch (error) {
    //       console.error('userSyncWalletBalancesForAllPools failed');
    //     }
    //   },
    // );

    // this.addRpcListener('userSyncStakedBalances', 'block', ONE_MINUTE_IN_MS, async () => {
    //   try {
    //     await this.userGaugeSyncService.syncChangedStakedBalances();
    //   } catch (error) {
    //     console.error('userSyncStakedBalances failed');
    //   }
    // });

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
  
      this.scheduleJob('*!/5 * * * *', 'cache-tokens', async () => {
          await tokenService.cacheTokenDefinitions();
      });
  
      // every 10 seconds
      this.scheduleJob('*!/10 * * * * *', 'cache-user-pool-shares', async () => {
          await balancerService.cacheUserPoolShares();
      });
  
      // every 30 seconds
      this.scheduleJob('*!/30 * * * * *', 'cache-beets-price', async () => {
          await tokenPriceService.cacheBeetsPrice();
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

    // console.log('start pool sync');
  }
}
