# QuizMate

AI-powered interview study knowledge base. Manage your interview prep materials, track study progress, generate quiz questions with AI, and review your mistakes — all in one desktop app.

## Features

- **Document Browser** — Browse Markdown study materials in a two-pane layout. Supports code syntax highlighting, GFM tables, and font size adjustment.
- **Study Plan** — Create and manage a todo list of knowledge points to learn. Filter by status, category, and priority. Tag items for easy organization.
- **AI Quiz Generation** — Select study materials and let DeepSeek API generate multiple-choice quiz questions. Answer one by one with instant score tracking.
- **Wrong Answer Review** — Automatically tracks incorrect answers across sessions. Review with detailed explanations, re-answer to reinforce learning, and view statistics by category.
- **Mock Interview** *(coming soon)* — AI-simulated interview sessions based on your study materials.
- **iOS App** *(planned)* — Native iOS companion with iCloud sync.

## Screenshots

*Coming soon*

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Framework | Electron 33 |
| Frontend | React 18 + TypeScript + Vite 6 |
| Styling | Tailwind CSS + @tailwindcss/typography |
| State Management | Zustand |
| Database | better-sqlite3 |
| Markdown | react-markdown + rehype-highlight + remark-gfm |
| AI API | DeepSeek API (`deepseek-v4-flash`) |
| Packaging | electron-builder |

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **DeepSeek API Key** — [Apply here](https://platform.deepseek.com/) (required for quiz generation only)

## Getting Started

```bash
# Clone the repository
git clone git@github.com:Funnyguysmz/QuizMate.git
cd QuizMate

# Install dependencies
npm install

# Start development
npm run dev:renderer    # Terminal 1: Vite dev server
npm run dev:electron    # Terminal 2: Compile & launch Electron
```

## Usage

1. Launch the app
2. Go to **Settings** → verify the study materials path (default: `/Users/mac/Desktop/Halo博客文稿`)
3. Enter your **DeepSeek API Key** in Settings
4. Browse documents in **Document Browser**
5. Create study plans in **Study Plan**
6. Generate quizzes in **Quiz Practice**
7. Review wrong answers in **Wrong Answer Review**

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # App entry, window creation
│   ├── preload.ts           # Context bridge (IPC API)
│   ├── ipc/                 # IPC handlers
│   │   ├── database.ts      # Study plan CRUD
│   │   ├── deepseek.ts      # Quiz & wrong answer operations
│   │   ├── file-system.ts   # File reading & search
│   │   └── settings.ts      # App settings & API key
│   └── services/            # Business logic
│       ├── database.ts      # SQLite init & migrations
│       ├── file-scanner.ts  # Directory traversal
│       ├── deepseek-client.ts # DeepSeek API client
│       └── settings-store.ts # Config persistence
├── renderer/                # React frontend
│   ├── components/
│   │   ├── browser/         # FileTree, MarkdownViewer
│   │   ├── plan/            # StudyPlan list, form, filters
│   │   ├── quiz/            # Generator, session, card, result
│   │   ├── wrong-answer/    # List, card, stats
│   │   └── shared/          # Button, Modal, Badge, etc.
│   └── pages/               # Route pages
└── shared/                  # Shared types & constants
```

## Build & Package

```bash
# Build for production
npm run build

# Package for macOS (outputs to release/)
npm run package:mac

# Package for Windows
npm run package:win
```

## Database

The app uses SQLite for local data storage. Database file location:

- **macOS**: `~/Library/Application Support/quizmate/study-app.db`
- **Windows**: `%APPDATA%/quizmate/study-app.db`

Tables: `study_plans`, `quiz_sessions`, `quiz_questions`, `wrong_answers`, `app_settings`.

## License

MIT

---

# QuizMate（中文）

AI 驱动的面试学习知识库。一站式管理面试准备资料、追踪学习进度、AI 生成测验试题、回顾错题。

## 功能

- **文档浏览** — 双栏布局浏览 Markdown 学习资料。支持代码语法高亮、GFM 表格、字号调节。
- **学习计划** — 创建和管理知识点的 Todo 列表。按状态、分类、优先级筛选，支持标签归类。
- **AI 测验生成** — 选择学习资料，由 DeepSeek API 自动生成选择题。逐题作答，即时评分。
- **错题回顾** — 自动追踪跨会话的错题。查看详细解析，重新作答巩固知识，按分类查看统计。
- **模拟面试**（即将推出）— 基于学习资料的 AI 模拟面试。
- **iOS App**（计划中）— 原生 iOS 客户端，支持 iCloud 同步。

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 33 |
| 前端 | React 18 + TypeScript + Vite 6 |
| 样式 | Tailwind CSS + @tailwindcss/typography |
| 状态管理 | Zustand |
| 数据库 | better-sqlite3 |
| Markdown | react-markdown + rehype-highlight + remark-gfm |
| AI API | DeepSeek API（`deepseek-v4-flash`） |
| 打包 | electron-builder |

## 环境要求

- **Node.js** >= 18
- **npm** >= 9
- **DeepSeek API Key** — [点击申请](https://platform.deepseek.com/)（仅测验生成需要）

## 快速开始

```bash
# 克隆仓库
git clone git@github.com:Funnyguysmz/QuizMate.git
cd QuizMate

# 安装依赖
npm install

# 启动开发
npm run dev:renderer    # 终端 1: Vite 开发服务器
npm run dev:electron    # 终端 2: 编译主进程并启动 Electron
```

## 使用说明

1. 启动应用
2. 进入**设置** → 确认学习资料路径（默认：`/Users/mac/Desktop/Halo博客文稿`）
3. 在设置中输入 **DeepSeek API Key**
4. 在**文档浏览**中查阅学习资料
5. 在**学习计划**中创建学习待办
6. 在**测验练习**中生成并作答试题
7. 在**错题回顾**中复习错题

## 项目结构

```
src/
├── main/                    # Electron 主进程
│   ├── index.ts             # 应用入口，窗口创建
│   ├── preload.ts           # 上下文桥接（IPC API）
│   ├── ipc/                 # IPC 处理器
│   └── services/            # 业务逻辑
├── renderer/                # React 前端
│   ├── components/          # UI 组件
│   └── pages/               # 路由页面
└── shared/                  # 共享类型和常量
```

## 构建与打包

```bash
# 生产构建
npm run build

# 打包 macOS 应用（输出至 release/）
npm run package:mac

# 打包 Windows 应用
npm run package:win
```

## 数据库

应用使用 SQLite 进行本地数据存储。数据库文件位置：

- **macOS**: `~/Library/Application Support/quizmate/study-app.db`
- **Windows**: `%APPDATA%/quizmate/study-app.db`

数据表：`study_plans`、`quiz_sessions`、`quiz_questions`、`wrong_answers`、`app_settings`。

## 许可证

MIT
