import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import type { DefectService } from "../services/defectService.ts";
import type { User } from "../domain/types.ts";
import { resolveCurrentUser } from "./currentUser.ts";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

function notFound(res: ServerResponse): void {
  sendJson(res, 404, { error: "Defect not found" });
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

    const unassignMatch = url.pathname.match(/^\/defects\/([^/]+)\/unassign$/);
    if (method === "PATCH" && unassignMatch) {
      const defect = defectService.unassignDeveloper({ defectId: unassignMatch[1], actorId: user.id });
      if (!defect) {
        notFound(res);
        return;
      }
      sendJson(res, 200, defect);
      return;
    }

    const commentsMatch = url.pathname.match(/^\/defects\/([^/]+)\/comments$/);
    if (method === "GET" && commentsMatch) {
      const comments = defectService.getCommentsForUser(commentsMatch[1], user);
      if (!comments) {
        notFound(res);
        return;
      }
      sendJson(res, 200, comments);
      return;
    }

    const historyMatch = url.pathname.match(/^\/defects\/([^/]+)\/history$/);
    if (method === "GET" && historyMatch) {
      const history = defectService.getHistoryForUser(historyMatch[1], user);
      if (!history) {
        notFound(res);
        return;
      }
      sendJson(res, 200, history);
      return;
    }

    const defectMatch = url.pathname.match(/^\/defects\/([^/]+)$/);
    if (method === "GET" && defectMatch) {
      const defect = defectService.getDefectForUser(defectMatch[1], user);
      if (!defect) {
        notFound(res);
        return;
      }
      sendJson(res, 200, defect);
      return;
    }

    if (method === "GET" && url.pathname === "/defects") {
      sendJson(res, 200, defectService.listDefectsForUser(user));
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  };
}
