# Smart Campus - School Management System

A comprehensive school management platform for administrators, teachers, students, and parents.

## Features

- **Multi-role Dashboard**: Separate dashboards for Super Admin, Principal, Teacher, Student, Parent, and Accountant
- **Student Management**: Add, edit, and manage student information
- **Teacher Management**: Manage teacher profiles and assignments
- **Attendance Tracking**: Track student and teacher attendance
- **Grade Management**: Manage exam results and grades
- **Fee Management**: Handle fee structures, invoices, and payments
- **Notice Board**: Publish and manage school notices
- **Class Routine**: Manage class schedules and routines
- **Analytics**: View comprehensive analytics and reports

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Radix UI
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Form Handling**: React Hook Form, Zod
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=https://your-backend-url/api
```

Notes:
- Use `http://localhost:3001/api` for local development.
- For production (Vercel), set `VITE_API_URL` to your deployed Render backend URL.
- Do not use localhost URLs in production environment variables.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── DashboardLayout.tsx
│   ├── StatCard.tsx
│   ├── PageHeader.tsx
│   └── ...
├── pages/              # Page components
│   ├── super-admin/    # Super Admin pages
│   ├── principal/      # Principal pages
│   ├── teacher/        # Teacher pages
│   ├── student/        # Student pages
│   ├── parent/         # Parent pages
│   ├── accountant/     # Accountant pages
│   └── shared/         # Shared pages
├── stores/             # Zustand stores
├── lib/                # Utility functions and API
├── hooks/              # Custom React hooks
└── App.tsx             # Main application component
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## License

This project is proprietary software.
