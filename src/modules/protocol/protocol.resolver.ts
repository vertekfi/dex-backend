import { Resolver } from '@nestjs/graphql';
import { ProtocolService } from './protocol.service';

@Resolver()
export class ProtocolResolver {
  constructor(private readonly protocolService: ProtocolService) {}
}
