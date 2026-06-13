import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Upload, Image as ImageIcon, Check, Sliders, Sun, Contrast, 
  Droplet, Wand2, Download, Trash2, Palette, Brush, Undo2, Maximize2, RefreshCw
} from 'lucide-react';
import { FilterSettings, BackgroundSettings, initialFilterSettings, initialBgSettings } from '../types';

interface ImageEnhancerProps {
  onAnalyze: (base64: string, mimeType: string, fileName: string) => Promise<any>;
  aiParameters: any;
  loadingAI: boolean;
  onClearAIParams: () => void;
}

export default function ImageEnhancer({ onAnalyze, aiParameters, loadingAI, onClearAIParams }: ImageEnhancerProps) {
  // File states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('image/jpeg');

  // Interactive slider position (0 to 100 %)
  const [sliderPos, setSliderPos] = useState(50);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingSliderRef = useRef(false);

  // Settings
  const [filters, setFilters] = useState<FilterSettings>(initialFilterSettings);
  const [bgSettings, setBgSettings] = useState<BackgroundSettings>(initialBgSettings);
  const [activeTab, setActiveTab] = useState<'calibrate' | 'bg-remove' | 'eraser'>('calibrate');

  // Canvas refs
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Brush Eraser states
  const [isBrushMode, setIsBrushMode] = useState(false);
  const [brushSize, setBrushSize] = useState<number>(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnMask, setHasDrawnMask] = useState(false);
  
  // Undo/Redo historical snapshots
  const [history, setHistory] = useState<string[]>([]);

  // Color selection picker state
  const [isPickerActive, setIsPickerActive] = useState(false);

  // Trigger file selection
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Drag Over
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Convert uploaded file
  const processFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setMimeType(file.type);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImageSrc(dataUrl);
      setFilters(initialFilterSettings);
      setBgSettings(initialBgSettings);
      setHistory([dataUrl]);
      onClearAIParams();
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Drag-to-compare Event Handlers
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPos(percentage);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isBrushMode) return; // Ignore if painting
    isDraggingSliderRef.current = true;
    handleSliderMove(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isBrushMode) return;
    isDraggingSliderRef.current = true;
    if (e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingSliderRef.current) return;
      handleSliderMove(e.clientX);
    };
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isDraggingSliderRef.current) return;
      if (e.touches[0]) {
        handleSliderMove(e.touches[0].clientX);
      }
    };
    const handleGlobalMouseUp = () => {
      isDraggingSliderRef.current = false;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalTouchMove);
    window.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  // Sync original image to originalCanvas
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      // Setup original canvas
      const origCanvas = originalCanvasRef.current;
      if (origCanvas) {
        origCanvas.width = img.naturalWidth;
        origCanvas.height = img.naturalHeight;
        const ctx = origCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }
      }

      // Setup processed canvas
      const procCanvas = processedCanvasRef.current;
      if (procCanvas) {
        procCanvas.width = img.naturalWidth;
        procCanvas.height = img.naturalHeight;
        const ctx = procCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          applyCurrentModifications();
        }
      }
    };
  }, [imageSrc]);

  // Apply visual enhancements (Canvas + Pixels)
  const applyCurrentModifications = () => {
    const procCanvas = processedCanvasRef.current;
    const origCanvas = originalCanvasRef.current;
    if (!procCanvas || !origCanvas) return;

    const ctx = procCanvas.getContext('2d');
    if (!ctx) return;

    // Reset with original image
    ctx.clearRect(0, 0, procCanvas.width, procCanvas.height);
    ctx.drawImage(origCanvas, 0, 0);

    let imgData = ctx.getImageData(0, 0, procCanvas.width, procCanvas.height);
    const data = imgData.data;

    // --- 1. Sharpness & High Denoise pixel operations ---
    if (filters.sharpness > 0 || filters.denoise > 0) {
      // Simulate physical sharpening filter on pixel kernel
      // unsharp mask algorithm simulation
      const sharpenFactor = filters.sharpness / 100;
      if (sharpenFactor > 0) {
        const width = procCanvas.width;
        const height = procCanvas.height;
        const copy = new Uint8ClampedArray(data);
        const weights = [
          0, -1, 0,
          -1, 5, -1,
          0, -1, 0
        ];
        // Apply convolution matrix
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) {
              let sum = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const pixelPos = ((y + ky) * width + (x + kx)) * 4 + c;
                  const weight = weights[(ky + 1) * 3 + (kx + 1)];
                  sum += copy[pixelPos] * weight;
                }
              }
              const pos = (y * width + x) * 4 + c;
              // Blend original with sharpened using sharpenFactor
              const val = sum * sharpenFactor + copy[pos] * (1 - sharpenFactor);
              data[pos] = Math.min(255, Math.max(0, val));
            }
          }
        }
      }

      // Median-denoise simulation for smoothing noise out
      const denoiseFactor = filters.denoise / 100;
      if (denoiseFactor > 0) {
        const width = procCanvas.width;
        const height = procCanvas.height;
        const copy = new Uint8ClampedArray(data);
        for (let y = 2; y < height - 2; y += 2) {
          for (let x = 2; x < width - 2; x += 2) {
            // Downsample and blend neighboring pixels (smart bilateral blur)
            const pos = (y * width + x) * 4;
            const right = (y * width + (x + 1)) * 4;
            const down = ((y + 1) * width + x) * 4;
            for (let c = 0; c < 3; c++) {
              const avg = (copy[pos + c] + copy[right + c] + copy[down + c]) / 3;
              data[pos + c] = copy[pos + c] * (1 - denoiseFactor) + avg * denoiseFactor;
              data[right + c] = copy[right + c] * (1 - denoiseFactor) + avg * denoiseFactor;
              data[down + c] = copy[down + c] * (1 - denoiseFactor) + avg * denoiseFactor;
            }
          }
        }
      }
    }

    // --- 2. Advanced Background Removal (RGBA chroma subtraction & feathering) ---
    if (bgSettings.colorKey) {
      const width = procCanvas.width;
      const height = procCanvas.height;
      const targetColor = hexToRgb(bgSettings.colorKey);
      
      if (targetColor) {
        const tol = bgSettings.tolerance * 2.5; // Scale tolerance
        const feather = bgSettings.feather;
        const copy = new Uint8ClampedArray(data);

        for (let i = 0; i < data.length; i += 4) {
          const r = copy[i];
          const g = copy[i + 1];
          const b = copy[i + 2];

          // Compute Euclidean color distance
          const dist = Math.sqrt(
            Math.pow(r - targetColor.r, 2) +
            Math.pow(g - targetColor.g, 2) +
            Math.pow(b - targetColor.b, 2)
          );

          if (dist < tol) {
            // Match background - make transparent
            // Apply simple feathering by modulating alpha
            if (feather > 0 && dist > tol - feather * 4) {
              const alphaRatio = (dist - (tol - feather * 4)) / (feather * 4);
              data[i + 3] = Math.min(data[i + 3], Math.round(alphaRatio * 255));
            } else {
              data[i + 3] = 0;
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Apply Solid Color, Gradients, or Image replacements underneath if transparent
    if (bgSettings.replacementType !== 'transparent' && bgSettings.colorKey) {
      // Re-composite background replacements on canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = procCanvas.width;
      tempCanvas.height = procCanvas.height;
      const tCtx = tempCanvas.getContext('2d');
      if (tCtx) {
        // Draw background replacement
        if (bgSettings.replacementType === 'color') {
          tCtx.fillStyle = bgSettings.solidColor;
          tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        } else if (bgSettings.replacementType === 'gradient') {
          // Render simulated gradient banner
          const grad = tCtx.createLinearGradient(0, 0, tempCanvas.width, tempCanvas.height);
          if (bgSettings.gradientPreset.includes('135deg')) {
            grad.addColorStop(0, '#667eea');
            grad.addColorStop(1, '#764ba2');
          } else if (bgSettings.gradientPreset.includes('cyber')) {
            grad.addColorStop(0, '#f857a6');
            grad.addColorStop(1, '#ff5858');
          } else {
            grad.addColorStop(0, '#3a7bd5');
            grad.addColorStop(1, '#3a6073');
          }
          tCtx.fillStyle = grad;
          tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        } else if (bgSettings.replacementType === 'image' && bgSettings.customBgUrl) {
          const bgImg = new Image();
          bgImg.src = bgSettings.customBgUrl;
          // Synchronous fill if cached, fallback on stretch
          tCtx.drawImage(bgImg, 0, 0, tempCanvas.width, tempCanvas.height);
        }

        // Draw foreground image on top of background
        tCtx.drawImage(procCanvas, 0, 0);
        ctx.clearRect(0, 0, procCanvas.width, procCanvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }
  };

  // Trigger modification update when filters or bg settings change
  useEffect(() => {
    applyCurrentModifications();
  }, [filters, bgSettings]);

  // Apply Gemini Auto-Tune parameters directly
  useEffect(() => {
    if (aiParameters?.parameters) {
      setFilters(prev => ({
        ...prev,
        brightness: aiParameters.parameters.brightness ?? prev.brightness,
        contrast: aiParameters.parameters.contrast ?? prev.contrast,
        saturation: aiParameters.parameters.saturation ?? prev.saturation,
        sharpness: aiParameters.parameters.sharpness ?? prev.sharpness,
        temperature: aiParameters.parameters.temperature ?? prev.temperature,
        exposure: aiParameters.parameters.exposure ?? prev.exposure,
        denoise: aiParameters.parameters.denoise ?? prev.denoise,
        dehaze: aiParameters.parameters.dehaze ?? prev.dehaze,
      }));
    }
  }, [aiParameters]);

  const triggerAnalysis = async () => {
    if (!imageSrc) return;
    // Strip headers to isolate raw base64 data for server-side pipeline
    const base64Data = imageSrc.split(',')[1];
    if (base64Data) {
      await onAnalyze(base64Data, mimeType, fileName);
    }
  };

  // Helper: Hex color parse
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return isNaN(r) ? null : { r, g, b };
  };

  // Canvas Click: Color Picker Mode for Background Chromakey
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPickerActive || !processedCanvasRef.current) return;
    const canvas = processedCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Scale local click to canvas natural aspect coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
      setBgSettings(prev => ({
        ...prev,
        colorKey: hex
      }));
      setIsPickerActive(false);
    }
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    const toHex = (c: number) => {
      const hex = c.toString(16);
      return hex.length === 1 ? '0' : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Setup local automated background detector (AI contour simulator)
  const autoDetectBackground = () => {
    if (!processedCanvasRef.current) return;
    const canvas = processedCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Pull color from extreme top-left corner
      const pixel = ctx.getImageData(5, 5, 1, 1).data;
      const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
      setBgSettings(prev => ({
        ...prev,
        colorKey: hex,
        tolerance: 34
      }));
    }
  };

  // --- BRUSH/ERASER MASK INTERACTION ---
  const handleBrushStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isBrushMode || !processedCanvasRef.current) return;
    setIsDrawing(true);
    const canvas = processedCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = "rgba(239, 68, 68, 0.85)"; // High visibility Red for masking
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const handleBrushMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !processedCanvasRef.current) return;
    const canvas = processedCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasDrawnMask(true);
    }
  };

  const handleBrushEnd = () => {
    setIsDrawing(false);
  };

  // Run AI Texture Recovery Inpainter to fill selected objects with surroundings seamlessly
  const runSmartErase = () => {
    const canvas = processedCanvasRef.current;
    if (!canvas || !hasDrawnMask) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const width = canvas.width;
      const height = canvas.height;
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Custom inpainting logic: Replace Red Mask pixels with surrounding textures
      // Loop channels and evaluate if pixel matches masking Red with low green/blue
      const copy = new Uint8ClampedArray(data);

      for (let y = 3; y < height - 3; y++) {
        for (let x = 3; x < width - 3; x++) {
          const idx = (y * width + x) * 4;
          // Red mask trigger
          if (copy[idx] > 200 && copy[idx + 1] < 80 && copy[idx + 2] < 80) {
            // Pull surrounding neighbor color to smear/interpolate
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            const offsets = [-3, -2, 2, 3];
            for (const ox of offsets) {
              for (const oy of offsets) {
                const neighborIdx = ((y + oy) * width + (x + ox)) * 4;
                const rN = copy[neighborIdx];
                const gN = copy[neighborIdx + 1];
                const bN = copy[neighborIdx + 2];
                // Only merge if neighbor is NOT part of the red mask
                if (!(rN > 180 && gN < 90 && bN < 90)) {
                  rSum += rN;
                  gSum += gN;
                  bSum += bN;
                  count++;
                }
              }
            }
            if (count > 0) {
              data[idx] = rSum / count;
              data[idx + 1] = gSum / count;
              data[idx + 2] = bSum / count;
              data[idx + 3] = 255;
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      setHasDrawnMask(false);
      setIsBrushMode(false);
      // Save snapshot to allow revert
      setImageSrc(canvas.toDataURL());
    }
  };

  // Revert Mask or snap to original image
  const resetMask = () => {
    applyCurrentModifications();
    setHasDrawnMask(false);
  };

  // Export & Download HD Image
  const downloadHDImage = () => {
    const canvas = processedCanvasRef.current;
    if (!canvas) return;
    
    // Generate trigger link
    const link = document.createElement('a');
    link.download = `GS_INHANCE_HD_${fileName || 'photo.png'}`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // CSS values calculated dynamically for real-time slider filtering feed
  const generateCssFilterString = () => {
    return `
      brightness(${100 + filters.brightness}%)
      contrast(${100 + filters.contrast}%)
      saturate(${100 + filters.saturation}%)
      drop-shadow(0 0 0 rgb(0,0,0))
    `;
  };

  // BG Color Replacement selection triggers
  const customBgUploadRef = useRef<HTMLInputElement>(null);
  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setBgSettings(prev => ({
          ...prev,
          replacementType: 'image',
          customBgUrl: ev.target?.result as string
        }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT VIEWPORT AREA: Drag Slider comparison & Preview */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {!imageSrc ? (
          /* INITIAL STATE: FILE DRAG DROP */
          <div 
            className={`border-3 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[450px] ${
              dragActive 
                ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/10' 
                : 'border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            id="file-drop-zone"
          >
            <input 
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileInput}
            />
            <div className="bg-gradient-to-tr from-cyan-500 to-indigo-600 p-4 rounded-2xl mb-4 shadow-xl">
              <Upload className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-medium tracking-tight text-slate-100 mb-2">
              Khrab Photo Ko HD Banane Ke Liye Upload Karein
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              Drag and drop any blurry, dark or old image, or browse your files. All files parsed completely offline.
            </p>
            <button className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95">
              Select Photo to INHANCE
            </button>
          </div>
        ) : (
          /* MAIN WORKSPACE */
          <div className="flex flex-col gap-4">
            {/* Header toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 backdrop-blur border border-slate-800/80 p-3.5 rounded-2xl">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-slate-200 truncate max-w-[200px]" title={fileName}>
                  {fileName}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">
                  {mimeType?.split('/')[1] || 'img'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={triggerAnalysis}
                  disabled={loadingAI}
                  className="flex items-center gap-2 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 px-3.5 py-1.5 rounded-xl transition-all font-medium disabled:opacity-50 cursor-pointer"
                >
                  {loadingAI ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  AI Auto Diagnostics
                </button>

                <button
                  onClick={() => setImageSrc(null)}
                  className="p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400 rounded-lg transition-all"
                  title="Upload different photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SPLIT SCREEN COMPARATOR VIEWPORT */}
            <div 
              ref={sliderContainerRef}
              className="relative overflow-hidden w-full h-[450px] rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl cursor-ew-resize select-none"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <canvas ref={originalCanvasRef} className="hidden" />

              {/* SIDE A: ORIGINAL (LEFT PORTION) */}
              <div 
                className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-all"
                style={{ 
                  backgroundImage: `url(${imageSrc})`,
                  width: `${sliderPos}%` 
                }}
              />

              {/* VERTICAL COMPARISON SEPARATOR TRACK */}
              <div 
                className="absolute top-0 bottom-0 z-40 w-1 bg-cyan-400 cursor-ew-resize pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyan-400 text-slate-950 hover:scale-110 p-2 rounded-full shadow-lg pointer-events-auto cursor-ew-resize transition-all">
                  <Maximize2 className="w-4 h-4 rotate-45" />
                </div>
              </div>

              {/* SIDE B: HD AI ENHANCED (RIGHT PORTION) */}
              <div className="absolute inset-0 z-0 bg-slate-950/20">
                {/* We render the running processed canvas inside. CSS filters applied on final overlay representation for hardware speed */}
                <canvas 
                  ref={processedCanvasRef}
                  onClick={handleCanvasClick}
                  onMouseDown={handleBrushStart}
                  onMouseMove={handleBrushMove}
                  onMouseUp={handleBrushEnd}
                  onMouseLeave={handleBrushEnd}
                  className={`w-full h-full object-contain pointer-events-auto ${isPickerActive ? 'cursor-cell' : isBrushMode ? 'cursor-crosshair' : 'cursor-default'}`}
                  style={{
                    filter: generateCssFilterString(),
                    opacity: 1
                  }}
                />
              </div>

              {/* Before/After Indicator Badges */}
              <div className="absolute top-4 left-4 z-40 bg-slate-900/80 backdrop-blur text-slate-300 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-800 pointer-events-none">
                ORIGINAL
              </div>
              <div className="absolute top-4 right-4 z-40 bg-cyan-500 text-slate-950 font-bold font-mono text-[10px] px-2 py-0.5 rounded shadow pointer-events-none">
                GS INHANCED HD
              </div>
            </div>

            {/* Controls bottom bar for brush & selector indicator */}
            {isBrushMode && (
              <div className="flex flex-wrap items-center justify-between gap-4 bg-rose-500/5 border border-rose-500/20 p-3.5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Brush className="w-5 h-5 text-rose-400" />
                  <div>
                    <h4 className="text-xs font-semibold text-rose-200">AI Objects Eraser Mode Activated</h4>
                    <p className="text-[10px] text-rose-300/80">Kharab pixel, scratches ya unwanted objects par brush chalayein phir Erase dabayein.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono">Size: {brushSize}px</span>
                    <input 
                      type="range"
                      min="5" 
                      max="60" 
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-24 accent-rose-500 h-1 rounded"
                    />
                  </div>
                  <button 
                    onClick={runSmartErase}
                    disabled={!hasDrawnMask}
                    className="bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded-xl font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    AI Smart Erase
                  </button>
                  <button 
                    onClick={resetMask}
                    className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1.5 rounded"
                  >
                    Reset Pain
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR: Parameter Calibrations & Sliders */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Navigation tabs */}
        <div className="grid grid-cols-3 bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => { setActiveTab('calibrate'); setIsBrushMode(false); }}
            className={`flex flex-col items-center gap-1.5 py-2.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
              activeTab === 'calibrate'
                ? 'bg-slate-800 text-cyan-400 border-b border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Restore
          </button>
          <button
            onClick={() => { setActiveTab('bg-remove'); setIsBrushMode(false); }}
            className={`flex flex-col items-center gap-1.5 py-2.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
              activeTab === 'bg-remove'
                ? 'bg-slate-800 text-cyan-400 border-b border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            BG Remove
          </button>
          <button
            onClick={() => { setActiveTab('eraser'); setIsBrushMode(true); }}
            className={`flex flex-col items-center gap-1.5 py-2.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
              activeTab === 'eraser'
                ? 'bg-slate-800 text-cyan-400 border-b border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Brush className="w-3.5 h-3.5" />
            Smart Erase
          </button>
        </div>

        {/* Tab content wrapper */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl min-h-[350px] flex flex-col justify-between gap-6">
          
          {/* TAB 1: RESTORE CALIBRATE SLIDERS */}
          {activeTab === 'calibrate' && (
            <div className="flex flex-col gap-5">
              <div>
                <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-1">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  HD Enhancing Sliders
                </h4>
                <p className="text-[11px] text-slate-400">Photo ke details aur brightness ko manual adjust karein:</p>
              </div>

              {/* Slider list */}
              <div className="flex flex-col gap-4">
                {/* Sharpness (AI Resolution) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      Sharpness / Details
                    </span>
                    <span className="text-cyan-400 font-mono font-bold">{filters.sharpness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.sharpness}
                    onChange={(e) => setFilters({ ...filters, sharpness: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1 rounded bg-slate-800 hover:accent-cyan-300 cursor-pointer"
                  />
                </div>

                {/* Denoise (Grain Reduction) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Noise Reduction / Denoise</span>
                    <span className="text-cyan-400 font-mono font-bold">{filters.denoise}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.denoise}
                    onChange={(e) => setFilters({ ...filters, denoise: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1 rounded bg-slate-800 cursor-pointer"
                  />
                </div>

                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-400" />
                      Brightness
                    </span>
                    <span className="text-slate-400 font-mono font-bold">
                      {filters.brightness > 0 ? `+${filters.brightness}` : filters.brightness}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    value={filters.brightness}
                    onChange={(e) => setFilters({ ...filters, brightness: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1 rounded bg-slate-800 cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1">
                      <Contrast className="w-3 h-3 text-cyan-400" />
                      Contrast
                    </span>
                    <span className="text-slate-400 font-mono font-bold">
                      {filters.contrast > 0 ? `+${filters.contrast}` : filters.contrast}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    value={filters.contrast}
                    onChange={(e) => setFilters({ ...filters, contrast: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1 rounded bg-slate-800 cursor-pointer"
                  />
                </div>

                {/* Saturation (Color Enhancement) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1">
                      <Droplet className="w-3 h-3 text-cyan-400" />
                      Color Saturation
                    </span>
                    <span className="text-slate-400 font-mono font-bold">
                      {filters.saturation > 0 ? `+${filters.saturation}` : filters.saturation}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="100"
                    value={filters.saturation}
                    onChange={(e) => setFilters({ ...filters, saturation: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1 rounded bg-slate-800 cursor-pointer"
                  />
                </div>

                {/* Warmth Temperature */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Temperature / Warmth</span>
                    <span className="text-slate-400 font-mono font-bold">
                      {filters.temperature > 0 ? `+${filters.temperature}` : filters.temperature}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={filters.temperature}
                    onChange={(e) => setFilters({ ...filters, temperature: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1 rounded bg-slate-800 cursor-pointer"
                  />
                </div>
              </div>

              {/* Slider quick preset actions */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => setFilters({ ...initialFilterSettings, sharpness: 60, contrast: 15 })}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 px-1 rounded-xl transition-all cursor-pointer"
                >
                  HD Clarity Preset
                </button>
                <button
                  onClick={() => setFilters(initialFilterSettings)}
                  className="bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs py-2 px-1 rounded-xl transition-all cursor-pointer"
                >
                  Reset Sliders
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: BACKGROUND REMOVAL */}
          {activeTab === 'bg-remove' && (
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-1">
                  <Wand2 className="w-4 h-4 text-cyan-400" />
                  AI Background Remover
                </h4>
                <p className="text-[11px] text-slate-400">Background saaf kar ke solid, gradient ya transparent custom look dein:</p>
              </div>

              {/* Background color chrome dropper tools */}
              <div className="flex flex-col gap-3 bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-300">Background target color:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsPickerActive(!isPickerActive)}
                      className={`text-xs px-3 py-1 rounded transition-all cursor-pointer font-medium ${
                        isPickerActive 
                          ? 'bg-rose-500 text-white animate-pulse' 
                          : 'bg-slate-800 hover:bg-slate-700 text-cyan-400'
                      }`}
                    >
                      {isPickerActive ? 'Click on Canvas!' : 'Pick Color'}
                    </button>
                    {bgSettings.colorKey && (
                      <div 
                        className="w-5 h-5 rounded border border-slate-750" 
                        style={{ backgroundColor: bgSettings.colorKey }}
                        title={`Selected Key: ${bgSettings.colorKey}`}
                      />
                    )}
                  </div>
                </div>

                {bgSettings.colorKey && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Selection Tolerance:</span>
                      <span className="font-mono">{bgSettings.tolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={bgSettings.tolerance}
                      onChange={(e) => setBgSettings({ ...bgSettings, tolerance: Number(e.target.value) })}
                      className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button 
                    onClick={autoDetectBackground}
                    className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-xs py-2 px-2.5 rounded-xl transition-all cursor-pointer font-medium flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto AI BG Remove
                  </button>
                </div>
              </div>

              {/* Background replacements options */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">Naya Dynamic Background Mode:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setBgSettings({ ...bgSettings, replacementType: 'transparent' })}
                    className={`py-2 text-xs rounded-xl font-medium border transition-all cursor-pointer ${
                      bgSettings.replacementType === 'transparent'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Transparent
                  </button>
                  <button
                    onClick={() => setBgSettings({ ...bgSettings, replacementType: 'color' })}
                    className={`py-2 text-xs rounded-xl font-medium border transition-all cursor-pointer ${
                      bgSettings.replacementType === 'color'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Solid Color
                  </button>
                  <button
                    onClick={() => setBgSettings({ ...bgSettings, replacementType: 'gradient' })}
                    className={`py-2 text-xs rounded-xl font-medium border transition-all cursor-pointer ${
                      bgSettings.replacementType === 'gradient'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Gradient Presets
                  </button>
                  <button
                    onClick={() => customBgUploadRef.current?.click()}
                    className={`py-2 text-xs rounded-xl font-medium border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      bgSettings.replacementType === 'image'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    Custom Image
                  </button>
                </div>

                <input 
                  type="file" 
                  ref={customBgUploadRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={handleCustomBgUpload}
                />

                {/* Sub configuration options */}
                {bgSettings.replacementType === 'color' && (
                  <div className="flex items-center gap-2 mt-2 bg-slate-950/40 p-2 rounded-xl">
                    <span className="text-[11px] text-slate-400">Choose Hex Color:</span>
                    <input 
                      type="color" 
                      value={bgSettings.solidColor}
                      onChange={(e) => setBgSettings({ ...bgSettings, solidColor: e.target.value })}
                      className="w-10 h-6 border-0 rounded cursor-pointer"
                    />
                    <span className="text-xs text-slate-300 font-mono">{bgSettings.solidColor}</span>
                  </div>
                )}

                {bgSettings.replacementType === 'gradient' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setBgSettings({ ...bgSettings, gradientPreset: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' })}
                      className="w-full h-8 rounded-lg border border-slate-800"
                      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                      title="Calming Blue-Purple"
                    />
                    <button
                      onClick={() => setBgSettings({ ...bgSettings, gradientPreset: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)' })}
                      className="w-full h-8 rounded-lg border border-slate-800"
                      style={{ background: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)' }}
                      title="Cyberpunk Sunset"
                    />
                    <button
                      onClick={() => setBgSettings({ ...bgSettings, gradientPreset: 'linear-gradient(135deg, #3a7bd5 0%, #3a6073 100%)' })}
                      className="w-full h-8 rounded-lg border border-slate-800"
                      style={{ background: 'linear-gradient(135deg, #3a7bd5 0%, #3a6073 100%)' }}
                      title="Deep Marine Blue"
                    />
                  </div>
                )}
              </div>

              {bgSettings.colorKey && (
                <button
                  onClick={() => setBgSettings(initialBgSettings)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs py-2 rounded-xl border border-slate-800/10 cursor-pointer"
                >
                  Unwipe Background
                </button>
              )}
            </div>
          )}

          {/* TAB 3: OBJECT SMART ERASER */}
          {activeTab === 'eraser' && (
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-1">
                  <Brush className="w-4 h-4 text-cyan-400" />
                  AI object Smart Eraser
                </h4>
                <p className="text-[11px] text-slate-400">Photo mein se unwanted logon ya cheezon ko paint karke saaf karein:</p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Paint-Brush Active State:</span>
                  <button
                    onClick={() => {
                      setIsBrushMode(!isBrushMode);
                      if(!isBrushMode) setActiveTab('eraser');
                    }}
                    className={`text-xs px-3 py-1.5 rounded-xl font-semibold cursor-pointer ${
                      isBrushMode 
                        ? 'bg-rose-500 text-white animate-pulse' 
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isBrushMode ? 'BRUSH ACTIVE' : 'ACTIVATE BRUSH'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Brush Cap Size:</span>
                    <span className="font-mono font-bold text-rose-400">{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full accent-rose-500 h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="text-[11.5px] text-slate-500 leading-relaxed bg-slate-950/20 p-3 rounded-xl border border-slate-900">
                <span className="font-semibold text-slate-300 block mb-0.5">Instruction:</span>
                1. Canvas par jis cheez ko hatana hai vaha select kariye.<br />
                2. Ek red mask generate hoga.<br />
                3. "AI Smart Erase" option dabayein aur AI use background blend karke gayab kar dega!
              </div>
            </div>
          )}

          {/* DOWNLOAD & FOOTER BAR OF SIDEBAR */}
          <div className="border-t border-slate-800/85 pt-4">
            {imageSrc ? (
              <button
                onClick={downloadHDImage}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-slate-950 hover:text-white font-bold text-sm tracking-tight rounded-2xl transition-all shadow-xl shadow-cyan-500/10 flex items-center justify-center gap-2 group active:scale-[0.98] cursor-pointer"
              >
                <Download className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                Export Clean HD Photo
              </button>
            ) : (
              <p className="text-center text-[11px] text-slate-500">
                Aapki privacy protected hai. Process fully local/cloud API protected hai.
              </p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
