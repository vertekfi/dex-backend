import { gql } from 'graphql-request';

export const queryWithLinear = gql`
  {
    pools(
      where: { swapEnabled: true, totalShares_gt: "0.000000000001" }
      orderBy: totalLiquidity
      orderDirection: desc
    ) {
      id
      address
      poolType
      swapFee
      totalShares
      tokens {
        address
        balance
        decimals
        weight
        priceRate
      }
      tokensList
      totalWeight
      amp
      expiryTime
      unitSeconds
      principalToken
      baseToken
      swapEnabled
      wrappedIndex
      mainIndex
      lowerTarget
      upperTarget
    }
  }
`;

export const Query: { [chainId: number]: string } = {
  5: queryWithLinear,
  56: queryWithLinear,
};
