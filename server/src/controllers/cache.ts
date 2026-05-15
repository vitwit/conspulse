type BlockInfo = {
    blockNumber: number;
    blockTime: number;
    txnCount: number;
    time: number;
};

export const blockCache: BlockInfo[] = [];
const MAX_BLOCKS = 20;

let lastBlockTime: number | null = null;

/**
 * Adds a new block's info to the cache.
 */
export function cacheBlock(blockNumber: number, currentTime: number, txnCount: number): void {
    let timeSinceLastBlock = 0;

    if (lastBlockTime !== null) {
        timeSinceLastBlock = currentTime - lastBlockTime;
    }

    blockCache.push({ blockNumber, blockTime: timeSinceLastBlock, txnCount, time: currentTime });

    lastBlockTime = currentTime;

    if (blockCache.length > MAX_BLOCKS) {
        blockCache.shift();
    }
}