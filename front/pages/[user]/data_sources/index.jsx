import AppLayout from "@app/components/AppLayout";
import MainTab from "@app/components/profile/MainTab";
import { Button } from "@app/components/Button";
import { unstable_getServerSession } from "next-auth/next";
import { authOptions } from "@app/pages/api/auth/[...nextauth]";
import { PlusIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { classNames } from "@app/lib/utils";

const { URL, GA_TRACKING_ID = null } = process.env;

export default function DataSourcesView({
  dataSources,
  readOnly,
  user,
  ga_tracking_id,
}) {
  const { data: session } = useSession();

  return (
    <AppLayout ga_tracking_id={ga_tracking_id}>
      <div className="flex flex-col">
        <div className="flex flex-initial mt-2">
          <MainTab currentTab="DataSources" user={user} readOnly={readOnly} />
        </div>
        <div className="">
          <div className="mx-auto sm:max-w-2xl lg:max-w-4xl px-6 divide-y divide-gray-200 mt-8">
            <div>
              {readOnly ? null : (
                <div className="sm:flex sm:items-center">
                  <div className="sm:flex-auto"></div>
                  <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <Link
                      href={`/${session.user.username}/data_sources/new`}
                      onClick={(e) => {
                        // Enforce FreePlan limit: 1 DataSource.
                        if (dataSources.length >= 1 && user !== "spolu") {
                          e.preventDefault();
                          window.alert(
                            "You are limited to 1 DataSource on our free plan. Contact team@dust.tt if you want to increase this limit."
                          );
                          return;
                        }
                      }}
                    >
                      <Button>
                        <PlusIcon className="-ml-1 mr-1 h-5 w-5" />
                        New DataSource
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              <div className="overflow-hidden mt-8">
                <ul role="list" className="">
                  {dataSources.map((ds) => (
                    <li key={ds.id} className="px-2">
                      <div className="py-4">
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/${user}/ds/${ds.name}`}
                            className="block"
                          >
                            <p className="truncate text-base font-bold text-violet-600">
                              {ds.name}
                            </p>
                          </Link>
                          <div className="ml-2 flex flex-shrink-0">
                            <p
                              className={classNames(
                                "inline-flex rounded-full px-2 text-xs font-semibold leading-5",
                                ds.visibility == "public"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              )}
                            >
                              {ds.visibility}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-700">
                              {ds.description}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-300 sm:mt-0">
                            <p></p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                  {dataSources.length == 0 ? (
                    <div className="flex flex-col items-center justify-center text-sm text-gray-500 mt-10">
                      {readOnly ? (
                        <>
                          <p>
                            Welcome to Dust DataSources 🔎{" "}
                            <span className="font-bold">{user}</span> has not
                            created any data source yet 🙃
                          </p>
                          <p className="mt-2">
                            Sign-in to create your own data source.
                          </p>
                        </>
                      ) : (
                        <>
                          <p>Welcome to Dust DataSources 🔎</p>
                          <p className="mt-2">
                            Data sources let you upload documents to perform
                            semantic searches on them (
                            <span className="rounded-md px-1 py-0.5 bg-gray-200 font-bold">
                              data_source
                            </span>{" "}
                            block).
                          </p>
                        </>
                      )}
                    </div>
                  ) : null}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export async function getServerSideProps(context) {
  const session = await unstable_getServerSession(
    context.req,
    context.res,
    authOptions
  );

  let readOnly = !session || context.query.user !== session.user.username;

  const [dataSourcesRes] = await Promise.all([
    fetch(`${URL}/api/data_sources/${context.query.user}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: context.req.headers.cookie,
      },
    }),
  ]);

  if (dataSourcesRes.status === 404) {
    return {
      notFound: true,
    };
  }

  const [dataSources] = await Promise.all([dataSourcesRes.json()]);

  return {
    props: {
      session,
      dataSources: dataSources.dataSources,
      readOnly,
      user: context.query.user,
      ga_tracking_id: GA_TRACKING_ID,
    },
  };
}
