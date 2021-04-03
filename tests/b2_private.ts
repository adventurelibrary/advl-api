import {S3, Credentials} from 'aws-sdk';
import YAML from 'yamljs';

const linkExpiryInSeconds = 60*60 //1 hr
const env = YAML.load('src/.env.yml').backblaze;

console.log(GetURL());


export async function GetURL(){
  const b2 = new S3({
    endpoint: env.B2_ENDPOINT,
    credentials: new Credentials({accessKeyId: env.B2_KEYID, secretAccessKey:env.B2_KEY}),
    signatureVersion: "v4"
  })

  /*
  let signedUrl = b2.getSignedUrl('getObject', {
    Bucket: 'advl-test',
    Key: `advl-test/Mountain_Dig_Site-9f35a417a1d344898c0a02852190b2b3/thumb.webp`,
    Expires: linkExpiryInSeconds
  })
  */
  let signedUrl = await b2.getSignedUrlPromise('getObject', {
    Bucket: 'advl-test',
    Key: `advl-test/Mountain_Dig_Site-9f35a417a1d344898c0a02852190b2b3/thumb.webp`,
    Expires: linkExpiryInSeconds
  })
  console.log(signedUrl);
  return signedUrl;
}

/*
console.log(GetURL());
export function GetURL(){
  const backupConfig = config.credentials;
  config.credentials.accessKeyId = env.backblaze.B2_KEYID
  config.credentials.secretAccessKey = env.backblaze.B2_KEY
  const b2 = new S3({endpoint: new Endpoint('s3.us-west-000.backblazeb2.com')})
  let signedUrl = b2.getSignedUrl('getObject', {
    Bucket: 'advl-public-assets',
    Key: `watermark_logo.png`,
    Expires: linkExpiryInSeconds
  })

  //Reset AWS Credentials back to AWS for use with Dynamo/others
  config.credentials = backupConfig;
  return signedUrl;
}
*/

