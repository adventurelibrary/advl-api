import {config, S3, Endpoint} from 'aws-sdk';
import { Asset, image_file_resolutions } from '../../interfaces/IAsset';

const linkExpiryInSeconds = 60*60 //1 hr

export function GetURL(type:image_file_resolutions, asset:Asset){
  const backupConfig = config.credentials;
  //Temp set the AWS credentials to B2 to access B2 with S3 API
  config.credentials.accessKeyId = process.env.B2_KEYID
  config.credentials.secretAccessKey = process.env.B2_KEY
  const b2 = new S3({endpoint: new Endpoint(process.env.B2_ENDPOINT)})
  let ext = type == 'original' ? asset.originalFileExt : 'webp'
  let bucket = '';
  switch(type){
    case 'optimized':
      bucket = process.env.B2_BUCKET_OPTIMIZED
      break;
    case 'original':
      bucket = process.env.B2_BUCKET_ORIGINALS
      break;
    case 'thumbnail':
      bucket = process.env.B2_BUCKET_THUMBS
      break;
    case 'watermarked':
      bucket = process.env.B2_BUCKET_WATERMARKED
      break;
  }


  let signedUrl = b2.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: `${asset.creatorID}/${asset.id}.${ext}`,
    Expires: linkExpiryInSeconds
  })

  //Reset AWS Credentials back to AWS for use with Dynamo/others
  config.credentials = backupConfig;
  return signedUrl;
}