use anyhow::Result;
use clap::{Parser, Subcommand};
use dust::{app, data, init, providers::provider, utils};

#[derive(Parser)]
#[clap(author, version, about, long_about = None)]
struct Cli {
    #[clap(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new Dust project
    Init {
        /// Path to the directory to init
        #[clap(default_value = ".")]
        path: String,
    },
    /// Manage versioned JSONL data files
    Data {
        #[clap(subcommand)]
        command: DataCommands,
    },
    /// Manage model provicers
    Provider {
        #[clap(subcommand)]
        command: ProviderCommands,
    },
    /// Runs an app on registered data using the specified model
    Run {
        /// Data id to run the app on
        #[clap(required = true)]
        data_id: String,

        /// Provider id
        #[clap(required = true)]
        provider_id: provider::ProviderID,

        /// Model id
        #[clap(required = true)]
        model_id: String,

        /// Concurrency
        #[clap(short, long, default_value = "8")]
        concurrency: usize,
    },
}

#[derive(Subcommand)]
enum DataCommands {
    /// Registers or udpates a new data JSONL version under the provided id. The JSONL data will be
    /// checked and stored in the Dust directory under `.data/<id>/<hash>`.
    Register {
        /// Data id to register or update
        #[clap(required = true)]
        data_id: String,
        /// Path to the JSONL data file
        #[clap(required = true)]
        jsonl_path: String,
    },
}

#[derive(Subcommand)]
enum ProviderCommands {
    /// Provides instructions to setup a new provider.
    Setup {
        /// Provider id
        #[clap(required = true)]
        provider_id: provider::ProviderID,
    },
    /// Tests whether a provider is properly setup.
    Test {
        /// Provider id
        #[clap(required = true)]
        provider_id: provider::ProviderID,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .thread_name("dust")
        .worker_threads(32)
        .build()?;

    let err = match &cli.command {
        Commands::Init { path } => rt.block_on(init::cmd_init(path)),
        Commands::Data { command } => match command {
            DataCommands::Register {
                data_id,
                jsonl_path,
            } => rt.block_on(data::cmd_register(data_id, jsonl_path)),
        },
        Commands::Provider { command } => match command {
            ProviderCommands::Setup { provider_id } => {
                rt.block_on(provider::cmd_setup(*provider_id))
            }
            ProviderCommands::Test { provider_id } => rt.block_on(provider::cmd_test(*provider_id)),
        },
        Commands::Run {
            data_id,
            provider_id,
            model_id,
            concurrency,
        } => rt.block_on(app::cmd_run(data_id, *provider_id, model_id, *concurrency)),
    };

    match err {
        Err(e) => {
            utils::error(&format!("{}", e));
        }
        _ => (),
    }

    Ok(())
}
