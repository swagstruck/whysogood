'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Category, Tool } from '@/lib/types';
import type { SimpleModeOutput, RunnerOptions } from '@/lib/simpleMode/types';
import { detectCategoryFromFile, getCategoryDefaultTool } from '@/lib/simpleMode/categoryDetection';
import { executeTool, createOutputsZip } from '@/lib/simpleMode/runners';
import { TOOL_MAP, getToolsByCategory } from '@/lib/registry';
import { downloadBlob, uid } from '@/lib/utils';
import { SimpleModeDropzone } from './SimpleModeDropzone';
import { ToolSelector } from './ToolSelector';
import { ToolConfigPanel } from './ToolConfigPanel';
import { OutputList } from './OutputList';
import { Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';

export function SimpleModeWorkbench() {
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [currentCategory, setCurrentCategory] = useState<Category>('Images');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [outputs, setOutputs] = useState<SimpleModeOutput[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clean up output preview URLs on unmount
  const outputsRef = useRef(outputs);
  useEffect(() => {
    outputsRef.current = outputs;
  }, [outputs]);

  useEffect(() => {
    return () => {
      outputsRef.current.forEach(o => {
        if (o.previewUrl) URL.revokeObjectURL(o.previewUrl);
      });
    };
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setActiveFile(file);
    setErrorMessage(null);

    // Auto-detect category
    const cat = detectCategoryFromFile(file);
    setCurrentCategory(cat);

    // Auto-select suggested default tool for this category
    const defaultSlug = getCategoryDefaultTool(cat);
    const tool = TOOL_MAP[defaultSlug] || getToolsByCategory(cat)[0] || null;
    setSelectedTool(tool);
  }, []);

  // Handle clearing active file
  const handleClearFile = useCallback(() => {
    setActiveFile(null);
    setSelectedTool(null);
    setErrorMessage(null);
  }, []);

  // Handle manual category change
  const handleCategoryChange = useCallback((newCat: Category) => {
    setCurrentCategory(newCat);
    const catTools = getToolsByCategory(newCat);
    setSelectedTool(catTools.length > 0 ? catTools[0] : null);
  }, []);

  // Execute active tool
  const handleExecuteTool = async (options: RunnerOptions) => {
    if (!activeFile || !selectedTool) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await executeTool(selectedTool.slug, activeFile, options);
      const previewUrl = URL.createObjectURL(result.blob);

      const newOutput: SimpleModeOutput = {
        id: uid(),
        toolSlug: selectedTool.slug,
        toolName: selectedTool.name,
        sourceFilename: activeFile.name,
        outputFilename: result.filename,
        mimeType: result.blob.type || activeFile.type || 'application/octet-stream',
        size: result.blob.size,
        originalSize: activeFile.size,
        blob: result.blob,
        previewUrl,
        createdAt: Date.now(),
        metadata: result.metadata,
      };

      setOutputs(prev => [newOutput, ...prev]);
    } catch (err: unknown) {
      console.error('Tool execution error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to process file with the selected tool.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Download individual output
  const handleDownloadOutput = (output: SimpleModeOutput) => {
    downloadBlob(output.blob, output.outputFilename);
  };

  // Chain output as new input for next tool ("Use as input for next tool")
  const handleUseAsInput = (output: SimpleModeOutput) => {
    const chainedFile = new File([output.blob], output.outputFilename, {
      type: output.blob.type || output.mimeType,
      lastModified: Date.now(),
    });

    handleFileSelect(chainedFile);
  };

  // Remove individual output
  const handleRemoveOutput = (id: string) => {
    setOutputs(prev => {
      const target = prev.find(o => o.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(o => o.id !== id);
    });
  };

  // Download All as .zip
  const handleDownloadAll = async () => {
    if (outputs.length === 0) return;
    setIsZipping(true);
    try {
      const zipBlob = await createOutputsZip(outputs);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(zipBlob, `whysogood_simple_mode_outputs_${stamp}.zip`);
    } catch (err) {
      console.error('Failed to bundle outputs into zip:', err);
      setErrorMessage('Failed to create ZIP archive.');
    } finally {
      setIsZipping(false);
    }
  };

  // Clear all outputs
  const handleClearAllOutputs = () => {
    outputs.forEach(o => {
      if (o.previewUrl) URL.revokeObjectURL(o.previewUrl);
    });
    setOutputs([]);
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 16px 80px' }}>
      {/* ── Workbench Header Banner ──────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--brand-subtle)',
            color: 'var(--brand)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          <Sparkles size={14} />
          <span>Simple Mode Workbench</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: '0 0 8px',
            color: 'var(--ink)',
          }}
        >
          One Upload. Multiple Tools. Zero Hassle.
        </h1>

        <p
          style={{
            fontSize: 14,
            color: 'var(--ink-2)',
            maxWidth: 580,
            margin: '0 auto',
            lineHeight: 1.5,
          }}
        >
          Upload your file once to run compressions, conversions, resizes, and transformations sequentially without re-uploading. 100% client-side privacy.
        </p>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────── */}
      {errorMessage && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--neg)',
            color: 'var(--neg)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Step 1: Central Dropzone / Active File Card ───────────────── */}
      <SimpleModeDropzone
        activeFile={activeFile}
        detectedCategory={currentCategory}
        onFileSelect={handleFileSelect}
        onClearFile={handleClearFile}
      />

      {/* ── Step 2: Tool Matrix & Controls (When file is loaded) ──────── */}
      {activeFile && (
        <>
          <ToolSelector
            currentCategory={currentCategory}
            selectedToolSlug={selectedTool?.slug || null}
            onSelectCategory={handleCategoryChange}
            onSelectTool={tool => setSelectedTool(tool)}
          />

          {selectedTool && (
            <ToolConfigPanel
              tool={selectedTool}
              file={activeFile}
              isProcessing={isProcessing}
              onExecute={handleExecuteTool}
            />
          )}
        </>
      )}

      {/* ── Step 3: Generated Outputs List ──────────────────────────── */}
      <OutputList
        outputs={outputs}
        onDownload={handleDownloadOutput}
        onUseAsInput={handleUseAsInput}
        onRemove={handleRemoveOutput}
        onDownloadAll={handleDownloadAll}
        onClearAll={handleClearAllOutputs}
        isZipping={isZipping}
      />

      {/* ── Zero-Storage Privacy Footer ─────────────────────────────── */}
      <div
        style={{
          marginTop: 64,
          padding: '24px 20px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap',
          fontSize: 13,
          color: 'var(--ink-2)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--pos)', fontWeight: 600 }}>
          <ShieldCheck size={16} /> 100% Client-Side
        </span>
        <span>•</span>
        <span>Zero server uploads</span>
        <span>•</span>
        <span>Files stay in your browser memory</span>
        <span>•</span>
        <span>Independent and chainable outputs</span>
      </div>
    </div>
  );
}
