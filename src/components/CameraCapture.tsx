/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { Camera, RotateCw, AlertTriangle, X } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (base64Data: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [activeFacingMode, setActiveFacingMode] = useState<"user" | "environment">("environment");

  // List video output devices
  useEffect(() => {
    async function getDevices() {
      try {
        const checkStream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Close temporary check stream
        checkStream.getTracks().forEach(track => track.stop());

        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceList.filter(device => device.kind === "videoinput");
        setDevices(videoDevices);

        // Try to pre-select back camera (environment) if available
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes("back") || 
          device.label.toLowerCase().includes("rear") ||
          device.label.toLowerCase().includes("environment")
        );

        if (backCamera) {
          setSelectedDeviceId(backCamera.deviceId);
          setActiveFacingMode("environment");
        } else if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
          setActiveFacingMode("user");
        }
      } catch (err: any) {
        console.error("Error listing cameras:", err);
        setError("カメラデバイスの読み込みに失敗しました。カメラの使用許可を与えてください。");
      }
    }
    getDevices();
  }, []);

  // Initialize camera stream
  useEffect(() => {
    if (!selectedDeviceId && devices.length === 0) return;

    let localStream: MediaStream | null = null;

    async function startCamera() {
      try {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId 
            ? { deviceId: { exact: selectedDeviceId } }
            : { facingMode: activeFacingMode }
        };

        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(localStream);
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
        setError("");
      } catch (err: any) {
        console.error("Camera startup error:", err);
        // Fallback to standard camera if exact device selection failed
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: activeFacingMode }
          });
          setStream(localStream);
          if (videoRef.current) {
            videoRef.current.srcObject = localStream;
          }
          setError("");
        } catch (fallbackErr) {
          setError("選択されたカメラの起動に失敗しました。別のカメラを試すか、ファイルのアップロードをご利用ください。");
        }
      }
    }

    startCamera();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedDeviceId, activeFacingMode, devices.length]);

  // Turn off camera tracks on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle taking snapshot
  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      setError("カメラの準備ができていません。数秒待ってから再度撮影してください。");
      return;
    }
    
    // Set canvas dimensions to match actual camera resolution
    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, width, height);

    // Grab JPEG with good quality
    const base64Data = canvas.toDataURL("image/jpeg", 0.9);
    onCapture(base64Data);
  };

  // Toggle front/back facing camera
  const handleToggleFacingMode = () => {
    const nextMode = activeFacingMode === "environment" ? "user" : "environment";
    setActiveFacingMode(nextMode);
    
    // If we have explicit devices, select one with opposite properties
    const otherDevices = devices.filter(d => {
      const label = d.label.toLowerCase();
      if (nextMode === "environment") {
        return label.includes("back") || label.includes("rear") || label.includes("environment") || label.includes("out");
      } else {
        return label.includes("front") || label.includes("user") || label.includes("in");
      }
    });

    if (otherDevices.length > 0) {
      setSelectedDeviceId(otherDevices[0].deviceId);
    } else {
      // Find any other index
      const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
      if (currentIndex !== -1 && devices.length > 1) {
        const nextIndex = (currentIndex + 1) % devices.length;
        setSelectedDeviceId(devices[nextIndex].deviceId);
      }
    }
  };

  return (
    <div id="camera-capture-overlay" className="bg-black rounded-2xl overflow-hidden shadow-2xl shadow-black/60 relative border border-zinc-800 ring-1 ring-emerald-500/10">
      {/* Top action bar */}
      <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-center z-10">
        <span className="text-white font-medium text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          名刺を枠内に収めてください
        </span>
        <button
          onClick={onClose}
          id="close-camera-btn"
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="閉じる"
        >
          <X size={18} />
        </button>
      </div>

      {/* Video stream box */}
      <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="p-6 text-center max-w-sm">
            <AlertTriangle className="text-amber-500 mx-auto mb-3" size={40} />
            <p className="text-white text-sm font-medium mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs transition-colors"
            >
              ファイルをアップロードに切り替える
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Guideline Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
              {/* Card framing outline */}
              <div className="border-[3px] border-emerald-500/80 rounded-xl w-full aspect-[1.6/1] max-w-md relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] bg-transparent">
                {/* Visual corners corner indicators */}
                <div className="absolute -top-[3px] -left-[3px] w-8 h-8 border-t-[5px] border-l-[5px] border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-[3px] -right-[3px] w-8 h-8 border-t-[5px] border-r-[5px] border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-[3px] -left-[3px] w-8 h-8 border-b-[5px] border-l-[5px] border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-[3px] -right-[3px] w-8 h-8 border-b-[5px] border-r-[5px] border-emerald-400 rounded-br-lg" />

                {/* Laser scan animation line */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[scan_2.2s_ease-in-out_infinite]" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Bottom control panel */}
      {!error && (
        <div className="bg-slate-950 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
          {/* Camera device selector */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            {devices.length > 1 ? (
              <select
                id="camera-device-select"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full sm:w-48 bg-slate-850 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {devices.map((device, idx) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `カメラ ${idx + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-slate-400 text-xs sm:px-2">カメラスタンバイOK</span>
            )}
          </div>

          {/* Shutter primary action */}
          <button
            onClick={handleSnap}
            id="shutter-trigger-btn"
            className="h-14 w-14 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-100 shadow-xl relative group focus:outline-none focus:ring-2 focus:ring-emerald-500"
            title="撮影する"
          >
            <div className="absolute inset-1 rounded-full border-2 border-slate-950 bg-emerald-500 group-hover:bg-emerald-400 transition-colors flex items-center justify-center">
              <Camera size={22} className="text-white" />
            </div>
          </button>

          {/* Switch front/rear camera */}
          <div className="w-full sm:w-auto flex justify-end">
            <button
              onClick={handleToggleFacingMode}
              id="camera-switch-btn"
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700/50"
            >
              <RotateCw size={14} />
              内/外 カメラ切替
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
