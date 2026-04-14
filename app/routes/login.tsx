import { data, useActionData, type LoaderFunction } from "react-router";
import { z } from "zod";
import { ErrorMessage, PrimaryButton, PrimaryInput } from "~/components/form";
import classNames from "classnames";
import type { Route } from "./+types/login";
import { validateForm } from "~/utils/validation";
// import { getUser } from "~/models/user.server";
// import { sessionCookie } from "~/cookies";
import { getSession, commitSession } from "~/sessions";
import { generateMagicLink } from "~/magic-links.server";
import { v4 as uuid } from "uuid";

const loginSchema = z.object({
  email: z.string().email(),
});

// export const loader: LoaderFunction = async ({ request }) => {
//   const cookieHeader = request.headers.get("cookie");
//   const session = await getSession(cookieHeader);
//   console.log('Session data:', session.data);
//   return null;
// }

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
      console.log(link);
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
      <h1 className="text-3xl mb-8">Remix Recipes</h1>
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
  );
}
