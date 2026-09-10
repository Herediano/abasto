import { useState } from 'react';
import { CaretDown, Check, DownloadSimple } from '@phosphor-icons/react';
import { downloadFile, exportText } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Spinner } from '@/components/spinner';
import { cn } from '@/lib/utils';

type ExportParams = Record<string, string | number | undefined> | URLSearchParams;

function toQs(params?: ExportParams): URLSearchParams {
  const p = params instanceof URLSearchParams ? new URLSearchParams(params) : new URLSearchParams();
  if (params && !(params instanceof URLSearchParams)) {
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, String(v));
  }
  return p;
}

/**
 * Botón único "Exportar" que baja el Excel de una vez, sin menú. Para las
 * secciones de un módulo (ej. cada bloque de Reportes), donde un menú por
 * sección sería demasiado. Mismo endpoint que `ExportMenu`
 * (`GET {path}/export?format=xlsx`).
 */
export function ExportButton({
  path,
  params,
  filename,
  label = 'Exportar',
}: {
  path: string;
  params?: ExportParams;
  filename: string;
  label?: string;
}) {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const p = toQs(params);
      p.set('format', 'xlsx');
      await downloadFile(`${path}/export?${p}`, token, `${filename}.xlsx`);
    } catch {
      // el error de red ya se ve en consola; no vale un modal por un export
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void go()} disabled={busy}>
      {busy ? <Spinner /> : <DownloadSimple />} {label}
    </Button>
  );
}

/**
 * Botón "Exportar" — el mismo en todos los listados (ver docs/diseno.md). Baja
 * Excel o CSV, o copia la tabla al portapapeles, respetando los filtros
 * actuales (`params`) y la sucursal activa. El backend expone
 * `GET {path}/export?format=csv|xlsx`.
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
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      const text = (await exportText(`${path}/export?${p}`, token)).replace(/^﻿/, '');
      await navigator.clipboard.writeText(text.replace(/;/g, '\t'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // navegador sin clipboard o sin permiso: no rompe nada
    } finally {
      setBusy(null);
    }
  }

  return (
    <Menu>
      <MenuTrigger
        className={cn(
          'group flex h-10 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-accent-border hover:bg-subtle hover:text-foreground data-[state=open]:bg-subtle data-[state=open]:text-foreground',
          className,
        )}
      >
        <DownloadSimple className="size-4" />
        Exportar
        <CaretDown className="size-3 transition-transform group-data-[state=open]:rotate-180" />
      </MenuTrigger>
      <MenuContent>
        <MenuItem disabled={!!busy} onSelect={() => void download('xlsx')}>
          Descargar Excel (.xlsx)
        </MenuItem>
        <MenuItem disabled={!!busy} onSelect={() => void download('csv')}>
          Descargar CSV
        </MenuItem>
        <MenuSeparator />
        <MenuItem disabled={!!busy} onSelect={e => { e.preventDefault(); void copy(); }}>
          {copied ? (
            <span className="flex items-center gap-1.5 text-success">
              <Check className="size-3.5" /> Copiado
            </span>
          ) : busy === 'copy' ? (
            'Copiando…'
          ) : (
            'Copiar tabla'
          )}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
