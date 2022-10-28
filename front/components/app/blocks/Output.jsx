import { classNames } from "../../../lib/utils";
import { useSavedRunBlock } from "../../../lib/swr";
import {
  ExclamationCircleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "@heroicons/react/20/solid";
import { useEffect, useState } from "react";

function ObjectViewer({ block, value }) {
  return (
    <div className="flex flex-col">
      {Object.keys(value).map((key, index) => (
        <ValueViewer key={key} block={block} value={value[key]} k={key} />
      ))}
    </div>
  );
}

function ArrayViewer({ block, value }) {
  return (
    <div className="flex flex-col">
      {value.map((item, index) => (
        <ValueViewer key={index} block={block} value={item} k={index} />
      ))}
    </div>
  );
}

function ValueViewer({ block, value, k }) {
  const summary = (value) => {
    if (Array.isArray(value)) {
      return `[ ${value.length} items ]`;
    }
    if (typeof value === "object" && value !== null) {
      return `{ ${Object.keys(value).join(", ")} }`;
    }
    return value;
  };

  const isExpandable = (value) => {
    return (
      Array.isArray(value) || (typeof value === "object" && value !== null)
    );
  };

  const autoExpand = (value) => {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      let flat = true;
      let keys = Object.keys(value);
      for (let i = 0; i < keys.length; i++) {
        if (isExpandable(value[keys[i]])) {
          flat = false;
        }
      }
      return flat;
    }
    return false;
  };

  const [expanded, setExpanded] = useState(autoExpand(value));

  return (
    <div>
      {isExpandable(value) ? (
        <>
          <div className="flex flex-row items-center text-sm">
            <div className="flex-initial text-gray-400 cursor-pointer">
              {expanded ? (
                <div onClick={() => setExpanded(false)}>
                  <span className="flex flex-row items-center">
                    <ChevronDownIcon className="h-4 w-4 mt-0.5" />
                    {k != null ? (
                      <span className="text-gray-700 mr-1 font-bold">{k}:</span>
                    ) : null}
                    <span className="text-gray-400">{summary(value)}</span>
                  </span>
                </div>
              ) : (
                <div onClick={() => setExpanded(true)}>
                  <span className="flex flex-row items-center">
                    <ChevronRightIcon className="h-4 w-4 mt-0.5" />
                    {k != null ? (
                      <span className="text-gray-700 mr-1 font-bold">{k}:</span>
                    ) : null}
                    <span className="text-gray-400">{summary(value)}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
          {expanded ? (
            <div className="flex ml-4">
              {Array.isArray(value) ? (
                <ArrayViewer value={value} block={block} />
              ) : typeof value == "object" ? (
                <ObjectViewer value={value} block={block} />
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex text-sm text-gray-600 ml-4">
          {k != null ? (
            <span className="text-gray-700 mr-1 font-bold">{k}:</span>
          ) : null}
          <span className="whitespace-pre-wrap">{value}</span>
        </div>
      )}
    </div>
  );
}

function Error({ error }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className="flex flex-row items-center text-sm">
        <div className="flex-initial text-gray-400 cursor-pointer">
          {expanded ? (
            <div onClick={() => setExpanded(false)}>
              <span className="flex flex-row items-center">
                <ChevronDownIcon className="h-4 w-4 mt-0.5" />
                <span className="text-sm text-gray-400 italic">error</span>
              </span>
            </div>
          ) : (
            <div onClick={() => setExpanded(true)}>
              <span className="flex flex-row items-center">
                <ChevronRightIcon className="h-4 w-4 mt-0.5" />
                <span className="text-sm text-gray-400 italic">error</span>
              </span>
            </div>
          )}
        </div>
      </div>
      {expanded ? (
        <div className="flex text-sm text-red-400 ml-4">
          <div className="flex-auto">{error.split(" (sandboxed.js")[0]}</div>
        </div>
      ) : null}
    </div>
  );
}

export default function Output({ user, block, status, app }) {
  let { run, isRunLoading, isRunError } = useSavedRunBlock(
    user,
    app,
    block.type,
    block.name,
    (data) => {
      if (data && data.run) {
        switch (data?.run.status.run) {
          case "running":
            return 100;
          default:
            return 0;
        }
      }
      return 0;
    }
  );

  if (
    run &&
    run.traces.length > 0 &&
    run.traces[0].length > 0 &&
    run.traces[0][1].length > 0 &&
    !["reduce"].includes(block.type)
  ) {
    let traces = run.traces[0][1];
    return (
      <div className="flex flex-col flex-auto">
        {traces.map((trace, i) => {
          return (
            <div key={i} className="flex flex-row flex-auto ml-1">
              <div className="flex text-sm text-gray-300 mr-2">{i}:</div>
              <div className="flex flex-auto flex-col overflow-hidden">
                {trace.map((t, i) => {
                  return (
                    <div key={i} className="flex-auto flex-col">
                      {t.error != null ? (
                        <div className="flex flex-auto flex-row">
                          <ExclamationCircleIcon className="flex h-4 w-4 text-red-400 mt-0.5" />
                          <Error error={t.error} />
                        </div>
                      ) : (
                        <div className="flex flex-row">
                          <div className="flex flex-initial">
                            <CheckCircleIcon className="text-emerald-300 h-4 w-4 min-w-4 mt-0.5" />
                          </div>
                          <div className="flex flex-1">
                            <ValueViewer block={block} value={t.value} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  } else {
    return <></>;
  }
}
