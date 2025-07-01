// import geoip from 'geoip-lite';
import { fill, result, isUndefined, isEqual, isArray, sum, filter } from 'lodash';

const MAX_HISTORY = 40;
const MAX_INACTIVE_TIME = 1000 * 60 * 60 * 4;

export interface BlockStats {
    number: number;
    hash: string;
    difficulty: number;
    totalDifficulty: number;
    gasLimit: number;
    timestamp: number;
    time: number;
    arrival: number;
    received: number;
    propagation: number;
    transactions: any[];
}

export interface NodeStats {
    active: boolean;
    mining: boolean;
    hashrate: number;
    peers: number;
    pending: number;
    gasPrice: number;
    block: BlockStats;
    syncing: boolean;
    propagationAvg: number;
    latency: number;
    uptime: number;
}

export interface Uptime {
    started: number | null;
    up: number;
    down: number;
    lastStatus: boolean | null;
    lastUpdate: number | null;
}

export interface NodeData {
    id?: string;
    info?: any;
    ip?: string;
    spark?: string;
    latency?: number;
}

class Node {
    id: string | null = null;
    trusted: boolean = false;
    info: any = {};
    geo: any = {};
    stats: NodeStats;
    history: number[] = new Array(MAX_HISTORY);
    uptime: Uptime = {
        started: null,
        up: 0,
        down: 0,
        lastStatus: null,
        lastUpdate: null
    };
    spark: string | null = null;

    constructor(data: NodeData) {
        this.stats = {
            active: false,
            mining: false,
            hashrate: 0,
            peers: 0,
            pending: 0,
            gasPrice: 0,
            block: {
                number: 0,
                hash: '0x' + '0'.repeat(64),
                difficulty: 0,
                totalDifficulty: 0,
                gasLimit: 0,
                timestamp: 0,
                time: 0,
                arrival: 0,
                received: 0,
                propagation: 0,
                transactions: [],
            },
            syncing: false,
            propagationAvg: 0,
            latency: 0,
            uptime: 100
        };

        this.init(data);
    }

    init(data: NodeData) {
        fill(this.history, -1);

        if (this.id === null && this.uptime.started === null) {
            this.setState(true);
        }

        this.id = result(data, 'id', this.id);
        if (!isUndefined(data.latency)) {
            this.stats.latency = data.latency;
        }

        this.setInfo(data, null);
    }

    setInfo(data: NodeData, callback: ((err: any, info: any) => void) | null) {
        if (!isUndefined(data.info)) {
            this.info = data.info;
            this.info.canUpdateHistory = result(data, 'info.canUpdateHistory', false);
        }

        // if (!isUndefined(data.ip)) {
        //     if (trusted.includes(data.ip) || process.env.LITE === 'true') {
        //         this.trusted = true;
        //     }
        //     this.setGeo(data.ip);
        // }

        this.spark = result(data, 'spark', null);
        this.setState(true);

        if (callback !== null) {
            callback(null, this.getInfo());
        }
    }

    // setGeo(ip: string) {
    //     this.info.ip = ip;
    //     this.geo = geoip.lookup(ip);
    // }

    getInfo() {
        return {
            id: this.id,
            info: this.info,
            stats: this.getStats().stats,
            history: this.history,
            geo: this.geo
        };
    }

    setStats(stats: Partial<NodeStats>, history: number[], callback: (err: any, stats: any) => void) {
        if (!isUndefined(stats)) {
            this.setBlock(result(stats, 'block', this.stats.block), history, () => { });
            this.setBasicStats(stats, () => { });
            this.setPending(result(stats, 'pending', this.stats.pending), () => { });
            callback(null, this.getStats());
        } else {
            callback('Stats undefined', null);
        }
    }

    setBlock(block: Partial<BlockStats>, history: number[], callback: (err: any, stats: any) => void) {
        if (!isUndefined(block) && !isUndefined(block.number)) {
            if (!isEqual(history, this.history) || !isEqual(block, this.stats.block)) {
                if (block.number !== this.stats.block.number || block.hash !== this.stats.block.hash) {
                    this.stats.block = block as BlockStats;
                }
                this.setHistory(history);
                callback(null, this.getBlockStats());
            } else {
                callback(null, null);
            }
        } else {
            callback('Block undefined', null);
        }
    }

