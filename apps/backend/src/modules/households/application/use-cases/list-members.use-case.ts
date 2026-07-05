import { Inject, Injectable } from "@nestjs/common";
import type { MemberEntity } from "../../domain/member.entity";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../domain/member.repository.interface";

@Injectable()
export class ListMembersUseCase {
  constructor(
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  execute(householdId: string): Promise<MemberEntity[]> {
    return this.memberRepo.findAllByHousehold(householdId);
  }
}
