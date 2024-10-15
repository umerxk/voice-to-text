import React, { useState, useEffect, useRef } from "react";
import { uploadToS3 } from "./aws-s3"; // The S3 function we wrote above

const Voice = ({ getTranscribe }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const getUploadStatus = async () => {
    const ctime = Date.now();
    const audioFile = new File([audioBlob], `audio_${ctime}.wav`, {
        type: "audio/wav"
      });
      const xx = await uploadToS3(audioFile); // Upload audio file to S3
      if(xx === "completed"){
        getTranscribe(`audio_${ctime}.wav`);
      }
  }

  useEffect(() => {
    if (audioBlob) {
        getUploadStatus();
    }
  }, [audioBlob]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);

    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      setAudioBlob(audioBlob);
      audioChunksRef.current = []; // Reset for next recording
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  return (
    <div style={{ marginTop: 200 }}>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
      {audioBlob && (
        <audio controls src={URL.createObjectURL(audioBlob)} />
      )}
    </div>
  );
};

export default Voice;
