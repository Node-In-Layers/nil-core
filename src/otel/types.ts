import type { CoreNamespace, LogId, XOR } from '../types.js'

/**
 * OTel config (OtelConfig, OtelExporterConfig, OtelSignalConfig) lives on CoreConfig.logging.otel
 * in ../types.ts to avoid circular imports. Import from '@node-in-layers/core' when you need it.
 */

/** Status code and optional message for a span (e.g. OK, ERROR). */
export type SpanStatus = Readonly<{ code: number; message?: string }>

/** Single attribute value allowed in OTel attributes. */
export type AttributeValue = string | number | boolean

/** Map of attribute names to values (used in spans, metrics, etc.). */
export type AttributesMap = Readonly<Record<string, AttributeValue>>

/** A span-like object that can be wrapped to SpanLike (e.g. from OTel API). */
export type SpanWrappable = Readonly<{
  end: () => void
  setAttribute: (key: string, value: AttributeValue) => void
  setStatus: (status: SpanStatus) => void
}>

export type SpanLike = Readonly<{
  end: () => void
  setAttribute: (key: string, value: AttributeValue) => void
  setStatus: (status: SpanStatus) => void
}>

export type HistogramLike = Readonly<{
  record: (value: number, attributes?: AttributesMap) => void
}>

export type CounterLike = Readonly<{
  add: (value?: number, attributes?: AttributesMap) => void
}>

export type OtelTraceService = Readonly<{
  startSpan: (
    name: string,
    options?: { attributes?: AttributesMap }
  ) => SpanLike
  runWithSpan: <T>(
    name: string,
    fn: (span: SpanLike) => T | Promise<T>,
    options?: { attributes?: AttributesMap }
  ) => T | Promise<T>
  getActiveSpan: () => SpanLike | undefined
}>

export type OtelMetricsService = Readonly<{
  recordDuration: (
    name: string,
    durationMs: number,
    attributes?: AttributesMap
  ) => void
  incrementCounter: (
    name: string,
    value?: number,
    attributes?: AttributesMap
  ) => void
  createHistogram: (name: string, options?: { unit?: string }) => HistogramLike
  createCounter: (name: string, options?: { unit?: string }) => CounterLike
}>

export type OtelLogsService = Readonly<{
  emit: (record: {
    body: string
    severityNumber?: number
    severityText?: string
    attributes?: Record<string, unknown>
  }) => void
}>

/** Options for runWithTraceAndMetrics (layer/function identity and ids for span attributes). */
export type RunWithTraceAndMetricsOptions = Readonly<{
  layerName: string
  functionName: string
  getIds: () => readonly LogId[]
}>

export type OtelServices = Readonly<{
  /** One-time setup; may be async when loading optional OTel API. */
  setupOtel: () => XOR<void, Promise<void>>
  trace: OtelTraceService
  metrics: OtelMetricsService
  logs: OtelLogsService
  /** Runs fn with a span and records duration/count; uses this service's trace and metrics. */
  runWithTraceAndMetrics: <T>(
    options: RunWithTraceAndMetricsOptions,
    fn: () => T | Promise<T>
  ) => T | Promise<T>
}>

export type OtelServicesLayer = Readonly<{
  [CoreNamespace.otel]: OtelServices
}>
