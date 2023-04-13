use crate::blocks::block::{parse_pair, Block, BlockType, Env};
use crate::Rule;
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use js_sandbox::Script;
use pest::iterators::Pair;
use serde_json::Value;
use tokio::sync::mpsc::UnboundedSender;

#[derive(Clone)]
pub struct While {
    condition_code: String,
    max_iterations: usize,
}

impl While {
    pub fn parse(block_pair: Pair<Rule>) -> Result<Self> {
        let mut condition_code: Option<String> = None;
        let mut max_iterations: Option<usize> = None;

        for pair in block_pair.into_inner() {
            match pair.as_rule() {
                Rule::pair => {
                    let (key, value) = parse_pair(pair)?;
                    match key.as_str() {
                        "condition_code" => condition_code = Some(value),
                        "max_iterations" => match value.parse::<usize>() {
                            Ok(n) => max_iterations = Some(n),
                            Err(_) => Err(anyhow!(
                                "Invalid `max_iterations` in `while` block, \
                                  expecting unsigned integer"
                            ))?,
                        },
                        _ => Err(anyhow!("Unexpected `{}` in `while` block", key))?,
                    }
                }
                Rule::expected => Err(anyhow!("`expected` is not yet supported in `while` block"))?,
                _ => unreachable!(),
            }
        }

        if !condition_code.is_some() {
            Err(anyhow!(
                "Missing required `condition_code` in `while` block"
            ))?;
        }
        if !max_iterations.is_some() {
            Err(anyhow!(
                "Missing required `max_iterations` in `while` block"
            ))?;
        }

        if max_iterations.unwrap() >= 32 {
            Err(anyhow!("`max_iterations` cannot be greater than 32"))?;
        }

        Ok(While {
            condition_code: condition_code.unwrap(),
            max_iterations: max_iterations.unwrap(),
        })
    }
}

#[async_trait]
impl Block for While {
    fn block_type(&self) -> BlockType {
        BlockType::While
    }

    fn inner_hash(&self) -> String {
        let mut hasher = blake3::Hasher::new();
        hasher.update("while".as_bytes());
        hasher.update(self.condition_code.as_bytes());
        hasher.update(self.max_iterations.to_string().as_bytes());
        format!("{}", hasher.finalize().to_hex())
    }

    async fn execute(
        &self,
        _name: &str,
        env: &Env,
        _event_sender: Option<UnboundedSender<Value>>,
    ) -> Result<Value> {
        let e = env.clone();

        // Directly return false if we have reached max_iterations
        match env.map.as_ref() {
            None => unreachable!(),
            Some(w) => {
                if w.iteration >= self.max_iterations {
                    return Ok(Value::Bool(false));
                }
            }
        }

        // replace <DUST_TRIPLE_BACKTICKS> with ```
        let condition_code = self
            .condition_code
            .replace("<DUST_TRIPLE_BACKTICKS>", "```");

        let condition_value: Value = match tokio::task::spawn_blocking(move || {
            let mut script = Script::from_string(condition_code.as_str())?
                .with_timeout(std::time::Duration::from_secs(10));
            script.call("_fun", (&e,))
        })
        .await?
        {
            Ok(v) => v,
            Err(e) => Err(anyhow!("Error in `condition_code`: {}", e))?,
        };

        match condition_value {
            Value::Bool(b) => Ok(Value::Bool(b)),
            _ => Err(anyhow!(
                "Invalid return value from `condition_code`, expecting boolean"
            ))?,
        }
    }

    fn clone_box(&self) -> Box<dyn Block + Sync + Send> {
        Box::new(self.clone())
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}
