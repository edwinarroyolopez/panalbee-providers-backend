import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Account, AccountDocument } from './schemas/account.schema';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name)
    private accountModel: Model<Account>,
  ) {}

  async create(dto: CreateAccountDto): Promise<AccountDocument> {
    const name = dto.name?.trim();
    return this.accountModel.create({
      name: name && name.length > 0 ? name : 'Airlock',
      isActive: true,
    });
  }

  async findById(id: string) {
    const acc = await this.accountModel.findById(id);
    if (!acc) throw new NotFoundException('Account not found');
    return acc;
  }
}
