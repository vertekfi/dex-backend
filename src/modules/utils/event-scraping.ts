import { Contract, Event } from '@ethersproject/contracts';

/**
 * Util to iterate over some block range in `blockReadRange` chunks.
 * @notice `blockReadRange` Needs to be < 5000
 * Callback will be given an Event object for each event found in a block.
 *
 */
export async function getEventData(
  contract: Contract,
  contractEventfilter: string,
  startBlockInPast: number,
  upToBlock: number,
  blockReadRange: number,
  callback: (evtData: Event) => void,
) {
  let iterations = 1;

  let endBlock = startBlockInPast + blockReadRange;
  while (startBlockInPast <= upToBlock) {
    console.log(
      `Running iteration (${iterations}) - startblock: ${startBlockInPast} endblock: ${endBlock}, up to block: ${upToBlock}`,
    );

    const filter = contract.filters[contractEventfilter]();
    const data = await contract.queryFilter(filter, startBlockInPast, endBlock);

    if (data.length) {
      data.forEach(callback);
    }

    console.log(`${data.length} records found`);

    startBlockInPast = endBlock + 1;
    endBlock = startBlockInPast + blockReadRange;

    // Try not miss any late items
    if (upToBlock - endBlock < blockReadRange) {
      console.log('Shortening last block range..');
      endBlock = upToBlock;
    }

    iterations++;
  }
}
