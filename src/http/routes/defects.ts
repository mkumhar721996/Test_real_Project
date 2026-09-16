import type { DefectService } from "../../services/defectService.ts";
import type { User } from "../../domain/types.ts";

export interface RouteResult {
  status: number;
  body: unknown;
}

const NOT_FOUND: RouteResult = { status: 404, body: { error: "Defect not found" } };

export function handleDefectsRoute(
  defectService: DefectService,
  user: User,
  method: string,
  pathname: string,
): RouteResult | undefined {
  const unassignMatch = pathname.match(/^\/defects\/([^/]+)\/unassign$/);
  if (method === "PATCH" && unassignMatch) {
    const defect = defectService.unassignDeveloper({ defectId: unassignMatch[1], actorId: user.id });
    return defect ? { status: 200, body: defect } : NOT_FOUND;
  }

  const commentsMatch = pathname.match(/^\/defects\/([^/]+)\/comments$/);
  if (method === "GET" && commentsMatch) {
    const comments = defectService.getCommentsForUser(user, commentsMatch[1]);
    return comments ? { status: 200, body: comments } : NOT_FOUND;
  }

  const historyMatch = pathname.match(/^\/defects\/([^/]+)\/history$/);
  if (method === "GET" && historyMatch) {
    const history = defectService.getHistoryForUser(user, historyMatch[1]);
    return history ? { status: 200, body: history } : NOT_FOUND;
  }

  const defectMatch = pathname.match(/^\/defects\/([^/]+)$/);
  if (method === "GET" && defectMatch) {
    const defect = defectService.getDefectForUser(user, defectMatch[1]);
    return defect ? { status: 200, body: defect } : NOT_FOUND;
  }

  if (method === "GET" && pathname === "/defects") {
    return { status: 200, body: defectService.listDefectsForUser(user) };
  }

  return undefined;
}
