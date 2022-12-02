
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export interface GqlTokenAmountHumanReadable {
    address: string;
    amount: AmountHumanReadable;
}

export interface IQuery {
    poolGetPool(id: string): number | Promise<number>;
}

export interface IMutation {
    poolSyncAllPoolsFromSubgraph(): string[] | Promise<string[]>;
}

export type GqlBigNumber = any;
export type Bytes = any;
export type BigInt = any;
export type BigDecimal = any;
export type JSON = any;
export type AmountHumanReadable = any;
type Nullable<T> = T | null;
