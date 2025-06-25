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

### Running the IAVLViewer Backend
The dashboard can connect to a Go-based backend for comparing Cosmos SDK node databases (for consensus/apphash debugging).

To run the backend server:
```sh
cd scripts/iavlviewer
./iavlviewer --server --port=8080
```
- The API will be available at `http://localhost:8080/compare`.
- Verify the API at `http://localhost:8080/health`.
- You can change the port as needed.

## Environment Variables
- `NEXT_PUBLIC_RPC_URL`: Tendermint RPC endpoint (must support `/consensus_state` and `/validators?height=`)
- `NEXT_PUBLIC_NETWORK_NAME`: Name of the network (displayed in the UI)
- `NEXT_PUBLIC_SCRIPT_API_URL`: URL of the iavlviewer backend (e.g. `http://localhost:8080`)

## Contact & Support
- Email: [contact@vitwit.com](mailto:contact@vitwit.com)
- Telegram: [@vitwit](https://t.me/+3bXmS6GE4HRjYmU1)
- Twitter: [@vitwit](https://twitter.com/vitwit_)
- GitHub: [vitwit](https://github.com/vitwit)

---

**Powered by [Vitwit](https://vitwit.com)** 