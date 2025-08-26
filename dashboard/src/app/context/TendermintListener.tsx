'use client';

import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

export type ConsensusEvent =
    | { type: "NewRound"; height: number; round: number; step?: string; stepValue?: number; proposer?: string }
    | { type: "Vote"; height: number; round: number; step?: string; stepValue?: number; proposer?: string }
    | { type: "CompleteProposal"; height: number; round: number; step?: string; stepValue?: number; proposer?: string }
    | { type: "Step"; step: string; height: number; round: number, stepValue: number; proposer?: string }
    | { type: "NewBlock"; step?: string; height: number; round: number; stepValue?: number; proposer?: string };

const TendermintContext = createContext<ConsensusEvent | null>(null);

export const useTendermint = () => useContext(TendermintContext);

export const TendermintProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const socketRef = useRef<WebSocket | null>(null);
    const [event, setEvent] = useState<ConsensusEvent | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef<number>(0);
    const MAX_RETRIES = 10;

    const connectWebSocket = () => {
        const socket = new WebSocket(`${process.env.NEXT_PUBLIC_RPC_WEBSOCKET}/websocket`);
        socketRef.current = socket;

        const subscriptions = [
            { query: "tm.event='NewRoundStep'", id: "1" },
            { query: "tm.event='NewBlock'", id: "2" },
            // { query: "tm.event='NewRound'", id: "2" },
            // { query: "tm.event='Vote'", id: "2" },
            // { query: "tm.event='CompleteProposal'", id: "3" },
        ];

        socket.onopen = () => {
            retryCountRef.current = 0; // Reset retry count on success

            subscriptions.forEach(({ query, id }) => {
                socket.send(
                    JSON.stringify({
                        jsonrpc: "2.0",
                        method: "subscribe",
                        id,
                        params: { query },
                    })
                );
            });
        };

        socket.onmessage = (e: MessageEvent) => {
            try {
                const data = JSON.parse(e.data);
                const type = data?.result?.data?.type;
                const value = data?.result?.data?.value;

                let step: number = 0;
                switch (type) {
                    case "tendermint/event/NewRound": {
                        setEvent({
                            type: "NewRound",
                            height: parseInt(value.height, 10),
                            round: parseInt(value.round, 10),
                        });
                        break;
                    }

                    case "tendermint/event/Vote": {
                        const vote = value['Vote'];
                        setEvent({
                            type: "Vote",
                            height: parseInt(vote.height, 10),
                            round: parseInt(vote.round, 10),
                        });
                        break;
                    }

                    case "tendermint/event/NewBlock":
                        setEvent({
                            height: data?.result?.data?.value?.block?.header?.height,
                            proposer: data?.result?.data?.value?.block?.header?.proposer_address,
                            round: 0,
                            type: "NewBlock",
                        });
                        break;

                    case "tendermint/event/CompleteProposal": {
                        setEvent({
                            type: "CompleteProposal",
                            height: parseInt(value.height, 10),
                            round: parseInt(value.round, 10),
                        });
                        break;
                    }

                    case "tendermint/event/RoundState": {
                        let stepName = "";
                        switch (value.step) {
                            case "RoundStepNewHeight":
                                stepName = "NewHeight";
                                break;
                            case "RoundStepPrecommit":
                                stepName = "Precommit";
                                step = 2;
                                break;
                            case "RoundStepPrevote":
                                stepName = "Prevote";
                                step = 1;
                                break;
                            case "RoundStepCommit":
                                stepName = "Commit";
                                step = 3;
                                break;
                            case "RoundStepPropose":
                                stepName = "Propose";
                                step = 0;
                                break;
                            default:
                                stepName = "";
                        }

                        if (stepName === "") break;

                        setEvent({
                            type: "Step",
                            step: stepName,
                            stepValue: step,
                            height: parseInt(value.height, 10),
                            round: parseInt(value.round, 10),
                        });
                        break;
                    }
                }
            } catch (err) {
                console.error("WebSocket parse error:", err);
            }
        };

        socket.onerror = (err: Event) => {
            console.error("WebSocket error:", err);
        };

        socket.onclose = () => {
            console.warn("WebSocket closed. Attempting to reconnect...");
            reconnect();
        };
    };

    const reconnect = (delay = 3000) => {
        if (retryCountRef.current >= MAX_RETRIES) {
            console.error("Max retries reached. WebSocket will not reconnect.");
            return;
        }

        if (reconnectTimeout.current) return; // Prevent duplicate timeouts

        reconnectTimeout.current = setTimeout(() => {
            reconnectTimeout.current = null;
            retryCountRef.current += 1;
            console.log(`Reconnecting... attempt ${retryCountRef.current}`);
            connectWebSocket();
        }, delay);
    };

    useEffect(() => {
        if (typeof window === "undefined") return;

        connectWebSocket();

        return () => {
            socketRef.current?.close();
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = null;
            }
        };
    }, []);

    return (
        <TendermintContext.Provider value={event}>
            {children}
        </TendermintContext.Provider>
    );
};
