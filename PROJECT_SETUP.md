# CV Perfecto - Setup Guide

## Project Overview

CV Perfecto is a full-stack application that optimizes resumes using AI based on job descriptions. The application consists of:

- **Frontend**: Next.js 15 with React 19, TypeScript, and Tailwind CSS
- **Backend**: Node.js with Express, TypeScript, MongoDB, and AI-powered resume optimization

## Features

### Authentication
- ✅ User signup with local storage
- ✅ User login with JWT tokens
- ✅ Secure password handling
- ✅ Protected routes and authentication context

### Resume Optimization
- ✅ Job description input (50-10,000 characters)
- ✅ Resume upload (PDF and DOCX supported)
- ✅ Drag-and-drop file upload
- ✅ File validation (max 10MB)
- ✅ Real-time processing with loading indicators
- ✅ AI-powered resume optimization
- ✅ Results display with improvements and suggestions

## Prerequisites

- Node.js v18 or higher
- npm or yarn
- MongoDB (local or MongoDB Atlas)
- (Optional) pdflatex for PDF generation

## Installation

### 1. Clone the Repository

```bash
cd D:\project\cvPerfecto
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_SECRET=your_jwt_secret
PERPLEXITY_API_KEY=your_perplexity_api_key
```

Build and start the backend:

```bash
npm run build
npm start
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../frontend/my-app
npm install
```

Create a `.env.local` file in the `frontend/my-app` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication

- **POST** `/api/users` - Create new user (signup)
  - Body: `{ name, email, password }`
  
- **POST** `/api/users/login` - Login user
  - Body: `{ email, password }`

### Resume Optimization

- **POST** `/api/resume/optimize` - Optimize resume (requires authentication)
  - Headers: `Authorization: Bearer <token>`
  - Body: `multipart/form-data` with `resume` file and `jobDescription` text

- **GET** `/api/resume/my-resumes` - Get user's resumes (requires authentication)
  - Headers: `Authorization: Bearer <token>`

- **GET** `/api/resume/:id` - Get specific resume (requires authentication)
  - Headers: `Authorization: Bearer <token>`

- **GET** `/api/resume/health` - Health check endpoint

- **GET** `/api/resume/formats` - Get supported file formats

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Forms**: React Hook Form
- **File Upload**: React Dropzone
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Language**: TypeScript

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens) with Passport.js
- **File Upload**: Multer
- **PDF Processing**: pdf-parse, pdf-lib
- **Document Processing**: docx, mammoth
- **AI Service**: Perplexity AI
- **Language**: TypeScript

## Project Structure

```
cvPerfecto/
├── backend/
│   ├── src/
│   │   ├── common/
│   │   │   ├── dto/
│   │   │   ├── helper/
│   │   │   ├── middleware/
│   │   │   └── services/
│   │   ├── resume/
│   │   │   ├── resume.controller.ts
│   │   │   ├── resume.routes.ts
│   │   │   ├── resume.service.ts
│   │   │   └── resume.upload.ts
│   │   ├── user/
│   │   │   ├── user.controllers.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── user.service.ts
│   │   │   └── user.schema.ts
│   │   └── routes.ts
│   ├── index.ts
│   └── package.json
│
└── frontend/
    └── my-app/
        ├── app/
        │   ├── components/
        │   │   ├── FileUpload.tsx
        │   │   └── ResumeResults.tsx
        │   ├── contexts/
        │   │   └── AuthContext.tsx
        │   ├── services/
        │   │   └── api.ts
        │   ├── login/
        │   │   └── page.tsx
        │   ├── signup/
        │   │   └── page.tsx
        │   ├── dashboard/
        │   │   └── page.tsx
        │   ├── layout.tsx
        │   ├── page.tsx
        │   └── globals.css
        └── package.json
```

## Usage

### 1. Create an Account

1. Navigate to `http://localhost:3000`
2. Click "Sign up here"
3. Fill in your name, email, and password
4. Click "Create Account"

### 2. Login

1. Enter your email and password
2. Click "Sign In"
3. You'll be redirected to the dashboard

### 3. Optimize Your Resume

1. On the dashboard, paste the job description in the text area
2. Upload your resume (PDF or DOCX format)
3. Click "Optimize Resume"
4. Wait for the AI to process and optimize your resume
5. View the results with improvements and suggestions

## Features in Detail

### Authentication System
- Uses local storage to persist user data
- JWT tokens for secure API communication
- Automatic redirect to login if not authenticated
- Logout functionality clears local storage

### File Upload
- Drag-and-drop interface
- File type validation (PDF, DOCX only)
- File size validation (max 10MB)
- Visual feedback for upload status

### Loading States
- Animated spinners during processing
- Progress indicators
- Disabled buttons during submission
- Clear error messages

### Results Display
- Optimization summary
- Key improvements made
- Skills highlighted
- Optimized resume content
- File information

## Troubleshooting

### Backend Issues

1. **Port already in use**
   ```bash
   # Kill existing Node processes
   Get-Process -Name node | Stop-Process -Force
   ```

2. **MongoDB connection errors**
   - Check your MongoDB URI in `.env`
   - Ensure MongoDB is running

3. **JWT errors**
   - Ensure all JWT secrets are set in `.env`
   - Check that `JWT_SECRET`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` are defined

### Frontend Issues

1. **Cannot connect to backend**
   - Ensure backend is running on port 5000
   - Check `NEXT_PUBLIC_API_URL` in `.env.local`

2. **CORS errors**
   - Backend CORS is configured for `http://localhost:3000`
   - Ensure frontend is running on this URL

## Important Notes

1. **Route Order**: In the backend, specific routes (like `/health`) must be defined BEFORE parameterized routes (like `/:id`)

2. **Cookie Parser**: The backend requires `cookie-parser` middleware for proper cookie handling

3. **File Uploads**: Resume files are temporarily stored in the `backend/uploads` directory

4. **MongoDB**: The application requires a MongoDB connection. Ensure it's running and accessible.

5. **Environment Variables**: Both frontend and backend require proper environment variables to function correctly.

## Next Steps

- [ ] Add password reset functionality
- [ ] Implement email verification
- [ ] Add resume templates
- [ ] Support more file formats
- [ ] Add resume history and comparison
- [ ] Implement real-time collaboration
- [ ] Add premium features

## License

This project is for educational purposes.

