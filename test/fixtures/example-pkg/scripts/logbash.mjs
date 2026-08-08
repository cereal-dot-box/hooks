// Example PreToolUse(Bash) hook script. Reads the event payload on stdin.
import { readSync } from "node:fs";
let input = "";
try {
  const fd = 0;
  const buf = Buffer.alloc(65536);
  let n;
  while ((n = readSync(fd, buf, 0, buf.length, null)) > 0) input += buf.slice(0, n).toString();
} catch {
  // stdin may be absent in some invocations
}
const tool = (() => {
  try {
    return JSON.parse(input)?.tool_name ?? "unknown";
  } catch {
    return "unknown";
  }
})();
console.log(`[agenthooks] bash call observed (tool=${tool})`);
