description: Enforce correct edit snippet format and efficient edits for TS/TSX files
Auto attached
globs:
  - "app/**/*.{ts,tsx}"
  - "pages/**/*.{ts,tsx}"
  - "src/**/*.{ts,tsx}"

When editing TS or TSX files:

1. Always use `read_currently_open_file` or `read_file` first to get the latest content.

2. Use `edit_existing_file` with:
   - `filepath`: the exact relative path to the file
   - `changes`: a **fenced code block** containing both the **language and file path** in the info string, and only the modified sections.

✅ Example snippet formats (pick whichever fits):

```tsx app/page.tsx
// ... existing code ...
function HelloWorld() {
  return <h1>Hello, World!</h1>;
}
// ... existing code ...
export default function Home() {
  // ... existing code ...
  return (
    <div className="min-h-screen ...">
      <HelloWorld />
      {/* ... existing code ... */}
    </div>
  );
}
// ... rest of code ...
// ... existing code ...
export function Button() {
  return <button className="px-4 py-2 bg-blue-500 text-white">Click</button>;
}
// ... rest of code ...
tsx app/page.tsx  
...  

3. Do NOT dump the entire file unless explicitly asked by the user.

4. ✅ Keep existing code style (indentation, quotes, imports).

    Add new imports if needed at the top of the file.

    Do not reorder unrelated code.

5. ✅ Keep diffs minimal and focused. Only modify what is relevant to the user's request.