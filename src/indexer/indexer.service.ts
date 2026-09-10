import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';
import { Voter, VoterDocument } from '../users/voter.schema.js';
import { Candidate, CandidateDocument } from '../users/candidate.schema.js';
import { Election, ElectionDocument } from '../elections/election.schema.js';

@Injectable()
export class BlockchainIndexerService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainIndexerService.name);
  private provider: ethers.JsonRpcProvider;
  private factoryContract: ethers.Contract;
  
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
    this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-public.nodies.app');
  }

  async onModuleInit() {
    if (!this.FACTORY_ADDRESS) {
      this.logger.warn('FACTORY_ADDRESS not set. Blockchain indexer will not start.');
      return;
    }
    
    this.factoryContract = new ethers.Contract(this.FACTORY_ADDRESS, this.FACTORY_ABI, this.provider);
    
    this.logger.log('Starting Blockchain Indexer & Reconciling past logs...');
    await this.syncHistoricalLogs();
    this.setupLiveListeners();
  }

  async syncHistoricalLogs() {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      // Look back arbitrarily far for testnet. In production, store lastProcessedBlock in DB.
      const fromBlock = Math.max(0, currentBlock - 50000); 

      // 1. Sync Factory Events
      const creationLogs = await this.factoryContract.queryFilter('ElectionCreated', fromBlock, 'latest');
      for (const log of creationLogs) {
        if ('args' in log) {
           await this.handleElectionCreated(log.args[0], log.args[1], log.args[2]);
        }
      }

      // 2. Sync Events for all known active Elections
      const elections = await this.electionModel.find({ contractAddress: { $exists: true, $ne: null } });
      for (const el of elections) {
        const elContract = new ethers.Contract(el.contractAddress, this.ELECTION_ABI, this.provider);
        
        const candidateLogs = await elContract.queryFilter('CandidateAdded', fromBlock, 'latest');
        for (const log of candidateLogs) {
          if ('args' in log) await this.handleCandidateAdded(log.args[0], log.args[1], el.electionId);
        }
        
        const tokenLogs = await elContract.queryFilter('TokenPurchased', fromBlock, 'latest');
        for (const log of tokenLogs) {
          if ('args' in log) await this.handleTokenPurchased(log.args[0]);
        }

        const voteLogs = await elContract.queryFilter('VoteCast', fromBlock, 'latest');
        for (const log of voteLogs) {
          if ('args' in log) await this.handleVoteCast(log.args[0], log.args[1]);
        }

        const resolveLogs = await elContract.queryFilter('ElectionResolved', fromBlock, 'latest');
        for (const log of resolveLogs) {
          if ('args' in log) await this.handleElectionResolved(el.electionId, log.args[0], log.args[1]);
        }
      }
    } catch (error: any) {
      this.logger.error(`Error during historical sync: ${error.message}`);
    }
  }

  setupLiveListeners() {
    this.factoryContract.on('ElectionCreated', async (electionId, electionAddress, creator, event) => {
      this.logger.log(`Live Event: ElectionCreated - ID: ${electionId}`);
      await this.handleElectionCreated(electionId, electionAddress, creator);
      this.attachElectionListeners(electionAddress, Number(electionId));
    });

    // Attach listeners to already deployed elections
    this.electionModel.find({ contractAddress: { $exists: true, $ne: null } }).then(elections => {
      for (const el of elections) {
        this.attachElectionListeners(el.contractAddress, el.electionId);
      }
    });
  }

  attachElectionListeners(contractAddress: string, electionId: number) {
    const contract = new ethers.Contract(contractAddress, this.ELECTION_ABI, this.provider);
    
    contract.on('CandidateAdded', async (candidateId, candidateAddress, event) => {
      this.logger.log(`Live Event: CandidateAdded - ID: ${candidateId}`);
      await this.handleCandidateAdded(candidateId, candidateAddress, electionId);
    });

    contract.on('TokenPurchased', async (voterAddress, event) => {
      this.logger.log(`Live Event: TokenPurchased - Voter: ${voterAddress}`);
      await this.handleTokenPurchased(voterAddress);
    });

    contract.on('VoteCast', async (voterAddress, candidateId, event) => {
      this.logger.log(`Live Event: VoteCast - Candidate ID: ${candidateId}`);
      await this.handleVoteCast(voterAddress, candidateId);
    });

    contract.on('ElectionResolved', async (finalState, winnerId, event) => {
      this.logger.log(`Live Event: ElectionResolved - Winner: ${winnerId}`);
      await this.handleElectionResolved(electionId, finalState, winnerId);
    });
  }

  // --- Handlers ---
  async handleElectionCreated(electionId: bigint, contractAddress: string, creator: string) {
    await this.electionModel.findOneAndUpdate(
      { electionId: Number(electionId) },
      { contractAddress },
      { upsert: true, new: true } // Upsert gracefully if off-chain draft wasn't created first
    );
  }

  async handleCandidateAdded(candidateId: bigint, candidateAddress: string, electionId: number) {
    await this.candidateModel.findOneAndUpdate(
      { walletAddress: candidateAddress.toLowerCase() },
      { candidateId: Number(candidateId), electionId },
      { upsert: true, new: true }
    );
  }

  async handleTokenPurchased(voterAddress: string) {
    await this.voterModel.findOneAndUpdate(
      { walletAddress: voterAddress.toLowerCase() },
      { hasToken: true },
      { new: true }
    );
  }

  async handleVoteCast(voterAddress: string, candidateId: bigint) {
    // 1. Mark voter
    await this.voterModel.findOneAndUpdate(
      { walletAddress: voterAddress.toLowerCase() },
      { hasVoted: true, hasToken: false },
      { new: true }
    );

    // 2. Increment candidate off-chain counter
    await this.candidateModel.findOneAndUpdate(
      { candidateId: Number(candidateId) },
      { $inc: { voteCount: 1 } },
      { new: true }
    );
  }

  async handleElectionResolved(electionId: number, finalState: bigint, winnerId: bigint) {
    // Enum mapping: Draft(0), Active(1), Completed(2), Draw(3), Cancelled(4)
    const stateMap = ['Draft', 'Active', 'Completed', 'Draw', 'Cancelled'];
    const statusStr = stateMap[Number(finalState)] || 'Completed';

    await this.electionModel.findOneAndUpdate(
      { electionId },
      { status: statusStr, winnerId: Number(winnerId) },
      { new: true }
    );
  }
}
