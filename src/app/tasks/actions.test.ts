import mongoose from "mongoose";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { canTransitionStatus } from "@/lib/taskStatus";

const mockAuth = vi.fn();
const mockConnectDB = vi.fn();
const mockUserFindOne = vi.fn();
const mockTaskFindOne = vi.fn();
const mockTaskUpdateOne = vi.fn();
const mockTaskCreate = vi.fn();
const mockTaskAggregate = vi.fn();
const mockTaskCountDocuments = vi.fn();
const mockWorkspaceCreate = vi.fn();
const mockWorkspaceFindById = vi.fn();
const mockCommentCreate = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/mongodb", () => ({
  connectDB: mockConnectDB,
}));

vi.mock("@/models/User", () => ({
  default: {
    findOne: mockUserFindOne,
  },
}));

vi.mock("@/models/Task", () => ({
  default: {
    findOne: mockTaskFindOne,
    updateOne: mockTaskUpdateOne,
    create: mockTaskCreate,
    aggregate: mockTaskAggregate,
    countDocuments: mockTaskCountDocuments,
  },
}));

vi.mock("@/models/Workspace", () => ({
  default: {
    create: mockWorkspaceCreate,
    findById: mockWorkspaceFindById,
    exists: vi.fn(async () => true),
  },
}));

