"use client";

import type {
  CommandResultMap,
  VisualizationRPCCommand,
  VisualizationRPCRequestMap,
} from "@dust-tt/types";
import { Button, ErrorMessage, Spinner } from "@viz/app/components/Components";
import * as papaparseAll from "papaparse";
import * as reactAll from "react";
import React, { useCallback } from "react";
import { useEffect, useState } from "react";
import { importCode, Runner } from "react-runner";
import * as rechartsAll from "recharts";
import { useResizeDetector } from "react-resize-detector";

export function useVisualizationAPI(actionId: number) {
  const [error, setError] = useState<Error | null>(null);

  const fetchCode = useCallback(async (): Promise<string | null> => {
    const getCode = makeIframeMessagePassingFunction(
      "getCodeToExecute",
      actionId
    );
    try {
      const result = await getCode(null);

      const { code } = result;
      if (!code) {
        setError(new Error("Failed to extract visualization code."));
        return null;
      }

      return code;
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error
          : new Error("Failed to fetch visualization code.")
      );

      return null;
    }
  }, [actionId]);

  const fetchFile = useCallback(
    async (fileId: string): Promise<File | null> => {
      const getFile = makeIframeMessagePassingFunction("getFile", actionId);
      const res = await getFile({ fileId });

      const { fileBlob: blob } = res;

      if (!blob) {
        setError(new Error("Failed to fetch file."));
        return null;
      }

      const file = new File([blob], "fileId", { type: blob.type });

      return file;
    },
    [actionId]
  );

  // This retry function sends a command to the host window requesting a retry of a previous
  // operation, typically if the generated code fails.
  const retry = useCallback(
    async (errorMessage: string): Promise<void> => {
      const sendRetry = makeIframeMessagePassingFunction("retry", actionId);
      await sendRetry({ errorMessage });
    },
    [actionId]
  );

  return { fetchCode, fetchFile, error, retry };
}

// This function creates a function that sends a command to the host window with templated Input and Output types.
function makeIframeMessagePassingFunction<T extends VisualizationRPCCommand>(
  methodName: T,
  actionId: number
) {
  return (params: VisualizationRPCRequestMap[T]) => {
    return new Promise<CommandResultMap[T]>((resolve, reject) => {
      const messageUniqueId = Math.random().toString();
      const listener = (event: MessageEvent) => {
        if (event.data.messageUniqueId === messageUniqueId) {
          if (event.data.error) {
            reject(event.data.error);
          } else {
            resolve(event.data.result);
          }
          window.removeEventListener("message", listener);
        }
      };
      window.addEventListener("message", listener);
      window.top?.postMessage(
        {
          command: methodName,
          messageUniqueId,
          actionId,
          params,
        },
        "*"
      );
    });
  };
}

const useFile = (actionId: number, fileId: string) => {
  const [file, setFile] = useState<File | null>(null);

  const { fetchFile } = useVisualizationAPI(actionId); // Adjust the import based on your project structure

  useEffect(() => {
    const fetch = async () => {
      try {
        const fetchedFile = await fetchFile(fileId);
        setFile(fetchedFile);
      } catch (err) {
        setFile(null);
      }
    };

    if (fileId) {
      fetch();
    }
  }, [fileId, fetchFile]);

  return file;
};

// This component renders the generated code.
// It gets the generated code via message passing to the host window.
export function VisualizationWrapper({ actionId }: { actionId: string }) {
  type RunnerParams = {
    code: string;
    scope: Record<string, unknown>;
  };

  const [runnerParams, setRunnerParams] = useState<RunnerParams | null>(null);

  const [errored, setErrored] = useState<Error | null>(null);
  const actionIdParsed = parseInt(actionId, 10);

  const { fetchCode, error, retry } = useVisualizationAPI(actionIdParsed);

  useEffect(() => {
    const loadCode = async () => {
      try {
        const fetchedCode = await fetchCode();
        if (!fetchedCode) {
          setErrored(new Error("No visualization code found"));
        } else {
          setRunnerParams({
            code: "() => {import Comp from '@dust/generated-code'; return (<Comp />);}",
            scope: {
              import: {
                recharts: rechartsAll,
                react: reactAll,
                "@dust/generated-code": importCode(fetchedCode, {
                  import: {
                    recharts: rechartsAll,
                    react: reactAll,
                    papaparse: papaparseAll,
                    "@dust/react-hooks": {
                      useFile: (fileId: string) =>
                        useFile(actionIdParsed, fileId),
                    },
                  },
                }),
              },
            },
          });
        }
      } catch (error) {
        setErrored(new Error("Failed to fetch visualization code"));
      }
    };

    loadCode();
  }, [fetchCode, actionIdParsed]);

  const sendHeightToParent = useCallback(
    ({ height }: { height: number | null }) => {
      if (height === null) {
        return;
      }
      const sendHeight = makeIframeMessagePassingFunction<"setContentHeight">(
        "setContentHeight",
        actionIdParsed
      );
      sendHeight({ height });
    },
    [actionIdParsed]
  );

  const { ref } = useResizeDetector({
    handleHeight: true,
    refreshMode: "debounce",
    refreshRate: 500,
    onResize: sendHeightToParent,
  });

  useEffect(() => {
    if (error) {
      setErrored(error);
    }
  }, [error]);

  if (errored) {
    return (
      <VisualizationError
        error={errored}
        retry={() => retry(errored.message)}
      />
    );
  }

  if (!runnerParams) {
    return <Spinner />;
  }

  return (
    <div ref={ref}>
      <Runner
        code={runnerParams.code}
        scope={runnerParams.scope}
        onRendered={(error) => {
          if (error) {
            setErrored(error);
          }
        }}
      />
    </div>
  );
}

// This is the component to render when an error occurs.
function VisualizationError({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      <ErrorMessage title="Error">
        <>
          We encountered an error while running the code generated above. You
          can try again by clicking the button below.
          <div className="mt-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-pink-700 underline focus:outline-none"
            >
              {showDetails ? "Hide details" : "Show details"}
            </button>
            {showDetails && (
              <div className="mt-2 p-2 bg-pink-50 rounded">
                <strong>Error message:</strong> {error.message}
              </div>
            )}
          </div>
        </>
      </ErrorMessage>
      <div>
        <Button label="Retry" onClick={retry} />
      </div>
    </div>
  );
}

type ErrorBoundaryProps = {
  actionId: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: unknown;
};

// This is the error boundary component that wraps the VisualizationWrapper component.
// It needs to be a class component for error handling to work.
export class VisualizationWrapperWithErrorHandling extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.setState({ hasError: true, error });
  }

  render() {
    if (this.state.hasError) {
      let error: Error;
      if (this.state.error instanceof Error) {
        error = this.state.error;
      } else {
        error = new Error("Unknown error.");
      }

      const retry = makeIframeMessagePassingFunction(
        "retry",
        parseInt(this.props.actionId, 10)
      );
      return <VisualizationError error={error} retry={() => retry} />;
    }

    return <VisualizationWrapper actionId={this.props.actionId} />;
  }
}
