# Code Editor

A modern, collaborative code editor built with Next.js, Convex, and real-time technologies. This application enables developers to write, share, and collaborate on code snippets in real-time, with integrated video calling, GitHub authentication, and premium features.

## 🚀 Features

- **Real-Time Collaboration**: Create and join collaborative coding rooms with live code synchronization
- **Advanced Code Editor**: Powered by Monaco Editor (VS Code's editor) with syntax highlighting, IntelliSense, and multi-language support
- **GitHub Integration**: Authenticate with GitHub, import/export code snippets, and manage repositories
- **Code Snippets Management**: Save, share, and comment on code snippets with a dedicated snippets page
- **User Authentication**: Secure authentication via Clerk with user profiles and access control
- **Payment Integration**: Razorpay integration for premium subscriptions and features
- **Responsive Design**: Built with Tailwind CSS for a modern, accessible UI
- **Theme Support**: Light and dark mode with customizable themes
- **Language Support**: Support for multiple programming languages with syntax highlighting
- **Video Calling**: Integrated Stream.io for seamless video calls during collaboration sessions

## 🏗️ Architecture

### Frontend
- **Next.js 15**: React framework for server-side rendering and optimized performance
- **React 19**: Latest React with concurrent features
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Monaco Editor**: Code editor component with advanced features
- **Framer Motion**: Animation library for smooth UI transitions
- **Zustand**: State management for client-side data

### Backend
- **Convex**: Serverless backend-as-a-service for database and real-time subscriptions

### Authentication & Integrations
- **Clerk**: User authentication and management
- **GitHub API**: Repository integration and OAuth
- **Razorpay**: Payment processing for premium features
- **Stream.io**: Video calling and chat functionality

### Database Schema
- **Users**: User profiles and authentication data
- **Rooms**: Collaborative coding sessions
- **Snippets**: Shared code snippets with comments
- **Payments**: Transaction and subscription records
- **Video Calls**: Stream.io integration data

## 📋 Tech Stack

### Core Technologies
- **Frontend**: Next.js, React, TypeScript
- **Backend**: Convex
- **Database**: Convex (built on SQLite/PostgreSQL)
- **Real-Time**: Socket.io
- **Authentication**: Clerk
- **Video**: Stream.io
- **Payments**: Razorpay

### Development Tools
- **Build Tool**: Next.js (with SWC)
- **Styling**: Tailwind CSS, PostCSS
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **Package Manager**: npm
- **Version Control**: Git

### Key Dependencies
- `@monaco-editor/react`: Code editor component
- `@stream-io/video-react-sdk`: Video calling UI
- `@clerk/nextjs`: Authentication
- `convex`: Backend framework
- `framer-motion`: Animations
- `react-hot-toast`: Notifications
- `lucide-react`: Icons

## 🔄 Application Flow

1. **Authentication**: Users sign in via Clerk (GitHub OAuth supported)
2. **Dashboard**: Access to code editor, snippets, profile, and pricing
3. **Collaboration**: Create or join a room for real-time coding
4. **Code Editing**: Use Monaco Editor with syntax highlighting and IntelliSense
5. **Snippet Sharing**: Save and share code snippets with comments
6. **Premium Features**: Upgrade via Razorpay for advanced features
7. **GitHub Integration**: Import/export code from GitHub repositories
8. **Video Calls**: Initiate video calls using Stream.io during sessions

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- Convex account
- Clerk account
- Stream.io account
- Razorpay account (for payments)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/abhaygarg3504/code-editor.git
   cd code-editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with the following variables:
   ```env
   # Convex
   CONVEX_DEPLOYMENT=
   NEXT_PUBLIC_CONVEX_URL=

   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

   # Stream.io
   NEXT_PUBLIC_STREAM_API_KEY=
   STREAM_SECRET=

   # GitHub
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=

   # Razorpay
   RAZORPAY_KEY_ID=
   RAZORPAY_KEY_SECRET=

   # Other
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Convex Setup**
   ```bash
   npx convex dev --until-success
   npx convex dashboard
   ```
   - Create a new Convex project
   - Copy the deployment URL to your environment variables

5. **Clerk Setup**
   - Create a Clerk application
   - Configure OAuth providers (GitHub)
   - Add your domain and redirect URLs

6. **Stream.io Setup**
   - Create a Stream.io application
   - Generate API keys

7. **Start Development Servers**
   ```bash
   npm run dev
   ```
   This runs:
   - Next.js frontend on `http://localhost:3000`
   - Convex backend
   - Socket.io server

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy Convex functions**
   ```bash
   npx convex deploy
   ```

3. **Deploy to Vercel/Netlify**
   - Connect your repository
   - Set environment variables
   - Deploy

## 📖 Usage

### Creating a Collaborative Session
1. Sign in to the application
2. Click "Create Room" or "Join Room"
3. Share the room ID with collaborators
4. Start coding in real-time

### Managing Snippets
1. Navigate to the Snippets page
2. Create new snippets or view existing ones
3. Add comments and share with others

### Video Calling
1. During a collaborative session, click "Start Video Call"
2. Invite participants via the room interface
3. Use integrated chat and screen sharing

### GitHub Integration
1. Connect your GitHub account in settings
2. Import code from repositories
3. Export snippets to GitHub gists

## 🔧 API Endpoints

### Authentication
- `POST /api/github/auth` - GitHub OAuth
- `POST /api/github/callback` - OAuth callback
- `POST /api/github/disconnect` - Disconnect GitHub

### Collaboration
- `POST /api/collab/createRoom` - Create new room
- `POST /api/collab/joinRoom` - Join existing room
- `POST /api/collab/updateCode` - Update code in room
- `GET /api/collab/getCode` - Get current code

### Payments
- `POST /api/create-order` - Create Razorpay order
- `POST /api/verify-payment` - Verify payment

### Video
- `POST /api/stream-token` - Generate Stream token

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

**Abhay Garg**
- GitHub: [@abhaygarg3504](https://github.com/abhaygarg3504)
- LinkedIn: [Your LinkedIn Profile]
- Email: [Your Email]

## 🙏 Acknowledgments

- [Convex](https://convex.dev/) for the amazing backend platform
- [Stream.io](https://getstream.io/) for video calling infrastructure
- [Clerk](https://clerk.com/) for authentication services
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the code editor
- [Next.js](https://nextjs.org/) for the React framework

---

⭐ If you find this project helpful, please give it a star on GitHub!
