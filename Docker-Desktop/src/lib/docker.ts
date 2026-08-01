// Docker Engine API client — talks directly to local WSL2 Docker daemon.
// Runs inside a Tauri native shell, so browser CORS does not apply.

import { invoke } from '@tauri-apps/api/core';



export interface DockerContainer {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  Status: string;
  State: string;
  Ports: unknown[];
  Labels: Record<string, string>;
}

export interface ContainerStats {
  cpuPercent: number;
  memUsageMB: number;
  memLimitMB: number;
  memPercent: number;
}

export interface HealthState {
  connected: boolean;
  version?: string;
  error?: string;
}

async function dockerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  const result = await invoke<string>('docker_request', { path, method });
  if (!result) return undefined as T;
  return JSON.parse(result) as T;
}
export async function pingDocker(): Promise<HealthState> {
  try {
    const v = await dockerFetch<{ Version: string }>('/version', undefined);
    return { connected: true, version: v.Version };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function listContainers(all = true): Promise<DockerContainer[]> {
  return dockerFetch<DockerContainer[]>(`/containers/json?all=${all}`);
}

export async function startContainer(id: string): Promise<void> {
  await dockerFetch<void>(`/containers/${id}/start`, { method: 'POST' });
}

export async function stopContainer(id: string): Promise<void> {
  await dockerFetch<void>(`/containers/${id}/stop`, { method: 'POST' });
}

export async function pruneContainers(): Promise<{ ContainersDeleted: number; SpaceReclaimed: number }> {
  return dockerFetch<{ ContainersDeleted: number; SpaceReclaimed: number }>(
    '/containers/prune',
    { method: 'POST' }
  );
}

export async function getContainerStats(id: string): Promise<ContainerStats> {
  const raw = await dockerFetch<RawStats>(
    `/containers/${id}/stats?stream=false`,
    undefined
  );
  return parseStats(raw);
}

// export async function getContainerLogs(id: string): Promise<string> {
//   const controller = new AbortController();
//   const timer = setTimeout(() => controller.abort(), 8000);
//   try {
//     const res = await fetch(
//       `${DOCKER_HOST}/containers/${id}/logs?stdout=1&stderr=1&tail=50`,
//       { signal: controller.signal },
//     );
//     if (!res.ok) throw new Error(`Logs ${res.status}`);
//     // Docker returns multiplexed streams for non-tty containers (8-byte header per frame).
//     const buf = await res.arrayBuffer();
//     return demuxLogs(buf);
//   } finally {
//     clearTimeout(timer);
//   }
// }

// export async function getContainerLogs(id: string): Promise<string> {
//   const res = await fetch(
//     `${DOCKER_HOST}/containers/${id}/logs?stdout=1&stderr=1&tail=50`
//   );
//   if (!res.ok) throw new Error(`Logs ${res.status}`);
//   const buf = await res.arrayBuffer();
//   return demuxLogs(buf);
// }


export async function getContainerLogs(id: string): Promise<string> {
  const result = await invoke<string>('docker_request', {
    path: `/containers/${id}/logs?stdout=1&stderr=1&tail=50`,
    method: 'GET',
  });
  const buf = new TextEncoder().encode(result).buffer;
  return demuxLogs(buf);
}

// --- internals ---

interface RawStats {
  precpu_stats: CpuStats;
  cpu_stats: CpuStats;
  memory_stats: MemStats;
}

interface CpuStats {
  cpu_usage: { total_usage: number };
  system_cpu_usage?: number;
  online_cpus?: number;
}

interface MemStats {
  usage: number;
  limit: number;
}

function parseStats(raw: RawStats): ContainerStats {
  const cpuDelta =
    raw.cpu_stats.cpu_usage.total_usage - raw.precpu_stats.cpu_usage.total_usage;
  const sysDelta =
    (raw.cpu_stats.system_cpu_usage ?? 0) - (raw.precpu_stats.system_cpu_usage ?? 0);
  const cpus = raw.cpu_stats.online_cpus ?? 1;
  let cpuPercent = 0;
  if (sysDelta > 0 && cpuDelta > 0) {
    cpuPercent = ((cpuDelta / sysDelta) * cpus * 100) || 0;
  }
  const memUsageMB = (raw.memory_stats.usage ?? 0) / 1024 / 1024;
  const memLimitMB = (raw.memory_stats.limit ?? 0) / 1024 / 1024;
  const memPercent = memLimitMB > 0 ? (memUsageMB / memLimitMB) * 100 : 0;
  return { cpuPercent, memUsageMB, memLimitMB, memPercent };
}

function demuxLogs(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  if (bytes.length === 0) return '';
  const out: string[] = [];
  let i = 0;
  // Heuristic: if first 8 bytes look like a valid stdio header, demux.
  const looksMuxed =
    bytes.length >= 8 &&
    (bytes[0] === 0 || bytes[0] === 1 || bytes[0] === 2) &&
    bytes[1] === 0 &&
    bytes[2] === 0 &&
    bytes[3] === 0;

  if (!looksMuxed) {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  while (i + 8 <= bytes.length) {
    const streamType = bytes[i];
    const frameLen =
      ((bytes[i + 4] << 24) >>> 0) +
      ((bytes[i + 5] << 16) >>> 0) +
      ((bytes[i + 6] << 8) >>> 0) +
      bytes[i + 7];
    i += 8;
    if (frameLen <= 0 || i + frameLen > bytes.length) break;
    const chunk = bytes.slice(i, i + frameLen);
    out.push(new TextDecoder('utf-8', { fatal: false }).decode(chunk));
    i += frameLen;
    void streamType;
  }
  return out.join('');
}
