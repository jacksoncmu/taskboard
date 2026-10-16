Build a complete, production-quality task management web application inspired by Google Tasks and Google Workspace, with a modern, minimalist design.

## 1. Core requirements

The application must be:
- **100% client-side:** No backend, authentication, user accounts, cloud databases, or external APIs.
- **Locally persistent:** All user data should be stored in the browser using IndexedDB (with a simple wrapper such as `idb`). Changes must automatically persist, including after refreshing or closing the browser.
- **Portable:** Users must be able to export their entire taskboard as a JSON file and import it later, including on another computer.
- **Offline-capable:** Once loaded, the application should work without an internet connection.
- **Responsive:** Optimized for desktop but usable on tablets and phones.
- **Fast and polished:** Interactions should feel smooth, intuitive, and responsive.

## 2. Technology stack

Use:
- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui for UI components
- Lucide React for icons
- dnd-kit for drag-and-drop functionality
- IndexedDB via `idb` for persistent storage
- date-fns for date handling

Keep the architecture simple. Do not introduce unnecessary dependencies, complicated state management, or server-side components.

## 3. Visual design

Use Google Workspace / Google Tasks as the primary design inspiration.

Design characteristics:
- Clean, minimal interface with generous whitespace
- Google-style rounded cards, subtle shadows, and light borders
- Material Design-inspired buttons, menus, dialogs, and inputs
- White and light-gray backgrounds with tasteful blue accents
- Clear typography with a strong visual hierarchy
- Subtle hover states and smooth transitions
- Optional dark mode, with the preference saved locally
- Attractive empty states

Layout:
- **Left sidebar:** App name, navigation, and task lists
- **Top toolbar:** Current board title, search, filters, view selector, settings, import/export
- **Main content area:** Taskboard or alternative views

The interface should feel like a real Google productivity application, not a generic admin dashboard.

Do not use Google's official branding or logos.

## 4. Taskboard functionality

The main view should be a Kanban-style taskboard.

Users should be able to:
- Create, rename, reorder, and delete boards
- Create, rename, reorder, and delete columns within each board
- Add tasks to any column
- Drag tasks between columns
- Reorder tasks within a column
- Move tasks between boards
- Mark tasks complete or incomplete
- Duplicate tasks
- Archive or delete tasks
- Undo accidental task deletion

Default board columns:
- To Do
- In Progress
- Done

Allow users to customize all column names.

Each task should support:
- Unique ID
- Title (required)
- Description (optional, multiline)
- Status / column
- Priority: None, Low, Medium, High, Urgent
- Due date
- Optional due time
- Start date (optional)
- Tags / labels, including custom colors
- Subtasks with individual completion checkboxes
- Creation timestamp
- Last updated timestamp
- Completion timestamp
- Sort order
- Optional notes

Clicking a task should open a well-designed detail panel or modal where all properties can be edited.

Support keyboard shortcuts such as Enter to save, Escape to close, and a shortcut to quickly create a task.

## 5. Additional views

In addition to the Kanban board, implement:

**List view**
- Compact, clean task list
- Group tasks by board, status, or due date
- Check off tasks directly
- Sorting by due date, priority, creation date, and manual order

**Calendar view**
- Monthly calendar displaying tasks by due date
- Click a date to see its tasks or create a new task
- Click a task to edit it

**Today / Upcoming**
- Today: tasks due today and overdue
- Upcoming: tasks due in the next 7 days, grouped by date
- Completed: recently completed tasks

Task updates should be synchronized across all views immediately through shared client-side state.

## 6. Search and filtering

Implement global task search by title, description, and tags.

Support filters for:
- Priority
- Status
- Due date
- Tags
- Completed vs. incomplete

Allow users to combine filters and clear them easily.

## 7. Data persistence, export, and import

This section is critical.

All information must be stored locally in IndexedDB. Never send task data to a remote server.

Persist:
- Boards and columns
- Tasks and subtasks
- Tags
- Settings and appearance preferences
- Manual task ordering

**Export**
- Provide an "Export Data" button in Settings.
- Download a human-readable JSON file containing all application data.
- Include a schema version and export timestamp.
- Suggested filename: `taskboard-backup-YYYY-MM-DD.json`
- Preserve IDs, timestamps, task relationships, and ordering.

**Import**
- Allow users to select a previously exported JSON file.
- Validate the file structure and schema version before importing.
- Display a preview including the number of boards, tasks, and tags.
- Offer two options:
  1. Replace all existing data (with explicit confirmation)
  2. Merge imported data with existing data, handling ID collisions safely
- Handle invalid or corrupted files gracefully without damaging existing data.
- Make import operations atomic whenever possible.

Include a clear message explaining that data exists only in the current browser and may be lost if browser storage is cleared. Encourage users to export backups.

## 8. User experience details

Make the application feel polished:
- Inline editing for task titles and column names
- Quick-add task input at the bottom of each column
- Drag-and-drop animations
- Color-coded priority indicators
- Overdue tasks clearly highlighted
- Task count displayed on column headers
- Subtask completion indicators (e.g., 2/5 completed)
- Confirmation dialogs for destructive actions
- Toast notifications for successful actions and errors
- Empty states with useful calls to action
- Keyboard accessibility and visible focus states
- Sensible handling of long text and large boards

All controls must be functional. Do not create decorative buttons that do nothing.

## 9. Architecture and quality

Structure the project into reusable components, hooks, models, and storage utilities.

Requirements:
- Fully typed TypeScript data models
- Clean separation between UI, application state, and persistence
- Stable IDs for boards, columns, tasks, and subtasks
- IndexedDB error handling
- Data migrations using schema versions
- No hardcoded example data mixed into application logic
- No required environment variables, API keys, or external services
- Use CSS and local application code rather than external assets when possible

Include a small optional demo board for first-time users, with the ability to start empty.

Test the important workflows:
1. Create a board and several tasks.
2. Edit and move tasks between columns.
3. Refresh the page and verify that data persists.
4. Export data to JSON.
5. Clear the board and import the JSON.
6. Verify that all tasks, statuses, subtasks, timestamps, and ordering are preserved.
7. Verify that filters, search, and alternative views remain consistent.

## 10. Deliverables

Build the actual working application, not just a mockup or component examples.

Provide:
- Complete source code
- Appropriate project structure
- Working implementation of all core features
- A README with installation and local development instructions
- Instructions for building and deploying as a static site

The application should run using:

```bash
npm install
npm run dev
```

And build using:

```bash
npm run build
```

It should be deployable as static files without any backend.

## 11. Implementation priorities

Prioritize in this order:
1. Beautiful, responsive Google-inspired interface
2. Working board, column, and task CRUD
3. Reliable local persistence
4. Drag-and-drop
5. Import/export
6. Search, filtering, and task details
7. List/calendar/today views
8. Extra polish and keyboard shortcuts

Implement the functionality rather than leaving TODOs or placeholders.

Make sensible product decisions without asking me for clarification on minor implementation details. Aim for a finished application I can genuinely use every day.

You should try to emulate Google Taskboard as much as possible. 