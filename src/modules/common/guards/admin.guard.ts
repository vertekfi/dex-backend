import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor() {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // if (context.getType<GqlContextType>() === 'graphql') {
    //   const gqlCtx = GqlExecutionContext.create(context);
    //   const req = gqlCtx.getRoot()?.req;
    //   if (req && req.req) {
    //     console.log(req.req.headers);
    //   }
    // }
    return true;
  }
}
