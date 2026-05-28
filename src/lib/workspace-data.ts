// Multi-workspace model. Three regional teams under Guyju's; the
// head of marketing has access to all, individual contributors only see one.

export type Workspace = {
  id: string;
  name: string;
  region: string;
  memberCount: number;
};

export const WORKSPACES: Workspace[] = [
  {
    id: "ws-south",
    name: "Guyju's South",
    region: "Bangalore · Chennai · Hyderabad",
    memberCount: 8,
  },
  {
    id: "ws-ncr",
    name: "Guyju's North",
    region: "Delhi · Gurugram · Kota",
    memberCount: 5,
  },
  {
    id: "ws-mmr",
    name: "Guyju's West",
    region: "Mumbai · Pune",
    memberCount: 9,
  },
];

export function getWorkspace(id: string): Workspace | undefined {
  return WORKSPACES.find((w) => w.id === id);
}

// ─── Users / roles ──────────────────────────────────────────────────────

export type UserRole = "admin" | "member";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  // workspaceIds the user can switch into. Admins always have all.
  workspaceIds: string[];
  // For members, this is their default + only workspace.
  defaultWorkspaceId: string;
};

export const USERS: AppUser[] = [
  {
    id: "u-head-marketing",
    name: "Ankit Purohit",
    email: "ankit.purohit@guyjus.com",
    role: "admin",
    workspaceIds: WORKSPACES.map((w) => w.id),
    defaultWorkspaceId: "ws-south",
  },
  {
    id: "u-south-lead",
    name: "Arjun Rao",
    email: "arjun.rao@guyjus.com",
    role: "member",
    workspaceIds: ["ws-south"],
    defaultWorkspaceId: "ws-south",
  },
  {
    id: "u-ncr-lead",
    name: "Neha Kapoor",
    email: "neha.kapoor@guyjus.com",
    role: "member",
    workspaceIds: ["ws-ncr"],
    defaultWorkspaceId: "ws-ncr",
  },
  {
    id: "u-mmr-lead",
    name: "Karthik Iyer",
    email: "karthik.iyer@guyjus.com",
    role: "member",
    workspaceIds: ["ws-mmr"],
    defaultWorkspaceId: "ws-mmr",
  },
];

export function getUser(id: string): AppUser | undefined {
  return USERS.find((u) => u.id === id);
}
