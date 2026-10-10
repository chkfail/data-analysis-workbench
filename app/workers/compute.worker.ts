import { runCompute, type ComputeRequest, type ComputeResponse } from "@/app/lib/compute";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ComputeRequest>) => void) | null;
  postMessage: (message: ComputeResponse) => void;
};

scope.onmessage = (event) => {
  const { seq, kind, input } = event.data;
  try {
    const result = runCompute(kind, input as never);
    scope.postMessage({ seq, result });
  } catch (error) {
    scope.postMessage({ seq, error: error instanceof Error ? error.message : String(error) });
  }
};
