import { spawn } from "node:child_process";
import { basename } from "node:path";

export class ProcError extends Error {
	detail: string;

	constructor(message: string, detail: string) {
		super(message);
		this.detail = detail;
	}
}

export function run(
	cmd: string,
	args: Array<string>,
	timeoutMs = 600_000,
): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
		let out = "";
		let err = "";
		const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
		child.stdout.on("data", (chunk) => {
			out += chunk;
		});
		child.stderr.on("data", (chunk) => {
			err += chunk;
		});
		child.on("error", (e) => {
			clearTimeout(timer);
			reject(e);
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			if (code === 0) {
				resolve(out);
			} else {
				const detail = err.trim();
				if (detail) console.error(`${cmd} failed (code ${code}):\n${detail}`);
				reject(
					new ProcError(`${basename(cmd)} exited with code ${code}`, detail),
				);
			}
		});
	});
}
