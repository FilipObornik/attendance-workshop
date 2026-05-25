"use client";

import { useEffect, useRef } from "react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

export type PermissionState = "pending" | "granted" | "denied" | "unsupported";

export interface BarcodeScannerProps {
  onDecode: (token: string) => void;
  onPermissionChange: (state: PermissionState) => void;
  paused: boolean;
}

export function BarcodeScanner({
  onDecode,
  onPermissionChange,
  paused,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Refs so the long-lived decode callback always sees the latest values.
  const pausedRef = useRef(paused);
  const onDecodeRef = useRef(onDecode);
  const onPermissionChangeRef = useRef(onPermissionChange);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);
  useEffect(() => {
    onPermissionChangeRef.current = onPermissionChange;
  }, [onPermissionChange]);

  useEffect(() => {
    let cancelled = false;
    let controls: IScannerControls | null = null;

    onPermissionChangeRef.current("pending");

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      onPermissionChangeRef.current("unsupported");
      return;
    }

    const start = async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      } catch {
        if (!cancelled) onPermissionChangeRef.current("denied");
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Release the probe stream — zxing opens its own via decodeFromVideoDevice.
      stream.getTracks().forEach((t) => t.stop());

      onPermissionChangeRef.current("granted");

      const hints = new Map<DecodeHintType, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
      const reader = new BrowserMultiFormatReader(hints);

      if (!videoRef.current) return;

      try {
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!result) return;
            if (pausedRef.current) return;
            onDecodeRef.current(result.getText());
          },
        );
      } catch {
        if (!cancelled) onPermissionChangeRef.current("denied");
        return;
      }

      if (cancelled) {
        controls?.stop();
        controls = null;
      }
    };

    void start();

    return () => {
      cancelled = true;
      try {
        controls?.stop();
      } catch {
        // ignore
      }
      const video = videoRef.current;
      const srcObject = video?.srcObject;
      if (srcObject && srcObject instanceof MediaStream) {
        srcObject.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
        if (video) video.srcObject = null;
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full rounded-md aspect-video bg-black object-cover"
      data-testid="scan-video"
    />
  );
}

export default BarcodeScanner;
