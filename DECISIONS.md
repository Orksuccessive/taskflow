# Architecture & Technical Decisions

## 1. Why Next.js?

### Decision

I chose Next.js with the App Router as the main application framework.

### Why?

Next.js provides both frontend and backend capabilities in a single application.

It gives us:

- React Server Components
- Server Actions
- Route Handlers
- File-based routing
- Built-in loading and error boundaries
- Built-in navigation with `next/link`
- Image optimization
- Production-ready deployment with Vercel

For TaskFlow, this allowed me to build the UI, backend mutations, authentication flow, and database access within one project.

### Trade-off

A full MERN architecture with a separate Express backend would provide a stronger separation between frontend and backend.

However, that would also introduce:

- Another application
- Another deployment
- More API boilerplate
- CORS configuration
- More infrastructure to maintain

For this project and the available development time, Next.js provided a simpler full-stack architecture.

---

## 2. Why MongoDB?

### Decision

MongoDB Atlas was selected as the primary database.

### Why?

TaskFlow contains document-oriented data such as:

- Users
- Tasks
- Comments
- Tags
- Task assignments

MongoDB works well with this structure and provides flexible document storage.

MongoDB Atlas also provides a managed cloud database that integrates easily with Vercel.

### Trade-off

A relational database such as PostgreSQL would provide stronger relational constraints and could be a better choice for complex relationships and reporting.

For TaskFlow, MongoDB provided faster development and straightforward integration with Mongoose.

---

## 3. Why Mongoose?

### Decision

Mongoose is used as the MongoDB ODM.

### Why?

Mongoose provides:

- Schema definitions
- Validation
- TypeScript integration
- Model abstraction
- References between collections
- Query helpers
- Middleware support

This makes the MongoDB data model easier to maintain.

### Trade-off

Mongoose adds an abstraction layer over MongoDB.

For very performance-sensitive workloads, using the native MongoDB driver could provide more direct control.

For this application, the developer productivity benefits were more important.

---

## 4. Why Auth.js?

### Decision

Auth.js was used for authentication.

### Why?

Auth.js handles important authentication infrastructure such as:

- Sessions
- Credentials authentication
- JWT sessions
- Authentication callbacks
- Login/logout handling
- Protected server-side access

This avoids implementing authentication infrastructure manually.

### Trade-off

Auth.js introduces framework-specific abstractions.

A custom authentication system could provide more control, but it would require implementing and maintaining significantly more security-sensitive code.

For a production-style portfolio project, using a mature authentication library is safer and faster.

---

## 5. Why JWT Sessions?

### Decision

JWT was selected as the session strategy.

```ts
session: {
  strategy: "jwt",
}