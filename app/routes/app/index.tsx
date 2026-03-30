import { redirect } from "react-router";

export function loader() {
  // redirect function is the same as the following code. When the browser receives this, it will automatically redirect

  // return new Response(null, {
  //   status: 302,
  //   headers: {
  //     Location: "/app/pantry",
  //   },
  // });

  return redirect("/app/pantry");
}
