'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Crop, Download, RefreshCw } from 'lucide-react';
import { FileUploader } from '@/components/tools/FileUploader';
import { Button } from '@/components/ui/Button';
import { downloadBlob, formatFileSize } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type HandleId = 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

interface DragState {
  handle: HandleId;
  startMouseX: number;
  startMouseY: number;
  startBox: CropBox;
  containerW: number;
  containerH: number;
}

interface AspectRatio {
  label: string;
  value: number | null;
}

const RATIOS: AspectRatio[] = [
  { label: 'Free', value: null },
  { label: '1 : 1', value: 1 },
  { label: '16 : 9', value: 16 / 9 },
  { label: '4 : 3', value: 4 / 3 },
  { label: '9 : 16', value: 9 / 16 },
  { label: '3 : 2', value: 3 / 2 },
];

const HANDLE_SIZE = 12;
const MIN_DIM = 20;

interface HandleDef {
  id: HandleId;
  cursor: string;
  xFrac: number;
  yFrac: number;
}

const HANDLE_DEFS: HandleDef[] = [
  { id: 'nw', cursor: 'nwse-resize', xFrac: 0,   yFrac: 0   },
  { id: 'n',  cursor: 'ns-resize',   xFrac: 0.5, yFrac: 0   },
  { id: 'ne', cursor: 'nesw-resize', xFrac: 1,   yFrac: 0   },
  { id: 'w',  cursor: 'ew-resize',   xFrac: 0,   yFrac: 0.5 },
  { id: 'e',  cursor: 'ew-resize',   xFrac: 1,   yFrac: 0.5 },
  { id: 'sw', cursor: 'nesw-resize', xFrac: 0,   yFrac: 1   },
  { id: 's',  cursor: 'ns-resize',   xFrac: 0.5, yFrac: 1   },
  { id: 'se', cursor: 'nwse-resize', xFrac: 1,   yFrac: 1   },
];

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function applyDrag(
  handle: HandleId,
  dx: number,
  dy: number,
  startBox: CropBox,
  cW: number,
  cH: number,
  ratio: number | null,
): CropBox {
  let { x, y, w, h } = startBox;

  if (handle === 'move') {
    return {
      x: clamp(startBox.x + dx, 0, cW - startBox.w),
      y: clamp(startBox.y + dy, 0, cH - startBox.h),
      w, h,
    };
  }

  let newX = x, newY = y, newW = w, newH = h;

  if (handle.includes('w')) {
    newX = clamp(startBox.x + dx, 0, startBox.x + startBox.w - MIN_DIM);
    newW = startBox.x + startBox.w - newX;
  }
  if (handle.includes('e')) {
    newW = clamp(startBox.w + dx, MIN_DIM, cW - startBox.x);
  }
  if (handle.includes('n')) {
    newY = clamp(startBox.y + dy, 0, startBox.y + startBox.h - MIN_DIM);
    newH = startBox.y + startBox.h - newY;
  }
  if (handle.includes('s')) {
    newH = clamp(startBox.h + dy, MIN_DIM, cH - startBox.y);
  }

  if (ratio !== null) {
    if (handle === 'n' || handle === 's') {
      newW = clamp(newH * ratio, MIN_DIM, cW - newX);
      newH = newW / ratio;
    } else if (handle === 'e' || handle === 'w') {
      newH = clamp(newW / ratio, MIN_DIM, cH - newY);
      newW = newH * ratio;
    } else {
      if (Math.abs(dx) >= Math.abs(dy)) {
        newH = newW / ratio;
      } else {
        newW = newH * ratio;
      }
    }
    newW = clamp(newW, MIN_DIM, cW - newX);
    newH = clamp(newH, MIN_DIM, cH - newY);
    if (handle.includes('n')) newY = startBox.y + startBox.h - newH;
    if (handle.includes('w')) newX = startBox.x + startBox.w - newW;
  }

  newX = clamp(newX, 0, cW - MIN_DIM);
  newY = clamp(newY, 0, cH - MIN_DIM);
  newW = clamp(newW, MIN_DIM, cW - newX);
  newH = clamp(newH, MIN_DIM, cH - newY);

  return { x: newX, y: newY, w: newW, h: newH };
}

