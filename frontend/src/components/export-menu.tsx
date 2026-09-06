import { useEffect, useRef, useState } from 'react';
import { CaretDown, Check, DownloadSimple } from '@phosphor-icons/react';
import { API, downloadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

/**
 * Botón "Exportar" — el mismo en todos los listados (ver docs/diseno.md). Baja
 * Excel o CSV, o copia la tabla al portapapeles, respetando los filtros
 * actuales (`params`). El backend expone `GET {path}/export?format=csv|xlsx`.
 */
export function ExportMenu({
  path,
  params,
  filename,
  className,
}: {
  path: string;
  params?: Record<string, string | number | undefined> | URLSearchParams;
  filename: string;
  className?: string;
}) {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const qs = () => {
    const p = params instanceof URLSearchParams ? new URLSearchParams(params) : new URLSearchParams();
    if (params && !(params instanceof URLSearchParams)) {
      for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, String(v));
    }
    return p;
  };

  async function download(format: 'xlsx' | 'csv') {
    setBusy(format);
    try {
      const p = qs();
      p.set('format', format);
      await downloadFile(`${path}/export?${p}`, token, `${filename}.${format}`);
      setOpen(false);
    } catch {
      // el error de red ya se ve en la consola; no vale un modal por un export
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    setBusy('copy');
    try {
      const p = qs();
      p.set('format', 'csv');
      const res = await fetch(`${API}${path}/export?${p}`, { headers: { Authorization: `Bearer ${token}` } });
      const text = (await res.text()).replace(/^﻿/, '');
      await navigator.clipboard.writeText(text.replace(/;/g, '\t'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      setTimeout(() => setOpen(false), 400);
    } catch {
      // navegador sin clipboard o sin permiso: no rompe nada
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-accent-border hover:bg-subtle hover:text-foreground"
      >
        <DownloadSimple className="size-4" />
        Exportar
        <CaretDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 min-w-[190px] rounded-md border border-border bg-card p-1 shadow-float"
        >
          <button type="button" role="menuitem" onClick={() => download('xlsx')} disabled={!!busy} className="menu-row">
            {busy === 'xlsx' ? '…' : 'Descargar Excel (.xlsx)'}
          </button>
          <button type="button" role="menuitem" onClick={() => download('csv')} disabled={!!busy} className="menu-row">
            {busy === 'csv' ? '…' : 'Descargar CSV'}
          </button>
          <div className="my-1 h-px bg-border" />
          <button type="button" role="menuitem" onClick={copy} disabled={!!busy} className="menu-row">
            {copied ? (
              <span className="flex items-center gap-1.5 text-success">
                <Check className="size-3.5" /> Copiado
              </span>
            ) : busy === 'copy' ? (
              '…'
            ) : (
              'Copiar tabla'
            )}
          </button>
        </div>
      )}
      <style>{`.menu-row{display:block;width:100%;text-align:left;padding:7px 9px;border-radius:5px;font-size:13px;color:var(--color-foreground);}
      .menu-row:hover:not(:disabled){background:var(--color-background);}
      .menu-row:disabled{opacity:.5;}`}</style>
    </div>
  );
}
