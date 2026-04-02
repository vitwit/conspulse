'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";

export interface ValidatorInfo {
  address: string;
  votingPower: number;
  prevote: boolean;
  precommit: boolean;
}

export interface ConsensusState {
  height: number;
  round: number;
  proposer?: string;
  validators: ValidatorInfo[];
}

const TendermintHistoryContext = createContext<ConsensusState | null>(null);
export const useTendermintHistory = () => useContext(TendermintHistoryContext);

type PendingVote = { addr: string; type: number; round: number };

const toInt = (n: unknown, d = 0) => {
  const i = typeof n === "string" ? parseInt(n, 10) : Number(n);
  return Number.isFinite(i) ? i : d;
};

const normalizeAddress = (addr: string | undefined) => addr?.toUpperCase() ?? "";

/** Fetch full validator set for a height */
async function fetchValidatorSet(
  height: number,
  abortSignal?: AbortSignal
): Promise<ValidatorInfo[]> {
  const perPage = 100;
  let page = 1;
  let out: ValidatorInfo[] = [];

  for (;;) {
    const url = `${process.env.NEXT_PUBLIC_RPC_URL}/validators?height=${height}&per_page=${perPage}&page=${page}`;
    const res = await fetch(url, { signal: abortSignal });
    const json = await res.json();

    const vals = json?.result?.validators ?? [];
    const mapped: ValidatorInfo[] = vals.map((v: any) => ({
      address: normalizeAddress(v.address),
      votingPower: toInt(v.voting_power),
      prevote: false,
      precommit: false,
    }));

    out = out.concat(mapped);
    if (vals.length < perPage) break;
    page += 1;
  }

  return out;
}

const TendermintHistoryContent: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const WS_URL = `${process.env.NEXT_PUBLIC_RPC_WEBSOCKET}/websocket`;
  const searchParams = useSearchParams();
  const [state, setState] = useState<ConsensusState | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingVotesRef = useRef<Map<number, PendingVote[]>>(new Map());
  const inFlightValidatorFetch = useRef<AbortController | null>(null);
  const lastFetchedHeightRef = useRef<number>(0);

  const subscribeQueries = [
    { query: "tm.event='NewBlock'", id: "nb" },
    { query: "tm.event='Vote'", id: "vo" },
    { query: "tm.event='NewRoundStep'", id: "rs" },
  ];

  const isHistorical = !!searchParams.get("height");
  const isHistoricalRef = useRef(isHistorical);

  useEffect(() => {
    isHistoricalRef.current = isHistorical;
  }, [isHistorical]);

  const openSocket = () => {
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      subscribeQueries.forEach(({ query, id }) =>
        ws.send(JSON.stringify({ jsonrpc: "2.0", method: "subscribe", id, params: { query } }))
      );
    };

    ws.onmessage = (e: MessageEvent) => {
      if (isHistoricalRef.current) return;
      try {
        const msg = JSON.parse(e.data);
        const type = msg?.result?.data?.type;
        const value = msg?.result?.data?.value;

        switch (type) {
          /** --- New block --- */
          case "tendermint/event/NewBlock": {
            const header = value?.block?.header;
            const height = toInt(header?.height);
            const proposer = normalizeAddress(header?.proposer_address);
            if (!height) return;

            // cancel previous fetch if still running
            if (inFlightValidatorFetch.current) {
              inFlightValidatorFetch.current.abort();
            }
            const controller = new AbortController();
            inFlightValidatorFetch.current = controller;

            setState({ height, round: 0, proposer, validators: [] });

            (async () => {
              try {
                // Rate limit: only fetch validator set if height moved significantly
                // or if we don't have any validators yet.
                const shouldFetch = !state?.validators?.length || 
                                   (height - lastFetchedHeightRef.current >= 20);

                if (!shouldFetch) {
                  // Re-use existing validators but update height
                  setState(prev => prev && prev.height === height ? {
                    ...prev,
                    validators: prev.validators.map(v => ({ ...v, prevote: false, precommit: false }))
                  } : prev);
                  return;
                }

                const validators = await fetchValidatorSet(height, controller.signal);
                lastFetchedHeightRef.current = height;

                // replay pending votes for this height
                let updatedValidators = validators.map(v => ({ ...v }));
                const pending = pendingVotesRef.current.get(height) ?? [];
                for (const vote of pending) {
                  updatedValidators = updatedValidators.map(val =>
                    val.address === vote.addr
                      ? {
                          ...val,
                          prevote: vote.type === 1 ? true : val.prevote,
                          precommit: vote.type === 2 ? true : val.precommit,
                        }
                      : val
                  );
                }
                pendingVotesRef.current.delete(height);

                setState(prev =>
                  prev && prev.height === height
                    ? { ...prev, validators: updatedValidators }
                    : prev
                );
              } catch (err) {
                if ((err as any)?.name !== "AbortError") {
                  console.error("validators fetch failed:", err);
                }
              } finally {
                if (inFlightValidatorFetch.current === controller) {
                  inFlightValidatorFetch.current = null;
                }
              }
            })();

            return;
          }

          /** --- Vote --- */
          case "tendermint/event/Vote": {
            const v = value?.Vote ?? value?.vote; // handle both
            if (!v) return;

            const height = toInt(v.height);
            const round = toInt(v.round);
            const addr = normalizeAddress(v.validator_address);
            const voteType = toInt(v.type);

            if (!height || !addr) return;

            setState(prev => {
              if (!prev || prev.height !== height) {
                // block not ready yet → queue
                const arr = pendingVotesRef.current.get(height) ?? [];
                arr.push({ addr, type: voteType, round });
                pendingVotesRef.current.set(height, arr);
                return prev;
              }

              return {
                ...prev,
                round: Math.max(prev.round, round),
                validators: prev.validators.map(val =>
                  val.address === addr
                    ? {
                        ...val,
                        prevote: voteType === 1 ? true : val.prevote,
                        precommit: voteType === 2 ? true : val.precommit,
                      }
                    : val
                ),
              };
            });
            return;
          }

          /** --- Round step --- */
          case "tendermint/event/RoundState": {
            const stepHeight = toInt(value?.height);
            const round = toInt(value?.round);
            if (!stepHeight) return;
            setState(prev =>
              prev && prev.height === stepHeight
                ? { ...prev, round: Math.max(prev.round, round) }
                : prev
            );
            return;
          }
        }
      } catch (err) {
        // ignore subscription ack parse issues
      }
    };
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    openSocket();
    return () => {
      socketRef.current?.close();
      if (inFlightValidatorFetch.current) {
        inFlightValidatorFetch.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TendermintHistoryContext.Provider value={state}>
      {children}
    </TendermintHistoryContext.Provider>
  );
};

export const TendermintHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Suspense fallback={null}>
      <TendermintHistoryContent>{children}</TendermintHistoryContent>
    </Suspense>
  );
};
