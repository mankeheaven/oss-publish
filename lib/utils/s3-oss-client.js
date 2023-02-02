import S3 from "aws-sdk/clients/s3.js";
import fs from "fs-extra";

//把s3的api包装成promise接口
//实现部分api, 跟ali-oss相似
class S3OssClient {
  constructor(options) {
    this.options = options;
    this.useBucketFlag = options?.bucket;

    this.client = new S3({
      endpoint: options?.endpoint,
      region: options.region,
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.accessKeySecret,
    });
  }

  //如果不存在，创建bucket
  async putBucket(bucket) {
    return new Promise(async (resolve, reject) => {
      const exits = await this._hasBucket(bucket);
      if (!exits) {
        this.client.createBucket(
          {
            Bucket: bucket,
          },
          (err) => {
            if (!!err) {
              reject(err);
            } else {
              resolve(true);
            }
          }
        );
      } else {
        resolve(false);
      }
    });
  }

  //设置bucket acl
  async putBucketACL(bucket, acl) {
    return new Promise((resolve, reject) => {
      this.client.putBucketAcl(
        {
          Bucket: bucket,
          ACL: acl,
        },
        (err) => {
          if (!!err) {
            reject(err);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  async useBucket(bucket) {
    this.useBucketFlag = bucket;
  }

  //获取bucket下的所有object
  async list() {
    return new Promise((resolve, reject) => {
      if (!this.useBucketFlag) {
        reject("bucket not exits");
      } else {
        this.client.listObjects(
          {
            Bucket: this.useBucketFlag,
          },
          (err, data) => {
            if (!!err) {
              reject(err);
            } else {
              const dm = data.Contents?.map((d) => {
                return { ...d, name: d.Key };
              })
              resolve({
               objects: dm || []
              }
              );
            }
          }
        );
      }
    });
  }

  //清理bucket下所有的object
  async deleteMulti(dels) {
    return new Promise((resolve, reject) => {
      if (!this.useBucketFlag) {
        reject("bucket not exits");
      } else {
        if(!dels.length){
          resolve(true)
        }
        this.client.deleteObjects(
          {
            Bucket: this.useBucketFlag,
            Delete: {
              Objects: dels.map((d) => {
                return {
                  Key: d,
                };
              }),
            },
          },
          (err, data) => {
            if (!!err) {
              reject(err);
            } else {
              resolve(data);
            }
          }
        );
      }
    });
  }

  //设置bucket website
  //TODO 子目录首页
  async putBucketWebsite(bucket, cfg) {
    return new Promise((resolve, reject) => {
      this.client.putBucketWebsite(
        {
          Bucket: bucket,
          WebsiteConfiguration: {
            IndexDocument: {Suffix: cfg?.index || undefined},
            ErrorDocument: {Key: cfg?.error || undefined},
          },
        },
        (err) => {
          if (!!err) {
            reject(err);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  //上传某个object, file只能是路径
  async put(name, file) {
    return new Promise((resolve, reject) => {
      if (!this.useBucketFlag) {
        reject("bucket not exits");
      } else {
        try{
        const data = fs.readFileSync(file)
        this.client.putObject(
          {
            Bucket: this.useBucketFlag,
            Key: name,
            Body: data
          },
          (err, data) => {
            if(!!err){
              reject(err)
            }else {
              resolve(data)
            }
          }
        );
        }catch(e){
          reject(e)
        }
      }
    });
  }

  async _listBuckets() {
    return new Promise((resolve, reject) => {
      this.client.listBuckets((err, data) => {
        if (!!err) {
          reject(err);
        } else {
          resolve(data?.Buckets?.map((b) => b?.Name));
        }
      });
    });
  }
  async _hasBucket(bucketName) {
    const lists = await this._listBuckets();
    if (lists?.includes(bucketName)) {
      return true;
    }
    return false;
  }
}
export default S3OssClient;