vi.mock("@/models/Comment", () => ({
  default: {
    create: mockCommentCreate,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

const { updateTaskStatus, createTask } = await import("./actions");
const { getDashboardStats } = await import("@/lib/dashboard");

describe("updateTaskStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockConnectDB.mockReset();
    mockUserFindOne.mockReset();
    mockTaskFindOne.mockReset();
    mockTaskUpdateOne.mockReset();
    mockTaskCreate.mockReset();
    mockTaskAggregate.mockReset();
    mockTaskCountDocuments.mockReset();
    mockWorkspaceCreate.mockReset();
    mockWorkspaceFindById.mockReset();
    mockCommentCreate.mockReset();
    mockRevalidatePath.mockReset();
  });

  it("creates a default workspace for users without one before updating status", async () => {
    const taskId = "507f1f77bcf86cd799439011";
    const workspaceId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
    const userId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");

    const user = {
      _id: userId,
      email: "user@example.com",
      name: "Test User",
      workspaceId: null,
      save: vi.fn().mockResolvedValue(true),
    };

    mockAuth.mockResolvedValue({ user: { email: "user@example.com" } });
    mockConnectDB.mockResolvedValue(undefined);
    mockUserFindOne.mockResolvedValue(user);
    mockWorkspaceCreate.mockResolvedValue({
      _id: workspaceId,
      name: "Test User's workspace",
      inviteCode: "ABC12345",
      ownerId: user._id,
      members: [user._id],
    });
    mockWorkspaceFindById.mockResolvedValue({
      _id: workspaceId,
      ownerId: user._id,
      members: [user._id],
    });
    mockTaskFindOne.mockResolvedValue({
      _id: taskId,
      workspaceId,
      status: "todo",
    });
    mockTaskUpdateOne.mockResolvedValue({});

    const formData = new FormData();
    formData.set("taskId", taskId);
    formData.set("status", "done");

    await expect(updateTaskStatus(formData)).resolves.toBeUndefined();

    expect(mockWorkspaceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test User's workspace",
        ownerId: user._id,
        members: [user._id],
      })
    );
    expect(user.workspaceId).toBe(workspaceId);
    expect(mockTaskUpdateOne).toHaveBeenCalledWith(
      {
        _id: taskId,
        workspaceId,
      },
      { $set: { status: "done", workspaceId } }
    );
  });

  it("keeps personal and workspace dashboard metrics separate", async () => {
    mockConnectDB.mockResolvedValue(undefined);
    mockTaskAggregate.mockResolvedValue([
      { _id: "todo", count: 3 },
      { _id: "in-progress", count: 2 },
      { _id: "done", count: 1 },
    ]);
    mockTaskCountDocuments.mockResolvedValue(6);

    const stats = await getDashboardStats(
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"),
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439012")
    );

    expect(stats.personal.tasksByStatus.todo).toBe(3);
    expect(stats.workspace.tasksByStatus.todo).toBe(3);
    expect(stats.personal).toHaveProperty("completionRate");
    expect(stats.workspace).toHaveProperty("completionRate");
    expect(stats.personal).toEqual(expect.objectContaining({ completionRate: expect.any(Number) }));
    expect(stats.workspace).toEqual(expect.objectContaining({ completionRate: expect.any(Number) }));
  });

  it("blocks non-owners from creating tasks in a workspace", async () => {
    const workspaceId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
    const ownerId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439014");
    const memberId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");

    const user = {
      _id: memberId,
      email: "member@example.com",
      name: "Member User",
      workspaceId,
      workspaceIds: [workspaceId],
      save: vi.fn().mockResolvedValue(true),
    };

    mockAuth.mockResolvedValue({ user: { email: "member@example.com" } });
    mockConnectDB.mockResolvedValue(undefined);
    mockUserFindOne.mockResolvedValue(user);
    mockWorkspaceFindById.mockResolvedValue({
      _id: workspaceId,
      ownerId,
      members: [ownerId, memberId],
    });

    const formData = new FormData();
    formData.set("title", "Member task");
    formData.set("description", "Should fail");
    formData.set("priority", "medium");
    formData.set("dueDate", "");
    formData.set("assignee", "");
    formData.set("tags", "");

    await expect(createTask(formData)).rejects.toThrow("Only the workspace owner can create tasks");
    expect(mockTaskCreate).not.toHaveBeenCalled();
  });

  it("allows workspace members to update the status of tasks assigned to them", async () => {
    const workspaceId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
    const memberId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");

    const user = {
      _id: memberId,
      email: "member@example.com",
      name: "Member User",
      workspaceId,
      workspaceIds: [workspaceId],
      save: vi.fn().mockResolvedValue(true),
    };

    mockAuth.mockResolvedValue({ user: { email: "member@example.com" } });
    mockConnectDB.mockResolvedValue(undefined);
    mockUserFindOne.mockResolvedValue(user);
    mockWorkspaceFindById.mockResolvedValue({
      _id: workspaceId,
      ownerId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
      members: [memberId],
    });
    mockTaskFindOne.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      workspaceId,
      assignee: memberId,
      status: "todo",
    });
    mockTaskUpdateOne.mockResolvedValue({});

    const formData = new FormData();
    formData.set("taskId", "507f1f77bcf86cd799439011");
    formData.set("status", "done");

    await expect(updateTaskStatus(formData)).resolves.toBeUndefined();
    expect(mockTaskUpdateOne).toHaveBeenCalledWith(
      {
        _id: "507f1f77bcf86cd799439011",
        workspaceId,
      },
      { $set: { status: "done", workspaceId } }
    );
  });

  it("allows workspace members to comment on tasks in the current workspace", async () => {
    const workspaceId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
    const memberId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");
    const taskId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");

    const user = {
      _id: memberId,
      email: "member@example.com",
      name: "Member User",
      workspaceId,
      workspaceIds: [workspaceId],
      save: vi.fn().mockResolvedValue(true),
    };

    mockAuth.mockResolvedValue({ user: { email: "member@example.com" } });
    mockConnectDB.mockResolvedValue(undefined);
    mockUserFindOne.mockResolvedValue(user);
    mockWorkspaceFindById.mockResolvedValue({
      _id: workspaceId,
      ownerId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
      members: [memberId],
    });
    mockTaskFindOne.mockResolvedValue({
      _id: taskId,
      workspaceId,
      assignee: memberId,
      status: "todo",
    });

    const formData = new FormData();
    formData.set("taskId", taskId.toString());
    formData.set("content", "Looks good");

    await expect(import("./actions").then(({ createComment }) => createComment(formData))).resolves.toBeUndefined();
  });

  it("allows assigning a workspace member even when their active workspace is different", async () => {
    const workspaceId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
    const ownerId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439014");
    const assigneeId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");

    const owner = {
      _id: ownerId,
      email: "owner@example.com",
      name: "Owner User",
      workspaceId,
      workspaceIds: [workspaceId],
      save: vi.fn().mockResolvedValue(true),
    };

    const assignee = {
      _id: assigneeId,
      email: "assignee@example.com",
      name: "Assignee User",
      workspaceId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439020"),
      workspaceIds: [new mongoose.Types.ObjectId("507f1f77bcf86cd799439020"), workspaceId],
    };

    mockAuth.mockResolvedValue({ user: { email: "owner@example.com" } });
    mockConnectDB.mockResolvedValue(undefined);
    mockUserFindOne.mockResolvedValueOnce(owner).mockResolvedValueOnce(assignee);
    mockWorkspaceFindById.mockResolvedValue({
      _id: workspaceId,
      ownerId,
      members: [ownerId, assigneeId],
    });

    const formData = new FormData();
    formData.set("title", "Assigned task");
    formData.set("description", "Should succeed");
    formData.set("priority", "medium");
    formData.set("dueDate", "");
    formData.set("assignee", assigneeId.toString());
    formData.set("tags", "");

    await expect(createTask(formData)).resolves.toBeUndefined();
    expect(mockTaskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        assignee: assigneeId,
        workspaceId,
      })
    );
  });

  it("blocks direct todo to done transitions", () => {
    expect(canTransitionStatus("todo", "done")).toBe(false);
    expect(canTransitionStatus("done", "todo")).toBe(false);
  });

  it("allows adjacent status transitions in the workflow", async () => {
    const workspaceId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
    const memberId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");
    const taskId = "507f1f77bcf86cd799439011";

    const user = {
      _id: memberId,
      email: "member@example.com",
      name: "Member User",
      workspaceId,
      workspaceIds: [workspaceId],
      save: vi.fn().mockResolvedValue(true),
    };

    mockAuth.mockResolvedValue({ user: { email: "member@example.com" } });
    mockConnectDB.mockResolvedValue(undefined);
    mockUserFindOne.mockResolvedValue(user);
    mockWorkspaceFindById.mockResolvedValue({
      _id: workspaceId,
      ownerId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
      members: [memberId],
    });
    mockTaskFindOne.mockResolvedValue({
      _id: taskId,
      workspaceId,
      assignee: memberId,
      status: "todo",
    });
    mockTaskUpdateOne.mockResolvedValue({});

    const formData = new FormData();
    formData.set("taskId", taskId);
    formData.set("status", "in-progress");

    await expect(updateTaskStatus(formData)).resolves.toBeUndefined();
    expect(mockTaskUpdateOne).toHaveBeenCalled();
  });
});
