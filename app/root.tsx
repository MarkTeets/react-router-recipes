import {
  isRouteErrorResponse,
  NavLink,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
  useResolvedPath,
  useRouteError,
  Link,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import {
  DiscoverIcon,
  HomeIcon,
  LoginIcon,
  RecipeBookIcon,
  SettingsIcon,
} from "./components/icons";
import classNames from "classnames";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "React Router Recipes" },
    { name: "description", content: "Welcome to the React Router Recipes App" },
  ];
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="md:flex md:h-screen bg-background">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <>
      <nav className="bg-primary text-white md:w-16 flex md:flex-col justify-between">
        <ul className="flex md:flex-col">
          <AppNavLink to="/">
            <HomeIcon />
          </AppNavLink>
          <AppNavLink to="/discover">
            <DiscoverIcon />
          </AppNavLink>
          <AppNavLink to="/app">
            <RecipeBookIcon />
          </AppNavLink>
          <AppNavLink to="/settings">
            <SettingsIcon />
          </AppNavLink>
        </ul>
        <ul>
          <AppNavLink to="/login">
            <LoginIcon/>
          </AppNavLink>
        </ul>
      </nav>
      <div className="p-4 w-full md:w-[calc(100%-4rem)]">
        <Outlet />
      </div>
    </>
  );
}

/* From ZTM course, caused an error of placing html element within body
export function ErrorBoundary() {
  const error = useRouteError();

  return (
    <html>
      <head>
        <title>Whoops!</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale-1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="p-4">
          <h1 className="text-2xl pb-3">Whoops!</h1>
          <p>You're seeing this page because an unexpected error occurred.</p>
          {error instanceof Error ? (
            <p className="my-4 font-bold">{error.message}</p>
          ) : null}
          <Link to="/" className="text-primary">
            Take me home
          </Link>
        </div>
      </body>
    </html>
  );
}
*/

/* Error boundary from youtube course video */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
//*/

type AppNavLinkProps = {
  children: React.ReactNode;
  to: string;
};

// With classnames package
function AppNavLink({ children, to }: AppNavLinkProps) {
  const path = useResolvedPath(to);
  const navigation = useNavigation();
  const isLoading =
    navigation.state === "loading" &&
    navigation.location.pathname === path.pathname;

  return (
    <li className="w-16">
      <NavLink to={to}>
        {({ isActive }) => (
          <div
            className={classNames(
              "py-4 flex justify-center hover:bg-primary-light",
              {
                "bg-primary-light": isActive || isLoading,
                "animate-pulse": isLoading,
              },
            )}
          >
            {children}
          </div>
        )}
      </NavLink>
    </li>
  );
}
// */
// Without classnames package
/*
function AppNavLink({ children, to }: AppNavLinkProps) {
  const path = useResolvedPath(to);
  const navigation = useNavigation();
  const isLoading =
    navigation.state === "loading" &&
    navigation.location.pathname === path.pathname;

  return (
    <li className="w-16">
      <NavLink
        to={to}
        className={({ isActive }) =>
          `py-4 flex justify-center hover:bg-primary-light ${isActive || isLoading ? "bg-primary-light" : ""} ${isLoading ? "animate-pulse" : ""}`
        }
      >
        <div className="flex justify-center">{children}</div>
      </NavLink>
    </li>
  );
}
 // */
