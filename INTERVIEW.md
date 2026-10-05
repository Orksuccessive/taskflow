# TaskFlow — Interview Walkthrough

## 1. Problem Statement

TaskFlow is a collaborative task management application inspired by lightweight tools such as Trello and Notion.

The goal was to provide authenticated users with a simple workspace where they can:

- Create tasks
- Update tasks
- Delete tasks
- Change task status
- Set priorities and due dates
- Assign tasks
- Add tags
- Search and filter tasks
- Add comments
- View dashboard statistics

The project was also designed to demonstrate production-style Next.js development rather than only building a basic CRUD application.

---

# 2. Architecture

TaskFlow uses a full-stack Next.js architecture.

```text
                    Browser
                       |
                       | HTTPS
                       v
              +------------------+
              |     Next.js      |
              |    App Router    |
              +--------+---------+
                       |
          +------------+-------------+
          |            |             |
          v            v             v
    Server          Server       Route
   Components      Actions      Handlers
          |            |
          |            v
          |         Auth.js
          |            |
          +------------+
                       |
                       v
                 Mongoose
                       |
                       v
                MongoDB Atlas