import { useEffect, useRef, useState } from "react";

export default function useListWorker({ type, payload, fallback }) {
  const [result, setResult] = useState(() => fallback());
  const workerRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (typeof Worker === "undefined") {
      setResult(fallback());
      return undefined;
    }

    if (!workerRef.current) {
      workerRef.current = new Worker(new URL("../workers/listWorker.js", import.meta.url), {
        type: "module",
      });
    }

    const activeRequestId = requestIdRef.current + 1;
    requestIdRef.current = activeRequestId;

    const handleMessage = (event) => {
      const data = event?.data || {};
      if (data.requestId !== activeRequestId || data.type !== type) return;
      if (data.error) {
        setResult(fallback());
        return;
      }
      setResult(Array.isArray(data.result) ? data.result : fallback());
    };

    const handleError = () => {
      setResult(fallback());
    };

    workerRef.current.addEventListener("message", handleMessage);
    workerRef.current.addEventListener("error", handleError);
    workerRef.current.postMessage({
      requestId: activeRequestId,
      type,
      payload,
    });

    return () => {
      workerRef.current?.removeEventListener("message", handleMessage);
      workerRef.current?.removeEventListener("error", handleError);
    };
  }, [type, payload, fallback]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return result;
}
