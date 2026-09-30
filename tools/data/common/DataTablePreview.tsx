'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob } from '@/lib/utils';
import {
  Table as TableIcon,
  Code,
  Copy,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
} from 'lucide-react';

export interface DataTablePreviewProps {
  headers: string[];
  rows: string[][];
  rawCsv: string;
  downloadFilename?: string;
  title?: string;
  metricsBadge?: React.ReactNode;
  actionsToolbar?: React.ReactNode;
}

export function DataTablePreview({
  headers,
  rows,
  rawCsv,
  downloadFilename = 'data.csv',
  title = 'Data Output Preview',
  metricsBadge,
  actionsToolbar,
}: DataTablePreviewProps) {
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [copied, setCopied] = useState(false);

  const toast = useToast();

  // Search filtering
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const lower = searchTerm.toLowerCase();
    return rows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(lower))
    );
  }, [rows, searchTerm]);

  // Sorting
  const sortedRows = useMemo(() => {
    if (sortCol === null) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const valA = a[sortCol] ?? '';
      const valB = b[sortCol] ?? '';
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && valA.trim() !== '' && valB.trim() !== '') {
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }
      return sortDir === 'asc'
        ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
        : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filteredRows, sortCol, sortDir]);

  // Pagination calculations
  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const pageIndex = Math.min(currentPage, totalPages);
  const startIndex = (pageIndex - 1) * pageSize;
  const paginatedRows = useMemo(() => {
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, startIndex, pageSize]);

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortCol(null);
        setSortDir('asc');
      }
    } else {
      setSortCol(colIdx);
      setSortDir('asc');
    }
  };

  const handleCopy = async () => {
    if (!rawCsv) return;
    try {
      await copyToClipboard(rawCsv);
      setCopied(true);
      toast.success('CSV copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    if (!rawCsv) return;
    downloadBlob(new Blob([rawCsv], { type: 'text/csv' }), downloadFilename);
    toast.success(`Downloaded ${downloadFilename}`);
  };

  return (
    <div
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
            {title}
          </span>
          {metricsBadge}

          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg)',
              borderRadius: 'var(--radius-md)',
              padding: 2,
              border: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: viewMode === 'table' ? 'var(--brand)' : 'transparent',
                color: viewMode === 'table' ? 'var(--ink-inverse)' : 'var(--ink-2)',
                transition: 'all 0.15s ease',
              }}
            >
              <TableIcon size={13} />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: viewMode === 'raw' ? 'var(--brand)' : 'transparent',
                color: viewMode === 'raw' ? 'var(--ink-inverse)' : 'var(--ink-2)',
                transition: 'all 0.15s ease',
              }}
            >
              <Code size={13} />
              <span>Raw CSV</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {actionsToolbar}
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? <Check size={14} style={{ marginRight: 6 }} /> : <Copy size={14} style={{ marginRight: 6 }} />}
            Copy CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download size={14} style={{ marginRight: 6 }} />
            Download
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <>
          {/* Table Controls Bar: Search & Page Size */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                minWidth: 'min(100%, 220px)',
                flex: 1,
              }}
            >
              <Search size={14} color="var(--ink-2)" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter table rows..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ink)',
                  fontSize: 13,
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Page Size:</span>
              <div style={{ width: 90 }}>
                <Select
                  value={String(pageSize)}
                  onChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                  options={[
                    { label: '10', value: '10' },
                    { label: '25', value: '25' },
                    { label: '50', value: '50' },
                    { label: '100', value: '100' },
                    { label: '250', value: '250' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Tabular Grid */}
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              overflowX: 'auto',
              maxHeight: 460,
              overflowY: 'auto',
            }}
          >
            {rows.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-2)', fontSize: 13 }}>
                No rows to display. Load or process data to preview table.
              </div>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                <thead>
                  <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 12px', width: 44, color: 'var(--ink-3)', textAlign: 'center' }}>
                      #
                    </th>
                    {headers.map((header, colIdx) => (
                      <th
                        key={colIdx}
                        onClick={() => handleSort(colIdx)}
                        style={{
                          padding: '8px 12px',
                          color: 'var(--ink)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{header || `Column ${colIdx + 1}`}</span>
                          {sortCol === colIdx ? (
                            sortDir === 'asc' ? (
                              <ArrowUp size={12} color="var(--brand)" />
                            ) : (
                              <ArrowDown size={12} color="var(--brand)" />
                            )
                          ) : (
                            <ArrowUpDown size={11} color="var(--ink-3)" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: rowIdx % 2 === 0 ? 'transparent' : 'var(--bg-2)',
                      }}
                    >
                      <td style={{ padding: '6px 12px', color: 'var(--ink-3)', textAlign: 'center' }}>
                        {startIndex + rowIdx + 1}
                      </td>
                      {headers.map((_, colIdx) => (
                        <td
                          key={colIdx}
                          style={{
                            padding: '6px 12px',
                            color: 'var(--ink)',
                            whiteSpace: 'nowrap',
                            maxWidth: 320,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            borderRight: '1px solid var(--border)',
                          }}
                        >
                          {row[colIdx] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Navigation Footer */}
          {rows.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                fontSize: 12,
                color: 'var(--ink-2)',
              }}
            >
              <span>
                Showing {totalRows === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + pageSize, totalRows)} of{' '}
                {totalRows.toLocaleString()} rows {searchTerm && `(filtered from ${rows.length.toLocaleString()})`}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={pageIndex <= 1}
                  title="First Page"
                >
                  <ChevronsLeft size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pageIndex <= 1}
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </Button>
                <span style={{ padding: '0 8px', fontWeight: 600, color: 'var(--ink)' }}>
                  {pageIndex} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageIndex >= totalPages}
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={pageIndex >= totalPages}
                  title="Last Page"
                >
                  <ChevronsRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Raw CSV Code Mode */
        <textarea
          readOnly
          value={rawCsv}
          rows={16}
          style={{
            width: '100%',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 12,
            color: 'var(--ink)',
            fontSize: 13,
            fontFamily: 'var(--font-mono, monospace)',
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
          }}
        />
      )}
    </div>
  );
}
