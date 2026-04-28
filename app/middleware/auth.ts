import { type User } from "generated/prisma/client";
import { createContext, type MiddlewareFunction, redirect } from "react-router";
import { getCurrentUser } from "~/utils/auth.server";

export const requireLoggedOutUserMiddleware: MiddlewareFunction = async ({
  request,
}) => {
  // console.log("Entered requireLoggedOutUserMiddleware middleware");
  const user = await getCurrentUser(request);
  // console.log("user");
  // console.log(user);
  if (user !== null) {
    // console.log("Found user, redirecting to /app");
    throw redirect("/app");
  }
};

export const userContext = createContext<User | null>(null);

export const requireLoggedInUserMiddleware: MiddlewareFunction = async ({
  request,
  context,
}) => {
  // console.log("Entered requireLoggedInUserMiddleware middleware");
  const user = await getCurrentUser(request);
  // console.log("user");
  // console.log(user);
  if (user === null) {
    // console.log("No user, redirecting to /login");
    throw redirect("/login");
  }
  context.set(userContext, user);
};
