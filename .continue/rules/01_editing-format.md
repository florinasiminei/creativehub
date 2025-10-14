description: Ensure code edits use proper snippet format and the edit_existing_file tool
Always applied
When editing code in existing files:

1. Always call `read_currently_open_file` (or `read_file`) to get up-to-date content.
2. Then use `edit_existing_file` with:
   - `filepath`: relative path to the file
   - `changes`: a fenced code block with language + file path, showing only the changed sections.
3. Use placeholders like `// ... existing code ...` for unchanged parts.
4. Do NOT output the entire file unless the user explicitly asks.
5. Do NOT just describe edits in text — actually call the edit tool.
