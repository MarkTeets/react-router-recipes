import { redirect, type LoaderFunctionArgs } from "react-router";
import { userContext } from "~/middleware/auth";
import { type User } from "generated/prisma/client";

export function getUserFromContext(context: LoaderFunctionArgs["context"]): User {
  const user = context.get(userContext);
  if (user === null) {
    console.log(
      "Middleware auth not functioning, redirected to /login",
    );
    throw redirect("/login");
  }
  return user;
}
