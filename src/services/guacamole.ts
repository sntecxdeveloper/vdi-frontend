const BASE = "/guacamole/api";

export interface GuacTokenResponse {
  authToken: string;
  username: string;
  dataSource: string;
  availableDataSources: string[];
}

export interface GuacConnection {
  identifier: string;
  name: string;
  protocol: string;
  parentIdentifier: string;
}

export interface GuacActiveConnection {
  identifier: string;
  connectionIdentifier: string;
  connectionName?: string;
  username: string;
  startDate: number;
  remoteHost: string;
}

export interface GuacHistoryEntry {
  identifier: string;
  connectionName: string;
  username: string;
  remoteHost: string;
  startDate: number;
  endDate: number | null;
  active: boolean;
}

export interface GuacPermissions {
  connectionPermissions: Record<string, string[]>;
  systemPermissions: string[];
}

export async function login(username: string, password: string): Promise<GuacTokenResponse> {
  const body = new URLSearchParams();
  body.append("username", username.trim());
  body.append("password", password);

  const response = await fetch(`${BASE}/tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error("Invalid username or password");
  }

  return response.json();
}

export async function getConnections(
  token: string,
  dataSource: string
): Promise<Record<string, GuacConnection>> {
  const response = await fetch(
    `${BASE}/session/data/${dataSource}/connections?token=${token}`
  );

  if (!response.ok) {
    throw new Error("Failed to load connections");
  }

  return response.json();
}

export async function getActiveConnections(
  token: string,
  dataSource: string
): Promise<Record<string, GuacActiveConnection>> {
  const response = await fetch(
    `${BASE}/session/data/${dataSource}/activeConnections?token=${token}`
  );

  if (!response.ok) {
    throw new Error("Failed to load active sessions");
  }

  return response.json();
}

export async function getConnectionHistory(
  token: string,
  dataSource: string
): Promise<GuacHistoryEntry[]> {
  const response = await fetch(
    `${BASE}/session/data/${dataSource}/history/connections?token=${token}`
  );

  if (!response.ok) {
    throw new Error("Failed to load session history");
  }

  return response.json();
}

export async function getUsers(
  token: string,
  dataSource: string
): Promise<Record<string, { username: string }>> {
  const response = await fetch(`${BASE}/session/data/${dataSource}/users?token=${token}`);

  if (!response.ok) {
    throw new Error("Failed to load users");
  }

  return response.json();
}

export async function getUserGroups(
  token: string,
  dataSource: string
): Promise<Record<string, { identifier: string }>> {
  const response = await fetch(`${BASE}/session/data/${dataSource}/userGroups?token=${token}`);

  if (!response.ok) {
    throw new Error("Failed to load user groups");
  }

  return response.json();
}

export async function getUserPermissions(
  token: string,
  dataSource: string,
  username: string
): Promise<GuacPermissions> {
  const response = await fetch(
    `${BASE}/session/data/${dataSource}/users/${encodeURIComponent(username)}/permissions?token=${token}`
  );

  if (!response.ok) {
    throw new Error("Failed to load user permissions");
  }

  return response.json();
}

export async function getUserGroupPermissions(
  token: string,
  dataSource: string,
  groupName: string
): Promise<GuacPermissions> {
  const response = await fetch(
    `${BASE}/session/data/${dataSource}/userGroups/${encodeURIComponent(groupName)}/permissions?token=${token}`
  );

  if (!response.ok) {
    throw new Error("Failed to load user group permissions");
  }

  return response.json();
}

export async function logout(token: string): Promise<void> {
  await fetch(`${BASE}/tokens/${token}`, {
    method: "DELETE",
  });
}

export async function isSessionValid(token: string): Promise<boolean> {
  const response = await fetch(`${BASE}/session?token=${token}`, {
    method: "HEAD",
  });
  return response.ok;
}

export function buildTunnelUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/guacamole/websocket-tunnel`;
}
