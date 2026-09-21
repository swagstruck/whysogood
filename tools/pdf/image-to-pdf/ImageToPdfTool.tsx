'use client';
import React from 'react';
import { ImageToPdfConverter } from './ImageToPdfConverter';

export default function ImageToPdfTool() {
  return (
    <ImageToPdfConverter
      acceptedFormats="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg"
      title="Select any images to convert to PDF"
      description="or drop JPG, PNG, WebP, GIF or SVG files here • merge into one document"
      defaultOutputName="images_to_document.pdf"
    />
  );
}
