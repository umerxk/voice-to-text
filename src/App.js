import React, { useState } from 'react';
import AWS from 'aws-sdk';
import TranscribeService from 'aws-sdk/clients/transcribeservice';
import Voice from './Voice';
import { REGION, accessKeyId, fullBucketName, secretAccessKey, sessionToken } from './aws.config';
import './App.css';

function App() {
    AWS.config.update({
        accessKeyId,
        secretAccessKey,
        region: REGION,
        sessionToken
    });
    const transcribeService = new TranscribeService();
    const s3 = new AWS.S3(); // Create a new S3 client instance
    const [textValue, setTextValue] = useState('');
    const handleTextChange = (event) => {
        setTextValue(event.target.value);
    };
    const [isLoading, setIsLoading] = useState(false);

    async function connectAndTranscribe(audioRecording) {
        console.time('Time taken');
        const transcribeService = new AWS.TranscribeService();
        const jobName = generateRandomNumber().toString();
        console.log({ jobName });
        const params = {
            TranscriptionJobName: jobName,
            Media: {
                MediaFileUri: `s3://your-bucket-name/${audioRecording}`, // Replace with the actual path to your audio file
            },
            OutputBucketName: 'your-output-bucket-name',
            OutputKey: jobName + ".json",
            LanguageCode: 'en-US',
        };
        console.log("params::", params);

        try {
            setIsLoading(true);
            const response = await transcribeService.startTranscriptionJob(params).promise();
            console.log("0 response", response);
            const jobId = response.TranscriptionJob.TranscriptionJobName;
            console.log("1 jobId", jobId);

            // Wait for the transcription job to complete (asynchronous)
            await waitForTranscriptionJobCompletion(jobId);
            const transcribedText = await getTranscriptionResult(jobId);
            console.log('4 Transcription Result:', transcribedText);
            setTextValue(transcribedText);
            setIsLoading(false);
            console.timeEnd('Time taken');

        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function waitForTranscriptionJobCompletion(jobId) {
        let jobStatus = 'IN_PROGRESS';
        while (jobStatus === 'IN_PROGRESS') {
            const getTranscriptionJobResponse = await transcribeService.getTranscriptionJob({ TranscriptionJobName: jobId }).promise();
            // console.log("2 getTranscriptionJobResponse", getTranscriptionJobResponse);
            jobStatus = getTranscriptionJobResponse.TranscriptionJob.TranscriptionJobStatus;
            // console.log("3 getTranscriptionJobResponse", getTranscriptionJobResponse);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
        }
    }

    async function getTranscriptionResult(jobId) {
        const transcribeService = new AWS.TranscribeService();

        try {
            const params = {
                TranscriptionJobName: jobId,
            };

            const getTranscriptionJobResponse = await transcribeService.getTranscriptionJob(params).promise();

            // Check the transcription job status
            const jobStatus = getTranscriptionJobResponse.TranscriptionJob.TranscriptionJobStatus;
            if (jobStatus === 'COMPLETED') {
                const transcriptS3URI = getTranscriptionJobResponse.TranscriptionJob.Transcript.TranscriptFileUri;
                console.log("transcriptS3URI", transcriptS3URI);
                const bucketKey = jobId + ".json";
                const s3Params = { Bucket: fullBucketName, Key: bucketKey };
                const s3Response = await s3.getObject(s3Params).promise();

                
                const transcribedText = s3Response.Body.toString();
                const transcribedTextJson = JSON.parse(transcribedText);
                return transcribedTextJson.results.transcripts[0].transcript;
            } else {
                console.error(`Transcription job with ID ${jobId} is still in progress (Status: ${jobStatus})`);
                return null;
            }
        } catch (error) {
            console.error('Error getting transcription result:', error);
            throw error;
        }
    }

    const generateRandomNumber = () => {
        const min = 100000; // Minimum 6-digit number (inclusive)
        const max = 999999; // Maximum 6-digit number (inclusive)
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    return (
        <div className="App">
            <Voice getTranscribe={(audioRecording) => connectAndTranscribe(audioRecording)} />
            <>
                <textarea
                    style={{ marginTop: '2rem' }}
                    value={isLoading ? "Generating..." : textValue}
                    onChange={handleTextChange}
                    rows={7}
                    cols={50}
                />
            </>

        </div>
    );
}

export default App;
