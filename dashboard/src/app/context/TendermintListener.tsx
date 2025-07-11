'use client';

// src/context/TendermintContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type VoteType = "Prevote" | "Precommit";

export type ConsensusEvent =
  | { type: "NewRound"; height: number; round: number; step?: string; }
  | { type: "Vote"; height: number; round: number; step?: string; }
  | { type: "CompleteProposal"; height: number; round: number; step?: string }
  | { type: "Step"; step: string; height: number; round: number }
  | { type: "NewBlock"; step?: string; height: number; round: number };

const TendermintContext = createContext<ConsensusEvent | null>(null);

export const useTendermint = () => useContext(TendermintContext);

export const TendermintProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [event, setEvent] = useState<ConsensusEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const socket = new WebSocket(`${process.env.NEXT_PUBLIC_WEBSOCKET}/websocket`);
    socketRef.current = socket;

    const subscriptions = [
      { query: "tm.event='NewRoundStep'", id: "1" },
      { query: "tm.event='NewBlock'", id: "2" },
      // { query: "tm.event='NewRound'", id: "2" },
      // { query: "tm.event='Vote'", id: "2" },
      // { query: "tm.event='CompleteProposal'", id: "3" },
    ];

    socket.onopen = () => {
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
        switch (type) {
          case "tendermint/event/NewRound": {
            const value = data.result.data.value;
            setEvent({
              type: "NewRound",
              height: parseInt(value.height, 10),
              round: parseInt(value.round, 10),
            });
            break;
          }

          case "tendermint/event/Vote": {
            const vote = data.result.data.value['Vote'];
            setEvent({
              type: "Vote",
              height: parseInt(vote.height, 10),
              round: parseInt(vote.round, 10),
            });
            break;
          }

          case "tendermint/event/NewBlock":
            setEvent({
              height: 0,
              round: 0,
              type: "NewBlock"
            })
            break;
          case "tendermint/event/CompleteProposal": {
            const value = data.result.data.value;
            setEvent({
              type: "CompleteProposal",
              height: parseInt(value.height, 10),
              round: parseInt(value.round, 10),
            });
            break;
          }

          case "tendermint/event/RoundState": {
            const value = data.result.data.value;

            let stepName = ""
            switch (value.step) {
              case "RoundStepNewHeight":
                stepName = "NewHeight"
                break;
              case "RoundStepPrecommit":
                stepName = "Precommit"
                break;
              case "RoundStepPrevote":
                stepName = "Prevote"
                break;
              case "RoundStepCommit":
                stepName = "Commit"
                break;
              case "RoundStepPropose":
                stepName = "Propose"
                break;
              default:
                stepName = ""
            }

            if (stepName == "") { break }

            setEvent({
              type: "Step",
              step: stepName,
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
      console.warn("WebSocket closed");
    };

    return () => {
      socketRef.current?.close();
    };
  }, []);

  return (
    <TendermintContext.Provider value={event}>
      {children}
    </TendermintContext.Provider>
  );
};
