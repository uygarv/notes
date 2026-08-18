'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const previewSize = 280;
const outputSize = 512;
type Point = { x: number; y: number };

export function ProfileImageCropDialog({ file, onOpenChange, onConfirm }: { file: File | null; onOpenChange: (open: boolean) => void; onConfirm: (file: File) => Promise<void> | void }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ start: Point; position: Point } | null>(null);
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);
  useEffect(() => { setImage(null); setZoom(1); setPosition({ x: 0, y: 0 }); if (!objectUrl) return; const next = new Image(); next.onload = () => setImage(next); next.src = objectUrl; }, [objectUrl]);

  const dimensions = image ? (() => { const scale = Math.max(previewSize / image.naturalWidth, previewSize / image.naturalHeight) * zoom; return { width: image.naturalWidth * scale, height: image.naturalHeight * scale, scale }; })() : null;
  const clampPosition = (next: Point, currentDimensions = dimensions) => { if (!currentDimensions) return next; const maxX = Math.max(0, (currentDimensions.width - previewSize) / 2); const maxY = Math.max(0, (currentDimensions.height - previewSize) / 2); return { x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) }; };
  const changeZoom = (nextZoom: number) => { setZoom(nextZoom); if (!image) return; const scale = Math.max(previewSize / image.naturalWidth, previewSize / image.naturalHeight) * nextZoom; setPosition((current) => clampPosition(current, { width: image.naturalWidth * scale, height: image.naturalHeight * scale, scale })); };

  const crop = async () => {
    if (!image || !dimensions || !file) return;
    setSaving(true);
    try {
      const sourceX = (dimensions.width / 2 - position.x - previewSize / 2) / dimensions.scale;
      const sourceY = (dimensions.height / 2 - position.y - previewSize / 2) / dimensions.scale;
      const sourceSize = previewSize / dimensions.scale;
      const canvas = document.createElement('canvas');
      canvas.width = outputSize; canvas.height = outputSize;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image editing is unavailable in this browser.');
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Unable to crop image.')), 'image/webp', 0.9));
      await onConfirm(new File([blob], 'profile-picture.webp', { type: 'image/webp' }));
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  return <Dialog open={Boolean(file)} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Adjust profile picture</DialogTitle><DialogDescription>Drag to position your photo, then use zoom to frame a square profile picture.</DialogDescription></DialogHeader><div className="mx-auto"><div className="relative size-[280px] touch-none overflow-hidden rounded-xl bg-muted" onPointerDown={(event) => { drag.current = { start: { x: event.clientX, y: event.clientY }, position }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drag.current) return; setPosition(clampPosition({ x: drag.current.position.x + event.clientX - drag.current.start.x, y: drag.current.position.y + event.clientY - drag.current.start.y })); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>{dimensions && objectUrl ? <img src={objectUrl} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ width: dimensions.width, height: dimensions.height, left: previewSize / 2 - dimensions.width / 2 + position.x, top: previewSize / 2 - dimensions.height / 2 + position.y }} /> : <div className="grid size-full place-items-center"><LoaderCircle className="animate-spin text-muted-foreground" /></div>}<div className="pointer-events-none absolute inset-0 border border-foreground/15" /><div className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-white/40" /><div className="pointer-events-none absolute inset-y-0 right-1/3 border-l border-white/40" /><div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/40" /><div className="pointer-events-none absolute inset-x-0 bottom-1/3 border-t border-white/40" /></div><div className="mt-5 flex items-center gap-3"><ZoomOut className="size-4 text-muted-foreground" /><Slider value={[zoom]} min={1} max={3} step={0.01} onValueChange={([value]) => changeZoom(value)} aria-label="Profile picture zoom" /><ZoomIn className="size-4 text-muted-foreground" /></div></div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button><Button type="button" disabled={!image || saving} onClick={() => void crop()}>{saving && <LoaderCircle className="animate-spin" />}Use picture</Button></div></DialogContent></Dialog>;
}
