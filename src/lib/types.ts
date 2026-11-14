import type { getBill, getAnalysis } from "@/server/bills";
import type { getAction } from "@/server/actions";
import type { dashboard } from "@/server/dashboard";
type Jsonify<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;
export type BillView = Jsonify<Awaited<ReturnType<typeof getBill>>>;
export type AnalysisView = Jsonify<Awaited<ReturnType<typeof getAnalysis>>>;
export type ActionView = Jsonify<Awaited<ReturnType<typeof getAction>>>;
export type DashboardView = Jsonify<Awaited<ReturnType<typeof dashboard>>>;
