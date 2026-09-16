import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import type { DefectService } from "../services/defectService.ts";
import type { User } from "../domain/types.ts";
import { resolveCurrentUser } from "./middleware/currentUser.ts";
import { handleDefectsRoute } from "./routes/defects.ts";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

export function createRequestListener(deps: { defectService: DefectService; users: User[] }): RequestListener {
  const { defectService, users } = deps;

  return (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://internal");
    const method = req.method ?? "GET";
    const user = resolveCurrentUser(users, req.headers["x-user-id"] as string | undefined);

    if (!user) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    const result = handleDefectsRoute(defectService, user, method, url.pathname);
    if (!result) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    sendJson(res, result.status, result.body);
  };
}
