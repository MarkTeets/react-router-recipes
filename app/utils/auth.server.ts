import { getUserById } from "~/models/user.server";
import { getSession } from "~/sessions";

export async function getCurrentUser(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const session = await getSession(cookieHeader);

  const userId = session.get("userId");

  if (typeof userId !== "string") {
    console.log("No user found on current session")
    return null;
  }

  return getUserById(userId);
}