import OSS from "ali-oss";
import S3OssClient from "./utils/s3-oss-client.js";
import fs from "fs-extra";
import path from "path";
import ProgressBar from "progress";

/**
 * options.type,  required, default 'ali'
 * options.accessKeyId,  required
 * options.accessKeySecret, required,
 * options.region, required
 * options.endpoint, optionial
 * options.bucket, required
 * options.baseDir, required, 相对路径，eg(build or dist)，程序处理为process.cwd() + baseDir
 **/

//type ali的时候，可以用region
//type s3的时候，必须指定endpoint, 如果给浪潮云用，region会走到aws的地址
export default function ossPublish(options) {
  const ossConfig = {
    region: options.region,
    endpoint: options?.endpoint,
    accessKeyId: options.accessKeyId,
    accessKeySecret: options.accessKeySecret,
    bucket: options.bucket,
  };
  let store
  switch (options.type) {
    case "ali":
      store = new OSS(ossConfig);
      publish(store, options);
      break;
    case "s3":
      store = new S3OssClient(ossConfig);
      publish(store, options);
      break;
    default:
      console.error("\x1b[31m", "type is invalid", "\x1b[m");
      return;
  }
}


async function publish(store,options) {

  const files2publish = [];
  let successCount = 0;
  let failCount = 0;

  //检查一遍bucket,不存在就创建
  try {
    await store.putBucket(options.bucket);
    await store.putBucketACL(options.bucket, "public-read");
    await store.useBucket(options.bucket);
    console.info(`创建bucket:`, options.bucket);
  } catch (error) {
    console.info(`bucket已存在:`, options.bucket);
  }

  //检查是否需要提前清空
  if(options.clearBeforePublish){
    try{
      const objs = await store.list()
      const dels = objs.objects.map((o) => o.name)
      await store.deleteMulti(dels)
      console.info('清理了bucket内容：', dels)
    }catch(error) {
      console.info('清理bucket失败：', error)
    }
  }

  //如果有入口html, 设置
  if (!!options.defaultWebsiteEntry) {
    const cfg = {
      index: options.defaultWebsiteEntry,
      supportSubDir: options.supportSubDir || false
    }
    if(!!options.errorWebsiteEntry){
      cfg.error = options.errorWebsiteEntry
    }
    await store.putBucketWebsite(options.bucket, cfg);
  }

  console.log("扫描文件中...");
  let readBar = new ProgressBar("已扫描:atotal个文件", {
    total: 0,
  });
  await calculate(
    path.join(process.cwd(), options.baseDir),
    path.join(process.cwd(), options.baseDir)
  );
  readBar.tick({
    atotal: files2publish.length,
  });

  let i = 0,
    length = files2publish.length;
  let bar = new ProgressBar(
    "[:bar]   :finished/:atotal 出错:failCount个 :file",
    {
      total: length,
      incomplete: " ",
      width: 30,
      complete: "=",
    }
  );

  //遍历上传
  console.info("开始上传...");
  for (; i < length; i++) {
    let result = await put(files2publish[i].name, files2publish[i].filePath);
    let m = files2publish[i].name;
    if (result === true) {
      successCount++;
    } else {
      m = m + ":" + result;
      failCount++;
    }
    bar.tick(1, {
      atotal: length,
      finished: successCount + failCount,
      file: m,
      failCount: failCount,
    });
  }
  console.info("上传结束.");

  //递归计算
  async function calculate(baseDir, prefixDir) {
    const files = await fs.readdir(prefixDir);
    if (!files.length) {
      return;
    }
    for (let i = 0; i < files.length; i++) {
      const filePath = path.join(prefixDir, files[i]);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        await calculate(baseDir, path.join(prefixDir, files[i]));
      } else if (stat.isFile) {
        const relativePath = path.relative(baseDir, filePath);
        const name = path.normalize(relativePath);
        files2publish.push({ name: name.split("\\").join("/"), filePath });
      }
    }
  }

  async function put(object, file) {
    try {
      // object表示上传到OSS的Object名称，file表示本地文件或者文件路径
      await store.put(object, file);
      return true;
    } catch (e) {
      return e.message;
    }
  }
}

