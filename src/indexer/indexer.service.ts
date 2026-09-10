import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';
import { Voter, VoterDocument } from '../users/voter.schema.js';
import { Candidate, CandidateDocument } from '../users/candidate.schema.js';
import { Election, ElectionDocument } from '../elections/election.schema.js';

@Injectable()
export class BlockchainIndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainIndexerService.name);
  private provider: ethers.JsonRpcProvider;
  private factoryContract: ethers.Contract;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastCheckedBlock: number = 0;
  private isPolling = false;

  private readonly FACTORY_ADDRESS = process.env.FACTORY_ADDRESS;
  private readonly FACTORY_ABI = [
    "event ElectionCreated(uint256 indexed electionId, address indexed electionAddress, address creator)"
  ];
  private readonly ELECTION_ABI = [
    "event CandidateAdded(uint256 indexed candidateId, address indexed candidateAddress)",
    "event TokenPurchased(address indexed voter)",
    "event VoteCast(address indexed voter, uint256 indexed candidateId)",
    "event ElectionResolved(uint8 finalState, uint256 winnerId)"
  ];

  constructor(
    @InjectModel(Voter.name) private voterModel: Model<VoterDocument>,
    @InjectModel(Candidate.name) private candidateModel: Model<CandidateDocument>,
    @InjectModel(Election.name) private electionModel: Model<ElectionDocument>,
  ) {
    const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-public.nodies.app';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async onModuleInit() {
    if (!this.FACTORY_ADDRESS) {
      this.logger.warn('FACTORY_ADDRESS not set. Blockchain indexer will not start.');
      return;
    }

    this.factoryContract = new ethers.Contract(this.FACTORY_ADDRESS, this.FACTORY_ABI, this.provider);
    this.logger.log('Starting Blockchain Polling Indexer (bounded range for public RPC compatibility)...');

    try {
      const currentBlock = await this.provider.getBlockNumber();
      this.lastCheckedBlock = Math.max(0, currentBlock - 20);
    } catch (e: any) {
      this.logger.warn(`Failed to initialize starting block: ${e?.message}`);
      this.lastCheckedBlock = 0;
    }

    // Run initial poll and then schedule regular polling every 12 seconds
    this.pollEvents();
    this.pollInterval = setInterval(() => this.pollEvents(), 12000);
  }

  onModuleDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async pollEvents() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      if (currentBlock <= this.lastCheckedBlock) {
        this.isPolling = false;
        return;
      }

      // Keep block range strictly within 40 blocks to respect free public RPC limits
      const fromBlock = Math.max(this.lastCheckedBlock + 1, currentBlock - 40);
      const toBlock = currentBlock;

      // 1. Check Factory Events
      try {
        const creationLogs = await this.factoryContract.queryFilter('ElectionCreated', fromBlock, toBlock);
        for (const log of creationLogs) {
          if ('args' in log) {
            await this.handleElectionCreated(log.args[0], log.args[1], log.args[2]);
          }
        }
      } catch (err: any) {
        // Suppress transient RPC timeouts
      }

      // 2. Check deployed election contracts
      const elections = await this.electionModel.find({ contractAddress: { $exists: true, $ne: null } });
      for (const el of elections) {
        try {
          const elContract = new ethers.Contract(el.contractAddress, this.ELECTION_ABI, this.provider);

          const [candidateLogs, tokenLogs, voteLogs, resolveLogs] = await Promise.all([
            elContract.queryFilter('CandidateAdded', fromBlock, toBlock).catch(() => []),
            elContract.queryFilter('TokenPurchased', fromBlock, toBlock).catch(() => []),
            elContract.queryFilter('VoteCast', fromBlock, toBlock).catch(() => []),
            elContract.queryFilter('ElectionResolved', fromBlock, toBlock).catch(() => []),
          ]);

          for (const log of candidateLogs) {
            if ('args' in log) await this.handleCandidateAdded(log.args[0], log.args[1], el.electionId);
          }
          for (const log of tokenLogs) {
            if ('args' in log) await this.handleTokenPurchased(log.args[0]);
          }
          for (const log of voteLogs) {
            if ('args' in log) await this.handleVoteCast(log.args[0], log.args[1]);
          }
          for (const log of resolveLogs) {
            if ('args' in log) await this.handleElectionResolved(el.electionId, log.args[0], log.args[1]);
          }
        } catch (contractErr: any) {
          // Ignore individual contract transient errors
        }
      }

      this.lastCheckedBlock = currentBlock;
    } catch (e: any) {
      // Catch top-level polling errors silently
    } finally {
      this.isPolling = false;
    }
  }

  // --- Handlers ---
  async handleElectionCreated(electionId: bigint, contractAddress: string, creator: string) {
    this.logger.log(`Indexed Event: ElectionCreated - ID: ${electionId} -> ${contractAddress}`);
    await this.electionModel.findOneAndUpdate(
      { electionId: Number(electionId) },
      { contractAddress },
      { upsert: true, new: true }
    );
  }

  async handleCandidateAdded(candidateId: bigint, candidateAddress: string, electionId: number) {
    this.logger.log(`Indexed Event: CandidateAdded - ID: ${candidateId} (${candidateAddress})`);
    await this.candidateModel.findOneAndUpdate(
      { walletAddress: candidateAddress.toLowerCase() },
      { candidateId: Number(candidateId), electionId },
      { upsert: true, new: true }
    );
  }

  async handleTokenPurchased(voterAddress: string) {
    this.logger.log(`Indexed Event: TokenPurchased - Voter: ${voterAddress}`);
    await this.voterModel.findOneAndUpdate(
      { walletAddress: voterAddress.toLowerCase() },
      { hasToken: true },
      { new: true }
    );
  }

  async handleVoteCast(voterAddress: string, candidateId: bigint) {
    this.logger.log(`Indexed Event: VoteCast - Voter: ${voterAddress} for Candidate ID: ${candidateId}`);
    await this.voterModel.findOneAndUpdate(
      { walletAddress: voterAddress.toLowerCase() },
      { hasVoted: true, hasToken: false },
      { new: true }
    );

    await this.candidateModel.findOneAndUpdate(
      { candidateId: Number(candidateId) },
      { $inc: { voteCount: 1 } },
      { new: true }
    );
  }

  async handleElectionResolved(electionId: number, finalState: bigint, winnerId: bigint) {
    this.logger.log(`Indexed Event: ElectionResolved - Election: ${electionId}, State: ${finalState}`);
    const stateMap = ['Draft', 'Active', 'Completed', 'Draw', 'Cancelled'];
    const statusStr = stateMap[Number(finalState)] || 'Completed';

    await this.electionModel.findOneAndUpdate(
      { electionId },
      { status: statusStr, winnerId: Number(winnerId) },
      { new: true }
    );
  }
}
