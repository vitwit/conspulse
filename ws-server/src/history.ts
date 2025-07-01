import {
    orderBy, findIndex, sum, findLast, find, minBy, now as now1, maxBy,

} from 'lodash';
import * as d3 from 'd3';

const MAX_HISTORY = 2000;
const MAX_PEER_PROPAGATION = 40;
const MIN_PROPAGATION_RANGE = 0;
const MAX_PROPAGATION_RANGE = 10000;
const MAX_BINS = 40;

export interface BlockData {
    number: number;
    hash: string;
    timestamp: number;
    transactions: string[];
    gasLimit: number;
    gasUsed: number;

    // runtime props
    trusted?: boolean;
    arrived?: number;
    received?: number;
    propagation?: number;
    fork?: number;
    time?: number;
}

interface PropagationEntry {
    node: string;
    trusted: boolean;
    fork: number;
    received: number;
    propagation: number;
}

interface HistoryItem {
    height: number;
    block: BlockData;
    forks: BlockData[];
    propagTimes: PropagationEntry[];
}

export class History {
    private _items: HistoryItem[] = [];
    private _callback: ((err: any, data?: any) => void) | null = null;

    add(block: BlockData, id: string, trusted: boolean, addingHistory: boolean): { block: BlockData; changed: boolean } | false {
        if (!block || !block.number || block.number <= 0 || !block.transactions) {
            return false;
        }

        trusted = process.env.LITE === 'true' ? true : trusted;
        const historyBlock = this.search(block.number);
        let forkIndex = -1;

        const now = now1();

        block.trusted = trusted;
        block.arrived = now;
        block.received = now;
        block.propagation = 0;
        block.fork = 0;

        if (historyBlock) {
            const propIndex = findIndex(historyBlock.propagTimes, { node: id });
            forkIndex = this.compareForks(historyBlock, block);

            if (propIndex === -1) {
                if (forkIndex >= 0 && historyBlock.forks[forkIndex]) {
                    block.arrived = historyBlock.forks[forkIndex].arrived!;
                    block.propagation = now - historyBlock.forks[forkIndex].received!;
                } else {
                    const prevBlock = this.prevMaxBlock(block.number);
                    block.time = prevBlock ? Math.max(block.arrived - prevBlock.block.arrived!, 0) : 0;
                    if (block.number < this.bestBlockNumber()) {
                        block.time = Math.max((block.timestamp - (prevBlock?.block.timestamp || 0)) * 1000, 0);
                    }
                    forkIndex = historyBlock.forks.push(block) - 1;
                    historyBlock.forks[forkIndex].fork = forkIndex;
                }

                historyBlock.propagTimes.push({
                    node: id,
                    trusted,
                    fork: forkIndex,
                    received: now,
                    propagation: block.propagation,
                });
            } else {
                if (forkIndex >= 0 && historyBlock.forks[forkIndex]) {
                    block.arrived = historyBlock.forks[forkIndex].arrived!;
                    if (forkIndex === historyBlock.propagTimes[propIndex].fork) {
                        block.received = historyBlock.propagTimes[propIndex].received;
                        block.propagation = historyBlock.propagTimes[propIndex].propagation;
                    } else {
                        historyBlock.propagTimes[propIndex].fork = forkIndex;
                        historyBlock.propagTimes[propIndex].propagation = block.propagation = now - historyBlock.forks[forkIndex].received!;
                    }
                } else {
                    block.received = historyBlock.propagTimes[propIndex].received;
                    block.propagation = historyBlock.propagTimes[propIndex].propagation;
                    const prevBlock = this.prevMaxBlock(block.number);
                    block.time = prevBlock ? Math.max(block.arrived - prevBlock.block.arrived!, 0) : 0;
                    if (block.number < this.bestBlockNumber()) {
                        block.time = Math.max((block.timestamp - (prevBlock?.block.timestamp || 0)) * 1000, 0);
                    }
                    forkIndex = historyBlock.forks.push(block) - 1;
                    historyBlock.forks[forkIndex].fork = forkIndex;
                }
            }

            if (trusted && !this.compareBlocks(historyBlock.block, historyBlock.forks[forkIndex])) {
                historyBlock.forks[forkIndex].trusted = true;
                historyBlock.block = historyBlock.forks[forkIndex];
            }

            block.fork = forkIndex;
            return { block, changed: true };
        } else {
            const prevBlock = this.prevMaxBlock(block.number);
            block.time = prevBlock ? Math.max(block.arrived - prevBlock.block.arrived!, 0) : 0;
            if (block.number < this.bestBlockNumber()) {
                block.time = Math.max((block.timestamp - (prevBlock?.block.timestamp || 0)) * 1000, 0);
            }

            const item: HistoryItem = {
                height: block.number,
                block,
                forks: [block],
                propagTimes: [{
                    node: id,
                    trusted,
                    fork: 0,
                    received: now,
                    propagation: block.propagation,
                }],
            };

            if (
                this._items.length === 0 ||
                (this._items.length === MAX_HISTORY && block.number > this.worstBlockNumber()) ||
                (this._items.length < MAX_HISTORY && block.number < this.bestBlockNumber() && addingHistory)
            ) {
                this._save(item);
                return { block, changed: true };
            }
        }

        return { block, changed: false };
    }

