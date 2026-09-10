# VerifiVote - Backend

AI-Driven Decentralized Voting Platform Backend built with NestJS, MongoDB (Mongoose), LangChain with Google Gemini 1.5 Pro, and Ethers.js.

## Features
- **Multimodal AI KYC Engine:** LangChain & Gemini 1.5 Pro orchestration for CNIC front/back extraction, facial biometric verification, and automated name/DOB validation.
- **Admin Verification & NADRA Auth:** Endpoints for managing pending KYC verification queues and manual voter authorization.
- **Web3 Blockchain Integration:** Seamless integration with Sepolia testnet contracts using Ethers.js for automated signature verification and event tracking.
- **SIWE Authentication:** Cryptographic nonce generation and wallet signature verification issuing JWT access tokens.
- **Election & Candidate Indexing:** MongoDB storage for elections, candidate proposals, and voter registration status.

## Getting Started

Install dependencies:
```bash
npm install
```

Copy the environment configuration:
```bash
cp .env.example .env
```
Fill in your MongoDB URI, Sepolia RPC, private key, and Google Gemini API key.

Run the development server:
```bash
npm run start:dev
```

Server runs on [http://localhost:3001](http://localhost:3001).
