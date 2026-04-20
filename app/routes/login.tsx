import { data, useActionData, type LoaderFunction } from "react-router";
import { z } from "zod";
import { ErrorMessage, PrimaryButton, PrimaryInput } from "~/components/form";
import classNames from "classnames";
import type { Route } from "./+types/login";
import { validateForm } from "~/utils/validation";
import { getSession, commitSession } from "~/sessions";
import { generateMagicLink, sendMagicLinkEmail } from "~/magic-links.server";
import { v4 as uuid } from "uuid";
import { requireLoggedOutUserMiddleware } from "~/middleware/auth";

export const middleware = [requireLoggedOutUserMiddleware];

export const loader: LoaderFunction = async ({ request }) => {
  const cookieHeader = request.headers.get("cookie");
  const session = await getSession(cookieHeader);
  console.log('Loader session data:', session.data);
  return null;
}

const loginSchema = z.object({
  email: z.string().email(),
});

export async function action({ request }: Route.ActionArgs) {
  const cookieHeader = request.headers.get("cookie");
  const session = await getSession(cookieHeader);
  const formData = await request.formData();

  return validateForm(
    formData,
    loginSchema,
    async ({ email }) => {
      const nonce = uuid();
      session.set("nonce", nonce);
      const link = generateMagicLink(email, nonce);
      // console.log(link);
      await sendMagicLinkEmail(link, email);
      return data(
        { success: true },
        {
          headers: {
            "Set-Cookie": await commitSession(session),
          },
        },
      );
    },
    (errors) =>
      data(
        { errors, email: formData.get("email")?.toString() },
        { status: 400 },
      ),
  );
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  return (
    <div className="text-center mt-36">
      {actionData?.success ? (
        <div>
          <h1 className="text-2xl py-8">Yum!</h1>
          <p>Check your email and follow the instructions to finish logging in</p>
        </div>
      ) : (
        <div>
          <h1 className="text-3xl mb-8">React Router Recipes</h1>
          <form method="post" className="mx-auto md:w-1/3">
            <div className="text-left pb-4">
              <PrimaryInput
                type="email"
                name="email"
                placeholder="Email"
                autoComplete="off"
                defaultValue={actionData?.email}
              />
              <ErrorMessage>{actionData?.errors?.email}</ErrorMessage>
            </div>
            <PrimaryButton className="w-1/3 mx-auto">Log In</PrimaryButton>
          </form>
        </div>
      )}
    </div>
  );
}