export default function ImageCropperTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, w: 100, h: 100 });
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(RATIOS[0]);
  const [croppedUrl, setCroppedUrl] = useState<string>('');
  const [croppedSize, setCroppedSize] = useState(0);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const initDoneRef = useRef(false);

  // Init crop box to full image once we know the painted dimensions.
  // We read from imgRef because the absolute-positioned container derives
  // its size from the img; clientWidth is reliable after the browser paints.
  const initCropBox = useCallback(() => {
    const img = imgRef.current;
    if (!img || img.clientWidth === 0) return;
    initDoneRef.current = true;
    setNaturalW(img.naturalWidth);
    setNaturalH(img.naturalHeight);
    setCropBox({ x: 0, y: 0, w: img.clientWidth, h: img.clientHeight });
  }, []);

  const handleFile = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    initDoneRef.current = false;
    setFile(f);
    setCroppedUrl('');
    setCroppedBlob(null);
    setImgSrc(URL.createObjectURL(f));
  }, []);

  // onLoad fires when the image has decoded; rAF ensures the browser has
  // actually laid it out so clientWidth/clientHeight are non-zero.
  const handleImageLoad = useCallback(() => {
    requestAnimationFrame(initCropBox);
  }, [initCropBox]);

  // Safety net: ResizeObserver fires when the container is first sized
  // (covers cases where onLoad fires before layout is complete).
  useEffect(() => {
    const con = containerRef.current;
    if (!con) return;
    const ro = new ResizeObserver(() => {
      if (!initDoneRef.current) initCropBox();
    });
    ro.observe(con);
    return () => ro.disconnect();
  }, [imgSrc, initCropBox]);

  useEffect(() => {
    if (!imgSrc) return;
    const con = containerRef.current;
    if (!con) return;
    const { width: cW, height: cH } = con.getBoundingClientRect();
    if (cW === 0 || cH === 0) return;
    const ratio = selectedRatio.value;
    if (ratio === null) return;
    setCropBox(prev => {
      let w = prev.w;
      let h = w / ratio;
      if (h > cH) { h = cH; w = h * ratio; }
      if (w > cW) { w = cW; h = w / ratio; }
      return {
        x: clamp(prev.x, 0, cW - w),
        y: clamp(prev.y, 0, cH - h),
        w, h,
      };
    });
  }, [selectedRatio, imgSrc]);

  const startDrag = useCallback((handle: HandleId, clientX: number, clientY: number) => {
    const con = containerRef.current;
    if (!con) return;
    const { width, height } = con.getBoundingClientRect();
    dragRef.current = {
      handle,
      startMouseX: clientX,
      startMouseY: clientY,
      startBox: { ...cropBox },
      containerW: width,
      containerH: height,
    };
  }, [cropBox]);

  const onMouseDown = useCallback((handle: HandleId) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startDrag(handle, e.clientX, e.clientY);
  }, [startDrag]);

  const onTouchStart = useCallback((handle: HandleId) => (e: React.TouchEvent) => {
    e.stopPropagation();
    const t = e.touches[0];
    startDrag(handle, t.clientX, t.clientY);
  }, [startDrag]);

  useEffect(() => {
    const onMove = (clientX: number, clientY: number) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = clientX - d.startMouseX;
      const dy = clientY - d.startMouseY;
      setCropBox(applyDrag(d.handle, dx, dy, d.startBox, d.containerW, d.containerH, selectedRatio.value));
    };
    const handleMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => { const t = e.touches[0]; onMove(t.clientX, t.clientY); };
    const handleUp = () => { dragRef.current = null; };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [selectedRatio]);

  const displayW = imgRef.current?.clientWidth || 1;
  const displayH = imgRef.current?.clientHeight || 1;
  const scaleX = naturalW / displayW;
  const scaleY = naturalH / displayH;
  const naturalCropW = Math.round(cropBox.w * scaleX);
  const naturalCropH = Math.round(cropBox.h * scaleY);

  const executeCrop = useCallback(async () => {
    const img = imgRef.current;
    if (!img || !imgSrc) return;
    const sx = Math.round(cropBox.x * scaleX);
    const sy = Math.round(cropBox.y * scaleY);
    const sw = Math.round(cropBox.w * scaleX);
    const sh = Math.round(cropBox.h * scaleY);
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    canvas.toBlob(blob => {
      if (!blob) return;
      setCroppedUrl(URL.createObjectURL(blob));
      setCroppedSize(blob.size);
      setCroppedBlob(blob);
    }, file?.type || 'image/png', 0.92);
  }, [cropBox, imgSrc, scaleX, scaleY, file]);

  const handleDownload = () => {
    if (!croppedBlob || !file) return;
    const ext = file.name.split('.').pop() || 'png';
    downloadBlob(croppedBlob, `cropped-${file.name.replace(/\.[^/.]+$/, '')}.${ext}`);
  };

  const handleReset = () => {
    setFile(null);
    setImgSrc('');
    setCroppedUrl('');
    setCroppedBlob(null);
    setSelectedRatio(RATIOS[0]);
  };

  if (!imgSrc) {
    return (
      <FileUploader
        accept="image/*"
        multiple={false}
        label="Drop an image to crop — PNG, JPG, WebP, GIF"
        formats={['PNG', 'JPG', 'WebP', 'GIF', 'AVIF']}
        onFiles={handleFile}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Ratio pills */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-[var(--color-muted)] mr-1">Ratio:</span>
        {RATIOS.map(r => (
          <button
            key={r.label}
            onClick={() => setSelectedRatio(r)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              selectedRatio.label === r.label
                ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-[var(--color-muted)] tabular-nums">
          {naturalCropW} &times; {naturalCropH} px
        </span>
      </div>

      {/* Interactive crop canvas */}
      <div
        className="relative w-full select-none overflow-hidden rounded-xl"
        style={{ background: '#111', lineHeight: 0 }}
      >
        <img
          ref={imgRef}
          src={imgSrc}
          alt="crop source"
          onLoad={handleImageLoad}
          draggable={false}
          className="block w-full h-auto pointer-events-none"
          style={{ userSelect: 'none' }}
        />

        <div ref={containerRef} className="absolute inset-0">
          {/* Dark overlay: 4 rectangles around the crop box */}
          <div className="absolute bg-black/50" style={{ top: 0, left: 0, right: 0, height: cropBox.y }} />
          <div className="absolute bg-black/50" style={{ top: cropBox.y + cropBox.h, left: 0, right: 0, bottom: 0 }} />
          <div className="absolute bg-black/50" style={{ top: cropBox.y, left: 0, width: cropBox.x, height: cropBox.h }} />
          <div className="absolute bg-black/50" style={{ top: cropBox.y, left: cropBox.x + cropBox.w, right: 0, height: cropBox.h }} />

          {/* Crop box */}
          <div
            className="absolute"
            style={{
              left: cropBox.x,
              top: cropBox.y,
              width: cropBox.w,
              height: cropBox.h,
              border: '1.5px solid rgba(255,255,255,0.9)',
              boxSizing: 'border-box',
              cursor: 'move',
            }}
            onMouseDown={onMouseDown('move')}
            onTouchStart={onTouchStart('move')}
          >
            {/* Rule-of-thirds grid */}
            {[1, 2].map(i => (
              <React.Fragment key={i}>
                <div className="absolute bg-white/20" style={{ left: `${(i / 3) * 100}%`, top: 0, width: 1, height: '100%' }} />
                <div className="absolute bg-white/20" style={{ top: `${(i / 3) * 100}%`, left: 0, height: 1, width: '100%' }} />
              </React.Fragment>
            ))}
          </div>

          {/* Resize handles */}
          {HANDLE_DEFS.map(({ id, cursor, xFrac, yFrac }) => (
            <div
              key={id}
              onMouseDown={onMouseDown(id)}
              onTouchStart={onTouchStart(id)}
              style={{
                position: 'absolute',
                left: cropBox.x + cropBox.w * xFrac - HANDLE_SIZE / 2,
                top: cropBox.y + cropBox.h * yFrac - HANDLE_SIZE / 2,
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                background: 'white',
                borderRadius: 2,
                cursor,
                zIndex: 10,
                boxShadow: '0 0 4px rgba(0,0,0,0.7)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={executeCrop} className="flex-1 sm:flex-none">
          <Crop size={16} className="mr-2" />
          Crop Image
        </Button>
        <Button variant="secondary" onClick={handleReset} className="flex-1 sm:flex-none">
          <RefreshCw size={16} className="mr-2" />
          Reset
        </Button>
      </div>

      {/* Result */}
      {croppedUrl && (
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
          <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">Cropped Image</p>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                {naturalCropW} &times; {naturalCropH} px &middot; {formatFileSize(croppedSize)}
              </p>
            </div>
            <Button onClick={handleDownload}>
              <Download size={16} className="mr-2" />
              Download
            </Button>
          </div>
          <div className="p-4 flex justify-center bg-[#0d0d0d]">
            <img
              src={croppedUrl}
              alt="Cropped result"
              className="max-w-full max-h-96 object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
