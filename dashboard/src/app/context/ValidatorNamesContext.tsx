'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const STAKING_API_URL = process.env.NEXT_PUBLIC_STAKING_API_URL;

interface ValidatorNamesContextType {
  stakingNames: Map<string, string>;
}

const ValidatorNamesContext = createContext<ValidatorNamesContextType>({
  stakingNames: new Map(),
});

export function ValidatorNamesProvider({ children }: { children: React.ReactNode }) {
  const [stakingNames, setStakingNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!STAKING_API_URL) return;
    fetch(`${STAKING_API_URL}/api/v3/validators?limit=105`)
      .then(r => r.json())
      .then(data => {
        if (!data.success || !Array.isArray(data.result)) return;
        const map = new Map<string, string>();
        data.result.forEach((v: any) => {
          if (v.signerAddress && v.name?.trim()) {
            const key = v.signerAddress.replace(/^0x/i, '').toUpperCase();
            map.set(key, v.name.trim());
          }
        });
        setStakingNames(map);
      })
      .catch(() => {});
  }, []);

  return (
    <ValidatorNamesContext.Provider value={{ stakingNames }}>
      {children}
    </ValidatorNamesContext.Provider>
  );
}

export function useValidatorNames() {
  return useContext(ValidatorNamesContext);
}
