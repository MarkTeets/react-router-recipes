import classNames from "classnames";
import { NavLink as RRNavLink, Outlet } from "react-router";

type PageLayoutProps = {
  title: string;
  links: Array<{ to: string; label: string }>;
};

export function PageLayout({ title, links }: PageLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <h1 className="text-2xl font-bold my-4">{title}</h1>
      <nav className="mt-2 pb-2 border-b-2 border-gray-300">
        {links.map(({ to, label }) => (
          <NavLink key={label} to={to}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="py-4 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

type NavLinkProps = {
  to: string;
  children: React.ReactNode;
};

function NavLink({ to, children }: NavLinkProps) {
  return (
    <RRNavLink
      to={to}
      className={({ isActive }) =>
        classNames("hover:text-gray-500 pb-2.5 px-2 md:px-4", {
          "border-b-2 border-b-primary": isActive,
        })
      }
    >
      {children}
    </RRNavLink>
  );
}
