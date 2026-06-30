# DevBoard — Work Item Backlog

Welcome to the team 👋. This is your backlog, styled like an Azure DevOps board.
Pick up work items from the top. Each item has a type, priority, a description,
and **acceptance criteria** — treat the acceptance criteria as your definition of
done.

**Workflow**
1. Move a ticket to *Active* when you start (just note it for yourself).
2. Reproduce / build the change locally.
3. Verify against the acceptance criteria.
4. Commit with the work item ID in the message, e.g. `fix(DB-101): correct issue numbering`.

> Bugs describe **what's wrong from a user's point of view** — the repro steps and
> the expected vs. actual behaviour. Figuring out *why* and *where* is your job.

---

## 🐞 Bugs

---

### DB-101 · Cannot create a second issue in a project
- **Type:** Bug   **Priority:** 1 (High)   **State:** New   **Area:** API / Issues
- **Description:** Adding more than one issue to the same project doesn't work,
  and the issue numbering looks wrong from the very first issue.
- **Repro steps:**
  1. Log in and open any project.
  2. Create an issue and look at its issue number (e.g. `DEV-?`).
  3. Create a **second** issue in the same project.
- **Expected:** The first issue is numbered `1`, the second `2`, and so on. Each
  create succeeds.
- **Actual:** The numbering starts wrong, and creating the second issue fails
  with a server error.
- **Acceptance criteria:**
  - [ ] Issues are numbered sequentially per project starting at `1`.
  - [ ] You can create many issues in the same project without errors.
  - [ ] Two issues in the same project never share a number.

---

### DB-102 · Issue labels are merged into a single tag
- **Type:** Bug   **Priority:** 2 (Medium)   **State:** New   **Area:** API / Issues
- **Description:** When an issue has more than one label, they don't display as
  separate tags.
- **Repro steps:**
  1. Create (or edit) an issue and enter several labels, e.g. `bug, ui, urgent`.
  2. View the issue on the board and in the issue detail panel.
- **Expected:** Three separate tags — `bug`, `ui`, `urgent`.
- **Actual:** A single tag containing the whole string (e.g. `bug,ui,urgent`).
- **Acceptance criteria:**
  - [ ] Each label entered appears as its own tag.
  - [ ] Tags render correctly both on the board card and the issue detail view.
  - [ ] Existing issues with multiple labels also display correctly.

---

### DB-103 · Project cards show the wrong counts
- **Type:** Bug   **Priority:** 3 (Low)   **State:** New   **Area:** Web / Projects list
- **Description:** The issue and member counts on the projects grid don't match
  reality.
- **Repro steps:**
  1. Open the "Your projects" page.
  2. Compare a card's "issues" and "members" numbers against the actual project.
- **Expected:** "X issues" reflects the number of issues; "Y members" reflects the
  number of members.
- **Actual:** The two numbers are swapped (members shown as issues and vice versa).
- **Acceptance criteria:**
  - [ ] The issues count matches the real number of issues in the project.
  - [ ] The members count matches the real number of members.

---

### DB-104 · Deleting an issue removes the wrong issues from the board
- **Type:** Bug   **Priority:** 1 (High)   **State:** New   **Area:** Web / Board
- **Description:** Deleting a single issue corrupts the board view.
- **Repro steps:**
  1. Open a project that has several issues.
  2. Open one issue and click **Delete issue**.
  3. Look at the board (do **not** refresh yet).
- **Expected:** Only the deleted issue disappears; every other issue stays on the
  board.
- **Actual:** The other issues vanish from the board and only the deleted one
  appears to remain. Refreshing the page shows the correct list again.
- **Acceptance criteria:**
  - [ ] Deleting an issue removes only that issue from the board.
  - [ ] All other issues remain visible without needing a page refresh.

---

## ✨ Tasks & User Stories (enhancements)

These are new work — no bugs here. Pick them up to extend the product.

---

### TASK-201 · Set a real favicon and app title
- **Type:** Task   **Priority:** 3   **State:** New   **Area:** Web
- **Description:** The app currently uses the default favicon and the browser tab
  reads "Web".
- **Acceptance criteria:**
  - [ ] A custom favicon is shown in the browser tab.
  - [ ] The tab title reads "DevBoard" (or a sensible product name).

---

### US-202 · Dark / light mode
- **Type:** User Story   **Priority:** 2   **State:** New   **Area:** Web
- **As a** user, **I want** to switch between dark and light themes **so that** I
  can use the app comfortably in any lighting.
- **Acceptance criteria:**
  - [ ] A visible toggle in the header switches the theme.
  - [ ] The choice persists across page reloads.
  - [ ] On first visit the app respects the OS theme preference.

---

### US-203 · Friendlier confirmations and notifications
- **Type:** User Story   **Priority:** 2   **State:** New   **Area:** Web
- **As a** user, **I want** in-app dialogs and toasts instead of the browser's
  native pop-ups **so that** the experience feels consistent.
- **Acceptance criteria:**
  - [ ] Deleting an issue uses an in-app confirmation modal (not `confirm()`).
  - [ ] Success/error feedback appears as a toast/banner (not `alert()`).

---

### TASK-204 · Loading skeletons & empty states
- **Type:** Task   **Priority:** 3   **State:** New   **Area:** Web
- **Acceptance criteria:**
  - [ ] The projects grid and the board show skeleton placeholders while loading.
  - [ ] Empty lists/columns show a friendly message rather than plain text.

---

### TASK-205 · Inline form validation
- **Type:** Task   **Priority:** 3   **State:** New   **Area:** Web
- **Acceptance criteria:**
  - [ ] The project key field validates 2–8 uppercase letters/digits and shows a
        field-level error before submitting.
  - [ ] Required fields show clear inline errors instead of failing on submit.

---

### US-206 · Responsive board layout
- **Type:** User Story   **Priority:** 3   **State:** New   **Area:** Web
- **As a** user on a small screen, **I want** the Kanban board to remain usable.
- **Acceptance criteria:**
  - [ ] Columns scroll or stack gracefully on narrow viewports.
  - [ ] No horizontal overflow of the whole page on mobile widths.

---

### US-207 · Drag-and-drop issues between columns
- **Type:** User Story   **Priority:** 2   **State:** New   **Area:** Web
- **As a** user, **I want** to drag an issue card to another column **so that** I
  can change its status quickly.
- **Acceptance criteria:**
  - [ ] Dragging a card to another column updates the issue's status via the API.
  - [ ] The board reflects the new status without a manual refresh.

---

### TASK-208 · Search / filter on the board
- **Type:** Task   **Priority:** 3   **State:** New   **Area:** Web
- **Acceptance criteria:**
  - [ ] A search box filters issues by title.
  - [ ] Issues can be filtered by label and/or assignee.

---

### TASK-209 · Keyboard shortcuts
- **Type:** Task   **Priority:** 4   **State:** New   **Area:** Web
- **Acceptance criteria:**
  - [ ] `n` opens the "new issue" dialog.
  - [ ] `Esc` closes any open modal.

---

*Estimate, prioritise, and ship in small commits. Reference the work item ID in
each commit message.*
