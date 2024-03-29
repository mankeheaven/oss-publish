# oss-publish
发布静态资源到oss上，支持命令行方式，或者调用主程序入口

目前支持阿里云oss, s3（aws和浪潮云，阿里云也可以用type:"s3"，需要endpoint）

### 如何使用

1. 安装
```
npm install @mankeheaven/oss-publish --save-dev
```

2. 命令行发布使用方式
编写配置文件oss-publish.json， 目前仅支持json配置文件
```
{
  "type": "ali", //ali或者s3
  "accessKeyId": "your ak id",
  "accessKeySecret": "your ak secret",
  "bucket": "your bucket name",
  "region": "your region", //例如：oss-cn-shanghai
  "baseDir": "build", //你要发布的目录，dist or build or other...
  "clearBeforePublish": true, //是否先清空
  "defaultWebsiteEntry": "index.html", //如果有html，默认首页入口
  "errorWebsiteEntry": "404.html", //可以用来自定义404页面，默认是error.html
  "supportSubDir": true, //子目录首页, type为s3时候，不支持
}
```
或者配置文件改名字，xxx.json

编写scripts脚本,如果你的配置名称就是oss-publish.json，可以省略--config
```
oss-publish --config xxx.json
```

**另外，需要access_key_id，access_key_secret**，这两者会优先从process.env上拿，如果你想通过ci来发布，可以在ci上设置这两个值为环境变量

如果你想本地发布，可以配置~/.fcli/config.yaml文件, 优先级低于环境变量,如果是s3, 配置~/.fcli/s3-config.yaml
```
access_key_id: "your ak id"
access_key_secret: "your ak seceret"
```

3. 程序使用方式
```
import ossPublish from '@mankeheaven/oss-publish';

ossPublish({
  "type": "s3",
  "accessKeyId": "your ak id",
  "accessKeySecret": "your ak secret",
  "bucket": "your bucket name",
  "region": "your region", //例如：oss-cn-shanghai,
  "endpoint": "https://oss-cn-hangzhou.aliyuncs.com",
  "baseDir": "build", //你要发布的目录，dist or build or other...
  "clearBeforePublish": true, //是否先清空
  "defaultWebsiteEntry": "index.html", //如果有html，默认首页入口
  "errorWebsiteEntry": "404.html", //可以用来自定义404页面，默认是error.html
  "supportSubDir": true, //子目录首页, type为s3时候，不支持
  "poolLimit": 50, // 上传池最大限制
  "poolTimeout: 10000 //上传超时
})

```

### 注意

阿里云如果是想访问静态html, 必须配置自定义域名

### TODO
- [ ] 支持ts
- [ ] schema做验证
