import { Network } from '@capacitor/network';
import { useEffect, useState } from 'react';

type NetStatus = {
  connected: boolean;
  connectionType: string;
};

export function useNetworkStatus(): NetStatus {
  const [status, setStatus] = useState<NetStatus>({
    connected: true,
    connectionType: 'unknown'
  });

  useEffect(() => {
    Network.getStatus().then(setStatus);

    const handler = Network.addListener(
      'networkStatusChange',
      (s) => {
        setStatus(s);
        console.log("network",status)
      }
    );

    return () => {
      handler.then(h => h.remove());
    };
  }, []);

  return status;
}
