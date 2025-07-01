import _ from 'lodash';
import { BlockData, History } from './history';
import Node from './node';
import WebSocket from 'ws';

interface Stats {
    block: any;
    pending?: number;
    [key: string]: any;
}

class Collection {
    private _items: Node[] = [];
    private _blockchain = new History();
    private _askedForHistory = false;
    private _askedForHistoryTime = 0;
    private _externalClients: Set<WebSocket>;
    private _highestBlock = 0;

    constructor(externalClients: Set<WebSocket>) {
        this._externalClients = externalClients;
    }

    // Broadcast message to all connected external clients
    private broadcast(type: string, payload: any) {
        const message = JSON.stringify({ type, ...payload });

        for (const client of this._externalClients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }

    // Not needed with native ws, but can be used if you want to manually trigger responses
    setupSockets() {
        // Optional if you want to auto-reply to "latestBlock" messages from clients
        // This behavior should now be implemented in `setupExternalClient()`
    }

    add(data: any, callback: (err: any, info: any) => void) {
        const node = this.getNodeOrNew({ id: data.id }, data);
        node.setInfo(data, callback);
    }

    update(id: string, stats: Stats, callback: (err: any, info: any) => void) {
        const node = this.getNode({ id });

        if (!node) {
            callback('Node not found', null);
            return;
        }

        const block = this._blockchain.add(stats.block, id, node.trusted, false);
        if (!block) {
            callback('Block data wrong', null);
            return;
        }

        const propagationHistory = this._blockchain.getNodePropagation(id);
        stats.block.arrived = block.block.arrived;
        stats.block.received = block.block.received;
        stats.block.propagation = block.block.propagation;

        node.setStats(stats, propagationHistory, callback);
    }

    addBlock(id: string, stats: BlockData, callback: (err: any, info: any) => void) {
        const node = this.getNode({ id });

        if (!node) {
            callback('Node not found', null);
            return;
        }

        const block = this._blockchain.add(stats, id, node.trusted, false);
        if (!block) {
            callback('Block undefined', null);
            return;
        }

        const propagationHistory = this._blockchain.getNodePropagation(id);
        stats.arrived = block.block.arrived;
        stats.received = block.block.received;
        stats.propagation = block.block.propagation;

        // Update highest block and broadcast to external clients
        if (block.block.number > this._highestBlock) {
            this._highestBlock = block.block.number;
            this.broadcast('latestBlock', {
                number: this._highestBlock
            });
        }

        node.setBlock(stats, propagationHistory, callback);
    }

    updateStats(id: string, stats: Stats, callback: (err: any, stats: any) => void) {
        const node = this.getNode({ id });

        if (!node) {
            callback('Node not found', null);
        } else {
            node.setBasicStats(stats, callback);
        }
    }

    getIndex(search: any): number {
        return _.findIndex(this._items, search);
    }

    getNode(search: any): Node | false {
        const index = this.getIndex(search);
        return index >= 0 ? this._items[index] : false;
    }

    getNodeByIndex(index: number): Node | false {
        return this._items[index] ?? false;
    }

    getIndexOrNew(search: any, data: any): number {
        const index = this.getIndex(search);
        return index >= 0 ? index : this._items.push(new Node(data)) - 1;
    }

    getNodeOrNew(search: any, data: any): Node {
        return this.getNodeByIndex(this.getIndexOrNew(search, data)) as Node;
    }

    all(): Node[] {
        this.removeOldNodes();
        return this._items;
    }

    inactive(sparkId: string, callback: Function) {
        const node = this.getNode({ spark: sparkId });

        if (!node) {
            callback('Node not found', null);
        } else {
            node.setState(false);
            callback(null, node.getStats());
        }
    }

    removeOldNodes() {
        const deleteList: number[] = [];

        for (let i = this._items.length - 1; i >= 0; i--) {
            if (this._items[i].isInactiveAndOld()) {
                deleteList.push(i);
            }
        }

        for (const index of deleteList) {
            this._items.splice(index, 1);
        }
    }

    blockPropagationChart() {
        return this._blockchain.getBlockPropagation();
    }

    getBestBlockFromItems(): number {
        return Math.max(
            this._blockchain.bestBlockNumber(),
            _.get(_.maxBy(this._items, (item) => item.stats.block.number), 'stats.block.number', 0)
        );
    }

    canNodeUpdate(id: string): boolean {
        const node = this.getNode({ id });
        if (!node) return false;

        if (node.canUpdate()) {
            const diff = node.getBlockNumber() - this._blockchain.bestBlockNumber();
            return diff >= 0;
        }

        return false;
    }

    requiresUpdate(id: string): boolean {
        return (
            this.canNodeUpdate(id) &&
            this._blockchain.requiresUpdate() &&
            (!this._askedForHistory || _.now() - this._askedForHistoryTime > 2 * 60 * 1000)
        );
    }

    askedForHistory(set?: boolean): boolean {
        if (set !== undefined) {
            this._askedForHistory = set;

            if (set === true) {
                this._askedForHistoryTime = _.now();
            }
        }

        return this._askedForHistory || _.now() - this._askedForHistoryTime < 2 * 60 * 1000;
    }
}

export default Collection;