    private compareBlocks(a: BlockData, b: BlockData): boolean {
        return (
            a.hash === b.hash
        );
    }

    private compareForks(historyBlock: HistoryItem, block2: BlockData): number {
        if (!historyBlock || !historyBlock.forks.length) return -1;
        for (let i = 0; i < historyBlock.forks.length; i++) {
            if (this.compareBlocks(historyBlock.forks[i], block2)) return i;
        }
        return -1;
    }

    private _save(block: HistoryItem) {
        this._items.unshift(block);
        this._items = orderBy(this._items, 'height', 'desc');
        if (this._items.length > MAX_HISTORY) this._items.pop();
    }

    clean(max: number) {
        if (max > 0 && this._items.length && max < this.bestBlockNumber()) {
            this._items = this._items.filter(item => item.height <= max && !item.block.trusted);
        }
    }

    search(number: number): HistoryItem | false {
        const index = findIndex(this._items, { height: number });
        return index >= 0 ? this._items[index] : false;
    }

    prevMaxBlock(number: number): HistoryItem | undefined {
        return findLast(this._items, item => item.height < number);
    }

    bestBlock(): HistoryItem {
        return maxBy(this._items, 'height')!;
    }

    bestBlockNumber(): number {
        return this.bestBlock()?.height || 0;
    }

    worstBlock(): HistoryItem {
        return minBy(this._items, 'height')!;
    }

    worstBlockNumber(): number {
        return this.worstBlock()?.height || 0;
    }

    getNodePropagation(id: string): number[] {
        const propagation = Array(MAX_PEER_PROPAGATION).fill(-1);
        const bestBlock = this.bestBlockNumber();
        let lastBlocktime = now1();

        const sorted = orderBy(this._items, 'height', 'desc').slice(0, MAX_PEER_PROPAGATION);
        sorted.forEach(item => {
            const index = MAX_PEER_PROPAGATION - 1 - bestBlock + item.height;
            if (index >= 0) {
                const p = find(item.propagTimes, { node: id });
                if (p) {
                    propagation[index] = p.propagation;
                    lastBlocktime = item.block.arrived!;
                } else {
                    propagation[index] = Math.max(0, lastBlocktime - item.block.arrived!);
                }
            }
        });

        return propagation.reverse();
    }

    getBlockPropagation(): { histogram: any[]; avg: number } {
        const propagation: number[] = [];

        this._items.forEach(item =>
            item.propagTimes.forEach(p => {
                const prop = Math.min(MAX_PROPAGATION_RANGE, p.propagation);
                if (prop >= 0) propagation.push(prop);
            })
        );

        const avg = propagation.length > 0 ? Math.round(sum(propagation) / propagation.length) : 0;

        // Use d3.bin instead of deprecated d3.layout.histogram
        const bin = d3.bin()
            .domain([MIN_PROPAGATION_RANGE, MAX_PROPAGATION_RANGE])
            .thresholds(MAX_BINS);

        const binned = bin(propagation);

        let freqCum = 0;
        const histogram = binned.map(bucket => {
            const x0 = bucket.x0 ?? 0;
            const x1 = bucket.x1 ?? 0;
            const dx = x1 - x0;
            const y = bucket.length;

            freqCum += y;

            return {
                x: x0,
                dx: dx,
                y: y,
                frequency: y,
                cumulative: freqCum,
                cumpercent: freqCum / Math.max(1, propagation.length),
            };
        });

        return {
            histogram,
            avg,
        };
    }

    getBlockTimes(): number[] {
        return orderBy(this._items, 'height', 'desc')
            .slice(0, MAX_BINS)
            .reverse()
            .map(i => i.block.time! / 1000);
    }

    getAvgBlocktime(): number {
        const times = this.getBlockTimes();
        return sum(times) / (times.length || 1);
    }

    getGasLimit(): number[] {
        return orderBy(this._items, 'height', 'desc')
            .slice(0, MAX_BINS)
            .reverse()
            .map(i => i.block.gasLimit);
    }

    getTransactionsCount(): number[] {
        return orderBy(this._items, 'height', 'desc')
            .filter(i => i.block.trusted)
            .slice(0, MAX_BINS)
            .reverse()
            .map(i => i.block.transactions.length);
    }

    getGasSpending(): number[] {
        return orderBy(this._items, 'height', 'desc')
            .filter(i => i.block.trusted)
            .slice(0, MAX_BINS)
            .reverse()
            .map(i => i.block.gasUsed);
    }

    setCallback(cb: (err: any, data?: any) => void) {
        this._callback = cb;
    }

    requiresUpdate(): boolean {
        return this._items.length < MAX_HISTORY;
    }

}

