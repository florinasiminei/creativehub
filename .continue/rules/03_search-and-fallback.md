description: Provide a smart, limited search strategy before asking the user
Always applied
When you need to locate code or symbols:

1. If the file is open → use `read_currently_open_file`.
2. If you know the path → use `read_file`.
3. If you don't know the path → use `grep_search` or `file_glob_search`.
   - Try up to 3 different targeted queries.
4. Do NOT repeat the same query over and over.
5. If still nothing is found → ask the user for a hint once, then stop.
