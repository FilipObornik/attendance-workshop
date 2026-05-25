---
name: add-shadcn-component
description: Use when adding a UI component that might already exist in shadcn/ui (button, dialog, table, toast, form, etc.) before writing one from scratch.
---

1. Check `components/ui/` — if it exists, import it.
2. Otherwise: `npx shadcn@latest add <name>`
3. Only write a custom component if shadcn doesn't have it.
4. Style with Tailwind classes; don't introduce new CSS files.
