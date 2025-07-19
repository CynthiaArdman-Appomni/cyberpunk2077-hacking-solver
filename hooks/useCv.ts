import React, { useEffect, useRef, useState } from "react";
import { useAppContext } from "../components/AppContext";
import * as CvService from "../services/cv";

const areWorkersLoaded = (
  workersLoadingPromiseRef: React.MutableRefObject<Promise<void>>,
  cvWorkerRef: React.MutableRefObject<CvService.CvWorker>,
  ocrWorkerRef: React.MutableRefObject<Tesseract.Worker>
) => {
  return (
    cvWorkerRef.current &&
    ocrWorkerRef.current &&
    !workersLoadingPromiseRef.current
  );
};

const loadWorkers = async (
  cvWorkerRef: React.MutableRefObject<CvService.CvWorker>,
  ocrWorkerRef: React.MutableRefObject<Tesseract.Worker>,
  setOcrStatus: React.Dispatch<
    React.SetStateAction<{
      progress: number;
      text: string;
    }>
  >
) => {
  const uniqChars = (arr) => [...new Set(arr.join("").split(""))];
  const getOcrWhitelist = () =>
    [" ", ...uniqChars(["1C", "55", "7A", "BD", "E9", "FF"])].join("");

  const cv = await CvService.createWorker();
  cv.worker.addEventListener("error", (e) => console.error("onerror", e));
  await cv.load();
  cvWorkerRef.current = cv;

  const { createWorker, PSM } = await import("tesseract.js");

  const ocrWorker = createWorker({
    langPath: "/ocr",
    gzip: true,
    logger: (msg) => {
      if (msg?.userJobId?.startsWith("code_matrix-")) {
        const matrixProgress = msg.progress;
        const progress = 50 + (80 - 50) * matrixProgress;
        setOcrStatus({
          progress,
          text: "Reading code matrix...",
        });
      } else if (msg?.userJobId?.startsWith("sequences-")) {
        const sequenceProgress = msg.progress;
        const progress = 80 + (99 - 80) * sequenceProgress;
        setOcrStatus({
          progress,
          text: "Reading sequences...",
        });
      }
    },
    errorHandler: (err) => {
      console.error("[tesseract] ", err);
    },
  });

  await ocrWorker.load();
  await ocrWorker.loadLanguage("eng");
  await ocrWorker.initialize("eng");
  await ocrWorker.setParameters({
    tessedit_char_whitelist: getOcrWhitelist(),
    // @ts-ignore
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // if block doesn't work well enough, slice grids into columns
  });
  ocrWorkerRef.current = ocrWorker;
};

const useCv = (setModalVisible: (visible: boolean) => void) => {
  const { onMatrixChanged, onSequencesChanged, onRunSolver } = useAppContext();

  const workersLoadingPromise = useRef<Promise<void>>(null);
  const cvWorkerRef = useRef<CvService.CvWorker>(null);
  const ocrWorkerRef = useRef<Tesseract.Worker>(null);

  const [ocrStatus, setOcrStatus] = useState<{
    progress: number;
    text: string;
  }>();

  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasContainerRef = useRef<HTMLDivElement>();

  useEffect(() => {
    const getFileImageData = (file: File) => {
      return new Promise<ImageData>((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const img = document.createElement("img");
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          resolve(imageData);
        };
        img.onerror = () => {
          reject(new Error("Failed to load clipboard image!"));
        };

        const fr = new FileReader();
        fr.onload = () => {
          const dataUrl = fr.result as string;
          img.src = dataUrl;
        };
        fr.onerror = () => {
          reject(new Error("Failed to read file!"));
        };
        fr.readAsDataURL(file);
      });
    };

    async function processImage(imageData: ImageData) {
      setOcrStatus({
        text: "Processing screenshot...",
        progress: 20,
      });
      const output = await cvWorkerRef.current.processScreenshot(imageData);

      const ctx = outputCanvasRef.current.getContext("2d");
      const putImage = (img: ImageData) => {
        outputCanvasRef.current.width = img.width;
        outputCanvasRef.current.height = img.height;
        ctx.putImageData(img, 0, 0);
      };

      setOcrStatus({
        text: "Running OCR...",
        progress: 60,
      });
      if (outputCanvasContainerRef.current) {
        outputCanvasContainerRef.current.style.display = "block";
      }
      putImage(output.codeMatrix);
      const codeMatrix = await ocrWorkerRef.current.recognize(
        outputCanvasRef.current,
        undefined,
        "code_matrix-" + Math.random().toString(36).substr(2, 5)
      );

      putImage(output.sequences);
      const sequences = await ocrWorkerRef.current.recognize(
        outputCanvasRef.current,
        undefined,
        "sequences-" + Math.random().toString(36).substr(2, 5)
      );

      setOcrStatus({
        progress: 100,
        text: "Flushing...",
      });
      putImage(output.comboImage);

      onMatrixChanged(codeMatrix.data.text);
      onSequencesChanged(sequences.data.text);
      setOcrStatus(() => undefined);
      onRunSolver(undefined, {
        sequencesText: sequences.data.text,
        matrixText: codeMatrix.data.text,
      });
    }

    async function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData.items;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind !== "file" || !item.type.startsWith("image")) {
          continue;
        }

        
        setOcrStatus({
          text: "Reading image...",
          progress: 0,
        });
        const file = item.getAsFile();
        const imageData = await getFileImageData(file);

        if (
          !areWorkersLoaded(workersLoadingPromise, cvWorkerRef, ocrWorkerRef)
        ) {
          const promise = loadWorkers(cvWorkerRef, ocrWorkerRef, setOcrStatus);
          workersLoadingPromise.current = promise;
          await promise;
        }

        setTimeout(() => processImage(imageData), 0);
        onMatrixChanged("");
        onSequencesChanged("");
        setModalVisible(false);

        e.preventDefault();
        return;
      }
    }

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  return {
    ocrStatus,
    ocrOutputCanvasRef: outputCanvasRef,
    ocrOutputCanvasContainerRef: outputCanvasContainerRef,
  };
};

export default useCv;