    setHistory(history: number[]) {
        if (isEqual(history, this.history)) return false;

        if (!isArray(history)) {
            this.history = fill(new Array(MAX_HISTORY), -1);
            this.stats.propagationAvg = 0;
            return true;
        }

        this.history = history;
        const positives = filter(history, (p) => p >= 0);
        this.stats.propagationAvg = positives.length > 0 ? Math.round(sum(positives) / positives.length) : 0;
        return true;
    }

    setPending(stats: any, callback: (err: any, result: any) => void) {
        if (!isUndefined(stats) && !isUndefined(stats.pending)) {
            if (!isEqual(stats.pending, this.stats.pending)) {
                this.stats.pending = stats.pending;
                callback(null, { id: this.id, pending: this.stats.pending });
            } else {
                callback(null, null);
            }
        } else {
            callback('Stats undefined', null);
        }
    }

    setBasicStats(stats: Partial<NodeStats>, callback: (err: any, result: any) => void) {
        if (!isUndefined(stats)) {
            const current = {
                active: this.stats.active,
                mining: this.stats.mining,
                hashrate: this.stats.hashrate,
                peers: this.stats.peers,
                gasPrice: this.stats.gasPrice,
                uptime: this.stats.uptime
            };

            if (!isEqual(stats, current)) {
                this.stats.active = !!stats.active;
                this.stats.mining = !!stats.mining;
                this.stats.syncing = stats.syncing ?? false;
                this.stats.hashrate = stats.hashrate ?? 0;
                this.stats.peers = stats.peers ?? 0;
                this.stats.gasPrice = stats.gasPrice ?? 0;
                this.stats.uptime = stats.uptime ?? this.stats.uptime;
                callback(null, this.getBasicStats());
            } else {
                callback(null, null);
            }
        } else {
            callback('Stats undefined', null);
        }
    }

    setLatency(latency: number, callback: (err: any, result: any) => void) {
        if (!isUndefined(latency)) {
            if (!isEqual(latency, this.stats.latency)) {
                this.stats.latency = latency;
                callback(null, { id: this.id, latency });
            } else {
                callback(null, null);
            }
        } else {
            callback('Latency undefined', null);
        }
    }

    getStats() {
        return {
            id: this.id,
            stats: this.stats,
            history: this.history
        };
    }

    getBlockStats() {
        return {
            id: this.id,
            block: this.stats.block,
            propagationAvg: this.stats.propagationAvg,
            history: this.history
        };
    }

    getBasicStats() {
        return {
            id: this.id,
            stats: {
                active: this.stats.active,
                mining: this.stats.mining,
                syncing: this.stats.syncing,
                hashrate: this.stats.hashrate,
                peers: this.stats.peers,
                gasPrice: this.stats.gasPrice,
                uptime: this.stats.uptime,
                latency: this.stats.latency
            }
        };
    }

    setState(active: boolean) {
        const now = Date.now();

        if (this.uptime.started !== null) {
            if (this.uptime.lastStatus === active) {
                this.uptime[active ? 'up' : 'down'] += now - (this.uptime.lastUpdate ?? now);
            } else {
                this.uptime[active ? 'down' : 'up'] += now - (this.uptime.lastUpdate ?? now);
            }
        } else {
            this.uptime.started = now;
        }

        this.stats.active = active;
        this.uptime.lastStatus = active;
        this.uptime.lastUpdate = now;
        this.stats.uptime = this.calculateUptime();
    }

    calculateUptime(): number {
        if (this.uptime.lastUpdate === this.uptime.started) return 100;
        return Math.round((this.uptime.up / ((this.uptime.lastUpdate ?? 0) - (this.uptime.started ?? 0))) * 100);
    }

    getBlockNumber(): number {
        return this.stats.block.number;
    }

    canUpdate(): boolean {
        if (this.trusted) return true;
        return this.info.canUpdateHistory || (!this.stats.syncing && this.stats.peers > 0);
    }

    isInactiveAndOld(): boolean {
        return (
            this.uptime.lastStatus === false &&
            this.uptime.lastUpdate !== null &&
            Date.now() - this.uptime.lastUpdate > MAX_INACTIVE_TIME
        );
    }
}

export default Node;
