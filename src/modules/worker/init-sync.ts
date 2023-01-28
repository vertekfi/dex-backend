import { gql, GraphQLClient } from 'graphql-request';
import { ScheduledJobService } from './scheduled-job.service';

let client: GraphQLClient;

export async function runInitialSyncMutations(scheduledJobs: ScheduledJobService) {
  try {
    // if (process.env.NODE_ENV !== 'production') {
    //   scheduledJobs.init();
    //   return;
    // }
    console.log(`runInitialSyncMutations:`);
    client = new GraphQLClient(process.env.CALLBACK_URL, {
      headers: {
        AdminApiKey: process.env.ADMIN_API_KEY,
      },
    });
    await runMutation('tokenSyncTokenDefinitions');
    await runMutation('poolSyncSanityPoolData');
    await runMutation('poolSyncAllPoolsFromSubgraph');
    await runMutation('tokenReloadTokenPrices');
    await runMutation('poolReloadStakingForAllPools');
    // After initial data loads start scheduled jobs. Cleaner to manage initial setup this way imo
    scheduledJobs.init();
  } catch (error) {
    console.log(error);
    console.log('runInitialSyncMutations failed');
  }
}

async function runMutation(name: string) {
  const res = await client.request(
    gql`
      mutation {
        ${name}
      }
    `,
  );
  console.log(res);
}
