# Document Extraction & Compliance Platform (Frontend)

An enterprise-grade regulatory compliance and statutory document extraction platform. Built with **React 19**, **Vite**, **Tailwind CSS**, and **Zustand**, this application enables environmental, health, and legal compliance teams to parse complex regulatory permits, audit statutory obligations, track deadlines, and monitor real-time extraction telemetry.

---

## Key Features

- **Executive Compliance Dashboard**: Real-time adherence scores, statutory obligations breakdown, dynamic score trend area chart, and upcoming deadline tracking.
- **AI Document Ingestion & Pipeline**: Asynchronous document processing with live server-sent events (SSE) streaming logs and multi-model configuration.
- **Compliance Obligations Matrix**: Interactive matrix table with sortable columns, inline status management, clause badges, and statutory clause narrative drawers.
- **Document Library & Job Ledger**: Unified library for parsed environmental authorities, variation notices, consolidated permits, and background job telemetry diagnostics.
- **Advanced Export Engine**: Client-side and server-side multi-format exports for PDF, Word (DOCX), Excel (XLSX), and structured JSON.
- **Analytics & Model Benchmarking**: Comparative analysis of AI provider throughput, processing latency, success rates, and token utilization.
- **Multi-Tenant Administration**: Tenant-specific email notifications, SMTP configurations, alert routing, and system health monitors.

---

## Tech Stack

- **Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **Document Exporting**: [docx](https://docx.js.org/), [jspdf](https://github.com/parallax/jsPDF), [xlsx](https://sheetjs.com/)

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/ayan-estuate/document-extraction-front.git

# Navigate into the project directory
cd document-extraction-front

# Install dependencies
npm install
```

### Development Server

Start the local Vite development server with hot module replacement:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Production Build

Compile and bundle the application for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Type Checking & Lint

```bash
npm run lint
```

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── common/         # Modals, snackbar, notifications, filter popover
│   │   ├── dashboard/      # Dashboard KPI cards, trend charts, pipeline widgets
│   │   ├── documents/      # Document cards, grids, and obligation components
│   │   ├── exports/        # Export dialogues and download handlers
│   │   ├── layout/         # App shell, navigation header, and sidebar
│   │   ├── logs/           # Real-time SSE streaming logs panel
│   │   ├── settings/       # Tenant email and notification settings
│   │   ├── ui/             # Core design system primitives (DataTable, Button, etc.)
│   │   └── upload/         # File dropzone and upload forms
│   ├── config/             # API endpoints and model provider configuration
│   ├── hooks/              # Custom React hooks (documents, extraction, notifications)
│   ├── lib/                # API client, export engines, and formatting utilities
│   ├── pages/              # Primary route pages (Dashboard, Library, Matrix, etc.)
│   ├── stores/             # Zustand state management stores
│   ├── types/              # TypeScript schema definitions and data contracts
│   ├── App.tsx             # Root application and route configuration
│   ├── index.css           # Global stylesheet and Tailwind directives
│   └── main.tsx            # Application entry point
├── index.html              # HTML document shell
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build and proxy configuration
```

---

## License

Private and proprietary. All rights reserved.
