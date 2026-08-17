/** Tiny `--flag=value` / `--flag` argv parser — avoids pulling in a CLI-args dependency for two flags. */
export function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const withoutPrefix = raw.slice(2);
    const eq = withoutPrefix.indexOf("=");
    if (eq === -1) {
      args[withoutPrefix] = true;
    } else {
      args[withoutPrefix.slice(0, eq)] = withoutPrefix.slice(eq + 1);
    }
  }
  return args;
}
