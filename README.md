# TaskFlow

TaskFlow is a collaborative task management application built with Next.js, MongoDB, and Auth.js.

It provides a lightweight Kanban-style workflow where authenticated users can create, update, delete, assign, filter, sort, and comment on tasks.

## Live Demo

Live URL:

https://YOUR-VERCEL-DOMAIN.vercel.app

## Screenshots

### Login

![Login Screenshot](./screenshots/login.png)

### Dashboard

![Dashboard Screenshot](./screenshots/dashboard.png)

### Task Board

![Task Board Screenshot](./screenshots/tasks.png)

> Add the screenshots to `screenshots/` before publishing this README.

## Features

- User registration and login
- JWT-based authentication with Auth.js
- Protected dashboard and task routes
- Create, update, and delete tasks
- Task status management
- Task priorities
- Due dates
- Task assignment
- Tags
- Search and filtering
- Sorting
- Task comments
- Dashboard statistics
- Aggregation-based task analytics
- Loading states
- Error boundaries
- Responsive UI
- Accessibility improvements
- Production deployment with Vercel

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Next.js Server Components
- Next.js Server Actions
- Next.js Route Handlers
- Auth.js
- Mongoose

### Database

- MongoDB Atlas

### Authentication

- Auth.js Credentials Provider
- JWT sessions
- bcrypt password hashing

### Testing

- Vitest
- React Testing Library
- Supertest

### Deployment

- Vercel

## Architecture

The application follows a Next.js full-stack architecture.

```text
Browser
   |
   v
Next.js App Router
   |
   +--------------------+
   |                    |
   v                    v
Server Components    Server Actions
   |                    |
   +---------+----------+
             |
             v
        Auth.js
             |
             v
      Authentication
             |
             v
         Mongoose
             |
             v
       MongoDB Atlas