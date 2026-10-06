# TaskFlow

TaskFlow is a task management app built with Next.js, MongoDB, and Auth.js. It supports a simple but useful workflow for creating, organizing, filtering, and tracking tasks from a dashboard and Kanban-style board.

## Features

- Email/password sign-up and sign-in
- Protected dashboard and task routes
- Create, edit, delete, and filter tasks
- Kanban-style status management
- Due dates, priorities, assignees, and tags
- Commenting on tasks
- Dashboard summary cards and top-assignee insights
- Responsive layout for desktop and mobile
- Accessibility-focused updates for keyboard and screen-reader usability

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- MongoDB + Mongoose
- Auth.js / NextAuth
- bcryptjs

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file with a MongoDB connection string and the required Auth.js secret:

```bash
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/taskflow"
AUTH_SECRET="replace-with-a-long-random-secret"
```

3. Run the app in development mode:

```bash
npm run dev
```

4. Open http://localhost:3000

## Project structure

```text
src/
  app/
    dashboard/
    login/
    signup/
    tasks/
    api/
  auth.ts
  components/
  lib/
  models/
```

## Notes

This project is built as a practical full-stack Next.js starter for personal task tracking and team-style planning workflows. It is intended to be extended with additional features such as drag-and-drop task movement, analytics, and richer collaboration tools.
