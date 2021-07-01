import test from 'ava'
import '../load-yaml-env'
import {S3, Credentials} from 'aws-sdk';
const linkExpiryInSeconds = 60*60 //1 hr

test('b2: sign url', async (t) => {
  const b2 = new S3({
    endpoint: process.env.B2_ENDPOINT,
    credentials: new Credentials({accessKeyId: process.env.B2_KEYID, secretAccessKey:process.env.B2_KEY}),
    signatureVersion: "v4"
  })

  let signedUrl = await b2.getSignedUrlPromise('getObject', {
    Bucket: 'advl-test',
    Key: `advl-test/Mountain_Dig_Site-9f35a417a1d344898c0a02852190b2b3/thumb.webp`,
    Expires: linkExpiryInSeconds
  })
  console.log(signedUrl);
  t.pass()
})
