# Conspulse

Conspulse is a modern Tendermint validator dashboard for networks like the Polygon. It provides real-time consensus state, validator stats, and network insights, helping users and operators monitor validator performance and network health.

## Features
- Live consensus state and validator stats
- Auto-refresh every 10 seconds
- Favourites and sorting for validators
- Voting and precommit status per validator

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Setup
1. Clone the repository:
   ```sh
   git clone https://github.com/vitwit/conspulse
   cd conspulse/conspulse-dashboard
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env.local` file in `conspulse-dashboard/` with the following:
   ```env
   NEXT_PUBLIC_RPC_URL=https://your-tendermint-rpc-url
   NEXT_PUBLIC_NETWORK_NAME=Polygon Amoy Testnet
   ```
   - Replace the RPC URL and network name as needed.

### Running the App
```sh
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables
- `NEXT_PUBLIC_RPC_URL`: Tendermint RPC endpoint (must support `/consensus_state` and `/validators?height=`)
- `NEXT_PUBLIC_NETWORK_NAME`: Name of the network (displayed in the UI)

## Contact & Support
- Email: [hello@vitwit.com](mailto:hello@vitwit.com)
- Telegram: [@vitwit](https://t.me/vitwit)
- Twitter: [@vitwit](https://twitter.com/vitwit)
- GitHub: [vitwit](https://github.com/vitwit)

---

**Powered by [Vitwit](https://vitwit.com)** 