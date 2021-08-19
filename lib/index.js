import aliOssPublish from "./ali-oss-publish.js";

/**
 * options.type,  required, default 'ali'
 * options.accessKeyId,  required
 * options.accessKeySecret, required,
 * options.region, required
 * options.bucket, required
 * options.baseDir, required, 相对路径，eg(build or dist)，程序处理为process.cwd() + baseDir
 **/

export default function ossPublish(options) {
  switch (options.type) {
    case "ali":
      aliOssPublish(options);
      break;
    default:
      console.error("\x1b[31m", "type is invalid", "\x1b[m");
      return;
  }
}
