import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITask extends Document {
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  dueDate?: Date;
  userId: mongoose.Types.ObjectId;
  assignee?: mongoose.Types.ObjectId;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: ["todo", "in-progress", "done"],
      default: "todo",
      index: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true,
    },

    dueDate: {
      type: Date,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    tags: {
      type: [String],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Task: Model<ITask> =
  mongoose.models.Task ||
  mongoose.model<ITask>("Task", taskSchema);

export default Task;