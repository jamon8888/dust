import { Menu, Transition } from "@headlessui/react";
import { classNames, fetcher } from "../../lib/utils";
import { Fragment } from "react";
import { useDatasets } from "../../lib/swr";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

export default function DatasetPicker({
  user,
  dataset,
  readOnly,
  app,
  onDatasetUpdate,
}) {
  let { datasets, isDatasetsLoading, isDatasetsError } = readOnly
    ? {
        datasets: [],
        isDatasetsLoading: false,
        isDatasetsError: false,
      }
    : useDatasets(user, app);

  // Remove the dataset if it was suppressed.
  if (
    !readOnly &&
    !isDatasetsLoading &&
    !isDatasetsError &&
    dataset &&
    datasets.filter((d) => d.name == dataset).length == 0
  ) {
    setTimeout(() => {
      onDatasetUpdate("");
    });
  }

  return (
    <div className="flex items-center">
      {dataset ? (
        <Link href={`/${user}/a/${app.sId}/datasets/${dataset}`}>
          <a>
            <div className="font-bold text-violet-600 text-sm">{dataset}</div>
          </a>
        </Link>
      ) : (
        ""
      )}
      <Menu as="div" className="relative inline-block text-left">
        <div>
          {datasets.length == 0 && !dataset && !readOnly ? (
            <Link href={`/${user}/a/${app.sId}/datasets/new`}>
              <a
                className={classNames(
                  "inline-flex items-center rounded-md py-1 text-sm font-normal",
                  dataset ? "px-1" : "border px-3",
                  readOnly
                    ? "text-gray-300 border-white"
                    : "text-gray-700 border-orange-400",
                  "focus:outline-none focus:ring-0"
                )}
              >
                {isDatasetsLoading ? "Loading..." : "Create dataset"}
              </a>
            </Link>
          ) : readOnly ? null : (
            <Menu.Button
              className={classNames(
                "inline-flex items-center rounded-md py-1 text-sm font-normal",
                dataset ? "px-0" : "border px-3",
                readOnly
                  ? "text-gray-300 border-white"
                  : "text-gray-700 border-orange-400",
                "focus:outline-none focus:ring-0"
              )}
              readOnly={readOnly}
            >
              {dataset ? (
                <>
                  &nbsp;
                  <ChevronDownIcon className="h-4 w-4 hover:text-gray-700 mt-0.5" />
                </>
              ) : (
                "Select dataset"
              )}
            </Menu.Button>
          )}
        </div>

        {readOnly ? null : (
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items
              className={classNames(
                "absolute shadow left-1 z-10 mt-1 origin-top-left rounded-md bg-white ring-1 ring-black ring-opacity-5 focus:outline-none",
                dataset ? "-left-8" : "left-1"
              )}
            >
              <div className="py-1">
                {datasets.map((d) => {
                  return (
                    <Menu.Item
                      key={d.name}
                      onClick={() => onDatasetUpdate(d.name)}
                    >
                      {({ active }) => (
                        <span
                          className={classNames(
                            active
                              ? "bg-gray-50 text-gray-900"
                              : "text-gray-700",
                            "block px-4 py-2 text-sm cursor-pointer whitespace-nowrap"
                          )}
                        >
                          {d.name}
                        </span>
                      )}
                    </Menu.Item>
                  );
                })}
                <Menu.Item key="__create_dataset" onClick={() => {}}>
                  {({ active }) => (
                    <a>
                      <Link href={`/${user}/a/${app.sId}/datasets/new`}>
                        <div
                          className={classNames(
                            active
                              ? "bg-gray-50 text-gray-500"
                              : "text-gray-400",
                            "block px-4 py-2 text-sm font-normal cursor-pointer whitespace-nowrap"
                          )}
                        >
                          Create new dataset
                        </div>
                      </Link>
                    </a>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        )}
      </Menu>
    </div>
  );
}
