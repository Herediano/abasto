import { useEffect, useState } from 'react';
import { CheckCircle, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/field';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  api, errorMessage, uploadFile,
  type ImportApplyResult, type ImportField, type ImportInspect, type ImportPreview,
} from '@/lib/api';

type Step = 'upload' | 'map' | 'preview' | 'done';
const SIN_USAR = -1;

/**
 * Wizard genérico de importación desde Excel/CSV: subir → mapear columnas →
 * previsualizar qué cambia → aplicar. El backend (`importPath`) responde a tres
 * fases (`phase=inspect|preview|apply`); los campos aceptados vienen de
 * `fieldsPath`.
 */
export function ImportWizard({
  open, onClose, onDone, token, title, fieldsPath, importPath,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  token: string;
  title: string;
  fieldsPath: string;
  importPath: string;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [fields, setFields] = useState<ImportField[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [inspect, setInspect] = useState<ImportInspect | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportApplyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && !fields.length) api<{ fields: ImportField[] }>(fieldsPath, {}, token).then(r => setFields(r.fields)).catch(() => {});
  }, [open, fieldsPath, token, fields.length]);

  useEffect(() => {
    if (!open) {
      // Reset al cerrar, para que la próxima vez arranque limpio.
      setTimeout(() => {
        setStep('upload'); setFile(null); setInspect(null); setMapping({});
        setPreview(null); setResult(null); setError('');
      }, 200);
    }
  }, [open]);

  const matchKey = fields.find(f => f.matchKey)?.key ?? 'barcode';

  async function pickFile(f: File) {
    setFile(f);
    setBusy(true);
    setError('');
    try {
      const r = await uploadFile<ImportInspect>(importPath, token, f, { phase: 'inspect' });
      setInspect(r);
      setMapping({ ...r.suggested });
      setStep('map');
    } catch (err) {
      setError(errorMessage(err));
      setFile(null);
    } finally {
      setBusy(false);
    }
  }

  async function doPreview() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const r = await uploadFile<ImportPreview>(importPath, token, file, { phase: 'preview', mapping: JSON.stringify(mapping) });
      setPreview(r);
      setStep('preview');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function doApply() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const r = await uploadFile<ImportApplyResult>(importPath, token, file, { phase: 'apply', mapping: JSON.stringify(mapping) });
      setResult(r);
      setStep('done');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const nada = preview && preview.willCreate === 0 && preview.willUpdate === 0;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {error && <Alert variant="destructive">{error}</Alert>}

        {step === 'upload' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Subí un <span className="font-medium text-foreground">.xlsx</span> o <span className="font-medium text-foreground">.csv</span>.
              La primera fila son los encabezados. Lo más práctico es exportar el listado, editarlo y volver a subir el mismo archivo.
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-subtle">
              {busy ? <Spinner /> : <UploadSimple />} Elegir archivo
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" disabled={busy}
                onChange={e => e.target.files?.[0] && pickFile(e.target.files[0])} />
            </label>
          </div>
        )}

        {step === 'map' && inspect && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {inspect.rowCount} {inspect.rowCount === 1 ? 'fila' : 'filas'}. Confirmá qué columna del archivo va en cada dato. Las que dejes «sin usar» no se tocan (una celda vacía tampoco borra nada).
            </p>
            <div className="grid max-h-[50vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {fields.map(f => (
                <Field key={f.key} label={f.label} htmlFor={`map-${f.key}`} hint={f.help}>
                  <Select
                    id={`map-${f.key}`}
                    value={String(mapping[f.key] ?? SIN_USAR)}
                    onChange={e => setMapping(m => ({ ...m, [f.key]: Number(e.target.value) }))}
                  >
                    {!f.matchKey && <option value={SIN_USAR}>— sin usar —</option>}
                    {inspect.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </Select>
                </Field>
              ))}
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep('upload')}>Elegir otro archivo</Button>
              <Button type="button" disabled={busy || (mapping[matchKey] ?? SIN_USAR) < 0} onClick={() => void doPreview()}>
                {busy && <Spinner />} Ver qué cambia
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Se van a <span className="font-semibold">crear {preview.willCreate}</span> y{' '}
              <span className="font-semibold">actualizar {preview.willUpdate}</span> productos.
              {preview.skipped > 0 && <span className="text-muted-foreground"> {preview.skipped} filas vacías se saltean.</span>}
            </p>

            {preview.errors.length > 0 && (
              <Alert variant="destructive">
                <div className="flex items-center gap-2 font-medium"><WarningCircle /> {preview.errors.length} {preview.errors.length === 1 ? 'fila' : 'filas'} con problemas (se saltean)</div>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {preview.errors.slice(0, 8).map((e, i) => <li key={i}>Fila {e.row}: {e.message}</li>)}
                  {preview.errors.length > 8 && <li>… y {preview.errors.length - 8} más</li>}
                </ul>
              </Alert>
            )}

            {preview.sample.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Campos que cambian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.sample.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-chico">{s.barcode}</TableCell>
                        <TableCell>{s.action}</TableCell>
                        <TableCell className="text-muted-foreground">{s.campos.join(', ') || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep('map')}>Volver al mapeo</Button>
              <Button type="button" disabled={busy || !!nada} onClick={() => void doApply()}>
                {busy && <Spinner />} Importar
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle weight="fill" className="text-primary" />
              <span><span className="font-semibold">{result.created}</span> creados · <span className="font-semibold">{result.updated}</span> actualizados
                {result.errors.length > 0 && <> · <span className="text-muted-foreground">{result.errors.length} con error</span></>}</span>
            </div>
            {result.errors.length > 0 && (
              <ul className="max-h-40 list-disc overflow-y-auto rounded-md border border-border p-3 pl-6 text-xs text-muted-foreground">
                {result.errors.map((e, i) => <li key={i}>Fila {e.row}: {e.message}</li>)}
              </ul>
            )}
            <div className="flex justify-end">
              <Button type="button" onClick={() => { onDone(); onClose(); }}>Listo</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
