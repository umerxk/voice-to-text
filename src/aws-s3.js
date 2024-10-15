import AWS from 'aws-sdk';
import { accessKeyId, secretAccessKey, REGION, sessionToken, fullBucketName } from './aws.config';

AWS.config.update({
  accessKeyId,
  secretAccessKey,
  region: REGION,
  sessionToken
});

const s3 = new AWS.S3({
  params: { Bucket: fullBucketName },
  region: REGION,
});

export const uploadToS3 = async (file) => {
  const params = {
    Bucket: fullBucketName,
    Key: `recordings/${file.name}`,
    Body: file,
    ContentType: file.type
  };
  try {
    const upload = s3
      .putObject(params)
      .on("httpUploadProgress", (evt) => {
        const percent = parseInt((evt.loaded * 100) / evt.total) + "%";
        console.log("Uploading: " + percent);

        // Check if upload is completed
        if (evt.loaded === evt.total) {
          console.log("Upload completed!");
        }
      })
      .promise();

    await upload; // Wait for the upload to complete
    return "completed"; // Return "completed" when the upload finishes
  } catch (err) {
    console.log("Error", err);
    throw err; // Handle error appropriately
  }

};
