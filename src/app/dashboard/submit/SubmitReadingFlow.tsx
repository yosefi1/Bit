"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Camera, RefreshCw, Send, X } from "lucide-react";
import { formatCurrency, formatKwh, formatRateShekels } from "@/lib/utils";
import { he } from "@/lib/i18n/he";

interface OcrResult {
  reading: number | null;
  confidence: number | null;
  rawText: string;
  provider: "tesseract" | "openai" | "none";
}

interface UploadResponse {
  file: {
    url: string | null;
    originalName: string;
    contentType: string;
    size: number;
  };
  ocr: OcrResult;
  storageWarning?: string | null;
}

function isImageFile(f: File): boolean {
  if (f.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name);
}

export function SubmitReadingFlow({
  cycleId,
  ratePerKwh,
  previousReading,
}: {
  cycleId: string;
  ratePerKwh: number;
  previousReading: number;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<UploadResponse | null>(null);
  const [reading, setReading] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const readingNum = Number(reading);
  const valid =
    Number.isFinite(readingNum) && readingNum >= previousReading;

  const calc = useMemo(() => {
    if (!valid) return null;
    const consumption = Math.max(0, readingNum - previousReading);
    const amount = consumption * ratePerKwh;
    return {
      consumption: Math.round(consumption * 100) / 100,
      amount: Math.round(amount * 100) / 100,
    };
  }, [valid, readingNum, previousReading, ratePerKwh]);

  async function runOcrForFile(f: File) {
    setUploading(true);
    setError(null);
    setWarning(null);
    setUploaded(null);
    setReading("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || he.submit.uploadFailed);
        return;
      }
      const result = data as UploadResponse;
      setUploaded(result);
      if (result.ocr.reading != null) {
        setReading(String(result.ocr.reading));
        if (result.ocr.reading < previousReading) {
          setWarning(he.submit.ocrLow);
        }
      } else {
        setWarning(he.submit.ocrFailed);
      }
      if (result.storageWarning) {
        setWarning((w) =>
          w ? `${w} ${result.storageWarning}` : result.storageWarning ?? null
        );
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(f: File) {
    setError(null);
    setWarning(null);
    if (!isImageFile(f)) {
      setError(he.submit.imageTypeError);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(he.submit.imageSizeError);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    await runOcrForFile(f);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setUploaded(null);
    setReading("");
    setError(null);
    setWarning(null);
    setDragOver(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit() {
    if (!calc || !valid) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingCycleId: cycleId,
          confirmedReading: readingNum,
          imageUrl: uploaded?.file.url ?? undefined,
          imageOriginalName: uploaded?.file.originalName,
          ocrReading: uploaded?.ocr.reading,
          ocrConfidence: uploaded?.ocr.confidence,
          ocrRawText: uploaded?.ocr.rawText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || he.submit.submissionFailed);
        return;
      }
      router.push(`/dashboard/submission/${data.submission.id}?just=1`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{he.submit.step1}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {!preview ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInput.current?.click();
              }}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors ${
                dragOver
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/40"
              }`}
            >
              <Camera className="h-10 w-10 text-slate-400" />
              <div className="text-sm font-medium text-slate-700">
                {dragOver ? he.submit.dropHere : he.submit.uploadHint}
              </div>
              <div className="text-xs text-slate-500">{he.submit.uploadFormats}</div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={he.tenant.meterPhoto} className="w-full" />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white">
                  <RefreshCw className="ml-2 h-5 w-5 animate-spin" />
                  {he.submit.reading}
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />

          <div className="flex flex-wrap gap-2">
            {preview && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => file && runOcrForFile(file)}
                  disabled={uploading || !file}
                >
                  <RefreshCw className={`h-4 w-4 ${uploading ? "animate-spin" : ""}`} />
                  {he.submit.readMeter}
                </Button>
                <Button variant="ghost" onClick={reset} disabled={uploading}>
                  <X className="h-4 w-4" />
                  {he.submit.remove}
                </Button>
              </>
            )}
          </div>

          {error && <Alert tone="danger">{error}</Alert>}
          {warning && <Alert tone="warning">{warning}</Alert>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{he.submit.step2}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {uploaded && (
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {he.submit.ocrDetected} ({uploaded.ocr.provider}):{" "}
              <strong>
                {uploaded.ocr.reading != null
                  ? formatKwh(uploaded.ocr.reading)
                  : he.submit.noReading}
              </strong>
              {uploaded.ocr.confidence != null && (
                <>
                  {" "}
                  · {he.submit.confidence}{" "}
                  {Math.round(uploaded.ocr.confidence * 100)}%
                </>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="confirmedReading" hint="קו״ח">
              {he.submit.yourReading}
            </Label>
            <Input
              id="confirmedReading"
              type="number"
              step="0.01"
              min={previousReading}
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              placeholder={`למשל ${(previousReading + 100).toFixed(0)}`}
              className="mt-1 text-lg"
              disabled={uploading}
            />
            <p className="mt-1 text-xs text-slate-500">
              {he.submit.previousHint}:{" "}
              <strong>{formatKwh(previousReading)}</strong>. {he.submit.mustBeHigher}
            </p>
            {reading && !valid && (
              <Alert tone="danger" className="mt-2">
                {he.submit.mustBeHigher}
              </Alert>
            )}
          </div>

          {calc && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
              <h4 className="text-sm font-semibold text-brand-900">
                {he.submit.calcSummary}
              </h4>
              <dl className="mt-3 space-y-2 text-sm">
                <Line k={he.submit.currentReading} v={formatKwh(readingNum)} />
                <Line k={he.submit.previousHint} v={formatKwh(previousReading)} />
                <Line k={he.submit.consumption} v={formatKwh(calc.consumption)} />
                <Line k={he.submit.ratePerKwh} v={formatRateShekels(ratePerKwh)} />
                <div className="my-2 border-t border-brand-200" />
                <Line
                  k={he.submit.amountDue}
                  v={
                    <span className="text-lg font-semibold text-brand-900">
                      {formatCurrency(calc.amount)}
                    </span>
                  }
                />
              </dl>
            </div>
          )}

          <Button
            onClick={submit}
            disabled={!valid || submitting || uploading}
            size="lg"
            fullWidth
          >
            <Send className="h-4 w-4" />
            {submitting ? he.submit.submitting : he.submit.submit}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

function Line({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs uppercase tracking-wide text-brand-700">{k}</dt>
      <dd className="text-sm font-medium text-brand-900">{v}</dd>
    </div>
  );
}
