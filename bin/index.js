#!/usr/bin/env node
import ossPublish from "../lib/index.js";
import untildify from "untildify";
import fs from "fs-extra";
import path from "path";
import { Command } from "commander/esm.mjs";
import YAML from "yaml";

const program = new Command();

// 只支持json配置文件
// 处理参数 oss-publish --config=filePath(没有就找oss-publish.json)
// access_key_id，access_key_secret先从process.env上拿，拿不到从 ~/.fcli/config.yaml拿,如果type非ali, config.yaml前面加"s3-"等type
// 其余的从 oss-publish.json中拿，bucket参数

//命令行 oss-publish
function getAk(type) {
  let akId = process.env.access_key_id;
  let akSecret = process.env.access_key_secret;

  if (!akId || !akSecret) {
    let u = "~/.fcli/config.yaml"
    if(type && type!=='ali'){
      u = `~/.fcli/${type}-config.yaml`
    }
    const credentialsFile = untildify(u);
    if (!fs.existsSync(credentialsFile)) {
      console.error(
        "\x1b[31m",
        "can not find access_key_id and access_key_secret, check if it includes in process.env or ~/fcli/config.yaml",
        "\x1b[m"
      );
      process.exit(1);
    }
    const credentials = parseCredentials(credentialsFile);
    if (!credentials.accessKeyId || !credentials.accessKeySecret) {
      console.error(
        "\x1b[31m",
        "can not find access_key_id and access_key_secret, check if it includes in process.env or ~/fcli/config.yaml",
        "\x1b[m"
      );
      process.exit(1);
    }
    akId = credentials.accessKeyId;
    akSecret = credentials.accessKeySecret;
  }
  return {
    akId,
    akSecret,
  };
}

function parseCredentials(file) {
  const content = fs.readFileSync(file, "utf8");
  const doc = YAML.parse(content);
  return {
    accessKeyId: doc.access_key_id,
    accessKeySecret: doc.access_key_secret,
  };
}

function getOssOptions() {
  ///region/endpoint, accessKeyId, accessKeySecret, bucket
  program.option("-c, --config", "config file path");

  program.parse(process.argv);

  const options = program.opts();
  let configPath = null;

  //不在参数上设置配置文件路径，就找一次默认文件
  if (!options.config) {
    const defaultConfigPath = path.join(process.cwd(), "oss-publish.json");
    if (!fs.existsSync(defaultConfigPath)) {
      console.error(
        "\x1b[31m",
        "can not find config file oss-publish.json",
        "\x1b[m"
      );
      process.exit(1);
    } else {
      configPath = defaultConfigPath;
    }
  } else {
    configPath = path.join(options.config);
    if (!fs.existsSync(configPath)) {
      console.error("\x1b[31m", "can not find config file", "\x1b[m");
      process.exit(1);
    }
  }
  //找到了文件，读取
  let configJson = fs.readJsonSync(configPath);
  configJson = checkConfigJson(configJson);
  return configJson;
}

function checkConfigJson(configJson) {
  if (!configJson.type) {
    configJson.type = "ali";
  }

  if (!configJson.region&&!configJson.endpoint) {
    console.error("\x1b[31m", "can not find region or endpoint params", "\x1b[m");
    process.exit(1);
  }

  if (!configJson.bucket) {
    console.error("\x1b[31m", "can not find bucket params", "\x1b[m");
    process.exit(1);
  }

  if (!configJson.baseDir) {
    console.error("\x1b[31m", "can not find baseDir params", "\x1b[m");
    process.exit(1);
  }
  if (!fs.existsSync(configJson.baseDir)) {
    console.error("\x1b[31m", "baseDir is not exist", "\x1b[m");
    process.exit(1);
  }

  return configJson;
}

function getAllOptions() {
  const configJson = getOssOptions();
  const { akId, akSecret } = getAk(configJson.type);

  return {
    ...configJson,
    accessKeyId: akId,
    accessKeySecret: akSecret,
  };
}

const options = getAllOptions();
ossPublish(options);
