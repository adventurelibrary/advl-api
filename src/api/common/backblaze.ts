import {Credentials, Endpoint, S3} from 'aws-sdk';
import {image_file_resolutions} from '../../interfaces/IAsset';

const linkExpiryInSeconds = 60*60 //1 hr
const b2 = new S3({
  endpoint: new Endpoint(process.env.B2_ENDPOINT),
  credentials: new Credentials({accessKeyId: process.env.B2_KEYID, secretAccessKey:process.env.B2_KEY}),
  signatureVersion: "v4"
})

export interface AssetImage {
  id: string
  creator_id: string
  original_file_ext: string
  fileBaseName?: string
  forceDownload?: boolean
}

export function GetURL (type:image_file_resolutions, asset:AssetImage) {
  if (!asset) {
    throw new Error(`falsy asset passed into GetURL`)
  }
  let ext = type == 'original' ? asset.original_file_ext : 'webp'
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

  const opts : any = {
    Bucket: bucket,
    Key: `${asset.creator_id}/${asset.id}.${ext}`,
    Expires: linkExpiryInSeconds,
  }

  if (asset.forceDownload) {
    const basename = asset.fileBaseName
    const escapedName = basename.replace('"', '\"')
    opts.ResponseContentDisposition = 'attachment; filename="' + escapedName + '.' + ext + '"'
  }

  let signedUrl = b2.getSignedUrl('getObject', opts)

  //Reset AWS Credentials back to AWS for use with Dynamo/others
  return signedUrl;
}
